/**
 * dsh-session-manager 宿主半：注册设置页所需的同源 HTTP 路由。
 *
 * 为什么需要宿主半（而不是像归档那样纯客户端）：
 *   - 归档/取消归档有官方 Remote（workspaces.archiveSession/unarchiveSession），
 *     客户端可直接调用；
 *   - 但"彻底删除"需要 workspaceRegistry 的 detachSession（**未暴露为任何
 *     Remote 方法**）以及 filesystem 操作；
 *   - 已安装的第三方插件拿不到 host.call（那是动态运行时的契约），typert 的
 *     @Remote 契约由 DSH 构建流水线生成、第三方无法手写。
 *   → 同源 webServer 路由是本类插件读写宿主能力的可行路径（delivery-board-dsh
 *     与 sapbuddy-dsh 均以此模式实际工作）。
 *
 * 读开放（同源页面即可）；**写操作限本机 loopback**，且删除带硬闸门。
 */
import { cleanupArchivedIds } from "./cleanup.js"
import {
  DeleteCode,
  deleteSessions,
  previewDeletions,
} from "./delete.js"
import { encodeSegment, projectionCacheDir, projectKey, sessionsRoot } from "./paths.js"
import fs from "node:fs/promises"
import path from "node:path"

export const ROUTES = {
  state: "/api/session-manager/state",
  archive: "/api/session-manager/archive",
  unarchive: "/api/session-manager/unarchive",
  preview: "/api/session-manager/delete/preview",
  delete: "/api/session-manager/delete",
}

/** 仅允许本机回环访问写操作。 */
export function isLoopback(req) {
  const a = req?.socket?.remoteAddress ?? ""
  return a === "127.0.0.1" || a === "::1" || a === "::ffff:127.0.0.1"
}

function json(res, status, data) {
  const body = JSON.stringify(data)
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
  })
  res.end(body)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on("data", (c) => chunks.push(c))
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8")
      if (!raw.trim()) return resolve({})
      try {
        resolve(JSON.parse(raw))
      } catch (e) {
        reject(new Error(`请求体不是合法 JSON: ${e instanceof Error ? e.message : String(e)}`))
      }
    })
    req.on("error", reject)
  })
}

/** 从请求体取出干净的 id 列表（去重、仅保留非空字符串）。 */
export function bodyIds(body) {
  const raw = Array.isArray(body?.ids) ? body.ids : []
  const out = []
  const seen = new Set()
  for (const v of raw) {
    if (typeof v !== "string" || v.length === 0 || seen.has(v)) continue
    seen.add(v)
    out.push(v)
  }
  return out
}

/**
 * 构造宿主侧的依赖集合。
 *
 * 关键点：所有会写宿主状态的能力都从 ctx 惰性获取，并逐个包在 try 里——
 * 任一项不可用（headless、服务缺失）都不应让整个路由注册失败，而是降级为
 * 明确的结果标注（绝不假装成功）。
 *
 * @param ctx - 宿主插件上下文
 * @returns 供 deleteSessions / previewDeletions 使用的依赖
 */
export function buildDeps(ctx) {
  const workspaceRegistry = ctx.get("workspaceRegistry")
  const sessionQuery = ctx.get("sessionQuery")
  const sessionPersistence = ctx.get("sessionPersistence")
  const sessions = ctx.get("sessions")
  const logger = (msg) => {
    try {
      ctx.logger?.warn?.(msg)
    } catch {
      /* 日志失败不影响业务 */
    }
  }

  /* header 索引只建一次，避免逐条删除时重复 listSessions（该调用会遍历持久化存储）。 */
  let headerIndex = null
  const headers = async () => {
    if (headerIndex !== null) return headerIndex
    const map = new Map()
    try {
      const records = await (sessionQuery?.listSessions?.() ?? sessionPersistence?.list?.() ?? [])
      for (const record of records ?? []) {
        const header = record?.header ?? record
        if (header?.id !== undefined) map.set(header.id, header)
      }
    } catch (error) {
      logger(`session-manager: 枚举会话 header 失败：${String(error)}`)
    }
    headerIndex = map
    return map
  }

  return {
    root: sessionsRoot(),
    cacheDir: projectionCacheDir(),
    logger,

    /*
     * 归档。删除流程的**第一步**，用途是让侧栏立刻隐藏该会话。
     *
     * 带 stopActivity：跳过"活跃"检查并顺带停掉在跑的 agent。
     * 对已归档的 id 是安全 no-op。
     */
    archive: async (id) => {
      await workspaceRegistry?.archiveSession?.(id, { stopActivity: true })
    },

    /** 读取会话 header 的 cwd，用于推导磁盘路径。 */
    readCwd: async (id) => (await headers()).get(id)?.cwd,

    /*
     * 把会话从 DSH 内存注册表移除。**这是让条目真正消失的决定性一步。**
     *
     * 为什么必须做（读源码确认的链路）：
     *   ctx.sessions.list()                    ← 内存注册表
     *     ↓ 被无条件并入（records.set(id, { live: true })）
     *   sessionQuery.listSessions()
     *     ↓
     *   宿主 session.list()                    ← items.push(summaryFor(live))
     *     ↓
     *   客户端 refresh() 的基线                 ← 里面仍有它
     *
     * 因此只删文件 + 清记账是不够的：**只要会话还在内存里，它必定出现在
     * 列表里**，侧栏就会继续显示（refresh 也救不了，因为基线本身含它）。
     *
     * 用法取官方服务上的两个方法（不是 hack，是 DSH 自己 detach 时走的同一条路）：
     *   liveEntryFor(session) → entry
     *   detachEntered(entry)  → 从 store 移除 + emitDisposed（发 session/disposed）
     *
     * `session/disposed` 会正常通知 DSH 自己的监听者，其中
     * dsh-api-session-controller 的监听者会发出 `api-session/removed`，
     * 正是让客户端列表移除该条目的机制。
     *
     * 拿不到这两个方法（DSH 版本变动）时**抛错**，由调用方降级：
     * 文件照删，只是提示需要重启才能从侧栏消失。
     */
    evict: async (id) => {
      if (sessions === undefined) throw new Error("sessions 服务不可用")
      const session = sessions.get?.(id)
      /* 不在内存里 = 无需移除，视为成功（常见于冷会话）。 */
      if (session === undefined) return
      const entry = sessions.liveEntryFor?.(session)
      if (entry === undefined) {
        throw new Error("sessions.liveEntryFor 不可用（DSH 版本变动？）")
      }
      if (typeof sessions.detachEntered !== "function") {
        throw new Error("sessions.detachEntered 不可用（DSH 版本变动？）")
      }
      sessions.detachEntered(entry)
      /*
       * 自校验：调用后必须真的从注册表消失。
       *
       * 不假设它成功——`detachEntered` 依赖 `this.store`，而服务调用经过
       * Cordis 代理；万一绑定语义变化，静默失败会让整个删除流程"看起来成功、
       * 实际残留"。所以这里当场复核，失败就抛错走降级路径。
       */
      if (sessions.get?.(id) !== undefined) {
        throw new Error("detachEntered 后会话仍在内存注册表中")
      }
    },

    /** 从 workspace 记账中移除该会话（detachSession 未暴露为 Remote，只能宿主调用）。 */
    detach: async (id) => {
      /* 官方公开面：registry.list() 返回带 detachSession 的实体（registry.get(id) 亦同）。
         这里不直接改写 table，避免绕过 register 的写链（enqueueOperation / 快照切换）。 */
      const workspaces = workspaceRegistry?.list?.() ?? []
      let detached = false
      for (const entity of workspaces) {
        const owned = entity?.sessionIds ?? []
        if (!Array.isArray(owned) || !owned.includes(id)) continue
        await entity.detachSession(id)
        detached = true
      }
      if (!detached) {
        /* 没有记账条目也算成功（会话可能本就不属于任何 workspace）。 */
        logger(`session-manager: 会话 ${id} 无 workspace 记账，跳过 detach`)
      }
    },

    /** 从归档集移除（对未归档 id 是安全 no-op）。 */
    unarchive: async (id) => {
      await workspaceRegistry?.unarchiveSession?.(id)
    },
  }
}

/**
 * 启动清理：移除归档集里指向已消失会话的 id。
 *
 * 为什么需要：`archivedSessionIds` 在 DSH 里**没有任何过滤**
 * （对比 workspace 实体的 sessionIds getter 会按 sessionPath 过滤），
 * 因此删除流程出于安全保留的标记会永久留存。这里在每次启动时收拾干净。
 *
 * 保守原则：只在确定会话已消失时才清；任何查询抛错一律保留。
 *
 * @param ctx - 宿主插件上下文
 * @returns 清理结果（供测试与日志）
 */
export async function runStartupCleanup(ctx) {
  const workspaceRegistry = ctx.get("workspaceRegistry")
  const sessionPersistence = ctx.get("sessionPersistence")
  const sessions = ctx.get("sessions")
  const root = sessionsRoot()
  const logger = (msg) => {
    try {
      ctx.logger?.info?.(msg) ?? ctx.logger?.warn?.(msg)
    } catch {
      /* 日志失败不影响清理 */
    }
  }

  /*
   * 目录是否存在：按 id 反推路径需要 cwd，这里改用更简单也更可靠的
   * "直接枚举项目目录下是否有该会话目录"——避免为一堆死 id 反复读 header。
   */
  const dirExists = async (id) => {
    const seg = encodeSegment(id)
    let projects = []
    try {
      projects = await fs.readdir(root, { withFileTypes: true })
    } catch {
      /* 根目录读不到 => 无法判断，返回 true 让它被保守保留。 */
      return true
    }
    for (const entry of projects) {
      if (!entry.isDirectory()) continue
      try {
        await fs.access(path.join(root, entry.name, seg))
        return true
      } catch {
        /* 继续找 */
      }
    }
    return false
  }

  return cleanupArchivedIds({
    archivedIds: () => [...(workspaceRegistry?.archivedSessionIds ?? [])],
    sessionKnown: async (id) => {
      /* live registry 命中即已知。 */
      if (sessions?.get?.(id) !== undefined) return true
      /* header 索引（持久化列表）命中即已知。 */
      const headers = await sessionPersistence?.list?.()
      if (Array.isArray(headers)) {
        for (const record of headers) {
          if ((record?.header ?? record)?.id === id) return true
        }
        return false
      }
      /* 拿不到列表 => 返回 undefined 语义（不参与判断，交给磁盘证据）。 */
      throw new Error("sessionPersistence.list unavailable")
    },
    dirExists,
    unarchive: async (id) => {
      await workspaceRegistry?.unarchiveSession?.(id)
    },
    logger,
  })
}

/**
 * 构造全部路由规格（纯数据，不触碰 webServer，便于单测）。
 *
 * @param ctx - 宿主插件上下文
 * @returns 路由规格数组
 */
export function buildRouteSpecs(ctx) {
  const get = (path, handler) => ({
    kind: "exact",
    path,
    async handler(req, res) {
      if (req.method !== "GET" && req.method !== "HEAD") {
        return json(res, 405, { ok: false, error: "仅支持 GET" })
      }
      try {
        return await handler(req, res)
      } catch (e) {
        return json(res, 500, { ok: false, error: e instanceof Error ? e.message : String(e) })
      }
    },
  })

  const post = (path, handle) => ({
    kind: "exact",
    path,
    async handler(req, res) {
      if (req.method !== "POST") return json(res, 405, { ok: false, error: "仅支持 POST" })
      if (!isLoopback(req)) return json(res, 403, { ok: false, error: "仅允许本机访问" })
      let body
      try {
        body = await readBody(req)
      } catch (e) {
        return json(res, 400, { ok: false, error: e instanceof Error ? e.message : String(e) })
      }
      try {
        return json(res, 200, await handle(body))
      } catch (e) {
        return json(res, 500, { ok: false, error: e instanceof Error ? e.message : String(e) })
      }
    },
  })

  const deps = () => buildDeps(ctx)
  const registry = () => ctx.get("workspaceRegistry")

  return [
    /* 读：暴露根目录与归档集，便于客户端展示与诊断。 */
    get(ROUTES.state, (_req, res) => {
      const wr = registry()
      return json(res, 200, {
        ok: true,
        root: sessionsRoot(),
        projectionCache: projectionCacheDir(),
        archivedSessionIds: [...(wr?.archivedSessionIds ?? [])],
        pinnedSessionIds: [...(wr?.pinnedSessionIds ?? [])],
      })
    }),

    /* 批量归档：默认要求会话不活跃；stopActivity 时先停再归档（官方语义）。 */
    post(ROUTES.archive, async (b) => {
      const wr = registry()
      if (wr === undefined) return { ok: false, error: "workspaceRegistry 不可用（非 Web profile？）" }
      const ids = bodyIds(b)
      const stopActivity = b?.stopActivity === true
      const items = []
      for (const id of ids) {
        try {
          await wr.archiveSession(id, stopActivity ? { stopActivity: true } : {})
          items.push({ id, ok: true, code: DeleteCode.ok })
        } catch (e) {
          const name = e?.name
          const code = name === "WorkspaceActiveSessionError"
            ? "active"
            : name === "WorkspaceUnknownSessionError"
              ? "not-found"
              : "failed"
          items.push({ id, ok: false, code, error: e instanceof Error ? e.message : String(e) })
        }
      }
      const ok = items.filter((r) => r.ok).length
      return { ok: ok === items.length, items, okCount: ok, failed: items.length - ok }
    }),

    /* 批量取消归档：unarchiveSession 对未归档 id 是安全 no-op。 */
    post(ROUTES.unarchive, async (b) => {
      const wr = registry()
      if (wr === undefined) return { ok: false, error: "workspaceRegistry 不可用（非 Web profile？）" }
      const items = []
      for (const id of bodyIds(b)) {
        try {
          await wr.unarchiveSession(id)
          items.push({ id, ok: true, code: DeleteCode.ok })
        } catch (e) {
          items.push({ id, ok: false, code: "failed", error: e instanceof Error ? e.message : String(e) })
        }
      }
      const ok = items.filter((r) => r.ok).length
      return { ok: ok === items.length, items, okCount: ok, failed: items.length - ok }
    }),

    /* 预览：只算路径，不写。确认弹窗据此做到"所见即所删"。 */
    post(ROUTES.preview, async (b) => {
      const items = await previewDeletions(bodyIds(b), deps())
      return { ok: true, items }
    }),

    /* 删除：三重闸门（非活跃 / 锁空闲 / 不越界），逐条串行。 */
    post(ROUTES.delete, async (b) => {
      const ids = bodyIds(b)
      if (ids.length === 0) return { ok: false, error: "未提供要删除的会话 id" }
      const summary = await deleteSessions(ids, deps())
      return { ok: summary.failed === 0, ...summary }
    }),
  ]
}

/**
 * 注册全部路由。返回 disposer 列表；调用方负责并入 ctx.effect。
 *
 * 注册是"全有或全无"的：webServer 对重复的 (kind,path) 会抛错，
 * 若中途失败就把已注册的路由回滚掉再抛出，避免留下半套路由却没人卸载。
 *
 * @param webServer - 宿主 webServer 服务
 * @param ctx - 宿主插件上下文
 */
export function installRoutes(webServer, ctx) {
  const specs = buildRouteSpecs(ctx)
  const disposers = []
  try {
    for (const spec of specs) disposers.push(webServer.register(spec))
  } catch (e) {
    for (const d of disposers) {
      try {
        d()
      } catch {
        /* 回滚失败不再掩盖原始错误 */
      }
    }
    throw e
  }
  return disposers
}

/**
 * 插件入口。用 ctx.inject 而非硬依赖，这样 headless profile（无 webServer）下
 * 插件仍能正常加载，只是不注册路由。
 */
export function apply(ctx) {
  /*
   * 启动清理：收拾归档集里指向已消失会话的死 id。
   *
   * 用 ctx.inject 等 workspaceRegistry 就绪后再跑——它可能在插件之后才挂载。
   * 清理是尽力而为的维护动作：任何失败都只记日志，绝不影响插件加载。
   */
  ctx.inject(["workspaceRegistry"], (registryCtx) => {
    const run = () => {
      runStartupCleanup(registryCtx).catch((error) => {
        try {
          ctx.logger?.warn?.(`session-manager: 启动清理失败（忽略）：${String(error)}`)
        } catch {
          /* 日志失败也不能抛 */
        }
      })
    }
    registryCtx.effect(() => {
      run()
      return () => {}
    }, "dsh-session-manager: startup archive cleanup")
  })

  ctx.inject(["webServer"], (webCtx) => {
    const webServer = webCtx.get("webServer")
    if (webServer === undefined) return
    const disposers = installRoutes(webServer, ctx)
    webCtx.effect(() => () => {
      for (const d of disposers) {
        try {
          d()
        } catch {
          /* 单个卸载失败不影响其余 */
        }
      }
    })
    // eslint-disable-next-line no-console
    console.log(`[session-manager] 已注册 ${disposers.length} 条会话管理路由`)
  })
}

export default { name: "session-manager", apply }
