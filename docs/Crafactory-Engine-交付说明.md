# Crafactory Engine 交付说明

本轮版本为 v0.4.0，重点推进插件模块、CodeMirror 与 DOM、设置和视图的原创兼容实现。完整非订阅功能 1:1 目标仍未完成，不把启动通过、导出名称覆盖或负向测试通过算作全面兼容；原创实现继续采用 MIT，没有加入 Obsidian 应用代码、SDK 声明或社区插件实现。

## 本轮新增

- **显式运行模式：** 默认仍是 Worker。需要 DOM 的插件必须手动选择 Trusted renderer，再确认更强的权限提示，没有自动回退或自动启用。
- **真实 UI：** 插件设置的文本、长文本、下拉、开关、按钮、滑块支持实际交互与插件回调；Modal 支持打开、关闭、Escape 与焦点循环；状态信息和独立插件视图支持卸载清理。公开行为参考 [设置文档](https://docs.obsidian.md/Reference/TypeScript+API/Setting)及 [Modal 文档](https://docs.obsidian.md/Reference/TypeScript+API/Modal)，但不是全接口等价。
- **真实 CodeMirror：** 注册扩展接入主编辑器的实际 CodeMirror，修改扩展数组后 updateOptions 可重新配置，禁用后移除。参考 [公开扩展接口](https://docs.obsidian.md/Reference/TypeScript+API/Plugin/registerEditorExtension)；次级分栏编辑器和全部 Live Preview 插件行为尚未覆盖。
- **Checklist：** 增至 98 个稳定编号项、33 个限定验收点，保留全部 29 个核心插件与未完成总门槛。API 库存对照 271 个名称，分别列出 Worker 的 27 个和可信 renderer 的 43 个运行时子集，不把导出存在当作完整成员兼容，详见 [清单](https://github.com/crafactory/engine/blob/main/docs/FEATURE-CHECKLIST.md)与 [API 覆盖表](https://github.com/crafactory/engine/blob/main/docs/API-COVERAGE.md)。

## 真实插件结果

测试仍使用原来固定版本和 SHA-256 的原始发布文件，插件字节未经改写，只在一次性测试 Vault 中执行，不随软件分发。模式、哈希、首次阻塞和已执行流程分开记录于 [可信 renderer 结果](https://github.com/crafactory/engine/blob/main/docs/TRUSTED-RENDERER-PLUGIN-TESTS.md)。

| 插件 | 可信 renderer 实测 | 仍未验证 |
|---|---|---|
| Reading Time 1.1.2 | 八个限定流程通过：文档统计、速度设置保存、阅读/源码切换、编辑更新、选区弹窗、Escape、禁用清理、再启用恢复 | 全格式、无效输入、所有字数语义、事件时序、多分栏、其他平台 |
| Calendar (Beta) 2.0.0-beta.2 | 启动完成 | 日历视图与每日笔记等功能流程 |
| Advanced Tables 0.23.2 | 启动完成 | 表格导航、结构操作与格式化流程 |
| Dataview 0.5.70 / manifest 0.5.68 | 仍失败：MarkdownRenderChild 不支持 | 后续 API、查询和渲染 |
| Templater 2.26.0 | 仍失败：class extends undefined 加载错误 | 未猜测具体缺失类，后续模板流程未执行 |

默认 Worker 模式仍然是五个插件全部启动失败，独立保留在 [Worker 测试报告](https://github.com/crafactory/engine/blob/main/docs/COMMUNITY-PLUGIN-TESTS.md)。任何单个插件都没有被标记为完整兼容，也尚未固定安装版 Obsidian 进行逐项黑盒差分。

## 安全与交付边界

Trusted renderer 不是沙箱：插件可访问整个 UI、Vault bridge 与工作区元数据，可能冻结主线程，不能强制中断，已经完成的写入也不会回滚。Electron 保留 context isolation、sandbox 与关闭 Node integration；这不意味着 renderer 插件与应用隔离，完整说明见 [兼容报告](https://github.com/crafactory/engine/blob/main/docs/PLUGIN-COMPATIBILITY.md)。

状态项目前在底部状态栏上方独立显示，插件视图是独立浮层，不是完整 leaf 树；CSS/主题、Markdown processors、Node 模块和所有成员/事件仍有缺口。Linux 包未签名，Windows/macOS 构建不等于原生运行与安装验收，移动端、安全/无障碍及大型 Vault 验收也未完成。

本轮生产依赖检查报告 0 项已知告警，完整构建/开发依赖仍为 8 项中等风险、0 项高风险、0 项严重风险，这不是完整安全审计。最终自动验证和下载证据见 [验证记录](https://github.com/crafactory/engine/blob/main/docs/VERIFICATION.md)及 [v0.4.0 预发布页](https://github.com/crafactory/engine/releases/tag/v0.4.0)；重要笔记仍应先独立备份。

下一阶段可以补 MarkdownRenderChild/渲染处理器，执行 Calendar 与 Advanced Tables 的实际功能验收，并继续拆解 Dataview、Templater 的后续阻塞。
