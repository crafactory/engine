# Crafactory Engine 原生插件架构提案

状态：阶段 1（组装内核）、阶段 2（storage/documents/commands 默认提供者，内存/本地双提供者同一契约套件）与阶段 3（render/workspace 视图槽与格式注册，Markdown/Canvas/Bases 各自注册格式视图）已实现，其余迁移阶段未开始。阶段 1 规格见 [KERNEL-SPEC.md](KERNEL-SPEC.md)，阶段 2/3 规格见 [SERVICES-SPEC.md](SERVICES-SPEC.md)，单元证据见 `tests/kernel.test.ts`、`tests/services.test.ts` 与 `tests/workspace.test.ts`。阶段 4 已接入：`engine.editor/v1` 与两套提供者已实现，应用以默认 CodeMirror provider 为活动笔记开 session，选区/视口经 provider 恢复（证据 `tests/editor.test.ts`、`e2e/regressions.spec.ts`）；正文草稿与写入冲突仍沿用应用既有机制。格式分发已接入 `src/App.tsx`，但 storage/documents/commands 仍由 `src/bridge.ts` 提供，产品功能其余部分尚未完成迁移，全文其余勾选框保持未勾选是有意的。原创应用代码继续 MIT；不复制 Obsidian 应用、SDK、类型声明或示例代码。

## 路线结论

采用用户提出的“组装内核之外全部插件化”目标，编辑器也不例外。Obsidian API 是可选兼容插件提供的外部协议，不是 Engine 原生 API，更不能反向规定内核必须依赖 CodeMirror。这里借鉴 Cordis 的服务、依赖、作用域和可逆副作用设计，不直接搬运 DeepSeek Harness 实现。

DeepSeek Harness 的公开架构把模型、工具、会话、循环和客户端都放在可替换服务/插件上，组合配置形成运行时；服务应分别描述定义、提供者和消费者，而不是仅移动文件目录（[官方架构](https://deepseek-harness.github.io/deepseek-harness/en/reference/index.html)）。Cordis primer 将插件依赖注入、事件语义和效果清理作为基本机制，适合成为我们的设计参照（[官方 Cordis primer](https://deepseek-harness.github.io/deepseek-harness/en/reference/cordis-primer)）。

## 内核边界

内核只负责：

- **插件组装**：manifest/schema 验证、依赖图、版本匹配、循环/缺失/重复提供者诊断、启动回滚、停用和重载。
- **上下文与服务**：稳定的版本化服务契约，按 runtime、vault、window、leaf、document 划分作用域；消费者只依赖契约，不导入具体提供者。
- **效果所有权**：注册事件、命令、定时器、UI、视图和扩展时归属插件作用域；停用即时关闭新操作入口，后续异步结果以 generation 检验，不能污染新实例。
- **事件机制**：事件契约声明同步广播、异步并发、串行或可中止策略；不让调用者猜测返回值、异常和时序。
- **最低诊断**：无法组合时给出明确错误；不暗中加载备用产品功能来伪装成功。

操作系统载体负责建立进程、窗口和最小 IPC 信任边界，属于启动与安全基座，不借此在内核中保留编辑器、导航、设置或 Vault 产品逻辑。内核不解析 Markdown/Canvas/Bases，不了解 Obsidian 类名，不存笔记，不渲染工作区。

## 原生服务与默认插件

服务契约名称是本提案的建议值，未来以独立规格固定，不是已经存在的 API。

| 契约 | 默认提供插件 | 替换验收 |
| --- | --- | --- |
| `engine.storage/v1` | 本地文件 Vault、预览内存 Vault | 同一上层行为测试换两个提供者；冲突、安全路径和二进制边界一致 |
| `engine.documents/v1` | 文档事务、格式注册、重命名、历史 | 更换存储不丢格式、内容或链接；重命名不是转换 |
| `engine.index/v1` | 元数据、链接、全文搜索 | 不要求具体编辑器或 UI |
| `engine.editor/v1` | CodeMirror 编辑器 | 第二个简单编辑器能打开/编辑/保存，保留选区、草稿和滚动状态 |
| `engine.render/v1` | Markdown 阅读、Canvas、Bases | 根据格式注册解析/视图，不把 JSON 当 Markdown |
| `engine.workspace/v1` | 分屏、叶子、标签页、布局 | 无编辑器时仍可显示诊断/其他视图； UI 注册可完全撤销 |
| `engine.commands/v1` | 命令与快捷键 | UI、兼容层和无头测试共用契约 |
| `engine.preferences/v1` | 设置与配置存储 | schema 版本、默认值、迁移和权限明确 |
| 独立产品插件 | 图谱、每日笔记、模板、书签、文件导航、属性等 | 单独停用、不影响无关服务；可替换默认实现 |

CodeMirror 专用扩展是编辑器提供者的可选能力，例如 `engine.editor.codemirror/v1`，不能属于所有编辑器必须实现的抽象。编辑器替换时，依赖此能力的插件必须明确暂停或报告不支持，不能宣称第三方 CodeMirror 扩展仍兼容。

## 生命周期、数据安全和权限

每个插件声明提供/消费的契约和能力、执行模式、兼容范围。依赖未满足时不激活；提供者丢失时先撤销消费者的新操作入口，再清理有依赖的效果，并在依赖重新满足时创建新实例。停止顺序为消费者到提供者；激活失败必须逆序清理已经取得的资源，并把清理失败列入诊断。

编辑器/存储卸载涉及用户草稿，不能用普通 UI 清理替代数据事务。切换提供者前冻结新写入、等待已接受的写入、保留尚未保存的草稿；新提供者通过恢复文本、选区、文档身份和视口检查后才切换。失败则保留旧提供者或可导出的草稿，不能清空内容后声称切换成功。无法终止的 Trusted renderer 插件只能撤销能力入口和承认进程级风险，不能承诺强制中断任意 JavaScript。

原生插件可以是 Worker、受限 IPC 提供者，或经显式授权的 Trusted renderer；三者信任模型不同。权限声明不是安全沙箱，实现限制必须落在实际执行边界。Vault 不能仅凭其内容自动批准执行插件；配置默认仅接受经 schema 验证的 JSON/YAML，不采用可执行配置表达式。

运行配置作为有版本的 profile：desktop、web preview、headless、read-only。它们组装相同契约的不同提供者，不维护四套产品核心。插件包固定版本、完整性和许可信息；第三方许可保留，不因宿主 MIT 就改写依赖许可。

## Obsidian 兼容层

`compat.obsidian` 是普通原生插件：依赖 storage/documents/workspace/editor/render 等契约，把外部 Plugin/App/Vault/Workspace/Editor 接口转译成 Engine 服务；缺失能力明确拒绝。默认原生插件无需经由 Obsidian API 实现，也不直接依赖兼容 facade。现有 Worker/Trusted renderer 行为及测试仍分别记录，不合并为虚假的“全兼容”。

DeepSeek Harness 的 Claude Code Mods bridge 确实加入同一 Cordis 组合机制，但官方文档也明确它是进程内、无沙箱的桥接，并列出未触发事件、未实现命名空间和无法运行的实际 mods；这说明“桥接存在”和“完全兼容”必须分开验收（[官方 bridge 文档](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/claude-code-mods.md)）。我们借鉴这个分层，不照搬其受限行为，也不将其完整兼容作为已验证前提。

兼容测试保留固定版本与 SHA-256 原始发布文件，并区分加载、激活、设置、实际功能、事件时序、文件修改、停用与重载。对公开文档的每个接口还需要成员/重载/异常/作用域/时序测试；271 个名称库存不是完整接口实现率，负向断言通过也不是插件功能成功。

## 渐进迁移与验收门槛

- [x] 固定原生 manifest、作用域、服务版本、事件策略和效果所有权规格；增加缺依赖、环、重复服务、启动回滚、迟到回调和跨 Vault 隔离测试。规格见 [KERNEL-SPEC.md](KERNEL-SPEC.md)；证据为 `tests/kernel.test.ts`（38 个组装/生命周期/事件用例）。这不迁移任何产品功能，也不构成社区插件兼容。
- [x] 从 storage/documents/commands 提取默认提供者，用预览/本地两套提供者跑同一契约套件；保留旧应用入口直到行为回归通过。规格见 [SERVICES-SPEC.md](SERVICES-SPEC.md)；证据为 `tests/services.test.ts`（同一 storage 契约套件跑内存与本地两套提供者，另含 commands/documents 与 kernel 组装）。应用 UI 已托管桥接式 storage/documents 运行时（`createStorageRuntime({bridge})`），文件恢复视图改为消费 `engine.documents/v1`；笔记写入仍走 `src/bridge.ts` 直到持久化路径迁移。
- [x] 工作区改成视图槽/格式注册插件；Markdown、Canvas、Bases 注册自己的格式视图；确认 kernel 没有这些实现的 import。规格见 [SERVICES-SPEC.md](SERVICES-SPEC.md) 的 `engine.render/v1`、`engine.workspace/v1` 与格式视图插件；证据为 `tests/workspace.test.ts`（含 kernel 仅允许同目录相对 import 的静态检查）与 `src/App.tsx` 采用视图解析做格式分发。**边界：视图槽仍只承载 viewType/slot 元数据；组件工厂由 `engine.views/v1` 承载，内置 Markdown/Canvas/Bases/graph/editor 视图与 files/search/bookmarks/recent/tags 左栏面板与 outline/backlinks/outgoing/properties 右栏面板已作为视图插件注册，App 宿主统一按 loader 懒加载并渲染，不再硬编码 canvas/base/markdown 或书签列表分支。Bases 的 table/cards/list 已拆为 `builtinBasesViews` 注册渲染器，`Bases.tsx` 退化为 host；Canvas 的 Card/FitEmbed/Toolbar/CardEditor 已拆到 `src/views/canvas/`，`Canvas.tsx` 保留 host/状态。外部插件包的 UI 加载尚未接入。** storage/documents 现已由 App 托管桥接式提供者。
- [x] 编辑器：`engine.editor/v1` 契约与两套提供者（默认 `@codemirror/state`、第二个 plain）已实现；应用以默认 CodeMirror provider 为活动笔记开 session，编辑器选区与视口（草稿迁移）经该 provider 恢复/上报。草稿恢复、冲突、视口迁移与 CodeMirror 能力差异均有正向测试（`tests/editor.test.ts`、`e2e/regressions.spec.ts`）。边界：正文草稿与写入冲突仍沿用应用既有机制（bridge 版本冲突），`engine.editor/v1` 的 text/draft/expected-base API 由契约测试覆盖。Live Preview 已改为块内点击直接编辑（无 Edit source 按钮），表格支持 Tab 增行、悬停加行/列与块内滚动，inline 格式按 span reveal；主题/字号/行号/拼写检查改用 compartment 以保留 undo。frontmatter 改为 decoration 隐藏并保留完整文档，live/source 切换不再重建编辑器；插件 code-block processor 的 live preview 需独立 opt-in 契约，暂未接入。
- [ ] （进行中）将所有核心产品功能逐一迁移为原生插件。已完成：`engine.bookmarks/v1`、`engine.templates/v1` + `engine.daily-notes/v1`（依赖 templates，二者同批迁移），应用均已消费；依赖服务 `engine.index/v1`（元数据/链接/标签/搜索索引）已实现并测试，应用的 tags/backlinks/outgoing/outline、搜索、图谱与属性视图均已改为消费它；新增 `engine.navigation/v1`（消费 index）驱动随机笔记与快速切换；`engine.workspaces/v1` 驱动保存/加载命名工作区；`engine.unique-note/v1`（消费 templates）驱动唯一笔记，`engine.wordcount/v1` 驱动字数统计，`engine.slides/v1` 驱动演示，`engine.format-converter/v1` 驱动格式转换，`engine.explorer/v1`（消费 storage）驱动文件树排序，`engine.note-composer/v1` 驱动笔记合并/提取，`engine.web-viewer/v1` 驱动网页查看器地址校验，`engine.slash-commands/v1` 驱动斜杠命令，`engine.page-preview/v1` 驱动悬浮预览摘要/定位，`engine.audio-recorder/v1` 驱动录音生命周期，`engine.views/v1` 承载内置 Markdown/Canvas/Bases 视图与左右栏面板的惰性组件 loader（App 宿主统一解析），`engine.ui/v1` 承载扩展的 ribbon 按钮、状态栏文本与 settings 区段贡献（内置 Editor 设置区段已作为消费者）。文件恢复消费 `engine.documents/v1`。依赖关系与更新机制已补齐：kernel 新增逐插件 `disable`/`enable`（提供者丢失时连带停用传递必需的消费者并记录 `dependency-disabled`，恢复时重启作用域、消费者重绑定新实例），并有 `tests/dependency-flow.test.ts` 全套流程测试。其余核心功能（文件导航等）待迁移。
- [x] Obsidian facade 只消费原生服务；它停用后默认产品仍工作；更换编辑器后明确输出专有扩展的兼容差异。已完成：facade 可选消费 `engine.index/v1` 做链接解析，并通过 `engine.editor.codemirror/v1` 能力报告编辑器替换差异（非 CodeMirror 时明确拒绝扩展并指出当前 provider）；facade 仅在插件启用时创建，默认产品不依赖它。已完成：facade 的读/写/mkdir/pluginData/rename/trash/getResourcePath 均走原生 `engine.storage/v1`/`engine.documents/v1`（rename/trash 支持非根文件与文件夹子树；getResourcePath 返回 data URL）；renderer 自定义视图可用 `registerView` + `registerExtensions` 注册，宿主把扩展名接入 `engine.render/v1`/`engine.workspace/v1` 并在主文档区通过 plugin-view host 挂载；`registerEditorSuggest` 的 onTrigger/getSuggestions 接到 CodeMirror autocomplete，选择经编辑器变更宿主执行；`registerObsidianProtocolHandler` 由应用内 `engine:protocol` 事件分发（未注册 OS `obsidian://`），`registerHoverLinkSource` 在悬停 Markdown 链接时按 source 派发 `hover-link` 事件（最小 hoverParent，未实现 hover popover）；`registerBasesView` 用最小 QueryController（type/config/app）挂载 `render(container)`，未实现完整查询/分组/排序；MetadataCache 提供 changed/deleted/resolved 事件（cache 为 null）；新增 facade 依赖服务丢失的流程测试。`delete`/二进制/`process` 属于明确拒绝的兼容子集，不是迁移缺口；更完整的停用/重载时序仍未认证。
- [x] profile/包校验、权限和诊断验收；空插件配置下 kernel 不包含隐式产品能力。已完成：`validatePluginPackage` 校验 id/name/version、engine 范围、相对 `.js`/`.mjs` entry、已知权限名与 provides/consumes 形状；应用宿主按声明权限集在操作边界检查 `vault:read`/`vault:write`/`vault:trash`/`editor:write`/`storage:plugin-data`，未声明 `permissions` 的旧包保留原有访问，声明集缺少 `vault:read` 时启动/同步快照不含笔记内容与编辑器文本；空 kernel 测试确认无隐式服务/诊断。权限仍不是沙箱，UI 命令/标签注册尚未纳入权限门控。
- [ ] 每个阶段独立 PR，经 CodeRabbit 最新提交审查、修复、复审和全套 CI 后再合并，上一阶段未合并不开始后续实施。

阶段 1–4 已勾选；其余未勾选仍然是有意的：这是架构方向和迁移门槛，不是已经完成的重写。现有功能 checklist 的未完成总项仍保留，完整 1:1、移动端及社区插件全兼容目标不因架构提案而变成完成。
