# Session Manager DSH

在 DSH 的「设置 → 会话管理」中批量管理已归档会话，支持取消归档、归档和从磁盘彻底删除会话。

[![npm](https://img.shields.io/npm/v/@gxx-labs/session-manager-dsh)](https://www.npmjs.com/package/@gxx-labs/session-manager-dsh) [GitHub](https://github.com/gxx950224/dsh-session-manager)

> **彻底删除不可恢复。** 执行前请先预览路径，并确认不再需要目标会话。

## 功能

- 查看已归档或全部会话。
- 按标题或路径搜索，按最近更新、标题或占用空间排序。
- 分页浏览，每页 20 条；全选只作用于当前页。
- 批量取消归档、批量归档和彻底删除。
- 对正在运行的会话归档时提示是否先停止。
- 逐条返回操作结果；失败项会保留在列表并说明原因，方便重试。

## 安装

在 DSH 的插件管理器中安装：

```text
@gxx-labs/session-manager-dsh
```

也可以安装到 desktop profile：

```bash
npm install @gxx-labs/session-manager-dsh --prefix "$HOME/.dsh/profiles/desktop"
```

安装或升级后，从托盘完全退出并重新启动 DSH。

## 使用

1. 打开「设置 → 会话管理」。
2. 选择「已归档」或「全部会话」，搜索并勾选目标会话。
3. 执行归档或取消归档；执行删除时先打开预览。
4. 检查将删除的绝对路径，并勾选不可恢复确认项。
5. 提交后查看逐条结果；失败项不会被静默清除。

删除操作会清理会话目录及其中的日志和锁文件、会话投影缓存，以及 workspace 中的会话记账。插件不会删除项目目录本身。

## 数据与安全

默认会话根目录为：

```text
~/.dsh/sessions
```

插件同时使用 DSH 的会话投影缓存和 workspace 记账。写入接口只接受本机 loopback 请求。删除前会检查目标目录是否仍被占用，并确认路径位于会话根目录内；删除失败时会保留归档状态，避免会话重新出现在列表中。

## 限制

- 删除没有回收站，无法撤销。
- 插件依赖 DSH 的会话目录布局和内部会话服务；DSH 升级后这些内部契约可能变化。
- 主要面向启用本地持久化的 DSH Desktop Web profile。
- 本插件没有额外的用户配置项，路径由 DSH_HOME 和宿主会话配置决定。

## 开发

```bash
npm install
npm run seed
npm run build
npm run verify
npm test
npm run dry-run
npm run check
```

`npm run dry-run` 只对真实数据做只读演练，不执行删除。

## 许可

MIT
