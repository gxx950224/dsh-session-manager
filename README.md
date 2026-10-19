# dsh-session-manager

DSH 插件：在 **设置 →「会话管理」** 中批量管理已归档会话——批量取消归档、批量归档，
以及**从磁盘彻底删除会话**（含日志文件）。

> ⚠️ **删除是不可逆的。** DSH 本身不提供删除会话的能力，本插件以宿主文件操作实现，
> 属于超出官方保证范围的行为。使用前请读完本文件，尤其是「安全设计」与「风险」两节。

## 功能

**设置页签** — 在 `settings.section` 槽位注册「会话管理」，与「通用」「插件」并列。

**列表与筛选**
- 两个视图：**已归档**（默认）/ **全部会话**
- 搜索：标题或路径，大小写不敏感
- 排序：最近更新 / 标题 / 占用空间
- **分页**：每页 20 条，超过一页时出现分页条并显示「第 a–b 项，共 N 项」
- 全选当前页（三态复选框）

> **分页与「全选」的关系（重要）**：全选只作用于**当前页**，不会选中看不见的会话。
> 若全选作用在未分页的全量上，用户在第 1 页点全选就会连带选中第 7 页的条目，
> 批量删除时会删掉从未看见过的会话——这正是分页引入后最危险的点，已由测试钉死。
> 批量操作作用于选中集合（已由 `reconcile` 收敛），与翻页无关。
>
> 页码一律**收敛到合法范围**：筛选后数据变少不会停在空白页；切换视图/搜索/排序会回到第 1 页。

**批量操作**
- **取消归档**（恢复）：从归档集移除，会话回到侧栏原位置
- **归档**：对「全部会话」视图中的选中项归档；若会话正在运行，弹窗询问是否停止后归档
- **彻底删除**：删除会话目录、投影缓存、workspace 记账

**单条操作** — 每行提供「取消归档」图标按钮，无需先勾选。

**结果回执** — 逐条结果反馈；成功汇总为提示，失败项在列表内标红并说明原因，
且**失败项保持选中**，便于重试。绝不静默吞掉失败。

## 安装

### 方式一：GUI（推荐）

**设置 → 插件 → 添加插件**，填入包名或本地路径。

本包声明了 `dsh.bundle.patch`（指向自带的 `cordis.patch.yml`），安装器能把它作为
profile layer 正确挂载——Loader 行由包自己提供，**无需手工编辑 profile**。

### 方式二：命令行

```bash
# 本地目录必须用 file: URL，不要用相对路径
dsh plugin --profile desktop add "file:C:/path/to/dsh-session-manager"
```

> **踩坑记录**：不要传相对路径或裸 `link:` 前缀。
> 一次实测中 `add "<本地目录>"` 被 pnpm 解析成 `link:/`，它把**源目录当成依赖去链接
> 并清空了源目录内容**。用 `file:` + 绝对路径可避免。

### 方式三：手工挂载

```bash
# 1. 备份
cp ~/.dsh/profiles/desktop/{package.json,pnpm-lock.yaml,cordis.patch.yml} ~/.dsh/profiles/desktop/.backup/
# 2. 在 profile 的 package.json 加依赖
# 3. pnpm install
# 4. 若无插件管理器代劳，在 cordis.patch.yml 追加：
#    - insert:
#        - id: dsh-session-manager
#          name: 'dsh-session-manager'
```

> **行名必须是裸包名。** `dsh-client-modules` 的 `locatePkgJson()` 只认精确包名；
> 写成 `dsh-session-manager/client` 会让它返回 `undefined`，浏览器半不会被注册，
> 设置页签就不会出现。

装完刷新页面（client 侧改动无需重启宿主）。

## 数据与删除范围

### 会话在磁盘上的位置

| 项 | 路径 |
|---|---|
| 会话根目录 | `<DSH_HOME>/sessions`（默认 `~/.dsh/sessions`） |
| 单个会话目录 | `<root>/<projectKey(cwd)>/<encodeSegment(sessionId)>/` |
| 日志文件 | `session.v4.jsonl.zstd`（该目录内） |
| 写锁文件 | `session.lock`（该目录内） |
| 投影缓存 | `<DSH_HOME>/storages/session_projcache/sessions/<sessionId>.json` |
| 归档集与记账 | `<DSH_HOME>/storages/workspace.json` |

`projectKey` 与 `encodeSegment` 逐字复刻自 `dsh-session-persistence-jsonl` 的内部实现。
**目录布局是本插件与 DSH 之间唯一的隐式契约**——公式若不一致，删除就会指向错误路径，
因此 `test/paths.test.mjs` 用本机**真实存在的会话目录名**做回归断言，
`scripts/dry-run.mjs` 还能对真实数据做只读演练。

### 一次删除会清理三处

1. **会话目录**（日志 + 锁文件）—— 整个目录，**不动** `projectKey` 父目录（那里可能还有别的会话）
2. **投影缓存** `<sessionId>.json`
3. **workspace 记账** —— 从 `sessionIds` 与 `archivedSessionIds` 移除

缺少任何一处，会话都会残留或在侧栏"复活"。

## 安全设计

删除是本插件唯一不可逆的操作，因此设了**硬执行闸门**与五层**交互防护**。

### 执行顺序（本方案的核心，别调整）

一次删除按以下顺序执行，每一步的位置都有硬理由：

| 步 | 动作 | 为什么在这个位置 |
|---|---|---|
| 1 | **归档**（`stopActivity: true`） | 侧栏**立刻**隐藏该会话，无需重启 DSH |
| 2 | **`evict`（内存注册表移除）** | **决定性一步**：见下。必须在删文件之前 |
| 3 | 删除会话目录 + 投影缓存 | 磁盘彻底消失 |
| 4 | `detachSession` | 从 workspace 记账移除 |
| 5 | **`unarchive`** | 必须在文件 / 内存 / 记账都处理完之后 |
| 6 | `sessions.refresh()` | 让客户端目录同步 |

#### 为什么必须有 `evict`（内存移除）

这是让条目**真正消失**的关键。DSH 的链路是：

```
ctx.sessions.list()                    ← 内存注册表
  ↓ 被无条件并入（records.set(id, { live: true })）
sessionQuery.listSessions()
  ↓
宿主 session.list()                    ← items.push(summaryFor(live))
  ↓
客户端 refresh() 拿到的基线             ← 里面仍有它
  ↓
侧栏继续显示
```

**所以只删文件、只清记账都不够**：只要会话还在内存注册表里，它必定出现在
`list()` 的返回中，侧栏就会继续显示它——**`refresh()` 也救不了**，因为它拿到的
基线本身就含内存会话。（这一条是本插件反复踩坑后才定位到的。）

`evict` 用 DSH 官方服务上的两个方法（不是 hack，是 DSH 自己 detach 时走的同一条路）：

```js
const entry = sessions.liveEntryFor(session)   // session → entry
sessions.detachEntered(entry)                  // 从 store 移除 + emitDisposed
```

`detachEntered` 会发出 `session/disposed`。已核对**全部**监听者
（`dsh-agent-loop` / `dsh-api-session-controller` / `dsh-client-file-upload` /
`dsh-experimental-agent-team`）都只做内存记账，**没有任何一个读会话文件**——
所以即使它导致条目从客户端列表移除，也不会牵动磁盘。

**为什么 `evict` 必须在 `rm` 之前**：这是"先停用、再删除"。归档虽带
`stopActivity`（会取消在跑的 turn），但取消并不等到真正沉降；若先删文件、
后移除内存，那个仍在收尾的会话一旦追加事件，存储层会**把刚删掉的目录
重新创建出来**——那就白删了。先移除内存，存储层不再持有它，后续追加不落盘。

**调用后立即自校验**：`evict` 实现里会在 `detachEntered` 之后复查
`sessions.get(id) === undefined`。不这样做的话，一旦 `this` 绑定语义变化导致
静默失败，整个删除流程会"看起来成功、实际残留"。

**拿不到这两个方法时抛错降级**：文件照删，但**保留归档标记**（让侧栏仍然隐藏），
并如实提示"需重启 DSH"。绝不静默假装成功。

#### 为什么 `unarchive` 必须最后

标记一清，`sessionVisible()` 就不再隐藏它。只有三项前置全部满足才安全：

```
canUnarchive = dirGone && detachOk && result.evicted === true
             (文件已删)  (记账已摘)   (内存已移除)
```

任一未达成则**保留**标记：宁可留一个无害死 id（由启动清理兜底），
也不要把会话重新暴露到「未分组」。

### 硬执行闸门（任一不满足即拒绝，绝不"尽力而为"地删）

| 闸门 | 条件 | 失败码 |
|---|---|---|
| 1. 锁空闲 | 目标目录的 `session.lock` 可独占（否则说明正在被写入） | `locked` |
| 2. 不越界 | 解析出的绝对路径必须位于会话根目录之内 | `escaped-root` |

**为什么只保留这两道**：早期版本曾用"会话是否在内存里"当闸门，
结果把大量正常会话误判为不可删（用户实测删不掉）。

读源码后确认：**「在内存」≠「正在运行」**。活跃的权威定义是
`agent.status === 'running'`（`dsh-agent/archive-admission.js`）；
而**归档只往 `archivedSessionIds` 里加一个 id**（见 `archiveSession`），
它**不**停止 Agent、**不**卸载内存——归档是显示过滤标记，不是"让会话停止活动"。

既然归档已经解决了"删了还显示"的问题，内存状态就不再是拒绝理由。

### 归档集死 id 的启动清理

删除失败（或进程中断）时，归档标记会被**故意保留**——因为标记是侧栏隐藏的依据，
宁可留一个无害死 id，也不要把会话重新暴露出来。

这些残留由 `lib/cleanup.js` 在**每次启动时**收拾：

- **保守原则**：只在**确定**会话已消失时才清
- 任何查询抛错（存储故障）一律 `unknown` 并**保留** —— 故障绝不能被当成"会话已删除"
- 为什么必须做：`archivedSessionIds` 在 DSH 里**没有任何过滤**
  （对比 workspace 实体的 `sessionIds` getter 会按 `sessionPath` 过滤），
  死 id 会**永久**留在 `workspace.json` 里，重启不会自己消失

### 交互防护

1. **危险按钮语义独立** —— 不与「恢复」混排，带「永久删除，不可撤销」提示
2. **路径预览** —— 确认弹窗列出**将被删除的绝对路径**（来自 `/delete/preview`，所见即所删）
3. **显式确认** —— 必须勾选「我已知晓此操作不可恢复」才能提交
4. **逐条回执** —— 失败项保留在列表中并标红，附可操作原因

### 其他

- 写操作**仅限本机 loopback**，非本机返回 403
- 批量删除**逐条串行**（`workspaceRegistry` 内部用 `enqueueOperation` 串行化写入），
  单条失败不中断整批
- 预览失败时**关闭弹窗**并提示错误，不会停在"按钮禁用且无路径"的死局
- 服务缺失（headless、非 Web profile）时优雅降级，不抛错

## HTTP 接口

客户端半的读取走 DSH 客户端服务（`ctx.get("workspaces")` / `ctx.get("sessions")`），
与侧栏同源；**删除与归档经宿主同源路由**。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/session-manager/state` | 会话根目录、归档集、固定集 |
| POST | `/api/session-manager/archive` | `{ ids, stopActivity? }` |
| POST | `/api/session-manager/unarchive` | `{ ids }` |
| POST | `/api/session-manager/delete/preview` | `{ ids }` → 将删除的绝对路径清单（只读） |
| POST | `/api/session-manager/delete` | `{ ids }` → 逐条结果 |

写操作限 loopback；失败一律以「逐条结果」返回，不因单条失败丢整批。

### 为什么需要宿主半

归档/取消归档有官方 Remote（`workspaces.archiveSession/unarchiveSession`），客户端可直呼；
但**彻底删除**需要 `workspaceRegistry` 的 `detachSession`（**未暴露为任何 Remote 方法**）
与文件系统操作。已安装的第三方插件拿不到 `host.call`，typert 的 `@Remote` 契约也由 DSH
构建流水线生成、第三方无法手写。因此走同源 `webServer` 路由——这也是
`delivery-board-dsh` 与 `sapbuddy-dsh` 实际工作的模式。

## 开发

```bash
pnpm install
pnpm run seed      # 抽取宿主 primitives 种子（渲染测试需要）
pnpm run build     # esbuild → dist/client.js（含 CSS 注入 + 类名对齐自检）
pnpm run verify    # 产物契约与规范校验（13 项）
pnpm run test      # 测试（94 个用例）
pnpm run dry-run   # 对真实数据做只读演练
pnpm run check     # build + verify + test
```

### 渲染测试需要宿主种子

`test/render.test.mjs` 用**真实的** DSH primitives 渲染组件，而不是手写 stub——
stub 只能证明"替身能渲染"，无法验证与宿主的属性契约。这些包只存在于 Electron 的
`app.asar` 内（profile 里那些 `@deepseek-ai/*` junction 实际指向**不存在的路径**），
所以 `pnpm run seed` 会把它们抽到 `node_modules/.host-seed/` 并打包成单文件。

### 几个容易踩的坑（已在代码注释中标明）

1. **bundle 包装的 `id` 必须等于 `package.json` 的 `name`** —— 客户端加载器按包名建
   模块表键，写错会在浏览器里才炸。构建脚本从 `package.json` 读取，不硬编码。
2. **esbuild 必须用 `--format=cjs`，不能用 `iife`** —— 入口是 ESM，iife 输出**不会**
   把导出挂到 `module.exports`，包装层的 `return module.exports` 拿到空对象，
   浏览器侧表现为"模块加载了但 `apply` 未定义"。
3. **CSS 必须由 JS `import`** —— `local-css` 会给类名加作用域前缀，JS 里读到的是映射后的
   类名。若只在构建脚本里单独编 CSS 而 JS 不 import，两边类名不一致（CSS 是
   `Sm_Sm_page`、JS 是 `Sm_page`），样式全部失效。构建脚本与 `verify-bundle.mjs` 双重断言。
4. **CSS 抽取要以 CSS 为入口** —— 入口是 JS 时 esbuild 会把 JS 文本写进 `--outfile=x.css`。
5. **`label` 必须是 thunk** —— 导航每次投影时重读，切语言即跟随。
6. **声明 `locale` 才能拿到 `t`** —— 渲染框架据此注入。
7. **jsdom 下 React 合成 onChange 不会由 DOM 事件触发** —— `_valueTracker`、原生 setter、
   `.click()` 三种都无效；渲染测试改为直接调用 fiber props 上的 `onChange`。
8. **Modal 经 createPortal 挂到 `document.body`** —— 弹窗断言必须查 body 而非容器。

### 结构

```
package.json               双面包声明（main = 宿主半，exports["./client"] = 浏览器半）
cordis.patch.yml           自带 Loader 行（行名必须为裸包名）
lib/paths.js               路径推导（复刻官方编码规则）+ 越界防护
lib/delete.js              删除执行器（三道闸门 + 三处清理）
lib/index.js               宿主半：webServer 路由 + 依赖装配
client/index.jsx           浏览器半：设置页签、列表、批量操作、确认弹窗
client/selection.js        选择/筛选纯逻辑（防"幽灵选中"）
client/Sm.module.css       CSS Modules：只用 --dsw-* 令牌
scripts/build-client.mjs   esbuild 构建 + CSS 注入 + 类名对齐自检
scripts/build-host-seed.mjs 打包宿主 primitives 供渲染测试
scripts/fetch-host-seed.mjs 从 app.asar 抽取宿主种子
scripts/extract-css-from-bundle.mjs 从产物反向提取 CSS（源码丢失时的救急手段）
scripts/run-tests.mjs      测试运行器（同进程，规避沙箱 spawn 限制）
scripts/verify-bundle.mjs  产物契约校验
scripts/dry-run.mjs        真实数据只读演练
test/                      paths / delete / routes / bundle / selection / render
```

`client/selection.js` 里的 `reconcile` 专门防一类危险缺陷：用户改搜索词或数据刷新后，
若选中集合仍含**不可见**项，点批量删除就会删掉看不见的会话。该逻辑是纯函数，单独可测。

## 风险与限制

1. **误删不可恢复。** DSH 无回收站机制。防护见「安全设计」，但请先用无关紧要的会话验证。
2. **依赖非公开内部契约。** `encodeSegment` / `projectKey` / 目录布局 / `session.lock` /
   `detachSession` 均为 DSH 内部实现，非公开插件 API。**DSH 升级后可能变动**，
   届时删除会失败（设计为"失败即拒、不猜测"），需重新核对。`settings.section` 亦属
   内部契约（已在两个在装插件上验证可用）。
3. **绕过官方契约。** DSH 明确不提供删除能力，本插件以宿主文件操作实现。
4. **`projectKey` 有损。** 不同 `cwd` 理论上可能映射到同一 key。因此**不通过扫描父目录
   反推**目标，而是严格由 header 的 `cwd` + `sessionId` 计算路径并做越界校验。
5. **搜索索引。** 当前 `session-query-sqlite` 配置为 `path: ':memory:'` + `openAt: never`，
   不落盘，无需清理。若改为非 `never`，还需额外清理其索引。
6. **只面向桌面/loopback Web profile**（宿主持久化可用的场景）。

## 许可

MIT
