/**
 * 归档集死 id 清理。
 *
 * 背景：`archivedSessionIds` **没有任何过滤**（对比 workspace 实体的 `sessionIds`
 * getter 会按 `sessionPath` 过滤），所以删除会话后若归档标记没被清掉，
 * 那个 id 会**永久**留在 `workspace.json` 里，重启也不会自己消失。
 *
 * 何时会残留：删除流程清标记的条件是"文件已删 **且** 记账已摘"。
 * 若记账摘除失败（或进程在中间被打断），标记会被**故意保留**——
 * 因为标记是侧栏隐藏的依据，宁可留一个无害死 id，也不要把会话重新暴露出来。
 * 这些"故意的残留"由本模块在下次启动时收拾。
 *
 * 保守原则（重要）：
 *   只在**确定**会话已消失时才清。任何不确定——包括查询抛错——
 *   一律跳过并保留。存储故障绝不能被当成"会话已删除"。
 */

/**
 * 判断一个归档 id 是否"确定已消失"。
 *
 * @param id - 待判断的会话 id
 * @param probes - 探测手段
 * @returns { "gone" | "exists" | "unknown" }
 */
export async function classifyArchivedId(id, probes) {
  const { sessionKnown, dirExists } = probes

  /*
   * 先问宿主："这个会话还已知吗？"
   * sessionKnown 覆盖 live registry + header 索引 + 持久化列表，是最权威的。
   * 抛错 => unknown（存储故障不可当作已删除）。
   */
  if (sessionKnown !== undefined) {
    try {
      if (await sessionKnown(id)) return "exists"
    } catch {
      return "unknown"
    }
  }

  /*
   * 再兜底看磁盘目录。sessionKnown 已答"不在"时，这里再确认一次；
   * 若目录仍在（例如索引未刷新），视为仍存在——保守。
   * dirExists 缺失则跳过该证据。
   */
  if (dirExists !== undefined) {
    try {
      if (await dirExists(id)) return "exists"
    } catch {
      return "unknown"
    }
  }

  /* 两条证据都没有时不敢下结论。 */
  if (sessionKnown === undefined && dirExists === undefined) return "unknown"
  return "gone"
}

/**
 * 清理归档集里指向已消失会话的 id。
 *
 * @param deps - 依赖
 * @returns {{ removed: string[], kept: string[], unknown: string[] }}
 */
export async function cleanupArchivedIds(deps) {
  const {
    archivedIds,                   // () => string[]  当前归档集
    sessionKnown,                  // async (id) => boolean
    dirExists,                     // async (id) => boolean
    unarchive,                     // async (id) => void
    logger = () => {},
  } = deps

  let ids = []
  try {
    ids = [...(archivedIds?.() ?? [])]
  } catch (error) {
    /* 读不到归档集就什么都不做——清理是尽力而为的维护，不该影响启动。 */
    logger(`session-manager: 读取归档集失败，跳过清理：${String(error)}`)
    return { removed: [], kept: [], unknown: [] }
  }

  const removed = []
  const kept = []
  const unknown = []

  for (const id of ids) {
    const verdict = await classifyArchivedId(id, { sessionKnown, dirExists })
    if (verdict === "exists") {
      kept.push(id)
      continue
    }
    if (verdict === "unknown") {
      /* 不确定就留着。 */
      unknown.push(id)
      continue
    }
    try {
      await unarchive?.(id)
      removed.push(id)
    } catch (error) {
      /* 清理失败同样不能影响启动。 */
      logger(`session-manager: 清理归档 id ${id} 失败：${String(error)}`)
      unknown.push(id)
    }
  }

  if (removed.length > 0 || unknown.length > 0) {
    logger(
      `session-manager: 归档集清理完成 —— 移除 ${removed.length} 个已消失会话，` +
        `保留 ${kept.length} 个有效、${unknown.length} 个无法确认（已保留）`,
    )
  }
  return { removed, kept, unknown }
}
