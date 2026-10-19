/* dsh-session-manager client bundle (esbuild) */
window.__ModuleLoader__.load({
  id: "dsh-session-manager",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// client/index.jsx
var index_exports = {};
__export(index_exports, {
  MAX_WAIT_TICKS: () => MAX_WAIT_TICKS,
  NS: () => NS,
  SECTION_ID: () => SECTION_ID,
  WAIT_TICK_MS: () => WAIT_TICK_MS,
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"), 1);
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");

// client/selection.js
function normalizeQuery(query) {
  return typeof query === "string" ? query.trim().toLowerCase() : "";
}
function matches(row, query) {
  const q = normalizeQuery(query);
  if (q === "") return true;
  const title = String(row?.title ?? "").toLowerCase();
  const cwd = String(row?.cwd ?? "").toLowerCase();
  return title.includes(q) || cwd.includes(q);
}
function filterRows(rows, query, sort = "updated-desc") {
  const hit = (rows ?? []).filter((row) => matches(row, query));
  const cmp = {
    "updated-desc": (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0) || String(a.title).localeCompare(String(b.title)),
    "title-asc": (a, b) => String(a.title).localeCompare(String(b.title)),
    "size-desc": (a, b) => (b.bytes ?? 0) - (a.bytes ?? 0) || String(a.title).localeCompare(String(b.title))
  }[sort] ?? ((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  return [...hit].sort(cmp);
}
function toggle(selected, id) {
  const next = new Set(selected);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}
function toggleAll(selected, visibleIds) {
  const next = new Set(selected);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => next.has(id));
  if (allSelected) for (const id of visibleIds) next.delete(id);
  else for (const id of visibleIds) next.add(id);
  return next;
}
function reconcile(selected, presentIds) {
  const present = new Set(presentIds);
  const next = /* @__PURE__ */ new Set();
  const dropped = [];
  for (const id of selected) {
    if (present.has(id)) next.add(id);
    else dropped.push(id);
  }
  return { selected: next, dropped };
}
function selectionState(selected, visibleIds) {
  if (visibleIds.length === 0) return "none";
  const hit = visibleIds.filter((id) => selected.has(id)).length;
  if (hit === 0) return "none";
  return hit === visibleIds.length ? "all" : "some";
}
var DEFAULT_PAGE_SIZE = 20;
function paginate(rows, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
  const list = rows ?? [];
  const total = list.length;
  const size = pageSize > 0 ? Math.floor(pageSize) : DEFAULT_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
  const start = (current - 1) * size;
  const items = list.slice(start, start + size);
  return {
    items,
    page: current,
    pageCount,
    total,
    /* 1 起的区间端，便于显示"第 1–20 项，共 137 项"。 */
    from: total === 0 ? 0 : start + 1,
    to: start + items.length
  };
}
function pageIds(page) {
  return (page?.items ?? []).map((r) => r.id);
}

// client/Sm.module.css
var Sm_default = {
  Sm_page: "Sm_Sm_page",
  Sm_heading: "Sm_Sm_heading",
  Sm_intro: "Sm_Sm_intro",
  Sm_toolbar: "Sm_Sm_toolbar",
  Sm_search: "Sm_Sm_search",
  Sm_meta: "Sm_Sm_meta",
  Sm_count: "Sm_Sm_count",
  Sm_actions: "Sm_Sm_actions",
  Sm_hint: "Sm_Sm_hint",
  Sm_notice: "Sm_Sm_notice",
  Sm_error: "Sm_Sm_error",
  Sm_empty: "Sm_Sm_empty",
  Sm_emptyTitle: "Sm_Sm_emptyTitle",
  Sm_emptyText: "Sm_Sm_emptyText",
  Sm_pager: "Sm_Sm_pager",
  Sm_pageInfo: "Sm_Sm_pageInfo",
  Sm_list: "Sm_Sm_list",
  Sm_row: "Sm_Sm_row",
  Sm_rowFailed: "Sm_Sm_rowFailed",
  Sm_rowMain: "Sm_Sm_rowMain",
  Sm_rowTitle: "Sm_Sm_rowTitle",
  Sm_rowSub: "Sm_Sm_rowSub",
  Sm_rowFail: "Sm_Sm_rowFail",
  Sm_rowTime: "Sm_Sm_rowTime",
  Sm_confirmHead: "Sm_Sm_confirmHead",
  Sm_paths: "Sm_Sm_paths",
  Sm_path: "Sm_Sm_path",
  Sm_pathGone: "Sm_Sm_pathGone",
  Sm_ack: "Sm_Sm_ack"
};

// client/index.jsx
var NS = "session-manager";
var SECTION_ID = "session-manager";
var API = {
  preview: "/api/session-manager/delete/preview",
  remove: "/api/session-manager/delete",
  archive: "/api/session-manager/archive",
  unarchive: "/api/session-manager/unarchive"
};
function cx(...names) {
  return names.filter(Boolean).join(" ");
}
var WAIT_TICK_MS = 250;
var MAX_WAIT_TICKS = 40;
var zh = {
  nav: "\u4F1A\u8BDD\u7BA1\u7406",
  title: "\u4F1A\u8BDD\u7BA1\u7406",
  intro: "\u6279\u91CF\u7BA1\u7406\u5DF2\u5F52\u6863\u7684\u4F1A\u8BDD\uFF1A\u6062\u590D\u3001\u5F52\u6863\uFF0C\u6216\u4ECE\u78C1\u76D8\u5F7B\u5E95\u5220\u9664\u3002",
  view: "\u89C6\u56FE",
  viewArchived: "\u5DF2\u5F52\u6863",
  viewAll: "\u5168\u90E8\u4F1A\u8BDD",
  search: "\u641C\u7D22\u6807\u9898\u6216\u8DEF\u5F84",
  sort: "\u6392\u5E8F",
  sortUpdated: "\u6700\u8FD1\u66F4\u65B0",
  sortTitle: "\u6807\u9898",
  sortSize: "\u5360\u7528\u7A7A\u95F4",
  selected: "\u5DF2\u9009 {n} \u9879",
  total: "\u5171 {m} \u9879",
  pagePrev: "\u4E0A\u4E00\u9875",
  pageNext: "\u4E0B\u4E00\u9875",
  pageInfo: "\u7B2C {from}\u2013{to} \u9879\uFF0C\u5171 {total} \u9879",
  pageOf: "\u7B2C {page} / {pages} \u9875",
  selectAll: "\u5168\u9009\u5F53\u524D\u5217\u8868",
  restore: "\u53D6\u6D88\u5F52\u6863",
  archive: "\u5F52\u6863",
  remove: "\u5F7B\u5E95\u5220\u9664",
  removeHint: "\u6C38\u4E45\u5220\u9664\uFF0C\u4E0D\u53EF\u64A4\u9500",
  rowRestore: "\u53D6\u6D88\u5F52\u6863\u6B64\u4F1A\u8BDD",
  emptyArchived: "\u6682\u65E0\u5DF2\u5F52\u6863\u4F1A\u8BDD",
  emptyArchivedText: "\u5728\u4FA7\u680F\u53F3\u952E\u4F1A\u8BDD\u5373\u53EF\u5F52\u6863\uFF1B\u5F52\u6863\u540E\u7684\u4F1A\u8BDD\u4F1A\u51FA\u73B0\u5728\u8FD9\u91CC\u3002",
  emptyAll: "\u6682\u65E0\u4F1A\u8BDD",
  emptyFiltered: "\u6CA1\u6709\u5339\u914D\u7684\u4F1A\u8BDD",
  emptyFilteredText: "\u6362\u4E00\u4E2A\u5173\u952E\u8BCD\u8BD5\u8BD5\u3002",
  loading: "\u6B63\u5728\u8BFB\u53D6\u4F1A\u8BDD\u2026",
  waitingServices: "\u6B63\u5728\u7B49\u5F85\u4F1A\u8BDD\u670D\u52A1\u5C31\u7EEA\u2026",
  unsupported: "\u5F53\u524D\u73AF\u5883\u4E0D\u652F\u6301\u4F1A\u8BDD\u7BA1\u7406\uFF08\u672A\u6302\u8F7D Web \u5BBF\u4E3B\u670D\u52A1\uFF09\u3002",
  untitled: "\u672A\u547D\u540D\u4F1A\u8BDD",
  busy: "\u5904\u7406\u4E2D\u2026",
  confirmTitle: "\u5F7B\u5E95\u5220\u9664 {n} \u4E2A\u4F1A\u8BDD\uFF1F",
  confirmDesc: "\u4EE5\u4E0B\u4F1A\u8BDD\u7684\u65E5\u5FD7\u6587\u4EF6\u5C06\u4ECE\u78C1\u76D8\u6C38\u4E45\u5220\u9664\uFF0C\u6B64\u64CD\u4F5C\u4E0D\u53EF\u6062\u590D\u3002\u5220\u9664\u524D\u4F1A\u5148\u5F52\u6863\uFF08\u5373\u4ECE\u4FA7\u680F\u9690\u85CF\uFF09\uFF0C\u56E0\u6B64\u5B8C\u6210\u540E\u5217\u8868\u4E0E\u4FA7\u680F\u90FD\u4F1A\u7ACB\u5373\u4E0D\u518D\u663E\u793A\u5B83\u4EEC\u3002",
  confirmPaths: "\u5C06\u88AB\u5220\u9664\u7684\u8DEF\u5F84",
  confirmAck: "\u6211\u5DF2\u77E5\u6653\u6B64\u64CD\u4F5C\u4E0D\u53EF\u6062\u590D",
  confirmCancel: "\u53D6\u6D88",
  confirmDelete: "\u6C38\u4E45\u5220\u9664",
  previewing: "\u6B63\u5728\u8BA1\u7B97\u5220\u9664\u8DEF\u5F84\u2026",
  noPaths: "\uFF08\u8FD9\u4E9B\u4F1A\u8BDD\u5728\u78C1\u76D8\u4E0A\u5DF2\u65E0\u5BF9\u5E94\u6587\u4EF6\uFF0C\u4EC5\u6E05\u7406\u8BB0\u8D26\uFF09",
  resultOk: "\u5DF2\u5B8C\u6210\uFF1A\u6210\u529F {ok} \u9879",
  resultPartial: "\u5B8C\u6210\uFF1A\u6210\u529F {ok} \u9879\uFF0C\u5931\u8D25 {failed} \u9879",
  failActive: "\u4F1A\u8BDD\u6B63\u5728\u8FD0\u884C",
  failLocked: "\u4F1A\u8BDD\u6301\u6709\u5199\u9501",
  failNotFound: "\u78C1\u76D8\u4E0A\u5DF2\u65E0\u5BF9\u5E94\u8BB0\u5F55",
  failEscaped: "\u8DEF\u5F84\u8D8A\u754C\uFF0C\u5DF2\u62D2\u7EDD\u5220\u9664",
  failFailed: "\u64CD\u4F5C\u5931\u8D25",
  refreshUnavailable: "\u64CD\u4F5C\u5DF2\u751F\u6548\uFF0C\u4F46\u65E0\u6CD5\u5237\u65B0\u4F1A\u8BDD\u76EE\u5F55\uFF08sessions \u670D\u52A1\u4E0D\u53EF\u7528\uFF09\u3002\u8BF7\u91CD\u65B0\u8FDE\u63A5\u6216\u5237\u65B0\u9875\u9762\u4EE5\u540C\u6B65\u4FA7\u680F\u3002",
  refreshFailed: "\u64CD\u4F5C\u5DF2\u751F\u6548\uFF0C\u4F46\u5237\u65B0\u4F1A\u8BDD\u76EE\u5F55\u5931\u8D25",
  stopAndArchive: "\u505C\u6B62\u5E76\u5F52\u6863",
  stopAndArchiveDesc: "\u6709 {n} \u4E2A\u4F1A\u8BDD\u6B63\u5728\u8FD0\u884C\u3002\u5F52\u6863\u4F1A\u5148\u505C\u6B62\u5B83\u4EEC\u7684\u5DE5\u4F5C\u3002",
  timeNow: "\u521A\u521A",
  timeMinutes: "{n} \u5206\u949F\u524D",
  timeHours: "{n} \u5C0F\u65F6\u524D",
  timeDays: "{n} \u5929\u524D"
};
var en = {
  nav: "Sessions",
  title: "Session management",
  intro: "Batch-manage archived sessions: restore, archive, or permanently delete them from disk.",
  view: "View",
  viewArchived: "Archived",
  viewAll: "All sessions",
  search: "Search title or path",
  sort: "Sort",
  sortUpdated: "Recently updated",
  sortTitle: "Title",
  sortSize: "Size",
  selected: "{n} selected",
  total: "{m} total",
  pagePrev: "Previous",
  pageNext: "Next",
  pageInfo: "{from}\u2013{to} of {total}",
  pageOf: "Page {page} / {pages}",
  selectAll: "Select all in list",
  restore: "Unarchive",
  archive: "Archive",
  remove: "Delete permanently",
  removeHint: "Permanent, irreversible",
  rowRestore: "Unarchive this session",
  emptyArchived: "No archived sessions",
  emptyArchivedText: "Archive a session from the sidebar context menu and it will appear here.",
  emptyAll: "No sessions",
  emptyFiltered: "No matching sessions",
  emptyFilteredText: "Try a different keyword.",
  loading: "Loading sessions\u2026",
  waitingServices: "Waiting for session services\u2026",
  unsupported: "Session management is unavailable in this environment (no Web host service).",
  untitled: "Untitled session",
  busy: "Working\u2026",
  confirmTitle: "Permanently delete {n} sessions?",
  confirmDesc: "The log files of the following sessions will be permanently removed from disk. This cannot be undone. They are archived first (hidden from the sidebar), so both this list and the sidebar stop showing them immediately afterwards.",
  confirmPaths: "Paths to be deleted",
  confirmAck: "I understand this cannot be undone",
  confirmCancel: "Cancel",
  confirmDelete: "Delete permanently",
  previewing: "Computing paths\u2026",
  noPaths: "(No files remain on disk for these sessions; only bookkeeping is cleaned.)",
  resultOk: "Done: {ok} succeeded",
  resultPartial: "Done: {ok} succeeded, {failed} failed",
  failActive: "session is running",
  failLocked: "session holds a write lock",
  failNotFound: "no record left on disk",
  failEscaped: "path escaped root, refused",
  failFailed: "operation failed",
  refreshUnavailable: "The change took effect, but the session catalog could not be refreshed (sessions service unavailable). Reconnect or reload to sync the sidebar.",
  refreshFailed: "The change took effect, but refreshing the session catalog failed",
  stopAndArchive: "Stop and archive",
  stopAndArchiveDesc: "{n} sessions are running. Archiving stops their work first.",
  timeNow: "just now",
  timeMinutes: "{n} min ago",
  timeHours: "{n} h ago",
  timeDays: "{n} d ago"
};
function format(text, vars) {
  return String(text).replace(/\{(\w+)\}/g, (_, k) => vars?.[k] === void 0 ? "" : String(vars[k]));
}
async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`\u54CD\u5E94\u89E3\u6790\u5931\u8D25\uFF08HTTP ${res.status}\uFF09`);
  }
  if (data?.ok === false) throw new Error(data.error ?? "\u64CD\u4F5C\u5931\u8D25");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return data;
}
function relativeTime(ms, t) {
  if (typeof ms !== "number" || ms <= 0) return "";
  const delta = Date.now() - ms;
  const min = 6e4;
  const hour = 60 * min;
  const day = 24 * hour;
  if (delta < min) return t("timeNow");
  if (delta < hour) return format(t("timeMinutes"), { n: Math.floor(delta / min) });
  if (delta < day) return format(t("timeHours"), { n: Math.floor(delta / hour) });
  if (delta < 30 * day) return format(t("timeDays"), { n: Math.floor(delta / day) });
  return new Date(ms).toLocaleDateString();
}
function failureText(code, t) {
  if (code === "active") return t("failActive");
  if (code === "locked") return t("failLocked");
  if (code === "not-found") return t("failNotFound");
  if (code === "escaped-root") return t("failEscaped");
  return t("failFailed");
}
function buildRows(sessionList, archivedIds, workspaceItems) {
  const archived = archivedIds instanceof Set ? archivedIds : new Set(archivedIds ?? []);
  const cwdBySession = /* @__PURE__ */ new Map();
  for (const ws of workspaceItems ?? []) {
    for (const id of ws.sessionIds ?? []) cwdBySession.set(id, ws.path);
  }
  const rows = [];
  for (const id of sessionList?.ids ?? []) {
    const summary = sessionList.byId?.[id];
    if (summary === void 0) continue;
    rows.push({
      id,
      title: summary.displayTitle || summary.title || null,
      cwd: summary.cwd ?? cwdBySession.get(id) ?? "",
      updatedAt: summary.updatedAt ?? 0,
      bytes: 0,
      running: summary.running === true,
      archived: archived.has(id),
      parentId: summary.parentId
    });
  }
  return rows;
}
function useStoreValue(store) {
  const subscribe = (0, import_react.useCallback)(
    (cb) => store?.subscribe ? store.subscribe(cb) : () => {
    },
    [store]
  );
  const get = (0, import_react.useCallback)(() => store?.getSnapshot ? store.getSnapshot() : store?.state, [store]);
  return (0, import_react.useSyncExternalStore)(subscribe, get, get);
}
function SessionManagerSection(props) {
  const { t, hooks, resolveServices } = props;
  const services = resolveServices?.() ?? {};
  const sessionsService = services.sessions ?? props.sessionsService;
  const sessionStore = hooks?.sessions ?? sessionsService?.list;
  const workspaceStore = hooks?.workspaces ?? services.workspaces?.list;
  const sessionList = useStoreValue(sessionStore);
  const workspaceSnapshot = useStoreValue(workspaceStore);
  const supported = sessionStore !== void 0 && workspaceStore !== void 0;
  const [view, setView] = (0, import_react.useState)("archived");
  const [query, setQuery] = (0, import_react.useState)("");
  const [sort, setSort] = (0, import_react.useState)("updated-desc");
  const [selected, setSelected] = (0, import_react.useState)(() => /* @__PURE__ */ new Set());
  const [busy, setBusy] = (0, import_react.useState)(false);
  const [toast, setToast] = (0, import_react.useState)(null);
  const [error, setError] = (0, import_react.useState)(null);
  const [failures, setFailures] = (0, import_react.useState)(() => /* @__PURE__ */ new Map());
  const [confirmOpen, setConfirmOpen] = (0, import_react.useState)(false);
  const [confirmed, setConfirmed] = (0, import_react.useState)(false);
  const [preview, setPreview] = (0, import_react.useState)(null);
  const [previewing, setPreviewing] = (0, import_react.useState)(false);
  const [activePrompt, setActivePrompt] = (0, import_react.useState)(null);
  const seq = (0, import_react.useRef)(0);
  const notify = (0, import_react.useCallback)((next) => {
    seq.current += 1;
    setToast({ ...next, seq: seq.current });
  }, []);
  const refreshCatalog = (0, import_react.useCallback)(async () => {
    const live = resolveServices?.() ?? {};
    const svc = live.sessions ?? sessionsService;
    if (svc?.refresh === void 0) {
      setError(t("refreshUnavailable"));
      return;
    }
    try {
      await svc.refresh();
    } catch (e) {
      setError(`${t("refreshFailed")}\uFF1A${e instanceof Error ? e.message : String(e)}`);
    }
  }, [resolveServices, sessionsService, t]);
  const archivedIds = (0, import_react.useMemo)(
    () => new Set(workspaceSnapshot?.archivedSessionIds ?? []),
    [workspaceSnapshot]
  );
  const allRows = (0, import_react.useMemo)(
    () => buildRows(sessionList, archivedIds, workspaceSnapshot?.items),
    [sessionList, archivedIds, workspaceSnapshot]
  );
  const rows = (0, import_react.useMemo)(() => {
    const scoped = view === "archived" ? allRows.filter((r) => r.archived) : allRows;
    return filterRows(scoped, query, sort);
  }, [allRows, view, query, sort]);
  const [page, setPage] = (0, import_react.useState)(1);
  const [pageSize, setPageSize] = (0, import_react.useState)(DEFAULT_PAGE_SIZE);
  const paged = (0, import_react.useMemo)(() => paginate(rows, page, pageSize), [rows, page, pageSize]);
  const visibleIds = (0, import_react.useMemo)(() => pageIds(paged), [paged]);
  (0, import_react.useEffect)(() => {
    if (page !== paged.page) setPage(paged.page);
  }, [page, paged.page]);
  (0, import_react.useEffect)(() => {
    setPage(1);
  }, [view, query, sort, pageSize]);
  (0, import_react.useEffect)(() => {
    const present = allRows.map((r) => r.id);
    setSelected((prev) => {
      const { selected: next, dropped } = reconcile(prev, present);
      return dropped.length === 0 && next.size === prev.size ? prev : next;
    });
  }, [allRows]);
  const checkState = selectionState(selected, visibleIds);
  const hasSelection = selected.size > 0;
  const loading = sessionList?.phase === void 0 || sessionList?.phase === "pending";
  const afterBatch = (0, import_react.useCallback)(
    (result) => {
      if (result?.ok === false && result?.error !== void 0 && result?.items === void 0) {
        setError(String(result.error));
        return;
      }
      const items = result?.items ?? [];
      const okCount = items.filter((i) => i.ok).length;
      const bad = items.filter((i) => !i.ok);
      const next = /* @__PURE__ */ new Map();
      for (const item of bad) next.set(item.id, item.code ?? "failed");
      setFailures(next);
      setSelected(() => new Set(bad.map((i) => i.id)));
      notify(
        bad.length === 0 ? { text: format(t("resultOk"), { ok: okCount }), tone: "success" } : {
          text: format(t("resultPartial"), { ok: okCount, failed: bad.length }),
          icon: import_react.default.createElement(import_dsh_client_ui_primitives.IconWarningOutlineRegular, { size: 16 }),
          holdMs: 6e3
        }
      );
    },
    [notify, t]
  );
  const runUnarchive = (0, import_react.useCallback)(async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      afterBatch(await postJson(API.unarchive, { ids }));
      await refreshCatalog();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [selected, afterBatch, refreshCatalog]);
  const runArchive = (0, import_react.useCallback)(
    async (stopActivity = false) => {
      const ids = [...selected];
      if (ids.length === 0) return;
      setBusy(true);
      setError(null);
      try {
        const result = await postJson(API.archive, { ids, stopActivity });
        const refusals = (result?.items ?? []).filter((i) => !i.ok && i.code === "active");
        if (refusals.length > 0 && !stopActivity) {
          setActivePrompt(refusals.map((i) => i.id));
          return;
        }
        afterBatch(result);
        await refreshCatalog();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [selected, afterBatch]
  );
  const openConfirm = (0, import_react.useCallback)(async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    setConfirmed(false);
    setPreview(null);
    setPreviewing(true);
    setConfirmOpen(true);
    try {
      const result = await postJson(API.preview, { ids });
      setPreview(result?.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setConfirmOpen(false);
      setConfirmed(false);
      setPreview(null);
    } finally {
      setPreviewing(false);
    }
  }, [selected]);
  const runDelete = (0, import_react.useCallback)(async () => {
    const ids = [...selected];
    if (ids.length === 0 || !confirmed) return;
    setBusy(true);
    setError(null);
    try {
      afterBatch(await postJson(API.remove, { ids }));
      await refreshCatalog();
      setConfirmOpen(false);
      setConfirmed(false);
      setPreview(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [selected, confirmed, afterBatch, refreshCatalog]);
  const rowRestore = (0, import_react.useCallback)(
    async (id) => {
      setBusy(true);
      setError(null);
      try {
        afterBatch(await postJson(API.unarchive, { ids: [id] }));
        await refreshCatalog();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [afterBatch, refreshCatalog]
  );
  const [waited, setWaited] = (0, import_react.useState)(0);
  (0, import_react.useEffect)(() => {
    if (supported) return void 0;
    const timer = setInterval(() => {
      setWaited((n) => {
        if (n + 1 >= MAX_WAIT_TICKS) clearInterval(timer);
        return Math.min(n + 1, MAX_WAIT_TICKS);
      });
    }, WAIT_TICK_MS);
    return () => clearInterval(timer);
  }, [supported]);
  if (!supported) {
    const giveUp = waited >= MAX_WAIT_TICKS;
    return import_react.default.createElement(
      "div",
      { className: Sm_default.Sm_page },
      import_react.default.createElement(
        "p",
        { className: Sm_default.Sm_notice, role: "status" },
        giveUp ? t("unsupported") : t("waitingServices")
      )
    );
  }
  const viewOptions = [
    { value: "archived", label: t("viewArchived") },
    { value: "all", label: t("viewAll") }
  ];
  const sortOptions = [
    { value: "updated-desc", label: t("sortUpdated") },
    { value: "title-asc", label: t("sortTitle") },
    { value: "size-desc", label: t("sortSize") }
  ];
  const previewItems = preview ?? [];
  const anyPathExists = previewItems.some((p) => p.exists === true);
  return import_react.default.createElement(
    "div",
    { className: Sm_default.Sm_page },
    import_react.default.createElement("h1", { className: Sm_default.Sm_heading }, t("title")),
    import_react.default.createElement("p", { className: Sm_default.Sm_intro }, t("intro")),
    error !== null && import_react.default.createElement(
      "p",
      { className: Sm_default.Sm_error, role: "alert" },
      error,
      import_react.default.createElement(import_dsh_client_ui_primitives.Button, { size: "sm", onClick: () => setError(null) }, t("confirmCancel"))
    ),
    import_react.default.createElement(
      "div",
      { className: Sm_default.Sm_toolbar },
      import_react.default.createElement(import_dsh_client_ui_primitives.SegmentedControl, {
        id: "sm-view",
        value: view,
        options: viewOptions,
        onChange: setView,
        label: t("view")
      }),
      import_react.default.createElement(import_dsh_client_ui_primitives.Input, {
        icon: import_react.default.createElement(import_dsh_client_ui_primitives.IconSearchOutlineMedium, { size: 16 }),
        placeholder: t("search"),
        value: query,
        "aria-label": t("search"),
        onChange: (e) => setQuery(e.target.value),
        className: Sm_default.Sm_search
      }),
      import_react.default.createElement(import_dsh_client_ui_primitives.SegmentedControl, {
        id: "sm-sort",
        value: sort,
        options: sortOptions,
        onChange: setSort,
        label: t("sort")
      })
    ),
    import_react.default.createElement(
      "div",
      { className: Sm_default.Sm_meta },
      import_react.default.createElement(import_dsh_client_ui_primitives.Checkbox, {
        checked: checkState === "all",
        onChange: () => setSelected((prev) => toggleAll(prev, visibleIds)),
        label: t("selectAll"),
        disabled: visibleIds.length === 0,
        title: t("selectAll")
      }),
      import_react.default.createElement("span", { className: Sm_default.Sm_count }, format(t("selected"), { n: selected.size })),
      import_react.default.createElement("span", { className: Sm_default.Sm_count }, format(t("total"), { m: rows.length }))
    ),
    import_react.default.createElement(
      "div",
      { className: Sm_default.Sm_actions },
      import_react.default.createElement(
        import_dsh_client_ui_primitives.Button,
        {
          variant: "primary",
          size: "sm",
          icon: import_react.default.createElement(import_dsh_client_ui_primitives.IconUnarchiveOutlineMedium, { size: 16 }),
          disabled: !hasSelection || busy || view !== "archived",
          onClick: runUnarchive
        },
        t("restore")
      ),
      import_react.default.createElement(
        import_dsh_client_ui_primitives.Button,
        {
          size: "sm",
          icon: import_react.default.createElement(import_dsh_client_ui_primitives.IconArchiveOutlineMedium, { size: 16 }),
          disabled: !hasSelection || busy || view !== "all",
          onClick: () => runArchive(false)
        },
        t("archive")
      ),
      import_react.default.createElement(
        import_dsh_client_ui_primitives.Button,
        {
          variant: "danger",
          size: "sm",
          icon: import_react.default.createElement(import_dsh_client_ui_primitives.IconTrashOutlineMedium, { size: 16 }),
          disabled: !hasSelection || busy,
          onClick: openConfirm
        },
        t("remove")
      ),
      import_react.default.createElement("span", { className: Sm_default.Sm_hint }, t("removeHint"))
    ),
    loading ? import_react.default.createElement("p", { className: Sm_default.Sm_notice, role: "status" }, t("loading")) : rows.length === 0 ? import_react.default.createElement(
      "div",
      { className: Sm_default.Sm_empty, role: "status" },
      import_react.default.createElement(
        "p",
        { className: Sm_default.Sm_emptyTitle },
        query === "" ? view === "archived" ? t("emptyArchived") : t("emptyAll") : t("emptyFiltered")
      ),
      import_react.default.createElement(
        "p",
        { className: Sm_default.Sm_emptyText },
        query === "" ? view === "archived" ? t("emptyArchivedText") : "" : t("emptyFilteredText")
      )
    ) : import_react.default.createElement(
      "ul",
      { className: Sm_default.Sm_list },
      paged.items.map(
        (row) => import_react.default.createElement(
          "li",
          {
            key: row.id,
            className: failures.has(row.id) ? cx(Sm_default.Sm_row, Sm_default.Sm_rowFailed) : Sm_default.Sm_row
          },
          import_react.default.createElement(import_dsh_client_ui_primitives.Checkbox, {
            checked: selected.has(row.id),
            onChange: () => setSelected((prev) => toggle(prev, row.id)),
            label: "",
            title: row.title ?? t("untitled")
          }),
          import_react.default.createElement(
            "div",
            { className: Sm_default.Sm_rowMain },
            import_react.default.createElement(
              "span",
              { className: Sm_default.Sm_rowTitle, title: row.title ?? row.id },
              row.title ?? t("untitled")
            ),
            import_react.default.createElement(
              "span",
              { className: Sm_default.Sm_rowSub, title: row.cwd },
              row.cwd || row.id
            ),
            failures.has(row.id) && import_react.default.createElement(
              "span",
              { className: Sm_default.Sm_rowFail },
              failureText(failures.get(row.id), t)
            )
          ),
          row.running && import_react.default.createElement(import_dsh_client_ui_primitives.Tag, { tone: "outline" }, t("failActive")),
          row.archived && import_react.default.createElement(import_dsh_client_ui_primitives.Tag, { tone: "outline" }, t("viewArchived")),
          import_react.default.createElement("span", { className: Sm_default.Sm_rowTime }, relativeTime(row.updatedAt, t)),
          row.archived && import_react.default.createElement(import_dsh_client_ui_primitives.Button, {
            size: "sm",
            "aria-label": t("rowRestore"),
            title: t("rowRestore"),
            disabled: busy,
            icon: import_react.default.createElement(import_dsh_client_ui_primitives.IconUnarchiveOutlineMedium, { size: 16 }),
            onClick: () => rowRestore(row.id)
          })
        )
      )
    ),
    /*
     * 分页条：仅在超过一页时出现，避免少量会话时白占一行。
     * 显示"第 a–b 项，共 N 项"，让用户始终知道自己在全量中的位置。
     */
    !loading && paged.pageCount > 1 && import_react.default.createElement(
      "div",
      { className: Sm_default.Sm_pager },
      import_react.default.createElement(
        import_dsh_client_ui_primitives.Button,
        {
          size: "sm",
          disabled: paged.page <= 1 || busy,
          onClick: () => setPage((p) => Math.max(1, p - 1))
        },
        t("pagePrev")
      ),
      import_react.default.createElement(
        "span",
        { className: Sm_default.Sm_pageInfo },
        format(t("pageInfo"), { from: paged.from, to: paged.to, total: paged.total })
      ),
      import_react.default.createElement(
        import_dsh_client_ui_primitives.Button,
        {
          size: "sm",
          disabled: paged.page >= paged.pageCount || busy,
          onClick: () => setPage((p) => Math.min(paged.pageCount, p + 1))
        },
        t("pageNext")
      ),
      import_react.default.createElement(
        "span",
        { className: Sm_default.Sm_pageInfo },
        format(t("pageOf"), { page: paged.page, pages: paged.pageCount })
      )
    ),
    import_react.default.createElement(import_dsh_client_ui_primitives.Modal, {
      open: confirmOpen,
      onClose: () => {
        if (!busy) setConfirmOpen(false);
      },
      title: format(t("confirmTitle"), { n: selected.size }),
      closeLabel: t("confirmCancel"),
      description: t("confirmDesc"),
      footer: [
        import_react.default.createElement(
          import_dsh_client_ui_primitives.Button,
          { key: "cancel", size: "sm", disabled: busy, onClick: () => setConfirmOpen(false) },
          t("confirmCancel")
        ),
        import_react.default.createElement(
          import_dsh_client_ui_primitives.Button,
          {
            key: "go",
            variant: "danger",
            size: "sm",
            disabled: busy || !confirmed || previewing,
            onClick: runDelete
          },
          busy ? t("busy") : t("confirmDelete")
        )
      ],
      children: [
        import_react.default.createElement("p", { key: "h", className: Sm_default.Sm_confirmHead }, t("confirmPaths")),
        previewing ? import_react.default.createElement(
          "p",
          { key: "p", className: Sm_default.Sm_notice, role: "status" },
          t("previewing")
        ) : import_react.default.createElement(
          "ul",
          { key: "l", className: Sm_default.Sm_paths },
          previewItems.filter((p) => p.path !== void 0).map(
            (p) => import_react.default.createElement(
              "li",
              {
                key: p.id,
                className: p.exists ? Sm_default.Sm_path : cx(Sm_default.Sm_path, Sm_default.Sm_pathGone)
              },
              p.path
            )
          )
        ),
        !previewing && !anyPathExists && import_react.default.createElement("p", { key: "n", className: Sm_default.Sm_notice }, t("noPaths")),
        import_react.default.createElement(
          "label",
          { key: "ack", className: Sm_default.Sm_ack },
          import_react.default.createElement("input", {
            type: "checkbox",
            checked: confirmed,
            onChange: (e) => setConfirmed(e.target.checked)
          }),
          import_react.default.createElement("span", null, t("confirmAck"))
        )
      ]
    }),
    import_react.default.createElement(import_dsh_client_ui_primitives.Modal, {
      open: activePrompt !== null,
      onClose: () => setActivePrompt(null),
      title: t("archive"),
      closeLabel: t("confirmCancel"),
      description: format(t("stopAndArchiveDesc"), { n: activePrompt?.length ?? 0 }),
      footer: [
        import_react.default.createElement(
          import_dsh_client_ui_primitives.Button,
          { key: "c", size: "sm", onClick: () => setActivePrompt(null) },
          t("confirmCancel")
        ),
        import_react.default.createElement(
          import_dsh_client_ui_primitives.Button,
          {
            key: "s",
            variant: "primary",
            size: "sm",
            onClick: () => {
              setActivePrompt(null);
              runArchive(true);
            }
          },
          t("stopAndArchive")
        )
      ],
      children: null
    }),
    toast !== null && import_react.default.createElement(import_dsh_client_ui_primitives.Toast, {
      text: toast.text,
      tone: toast.tone,
      icon: toast.icon,
      holdMs: toast.holdMs,
      onDone: () => setToast(null),
      key: `sm-toast-${String(toast.seq)}`
    })
  );
}
var inject = ["slots", "workspaces", "sessions", "locale"];
function apply(ctx) {
  const locale = ctx.locale ?? ctx.get("locale");
  if (locale !== void 0 && locale.register !== void 0) {
    ctx.effect(() => locale.register(NS, { zh, en }), "dsh-session-manager: dictionaries");
  }
  const t = (key) => {
    if (locale === void 0 || locale.bind === void 0) return zh[key] ?? key;
    try {
      return locale.bind(NS)(key);
    } catch {
      return zh[key] ?? key;
    }
  };
  const services = () => ({
    sessions: ctx.get("sessions") ?? void 0,
    workspaces: ctx.get("workspaces") ?? void 0
  });
  ctx.slots.inject(
    "settings.section",
    () => ctx.slots.register(
      {
        name: "settings.section",
        id: SECTION_ID,
        order: 25,
        /* label 必须是 thunk：导航每次投影时重读，切语言即跟随。 */
        label: () => t("nav"),
        locale: NS,
        inject: () => {
          const { sessions, workspaces } = services();
          return {
            hooks: {
              sessions: sessions?.list,
              workspaces: workspaces?.list
            },
            /* 完整服务对象：refresh() 挂在服务上，不在 list 快照源上。 */
            sessionsService: sessions,
            /* 供页面在每次渲染时重新解析，处理"provider 晚于 apply"的情形。 */
            resolveServices: services
          };
        }
      },
      SessionManagerSection
    )
  );
}
var __cssTagId = "dsh-session-manager/Sm.module.css";
if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(__cssTagId) + "]") === null) {
  var __styleTag = document.createElement("style");
  __styleTag.dataset.plugin = "dsh-session-manager";
  __styleTag.dataset.pluginCss = __cssTagId;
  __styleTag.textContent = "/* client/Sm.module.css */\n.Sm_Sm_page {\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n  max-width: 760px;\n  color: var(--dsw-alias-label-primary);\n}\n.Sm_Sm_heading {\n  margin: 0;\n  font-size: 18px;\n  font-weight: 600;\n  line-height: 26px;\n}\n.Sm_Sm_intro {\n  margin: 0;\n  font-size: 13px;\n  line-height: 20px;\n  color: var(--dsw-alias-label-tertiary);\n}\n.Sm_Sm_toolbar {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 8px 12px;\n}\n.Sm_Sm_search {\n  flex: 1 1 200px;\n  min-width: 0;\n  max-width: 280px;\n}\n.Sm_Sm_meta {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 8px 14px;\n  min-height: 24px;\n}\n.Sm_Sm_count {\n  font-size: 12px;\n  line-height: 18px;\n  color: var(--dsw-alias-label-tertiary);\n  font-variant-numeric: tabular-nums;\n}\n.Sm_Sm_actions {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 8px;\n  padding: 10px 0;\n  border-top: 0.5px solid var(--dsw-alias-border-l2);\n  border-bottom: 0.5px solid var(--dsw-alias-border-l2);\n}\n.Sm_Sm_hint {\n  font-size: 12px;\n  line-height: 18px;\n  color: var(--dsw-alias-label-caption);\n}\n.Sm_Sm_notice {\n  margin: 0;\n  font-size: 13px;\n  line-height: 20px;\n  color: var(--dsw-alias-label-tertiary);\n}\n.Sm_Sm_error {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  margin: 0;\n  padding: 8px 12px;\n  border-radius: var(--dsw-radius-sm);\n  font-size: 12px;\n  line-height: 20px;\n  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent);\n  color: var(--dsw-alias-state-error-primary);\n}\n.Sm_Sm_empty {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  padding: 40px 20px;\n  text-align: center;\n}\n.Sm_Sm_emptyTitle {\n  margin: 0 0 6px;\n  font-size: 14px;\n  font-weight: 500;\n  line-height: 22px;\n  color: var(--dsw-alias-label-secondary);\n}\n.Sm_Sm_emptyText {\n  margin: 0;\n  max-width: 420px;\n  font-size: 13px;\n  line-height: 20px;\n  color: var(--dsw-alias-label-tertiary);\n}\n.Sm_Sm_pager {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  justify-content: center;\n  gap: 8px 12px;\n  padding-top: 12px;\n  margin-top: 4px;\n  border-top: 0.5px solid var(--dsw-alias-border-l2);\n}\n.Sm_Sm_pageInfo {\n  font-size: 12px;\n  line-height: 18px;\n  color: var(--dsw-alias-label-tertiary);\n  font-variant-numeric: tabular-nums;\n}\n.Sm_Sm_list {\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n  margin: 0;\n  padding: 0;\n  list-style: none;\n}\n.Sm_Sm_row {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  min-width: 0;\n  min-height: 44px;\n  padding: 4px 8px;\n  border-radius: var(--dsw-radius-sm);\n}\n.Sm_Sm_row:hover {\n  background: var(--dsw-alias-interactive-bg-hover);\n}\n.Sm_Sm_rowFailed {\n  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent);\n}\n.Sm_Sm_rowMain {\n  display: flex;\n  flex-direction: column;\n  gap: 1px;\n  flex: 1;\n  min-width: 0;\n}\n.Sm_Sm_rowTitle {\n  font-size: 13px;\n  line-height: 20px;\n  color: var(--dsw-alias-label-primary);\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.Sm_Sm_rowSub {\n  font-size: 12px;\n  line-height: 18px;\n  color: var(--dsw-alias-label-tertiary);\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.Sm_Sm_rowFail {\n  font-size: 12px;\n  line-height: 18px;\n  color: var(--dsw-alias-state-error-primary);\n}\n.Sm_Sm_rowTime {\n  flex: none;\n  font-size: 12px;\n  line-height: 18px;\n  color: var(--dsw-alias-label-tertiary);\n  font-variant-numeric: tabular-nums;\n}\n.Sm_Sm_confirmHead {\n  margin: 0 0 6px;\n  font-size: 12px;\n  font-weight: 500;\n  line-height: 18px;\n  color: var(--dsw-alias-label-secondary);\n}\n.Sm_Sm_paths {\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n  margin: 0 0 10px;\n  padding: 8px 10px;\n  max-height: 180px;\n  overflow: auto;\n  border: 0.5px solid var(--dsw-alias-border-l4);\n  border-radius: var(--dsw-radius-sm);\n  background: var(--dsw-alias-bg-layer-1);\n  list-style: none;\n}\n.Sm_Sm_path {\n  font-size: 12px;\n  line-height: 18px;\n  color: var(--dsw-alias-label-secondary);\n  word-break: break-all;\n}\n.Sm_Sm_pathGone {\n  color: var(--dsw-alias-label-caption);\n  text-decoration: line-through;\n}\n.Sm_Sm_ack {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  font-size: 13px;\n  line-height: 20px;\n  color: var(--dsw-alias-label-primary);\n  cursor: pointer;\n}\n.Sm_Sm_ack input {\n  flex: none;\n}\n@media (prefers-reduced-motion: reduce) {\n  .Sm_Sm_row {\n    transition: none;\n  }\n}\n\n/* .build-tmp/entry.css */\n";
  document.head.appendChild(__styleTag);
}

    return module.exports;
  }
});
