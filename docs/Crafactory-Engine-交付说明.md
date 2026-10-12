# Crafactory Engine 交付说明

本轮推进到 0.3.1，重点是可追踪的 Feature checklist 和独立插件兼容层，并修正了 Windows 构建发现的清单 CRLF 换行问题。**完整 1:1 目标、全面插件兼容与逐项参考行为验收仍未完成**；以下区分已经验证的子集、明确拒绝的能力和未测试部分，不给出未经证实的完成百分比。

## Feature checklist

- **追踪清单**：[FEATURE-CHECKLIST.md](https://github.com/crafactory/engine/blob/main/docs/FEATURE-CHECKLIST.md)包含 93 个编号项，覆盖全部 29 个公开文档核心插件、工作区/编辑/文件/平台/免费扩展差距、28 个有限验收点和后续完整性门槛。
- **勾选规则**：只勾选有具体测试证据的限定行为，不把“实现了一部分”勾成完整功能；Sync 和 Publish 是仅有的订阅排除项。完整原生移动端、免费扩展和社区插件均仍在目标内。
- **防止漂移**：Markdown 清单和机器可读 JSON 一起生成，`npm run inventory:check` 已接入验证流程，检查重复编号、遗漏核心插件、额外排除项、生成文档漂移和测试证据缺失。它不能自动发现所有新文档变化，因此仍需持续扩充逐项验收用例。
- **参考边界**：参考公开文档快照为 2026-10-12 UTC，尚未固定并安装某一 Obsidian 版本作黑盒差分验收；这是起始库存，不是穷尽规范。

## 本轮实现

新增原创 CommonJS Worker 兼容子集，允许 `require('obsidian')` 获取有限的 Plugin/Component 生命周期、命令注册、文本文件操作、插件数据与单一编辑器选区接口。原有 Engine 插件 API 保留，插件仍需手动安装和明确启用，不会自动从 `.obsidian` 读取或下载代码。

命令测试覆盖 editorCheck/editor/check/callback 的优先级、可用性与阅读模式隐藏。文件新增“只创建不覆盖”、串行追加，插件 JSON 数据按 ID 保存并拒绝跨插件元数据符号链接；桌面实测了创建/追加、数据持久化、停用/卸载/重新启用、关闭窗口保存，以及真实编辑器选区修改。出现错误后清除命令并停用，切换 Vault 前先停止插件，病态卸载最多等待两秒。

这些都是独立实现，没有引入 Obsidian 应用代码、SDK、类型声明或其示例插件实现。第三方真实插件仅作为临时测试输入，未并入 Engine 源码或安装包；原创项目仍采用 MIT，第三方资源保留各自许可。

## 插件文档对照与真实样本

[公开 API 对照表](https://github.com/crafactory/engine/blob/main/docs/API-COVERAGE.md)记录 271 个文档名称：154 个运行时符号和 117 个仅类型名称；27 个运行时符号提供子集，另 127 个明确拒绝。另有 12 个主要类的成员边界，**并非所有成员、重载、事件和时序都已全面验证**，详见[兼容报告](https://github.com/crafactory/engine/blob/main/docs/PLUGIN-COMPATIBILITY.md)。

实际加载测试包含 Dataview、Templater、Calendar (Beta)、Advanced Tables 和 Reading Time 的版本固定发布文件，加载前校验 main.js 与 manifest.json 的 SHA-256。**这五个插件目前全部启动失败，不能记作功能兼容通过**；具体首次错误、发布标签与 manifest 版本差异、未执行的后续功能见[真实插件测试报告](https://github.com/crafactory/engine/blob/main/docs/COMMUNITY-PLUGIN-TESTS.md)。首次失败后的其他阻塞项尚未枚举，泛化加载错误也没有被擅自诊断成某个 API 缺失。

本轮补正了 CommonJS `__esModule` 元数据探测被当作缺失 API 的问题，但没有把这等同于完整模块包装兼容。DOM、设置/Modal、视图、Markdown 处理器、CodeMirror 扩展、Node/Electron 环境、精确元数据缓存、二进制接口等仍未实现或未验证。

## 验证与使用

本轮源码单元套件含 521 项，包括新增的 3 项 Windows 换行回归；浏览器回归有 36 项、Linux Electron 桌面回归有 18 项。单元数包含 271 个符号探测与大量拒绝测试，不能换算为完成度；另执行了 5 项真实插件启动失败边界测试，这些断言通过只表示观察到了拒绝/加载错误，并不是五个插件可用。普通桌面套件不提供外部样本时会跳过这五项，不能算入通过数量。

生产依赖审计没有报告已知告警，完整开发/构建依赖仍有 8 项中等告警。原生 Windows/macOS 运行、签名/安装/升级、移动端、大型 Vault、崩溃耐久性和完整安全/无障碍审计尚未完成；桌面测试环境使用 Xvfb 与测试专用 `--no-sandbox`，不据此认证生产系统沙箱。

源码需要 Node.js 22.12 或更新版本，克隆[仓库](https://github.com/crafactory/engine)后执行 `npm ci`、`npm run desktop`。插件测试应使用备份或可丢弃 Vault；插件可以在启动、命令执行和卸载时修改笔记，启动失败不会回滚已完成写入。浏览器预览只保存临时内存数据，刷新即重置，不是本地 Vault 或原生移动端。

后续优先门槛是扩大清单到逐工作流用例，固定参考应用版本，补全模块/CodeMirror 和 DOM/设置/视图接口，并把真实插件测试从“启动失败边界”推进到实际功能与平台验收。完整 Live Preview、表格结构操作、完整 Bases/Canvas、原生移动端和免费扩展也继续保留在未完成清单中。
