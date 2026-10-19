/**
 * 会话磁盘路径推导。
 *
 * 这里刻意逐字复刻 @deepseek-ai/dsh-session-persistence-jsonl 的内部实现：
 * 目录布局是本插件与 DSH 之间**唯一的隐式契约**，一旦推导与后端不一致，
 * 删除就会指向错误路径。因此：
 *
 *   1. 编码规则按官方源码移植（含 `.` / `..` 特例与 `~` 自身转义）；
 *   2. test/paths.test.mjs 用**本机真实存在的会话目录名**做回归断言，
 *      公式错了测试就会红，而不是等到真的删错东西。
 *
 * 布局： <root>/<projectKey(cwd)>/<encodeSegment(sessionId)>/
 * 会话目录内含 session.v4.jsonl.zstd 与 session.lock（内核写锁）。
 */
import os from "node:os"
import path from "node:path"

/** 会话目录内的写锁文件名（官方 LEASE_FILENAME）。 */
export const LEASE_FILENAME = "session.lock"

/** 当前物理格式代次；官方 SESSION_FORMAT_VERSION 为 4。 */
export const SESSION_FORMAT_VERSION = 4

/**
 * 单段路径编码：安全字符直通，其余（含 `~` 自身）转 `~XXXX`。
 * 对 `.` 与 `..` 特判，避免整段恰好构成目录穿越。
 *
 * @param raw - 待编码字符串，不可为空
 * @returns 可安全用作单个路径段的字符串
 */
export function encodeSegment(raw) {
  if (typeof raw !== "string" || raw.length === 0) {
    throw new Error("cannot encode an empty path segment")
  }
  if (raw === ".") return "~002E"
  if (raw === "..") return "~002E~002E"
  let out = ""
  for (let i = 0; i < raw.length; i += 1) {
    const code = raw.charCodeAt(i)
    const ch = String.fromCharCode(code)
    if (ch !== "~" && /^[A-Za-z0-9._-]$/.test(ch)) out += ch
    else out += "~" + code.toString(16).toUpperCase().padStart(4, "0")
  }
  return out
}

/**
 * 单段路径解码：`~XXXX` 还原为对应码元。
 *
 * 官方后端不需要它（只做单向编码），但本插件用它做**回归自检**：
 * 证明编码是双射、不丢信息，从而目录名可安全地反向确认会话身份。
 * 非法转义原样保留，不抛错——诊断路径不应因畸形输入而中断。
 *
 * @param seg - 单个路径段
 * @returns 解码后的字符串
 */
export function decodeSegment(seg) {
  if (typeof seg !== "string") throw new Error("cannot decode a non-string path segment")
  let out = ""
  for (let i = 0; i < seg.length; i += 1) {
    const ch = seg[i]
    if (ch === "~" && i + 4 < seg.length) {
      const hex = seg.slice(i + 1, i + 5)
      if (/^[0-9A-Fa-f]{4}$/.test(hex)) {
        out += String.fromCharCode(Number.parseInt(hex, 16))
        i += 4
        continue
      }
    }
    out += ch
  }
  return out
}

/**
 * 项目目录键：分隔符与盘符折叠为单个 `-`，其他不安全字符用 `~XXXX` 转义，
 * 结果以 `--` 包裹并截断到 251 字符（文件系统组件长度上限）。
 *
 * 注意：折叠与截断是**有损**的，因此绝不能反向解析；调用方必须始终由
 * header 的 cwd 正向推导，并做越界校验。
 *
 * @param cwd - 会话所属项目目录
 * @returns 单一文件系统安全的项目目录名
 */
export function projectKey(cwd) {
  if (typeof cwd !== "string" || cwd.length === 0) {
    throw new Error("cannot encode an empty project path")
  }
  let readable = ""
  let separatorRun = false
  for (let i = 0; i < cwd.length; i += 1) {
    const code = cwd.charCodeAt(i)
    const ch = String.fromCharCode(code)
    if (ch === "/" || ch === "\\" || ch === ":") {
      if (!separatorRun) readable += "-"
      separatorRun = true
    } else if (ch !== "~" && /^[A-Za-z0-9._-]$/.test(ch)) {
      readable += ch
      separatorRun = false
    } else {
      readable += "~" + code.toString(16).toUpperCase().padStart(4, "0")
      separatorRun = false
    }
  }
  return `--${(readable.replace(/^-+/, "") || "root").slice(0, 251)}--`
}

/** 会话根目录。默认 <DSH_HOME|~/.dsh>/sessions，可用 DSH_SESSION_ROOT 覆盖（测试用）。 */
export function sessionsRoot(env = process.env) {
  if (env.DSH_SESSION_ROOT) return path.resolve(env.DSH_SESSION_ROOT)
  const home = env.DSH_HOME || path.join(os.homedir(), ".dsh")
  return path.join(home, "sessions")
}

/** 投影缓存根目录。默认 <DSH_HOME|~/.dsh>/storages/session_projcache/sessions。 */
export function projectionCacheDir(env = process.env) {
  if (env.DSH_PROJCACHE_DIR) return path.resolve(env.DSH_PROJCACHE_DIR)
  const home = env.DSH_HOME || path.join(os.homedir(), ".dsh")
  return path.join(home, "storages", "session_projcache", "sessions")
}

/** cwd 缺失时后端使用的项目目录名。 */
export const NO_CWD_DIR = "_no-cwd"

/** 项目目录绝对路径。cwd 为 undefined 时落到 _no-cwd。 */
export function projectDir(root, cwd) {
  if (cwd === undefined) return path.join(root, NO_CWD_DIR)
  return path.join(root, projectKey(cwd))
}

/** 单个会话独占的目录绝对路径。 */
export function sessionDir(root, cwd, id) {
  return path.join(projectDir(root, cwd), encodeSegment(id))
}

/** 指定代次的日志文件名（version 0 无 vN 段，4 为 session.v4.jsonl.zstd）。 */
export function generationLogFilename(version, compression = "zstd") {
  const suffix = compression === "zstd" ? ".zstd" : ""
  if (version === 0) return `session.jsonl${suffix}`
  return `session.v${version}.jsonl${suffix}`
}

/** 当前代次日志文件绝对路径。 */
export function logPath(root, cwd, id, compression = "zstd") {
  return path.join(sessionDir(root, cwd, id), generationLogFilename(SESSION_FORMAT_VERSION, compression))
}

/** 投影缓存单文件绝对路径。 */
export function projectionCachePath(cacheDir, id) {
  return path.join(cacheDir, `${encodeSegment(id)}.json`)
}

/**
 * 越界防护：确认 target 确实位于 root 之内。
 *
 * 这是删除路径的最后一道闸门。projectKey 有损，若调用方传入了被污染的
 * cwd，推导结果可能逃出 root；这里在真正 rm 之前强制拒绝。
 *
 * @param root - 允许的根目录
 * @param target - 待检查的绝对路径
 * @returns target 在 root 之内时为 true
 */
export function isWithin(root, target) {
  const rel = path.relative(path.resolve(root), path.resolve(target))
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel)
}
