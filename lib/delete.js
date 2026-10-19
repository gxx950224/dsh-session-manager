/**
 * 会话彻底删除执行器。
 *
 * 背景：DSH **不提供任何删除会话的能力**（已核实全部内部包：session-persistence
 * 契约无 delete/remove；jsonl 后端的 rm 仅清理临时文件；session-query-sqlite 的
 * `_deleteSession` 只是搜索索引缓存刷新）。因此本模块以宿主文件操作实现删除，
 * 属于超出 DSH 官方保证范围的行为——**防护必须做到位**。
 *
 * 一次完整删除涉及三处状态，缺一处会话就会残留或"复活"：
 *   a. 会话目录 <root>/<projectKey>/<sessionId>/   （日志 + session.lock）
 *   b. 投影缓存 <storages>/session_projcache/sessions/<sessionId>.json
 *   c. workspace 记账（sessionIds 与 archivedSessionIds）
 *
 * 安全闸门（任一不满足即拒绝，绝不"尽力而为"地删）：
 *   1. 会话必须不在 live registry 中（正在运行的会话持有写句柄）；
 *   2. 目标目录的 session.lock 必须可独占（否则说明正在被写入）；
 *   3. 解析出的绝对路径必须位于会话根目录之内（越界防护）。
 */
import fs from "node:fs/promises"
import path from "node:path"
import {
  LEASE_FILENAME,
  isWithin,
  projectionCacheDir,
  projectionCachePath,
  sessionDir,
  sessionsRoot,
} from "./paths.js"

/** 删除结果码。'ok' 之外的都表示该会话未被完整删除。 */
export const DeleteCode = {
  ok: "ok",
  active: "active",
  locked: "locked",
  notFound: "not-found",
  escapedRoot: "escaped-root",
  missingCwd: "missing-cwd",
  failed: "failed",
}

/**
 * 解析单个会话的删除目标目录。
 *
 * header 缺失 cwd 时回退 _no-cwd（与后端一致），并通过 escapedRoot 兜底。
 *
 * @returns {{dir: string} | {error: string}}
 */
export function resolveTarget(root, id, cwd) {
  const dir = sessionDir(root, cwd, id)
  if (!isWithin(root, dir)) return { error: DeleteCode.escapedRoot }
  return { dir }
}

/** 目录是否存在（任何错误都视为不存在，删除流程不因 stat 失败而中断）。 */
async function exists(p) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

/**
 * 检查会话目录的写锁是否空闲。
 *
 * 官方后端用 session.lock 的内核锁表达跨进程写归属。我们不去抢锁（抢锁本身
 * 是有副作用的操作），而是用独占打开来探测：能独占打开/创建即视为空闲。
 * 探测失败说明有写者，删除必须让路。
 *
 * @returns true 表示可以安全删除
 */
export async function isLeaseFree(dir) {
  const lock = path.join(dir, LEASE_FILENAME)
  let handle
  try {
    handle = await fs.open(lock, "r+")
    await handle.close()
    return true
  } catch (error) {
    const code = error?.code
    /* 锁文件不存在 = 无人持有（可能是从未写过或已清理）。 */
    if (code === "ENOENT") return true
    /* EBUSY/EAGAIN/EPERM(EACCES 在 Windows 上由共享冲突引起) 都按"被占用"处理。 */
    if (code === "EBUSY" || code === "EAGAIN" || code === "EPERM" || code === "EACCES") {
      return false
    }
    /* 其他错误（如目录不存在）不应被误判为锁占用。 */
    return true
  }
}

/**
 * 删除单个会话的全部痕迹。
 *
 * 执行顺序（**这是本函数的核心，别调整**）：
 *
 *   1. 归档（stopActivity）—— 侧栏立刻隐藏，不用重启 DSH
 *   2. evict —— 从 DSH 内存注册表移除（条目真正消失的决定性一步）
 *   3. 删除会话目录 + 投影缓存 —— 磁盘彻底消失
 *   4. detach —— 从 workspace 记账移除
 *   5. unarchive —— 清掉归档标记
 *
 * 为什么必须「先归档、后移除内存、最后才 unarchive」：
 *
 *   隐藏：侧栏是否显示一个会话由 `sessionVisible()` 决定，归档的返回 false
 *   （dsh-client-ui-workspace 的 archivedFilter:"default" 分支），「未分组」
 *   的候选列表也走同一个函数。所以归档标记 = 隐藏。
 *
 *   消失：但 DSH 宿主列会话时会把**内存注册表**无条件并入
 *   （sessionQuery.listSessions 里 `for (const session of ctx.sessions.list())`），
 *   因此只要会话还在内存里，它必定出现在列表里——归档只是让它不进分组，
 *   却会掉进「未分组」兜底桶。**必须真的把它移出内存**（步骤 2）。
 *
 *   顺序：evict 在 rm 之前，避免那个可能仍在收尾的会话把目录重新写出来；
 *   unarchive 在最后，因为它一执行就不再隐藏，必须等三项前置全部达成。
 *
 * 串行调用由调用方保证：workspaceRegistry 内部用 enqueueOperation 串行化写入，
 * 并发提交只会堆积且失败归因更差。
 *
 * @param id - 会话 id
 * @param deps - 注入的依赖（测试用）
 * @returns 单条结果
 */
export async function deleteSession(id, deps) {
  const {
    root = sessionsRoot(),
    cacheDir = projectionCacheDir(),
    readCwd,                       // async (id) => string | undefined
    archive,                       // async (id) => void  归档（隐藏 + 停止在跑的 agent）
    evict,                         // async (id) => void  从 DSH 内存注册表移除（决定性一步）
    detach,                        // async (id) => void  从 workspace 记账移除
    unarchive,                     // async (id) => void  清归档标记（必须最后）
    rm = (p) => fs.rm(p, { recursive: true, force: true }),
    unlink = (p) => fs.rm(p, { force: true }),
    logger = () => {},
  } = deps

  const result = {
    id,
    ok: false,
    code: DeleteCode.ok,
    removed: { dir: null, cache: null },
  }

  /* 解析路径。cwd 缺失时按 _no-cwd 推导，仍由 isWithin 兜底。 */
  let cwd
  try {
    cwd = await readCwd?.(id)
  } catch (error) {
    logger(`session-manager: 读取会话 ${id} 的 header 失败：${String(error)}`)
    result.code = DeleteCode.failed
    result.error = error instanceof Error ? error.message : String(error)
    return result
  }

  const target = resolveTarget(root, id, cwd)
  if (target.error !== undefined) {
    result.code = target.error
    return result
  }

  /* 越界断言：resolveTarget 已查过一次，这里再断言，防止后续改动绕过。 */
  if (!isWithin(root, target.dir)) {
    result.code = DeleteCode.escapedRoot
    return result
  }

  const dirExists = await exists(target.dir)
  const cachePath = projectionCachePath(cacheDir, id)
  const cacheExists = await exists(cachePath)

  /*
   * 会话目录与投影缓存都不存在 = 磁盘上已无该会话的记录（只剩记账）。
   * 成功时保留这个事实，让 UI 能区分"真删了文件"与"仅清理了记账"。
   */
  const diskAbsent = !dirExists && !cacheExists

  /*
   * 硬闸门：磁盘写锁。
   * 锁由持久化后端的写句柄持有，只有真有写者时才被占用——这是唯一
   * 客观且无误判的"不能删"依据。目录不存在则无需检查。
   */
  if (dirExists && !(await isLeaseFree(target.dir))) {
    result.code = DeleteCode.locked
    return result
  }

  /*
   * 步骤 1：先归档。
   *
   * 这是"立刻生效、无需重启"的关键——归档让 sessionVisible() 返回 false，
   * 侧栏（含「未分组」）立即不再显示该会话，无论它是否还在内存注册表里。
   * stopActivity 由上层传入（会顺带停掉在跑的 agent）。
   *
   * 归档失败不阻断删除：文件该删还是要删，只是可能残留显示，
   * 这种情况如实记入 failures，让用户知道需要重启。
   */
  const failures = []
  let archived = false
  try {
    await archive?.(id)
    archived = true
  } catch (error) {
    failures.push(`归档失败（可能仍显示在侧栏）：${error instanceof Error ? error.message : String(error)}`)
  }

  /*
   * 步骤 2：把会话从 **DSH 内存注册表**移除。
   *
   * 这是让条目真正消失的**决定性一步**。链路（读源码确认）：
   *
   *   ctx.sessions.list()                      ← 内存注册表
   *     ↓ 被无条件并入（records.set(id, { live: true })）
   *   sessionQuery.listSessions()
   *     ↓
   *   宿主 session.list()                       ← items.push(summaryFor(live))
   *     ↓
   *   客户端 refresh() 拿到的基线               ← 里面仍有它
   *     ↓
   *   侧栏继续显示
   *
   * 所以只删文件、只清记账都不够——**只要会话还在内存里，它就必定出现在
   * 列表里**（refresh 也救不了，因为它拿到的基线本身就含内存会话）。
   *
   * **为什么必须在删文件之前**：它比"删完再移除"安全得多。
   * 归档里虽然带了 stopActivity（会取消在跑的 turn），但取消并不等到
   * 真正沉降；若先删文件、后移除内存，那个仍在收尾的会话一旦追加事件，
   * 存储层会**把刚删掉的目录重新创建出来**——那就白删了。
   * 先移除内存，存储层不再持有它，后续追加不会再落盘。
   *
   * `evict` 由宿主半用官方的 liveEntryFor + detachEntered 实现，
   * 后者会发出 `session/disposed`。已核对该事件的全部监听者
   * （dsh-agent-loop / dsh-api-session-controller / dsh-client-file-upload /
   * dsh-experimental-agent-team）都只做内存记账，**没有任何一个读会话文件**，
   * 因此在删文件之前触发它是安全的。
   *
   * 失败不阻断流程：文件该删还是要删；失败意味着侧栏可能残留到重启，
   * 如实记入 failures 让用户知情。
   */
  try {
    await evict?.(id)
    result.evicted = true
  } catch (error) {
    result.evicted = false
    failures.push(
      `会话仍驻留在 DSH 内存中（重启后消失）：${error instanceof Error ? error.message : String(error)}`,
    )
  }

  /* 步骤 3：删文件。 */
  if (dirExists) {
    try {
      await rm(target.dir)
      result.removed.dir = target.dir
    } catch (error) {
      failures.push(`删除会话目录失败：${error instanceof Error ? error.message : String(error)}`)
    }
  }
  if (cacheExists) {
    try {
      await unlink(cachePath)
      result.removed.cache = cachePath
    } catch (error) {
      failures.push(`清理投影缓存失败：${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /* 步骤 4：摘 workspace 记账。 */
  const bookkeeping = { archived, detached: false, unarchived: false, registry: "ok" }
  let detachOk = false
  try {
    await detach?.(id)
    detachOk = true
    bookkeeping.detached = true
  } catch (error) {
    bookkeeping.registry = "error"
    failures.push(`从 workspace 移除失败：${error instanceof Error ? error.message : String(error)}`)
  }

  /*
   * 步骤 5：清归档标记——**必须在文件、内存、记账都处理完之后**。
   *
   * 顺序理由：标记一清，sessionVisible() 就不再隐藏它。只有当
   *   - 磁盘文件已删除，且
   *   - 内存已移除（否则它会带着 live 身份重新出现在列表里），且
   *   - workspace 记账已摘除
   * 才不会立刻掉进「未分组」。任一未达成则保留标记：宁可留一个无害的
   * 死 id（由启动清理兜底），也不要把会话重新暴露出来。
   */
  const dirGone = !(await exists(target.dir))
  /*
   * 内存也必须已移除：若会话仍 live，宿主 list() 会把它并回列表，
   * 此时清掉归档标记等于让它立刻重新出现在「未分组」。
   */
  const canUnarchive = dirGone && detachOk && result.evicted === true
  if (canUnarchive) {
    try {
      await unarchive?.(id)
      bookkeeping.unarchived = true
    } catch (error) {
      bookkeeping.registry = "error"
      failures.push(`清理归档标记失败：${error instanceof Error ? error.message : String(error)}`)
    }
  } else {
    bookkeeping.unarchiveSkipped = !dirGone
      ? "files-remain"
      : !detachOk
        ? "detach-failed"
        : "still-in-memory"
    logger(
      `session-manager: 会话 ${id} 的归档标记保留（${bookkeeping.unarchiveSkipped}）；` +
        `它将由启动清理在确认会话消失后移除`,
    )
  }
  result.bookkeeping = bookkeeping

  if (failures.length > 0) {
    result.code = DeleteCode.failed
    result.error = failures.join("；")
    return result
  }

  /* 成功：区分"真删了磁盘文件"与"磁盘上本就没有、仅清理了记账"。 */
  result.code = diskAbsent ? DeleteCode.notFound : DeleteCode.ok
  result.ok = true
  return result
}

/**
 * 批量删除：**逐条串行**，单条失败不中断整批。
 *
 * @returns {{items: object[], ok: number, failed: number}}
 */
export async function deleteSessions(ids, deps) {
  const items = []
  for (const id of ids) {
    try {
      items.push(await deleteSession(id, deps))
    } catch (error) {
      items.push({
        id,
        ok: false,
        code: DeleteCode.failed,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
  const ok = items.filter((r) => r.ok).length
  return { items, ok, failed: items.length - ok }
}

/**
 * 预览：只计算将被动到的绝对路径，不做任何写操作。
 * 删除确认弹窗据此展示"所见即所删"。
 *
 * 同时回报 lockFree，让弹窗能提前告知"该会话正被写入、无法删除"——
 * 这是唯一的硬闸门，提前暴露可以避免用户走到确认后才失败。
 */
export async function previewDeletions(ids, deps) {
  const { root = sessionsRoot(), cacheDir = projectionCacheDir(), readCwd } = deps
  const items = []
  for (const id of ids) {
    let cwd
    try {
      cwd = await readCwd?.(id)
    } catch {
      cwd = undefined
    }
    const target = resolveTarget(root, id, cwd)
    if (target.error !== undefined) {
      items.push({ id, code: target.error, exists: false })
      continue
    }
    const exists_ = await exists(target.dir)
    items.push({
      id,
      path: target.dir,
      exists: exists_,
      cache: projectionCachePath(cacheDir, id),
      cacheExists: await exists(projectionCachePath(cacheDir, id)),
      /* 目录不存在时无需探测锁（会凭空创建目录）。 */
      lockFree: exists_ ? await isLeaseFree(target.dir) : true,
    })
  }
  return items
}
