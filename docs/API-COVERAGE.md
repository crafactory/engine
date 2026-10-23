# Public API export coverage

Pinned [public API index](https://docs.obsidian.md/Reference/TypeScript+API/index): 271 names; 154 runtime symbols; 117 type-only names. Default Worker: 27 bounded runtime symbols. Explicit opt-in trusted renderer: 46 bounded runtime symbols (19 additional UI exports). **Export inventory does not establish member behavior or full real-plugin compatibility.** Renderer is not sandboxed. See PLUGIN-COMPATIBILITY.md and compatibility/member-contracts.json (Worker baseline); renderer-specific contracts and limits are in PLUGIN-COMPATIBILITY.md.

| Symbol | Kind | Default Worker | Trusted renderer | Public documentation |
|---|---|---|---|---|
| AbstractTextComponent | Classes | Unsupported; explicit CompatibilityError | Implemented subset, not full equivalence | [AbstractTextComponent](https://docs.obsidian.md/Reference/TypeScript+API/AbstractTextComponent) |
| App | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [App](https://docs.obsidian.md/Reference/TypeScript+API/App) |
| BasesEntry | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [BasesEntry](https://docs.obsidian.md/Reference/TypeScript+API/BasesEntry) |
| BasesEntryGroup | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [BasesEntryGroup](https://docs.obsidian.md/Reference/TypeScript+API/BasesEntryGroup) |
| BasesQueryResult | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [BasesQueryResult](https://docs.obsidian.md/Reference/TypeScript+API/BasesQueryResult) |
| BasesViewConfig | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [BasesViewConfig](https://docs.obsidian.md/Reference/TypeScript+API/BasesViewConfig) |
| BooleanValue | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [BooleanValue](https://docs.obsidian.md/Reference/TypeScript+API/BooleanValue) |
| ButtonComponent | Classes | Unsupported; explicit CompatibilityError | Implemented subset, not full equivalence | [ButtonComponent](https://docs.obsidian.md/Reference/TypeScript+API/ButtonComponent) |
| CapacitorAdapter | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [CapacitorAdapter](https://docs.obsidian.md/Reference/TypeScript+API/CapacitorAdapter) |
| ColorComponent | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [ColorComponent](https://docs.obsidian.md/Reference/TypeScript+API/ColorComponent) |
| Component | Classes | Implemented subset, not full equivalence | Implemented subset, not full equivalence | [Component](https://docs.obsidian.md/Reference/TypeScript+API/Component) |
| DateValue | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [DateValue](https://docs.obsidian.md/Reference/TypeScript+API/DateValue) |
| DropdownComponent | Classes | Unsupported; explicit CompatibilityError | Implemented subset, not full equivalence | [DropdownComponent](https://docs.obsidian.md/Reference/TypeScript+API/DropdownComponent) |
| DurationValue | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [DurationValue](https://docs.obsidian.md/Reference/TypeScript+API/DurationValue) |
| Events | Classes | Implemented subset, not full equivalence | Implemented subset, not full equivalence | [Events](https://docs.obsidian.md/Reference/TypeScript+API/Events) |
| ExtraButtonComponent | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [ExtraButtonComponent](https://docs.obsidian.md/Reference/TypeScript+API/ExtraButtonComponent) |
| FileManager | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [FileManager](https://docs.obsidian.md/Reference/TypeScript+API/FileManager) |
| FileSystemAdapter | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [FileSystemAdapter](https://docs.obsidian.md/Reference/TypeScript+API/FileSystemAdapter) |
| FileValue | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [FileValue](https://docs.obsidian.md/Reference/TypeScript+API/FileValue) |
| HoverPopover | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [HoverPopover](https://docs.obsidian.md/Reference/TypeScript+API/HoverPopover) |
| HTMLValue | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [HTMLValue](https://docs.obsidian.md/Reference/TypeScript+API/HTMLValue) |
| IconValue | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [IconValue](https://docs.obsidian.md/Reference/TypeScript+API/IconValue) |
| ImageValue | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [ImageValue](https://docs.obsidian.md/Reference/TypeScript+API/ImageValue) |
| Keymap | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [Keymap](https://docs.obsidian.md/Reference/TypeScript+API/Keymap) |
| LinkValue | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [LinkValue](https://docs.obsidian.md/Reference/TypeScript+API/LinkValue) |
| ListValue | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [ListValue](https://docs.obsidian.md/Reference/TypeScript+API/ListValue) |
| MarkdownEditView | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [MarkdownEditView](https://docs.obsidian.md/Reference/TypeScript+API/MarkdownEditView) |
| MarkdownPreviewRenderer | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [MarkdownPreviewRenderer](https://docs.obsidian.md/Reference/TypeScript+API/MarkdownPreviewRenderer) |
| MarkdownPreviewView | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [MarkdownPreviewView](https://docs.obsidian.md/Reference/TypeScript+API/MarkdownPreviewView) |
| MarkdownRenderChild | Classes | Unsupported; explicit CompatibilityError | Implemented subset, not full equivalence | [MarkdownRenderChild](https://docs.obsidian.md/Reference/TypeScript+API/MarkdownRenderChild) |
| MarkdownView | Classes | Implemented subset, not full equivalence | Implemented subset, not full equivalence | [MarkdownView](https://docs.obsidian.md/Reference/TypeScript+API/MarkdownView) |
| Menu | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [Menu](https://docs.obsidian.md/Reference/TypeScript+API/Menu) |
| MenuItem | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [MenuItem](https://docs.obsidian.md/Reference/TypeScript+API/MenuItem) |
| MenuSeparator | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [MenuSeparator](https://docs.obsidian.md/Reference/TypeScript+API/MenuSeparator) |
| MetadataCache | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [MetadataCache](https://docs.obsidian.md/Reference/TypeScript+API/MetadataCache) |
| Modal | Classes | Unsupported; explicit CompatibilityError | Implemented subset, not full equivalence | [Modal](https://docs.obsidian.md/Reference/TypeScript+API/Modal) |
| MomentFormatComponent | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [MomentFormatComponent](https://docs.obsidian.md/Reference/TypeScript+API/MomentFormatComponent) |
| Notice | Classes | Implemented subset, not full equivalence | Implemented subset, not full equivalence | [Notice](https://docs.obsidian.md/Reference/TypeScript+API/Notice) |
| NullValue | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [NullValue](https://docs.obsidian.md/Reference/TypeScript+API/NullValue) |
| NumberValue | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [NumberValue](https://docs.obsidian.md/Reference/TypeScript+API/NumberValue) |
| ObjectValue | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [ObjectValue](https://docs.obsidian.md/Reference/TypeScript+API/ObjectValue) |
| ProgressBarComponent | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [ProgressBarComponent](https://docs.obsidian.md/Reference/TypeScript+API/ProgressBarComponent) |
| QueryController | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [QueryController](https://docs.obsidian.md/Reference/TypeScript+API/QueryController) |
| RegExpValue | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [RegExpValue](https://docs.obsidian.md/Reference/TypeScript+API/RegExpValue) |
| RelativeDateValue | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [RelativeDateValue](https://docs.obsidian.md/Reference/TypeScript+API/RelativeDateValue) |
| RenderContext | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [RenderContext](https://docs.obsidian.md/Reference/TypeScript+API/RenderContext) |
| Scope | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [Scope](https://docs.obsidian.md/Reference/TypeScript+API/Scope) |
| SearchComponent | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [SearchComponent](https://docs.obsidian.md/Reference/TypeScript+API/SearchComponent) |
| SecretComponent | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [SecretComponent](https://docs.obsidian.md/Reference/TypeScript+API/SecretComponent) |
| SecretStorage | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [SecretStorage](https://docs.obsidian.md/Reference/TypeScript+API/SecretStorage) |
| Setting | Classes | Unsupported; explicit CompatibilityError | Implemented subset, not full equivalence | [Setting](https://docs.obsidian.md/Reference/TypeScript+API/Setting) |
| SettingGroup | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [SettingGroup](https://docs.obsidian.md/Reference/TypeScript+API/SettingGroup) |
| SliderComponent | Classes | Unsupported; explicit CompatibilityError | Implemented subset, not full equivalence | [SliderComponent](https://docs.obsidian.md/Reference/TypeScript+API/SliderComponent) |
| StringValue | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [StringValue](https://docs.obsidian.md/Reference/TypeScript+API/StringValue) |
| TagValue | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [TagValue](https://docs.obsidian.md/Reference/TypeScript+API/TagValue) |
| Tasks | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [Tasks](https://docs.obsidian.md/Reference/TypeScript+API/Tasks) |
| TextAreaComponent | Classes | Unsupported; explicit CompatibilityError | Implemented subset, not full equivalence | [TextAreaComponent](https://docs.obsidian.md/Reference/TypeScript+API/TextAreaComponent) |
| TextComponent | Classes | Unsupported; explicit CompatibilityError | Implemented subset, not full equivalence | [TextComponent](https://docs.obsidian.md/Reference/TypeScript+API/TextComponent) |
| TFile | Classes | Implemented subset, not full equivalence | Implemented subset, not full equivalence | [TFile](https://docs.obsidian.md/Reference/TypeScript+API/TFile) |
| TFolder | Classes | Implemented subset, not full equivalence | Implemented subset, not full equivalence | [TFolder](https://docs.obsidian.md/Reference/TypeScript+API/TFolder) |
| ToggleComponent | Classes | Unsupported; explicit CompatibilityError | Implemented subset, not full equivalence | [ToggleComponent](https://docs.obsidian.md/Reference/TypeScript+API/ToggleComponent) |
| UrlValue | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [UrlValue](https://docs.obsidian.md/Reference/TypeScript+API/UrlValue) |
| Vault | Classes | Implemented subset, not full equivalence | Implemented subset, not full equivalence | [Vault](https://docs.obsidian.md/Reference/TypeScript+API/Vault) |
| Workspace | Classes | Implemented subset, not full equivalence | Implemented subset, not full equivalence | [Workspace](https://docs.obsidian.md/Reference/TypeScript+API/Workspace) |
| WorkspaceFloating | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [WorkspaceFloating](https://docs.obsidian.md/Reference/TypeScript+API/WorkspaceFloating) |
| WorkspaceLeaf | Classes | Unsupported; explicit CompatibilityError | Implemented subset, not full equivalence | [WorkspaceLeaf](https://docs.obsidian.md/Reference/TypeScript+API/WorkspaceLeaf) |
| WorkspaceMobileDrawer | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [WorkspaceMobileDrawer](https://docs.obsidian.md/Reference/TypeScript+API/WorkspaceMobileDrawer) |
| WorkspaceRibbon | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [WorkspaceRibbon](https://docs.obsidian.md/Reference/TypeScript+API/WorkspaceRibbon) |
| WorkspaceRoot | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [WorkspaceRoot](https://docs.obsidian.md/Reference/TypeScript+API/WorkspaceRoot) |
| WorkspaceSidedock | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [WorkspaceSidedock](https://docs.obsidian.md/Reference/TypeScript+API/WorkspaceSidedock) |
| WorkspaceSplit | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [WorkspaceSplit](https://docs.obsidian.md/Reference/TypeScript+API/WorkspaceSplit) |
| WorkspaceTabs | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [WorkspaceTabs](https://docs.obsidian.md/Reference/TypeScript+API/WorkspaceTabs) |
| WorkspaceWindow | Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [WorkspaceWindow](https://docs.obsidian.md/Reference/TypeScript+API/WorkspaceWindow) |
| AbstractInputSuggest | Abstract Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [AbstractInputSuggest](https://docs.obsidian.md/Reference/TypeScript+API/AbstractInputSuggest) |
| BaseComponent | Abstract Classes | Unsupported; explicit CompatibilityError | Implemented subset, not full equivalence | [BaseComponent](https://docs.obsidian.md/Reference/TypeScript+API/BaseComponent) |
| BasesView | Abstract Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [BasesView](https://docs.obsidian.md/Reference/TypeScript+API/BasesView) |
| EditableFileView | Abstract Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [EditableFileView](https://docs.obsidian.md/Reference/TypeScript+API/EditableFileView) |
| Editor | Abstract Classes | Implemented subset, not full equivalence | Implemented subset, not full equivalence | [Editor](https://docs.obsidian.md/Reference/TypeScript+API/Editor) |
| EditorSuggest | Abstract Classes | Unsupported; explicit CompatibilityError | Implemented subset, not full equivalence | [EditorSuggest](https://docs.obsidian.md/Reference/TypeScript+API/EditorSuggest) |
| FileView | Abstract Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [FileView](https://docs.obsidian.md/Reference/TypeScript+API/FileView) |
| FuzzySuggestModal | Abstract Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [FuzzySuggestModal](https://docs.obsidian.md/Reference/TypeScript+API/FuzzySuggestModal) |
| ItemView | Abstract Classes | Unsupported; explicit CompatibilityError | Implemented subset, not full equivalence | [ItemView](https://docs.obsidian.md/Reference/TypeScript+API/ItemView) |
| MarkdownRenderer | Abstract Classes | Unsupported; explicit CompatibilityError | Implemented subset, not full equivalence | [MarkdownRenderer](https://docs.obsidian.md/Reference/TypeScript+API/MarkdownRenderer) |
| NotNullValue | Abstract Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [NotNullValue](https://docs.obsidian.md/Reference/TypeScript+API/NotNullValue) |
| Plugin | Abstract Classes | Implemented subset, not full equivalence | Implemented subset, not full equivalence | [Plugin](https://docs.obsidian.md/Reference/TypeScript+API/Plugin) |
| PluginSettingTab | Abstract Classes | Unsupported; explicit CompatibilityError | Implemented subset, not full equivalence | [PluginSettingTab](https://docs.obsidian.md/Reference/TypeScript+API/PluginSettingTab) |
| PopoverSuggest | Abstract Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [PopoverSuggest](https://docs.obsidian.md/Reference/TypeScript+API/PopoverSuggest) |
| PrimitiveValue | Abstract Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [PrimitiveValue](https://docs.obsidian.md/Reference/TypeScript+API/PrimitiveValue) |
| SettingTab | Abstract Classes | Unsupported; explicit CompatibilityError | Implemented subset, not full equivalence | [SettingTab](https://docs.obsidian.md/Reference/TypeScript+API/SettingTab) |
| SuggestModal | Abstract Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [SuggestModal](https://docs.obsidian.md/Reference/TypeScript+API/SuggestModal) |
| TAbstractFile | Abstract Classes | Implemented subset, not full equivalence | Implemented subset, not full equivalence | [TAbstractFile](https://docs.obsidian.md/Reference/TypeScript+API/TAbstractFile) |
| TextFileView | Abstract Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [TextFileView](https://docs.obsidian.md/Reference/TypeScript+API/TextFileView) |
| Value | Abstract Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [Value](https://docs.obsidian.md/Reference/TypeScript+API/Value) |
| ValueComponent | Abstract Classes | Unsupported; explicit CompatibilityError | Implemented subset, not full equivalence | [ValueComponent](https://docs.obsidian.md/Reference/TypeScript+API/ValueComponent) |
| View | Abstract Classes | Unsupported; explicit CompatibilityError | Implemented subset, not full equivalence | [View](https://docs.obsidian.md/Reference/TypeScript+API/View) |
| WorkspaceContainer | Abstract Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [WorkspaceContainer](https://docs.obsidian.md/Reference/TypeScript+API/WorkspaceContainer) |
| WorkspaceItem | Abstract Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [WorkspaceItem](https://docs.obsidian.md/Reference/TypeScript+API/WorkspaceItem) |
| WorkspaceParent | Abstract Classes | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [WorkspaceParent](https://docs.obsidian.md/Reference/TypeScript+API/WorkspaceParent) |
| PopoverState | Enumerations | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [PopoverState](https://docs.obsidian.md/Reference/TypeScript+API/PopoverState) |
| addIcon | Functions | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [addIcon](https://docs.obsidian.md/Reference/TypeScript+API/addIcon) |
| arrayBufferToBase64 | Functions | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [arrayBufferToBase64](https://docs.obsidian.md/Reference/TypeScript+API/arrayBufferToBase64) |
| arrayBufferToHex | Functions | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [arrayBufferToHex](https://docs.obsidian.md/Reference/TypeScript+API/arrayBufferToHex) |
| base64ToArrayBuffer | Functions | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [base64ToArrayBuffer](https://docs.obsidian.md/Reference/TypeScript+API/base64ToArrayBuffer) |
| debounce | Functions | Implemented subset, not full equivalence | Implemented subset, not full equivalence | [debounce](https://docs.obsidian.md/Reference/TypeScript+API/debounce) |
| displayTooltip | Functions | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [displayTooltip](https://docs.obsidian.md/Reference/TypeScript+API/displayTooltip) |
| finishRenderMath | Functions | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [finishRenderMath](https://docs.obsidian.md/Reference/TypeScript+API/finishRenderMath) |
| getAllTags | Functions | Implemented subset, not full equivalence | Implemented subset, not full equivalence | [getAllTags](https://docs.obsidian.md/Reference/TypeScript+API/getAllTags) |
| getBlobArrayBuffer | Functions | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [getBlobArrayBuffer](https://docs.obsidian.md/Reference/TypeScript+API/getBlobArrayBuffer) |
| getFrontMatterInfo | Functions | Implemented subset, not full equivalence | Implemented subset, not full equivalence | [getFrontMatterInfo](https://docs.obsidian.md/Reference/TypeScript+API/getFrontMatterInfo) |
| getIcon | Functions | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [getIcon](https://docs.obsidian.md/Reference/TypeScript+API/getIcon) |
| getIconIds | Functions | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [getIconIds](https://docs.obsidian.md/Reference/TypeScript+API/getIconIds) |
| getLanguage | Functions | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [getLanguage](https://docs.obsidian.md/Reference/TypeScript+API/getLanguage) |
| getLinkpath | Functions | Implemented subset, not full equivalence | Implemented subset, not full equivalence | [getLinkpath](https://docs.obsidian.md/Reference/TypeScript+API/getLinkpath) |
| hexToArrayBuffer | Functions | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [hexToArrayBuffer](https://docs.obsidian.md/Reference/TypeScript+API/hexToArrayBuffer) |
| htmlToMarkdown | Functions | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [htmlToMarkdown](https://docs.obsidian.md/Reference/TypeScript+API/htmlToMarkdown) |
| iterateCacheRefs | Functions | Implemented subset, not full equivalence | Implemented subset, not full equivalence | [iterateCacheRefs](https://docs.obsidian.md/Reference/TypeScript+API/iterateCacheRefs) |
| iterateRefs | Functions | Implemented subset, not full equivalence | Implemented subset, not full equivalence | [iterateRefs](https://docs.obsidian.md/Reference/TypeScript+API/iterateRefs) |
| loadMathJax | Functions | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [loadMathJax](https://docs.obsidian.md/Reference/TypeScript+API/loadMathJax) |
| loadMermaid | Functions | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [loadMermaid](https://docs.obsidian.md/Reference/TypeScript+API/loadMermaid) |
| loadPdfJs | Functions | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [loadPdfJs](https://docs.obsidian.md/Reference/TypeScript+API/loadPdfJs) |
| loadPrism | Functions | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [loadPrism](https://docs.obsidian.md/Reference/TypeScript+API/loadPrism) |
| normalizePath | Functions | Implemented subset, not full equivalence | Implemented subset, not full equivalence | [normalizePath](https://docs.obsidian.md/Reference/TypeScript+API/normalizePath) |
| parseFrontMatterAliases | Functions | Implemented subset, not full equivalence | Implemented subset, not full equivalence | [parseFrontMatterAliases](https://docs.obsidian.md/Reference/TypeScript+API/parseFrontMatterAliases) |
| parseFrontMatterEntry | Functions | Implemented subset, not full equivalence | Implemented subset, not full equivalence | [parseFrontMatterEntry](https://docs.obsidian.md/Reference/TypeScript+API/parseFrontMatterEntry) |
| parseFrontMatterStringArray | Functions | Implemented subset, not full equivalence | Implemented subset, not full equivalence | [parseFrontMatterStringArray](https://docs.obsidian.md/Reference/TypeScript+API/parseFrontMatterStringArray) |
| parseFrontMatterTags | Functions | Implemented subset, not full equivalence | Implemented subset, not full equivalence | [parseFrontMatterTags](https://docs.obsidian.md/Reference/TypeScript+API/parseFrontMatterTags) |
| parseLinktext | Functions | Implemented subset, not full equivalence | Implemented subset, not full equivalence | [parseLinktext](https://docs.obsidian.md/Reference/TypeScript+API/parseLinktext) |
| parsePropertyId | Functions | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [parsePropertyId](https://docs.obsidian.md/Reference/TypeScript+API/parsePropertyId) |
| parseYaml | Functions | Implemented subset, not full equivalence | Implemented subset, not full equivalence | [parseYaml](https://docs.obsidian.md/Reference/TypeScript+API/parseYaml) |
| prepareFuzzySearch | Functions | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [prepareFuzzySearch](https://docs.obsidian.md/Reference/TypeScript+API/prepareFuzzySearch) |
| prepareSimpleSearch | Functions | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [prepareSimpleSearch](https://docs.obsidian.md/Reference/TypeScript+API/prepareSimpleSearch) |
| removeIcon | Functions | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [removeIcon](https://docs.obsidian.md/Reference/TypeScript+API/removeIcon) |
| renderMatches | Functions | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [renderMatches](https://docs.obsidian.md/Reference/TypeScript+API/renderMatches) |
| renderMath | Functions | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [renderMath](https://docs.obsidian.md/Reference/TypeScript+API/renderMath) |
| renderResults | Functions | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [renderResults](https://docs.obsidian.md/Reference/TypeScript+API/renderResults) |
| request | Functions | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [request](https://docs.obsidian.md/Reference/TypeScript+API/request) |
| requestUrl | Functions | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [requestUrl](https://docs.obsidian.md/Reference/TypeScript+API/requestUrl) |
| requireApiVersion | Functions | Implemented subset, not full equivalence | Implemented subset, not full equivalence | [requireApiVersion](https://docs.obsidian.md/Reference/TypeScript+API/requireApiVersion) |
| resolveSubpath | Functions | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [resolveSubpath](https://docs.obsidian.md/Reference/TypeScript+API/resolveSubpath) |
| sanitizeHTMLToDom | Functions | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [sanitizeHTMLToDom](https://docs.obsidian.md/Reference/TypeScript+API/sanitizeHTMLToDom) |
| setIcon | Functions | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [setIcon](https://docs.obsidian.md/Reference/TypeScript+API/setIcon) |
| setTooltip | Functions | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [setTooltip](https://docs.obsidian.md/Reference/TypeScript+API/setTooltip) |
| sortSearchResults | Functions | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [sortSearchResults](https://docs.obsidian.md/Reference/TypeScript+API/sortSearchResults) |
| stringifyYaml | Functions | Implemented subset, not full equivalence | Implemented subset, not full equivalence | [stringifyYaml](https://docs.obsidian.md/Reference/TypeScript+API/stringifyYaml) |
| stripHeading | Functions | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [stripHeading](https://docs.obsidian.md/Reference/TypeScript+API/stripHeading) |
| stripHeadingForLink | Functions | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [stripHeadingForLink](https://docs.obsidian.md/Reference/TypeScript+API/stripHeadingForLink) |
| BasesConfigFile | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [BasesConfigFile](https://docs.obsidian.md/Reference/TypeScript+API/BasesConfigFile) |
| BasesConfigFileView | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [BasesConfigFileView](https://docs.obsidian.md/Reference/TypeScript+API/BasesConfigFileView) |
| BasesDropdownOption | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [BasesDropdownOption](https://docs.obsidian.md/Reference/TypeScript+API/BasesDropdownOption) |
| BasesFileOption | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [BasesFileOption](https://docs.obsidian.md/Reference/TypeScript+API/BasesFileOption) |
| BasesFolderOption | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [BasesFolderOption](https://docs.obsidian.md/Reference/TypeScript+API/BasesFolderOption) |
| BasesFormulaOption | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [BasesFormulaOption](https://docs.obsidian.md/Reference/TypeScript+API/BasesFormulaOption) |
| BasesMultitextOption | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [BasesMultitextOption](https://docs.obsidian.md/Reference/TypeScript+API/BasesMultitextOption) |
| BasesOption | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [BasesOption](https://docs.obsidian.md/Reference/TypeScript+API/BasesOption) |
| BasesOptionGroup | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [BasesOptionGroup](https://docs.obsidian.md/Reference/TypeScript+API/BasesOptionGroup) |
| BasesProperty | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [BasesProperty](https://docs.obsidian.md/Reference/TypeScript+API/BasesProperty) |
| BasesPropertyOption | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [BasesPropertyOption](https://docs.obsidian.md/Reference/TypeScript+API/BasesPropertyOption) |
| BasesSliderOption | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [BasesSliderOption](https://docs.obsidian.md/Reference/TypeScript+API/BasesSliderOption) |
| BasesTextOption | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [BasesTextOption](https://docs.obsidian.md/Reference/TypeScript+API/BasesTextOption) |
| BasesToggleOption | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [BasesToggleOption](https://docs.obsidian.md/Reference/TypeScript+API/BasesToggleOption) |
| BasesViewRegistration | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [BasesViewRegistration](https://docs.obsidian.md/Reference/TypeScript+API/BasesViewRegistration) |
| BlockCache | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [BlockCache](https://docs.obsidian.md/Reference/TypeScript+API/BlockCache) |
| BlockSubpathResult | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [BlockSubpathResult](https://docs.obsidian.md/Reference/TypeScript+API/BlockSubpathResult) |
| CachedMetadata | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [CachedMetadata](https://docs.obsidian.md/Reference/TypeScript+API/CachedMetadata) |
| CacheItem | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [CacheItem](https://docs.obsidian.md/Reference/TypeScript+API/CacheItem) |
| CliData | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [CliData](https://docs.obsidian.md/Reference/TypeScript+API/CliData) |
| CliFlag | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [CliFlag](https://docs.obsidian.md/Reference/TypeScript+API/CliFlag) |
| CloseableComponent | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [CloseableComponent](https://docs.obsidian.md/Reference/TypeScript+API/CloseableComponent) |
| Command | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [Command](https://docs.obsidian.md/Reference/TypeScript+API/Command) |
| DataAdapter | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [DataAdapter](https://docs.obsidian.md/Reference/TypeScript+API/DataAdapter) |
| DataWriteOptions | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [DataWriteOptions](https://docs.obsidian.md/Reference/TypeScript+API/DataWriteOptions) |
| Debouncer | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [Debouncer](https://docs.obsidian.md/Reference/TypeScript+API/Debouncer) |
| EditorChange | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [EditorChange](https://docs.obsidian.md/Reference/TypeScript+API/EditorChange) |
| EditorPosition | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [EditorPosition](https://docs.obsidian.md/Reference/TypeScript+API/EditorPosition) |
| EditorRange | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [EditorRange](https://docs.obsidian.md/Reference/TypeScript+API/EditorRange) |
| EditorRangeOrCaret | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [EditorRangeOrCaret](https://docs.obsidian.md/Reference/TypeScript+API/EditorRangeOrCaret) |
| EditorScrollInfo | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [EditorScrollInfo](https://docs.obsidian.md/Reference/TypeScript+API/EditorScrollInfo) |
| EditorSelection | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [EditorSelection](https://docs.obsidian.md/Reference/TypeScript+API/EditorSelection) |
| EditorSelectionOrCaret | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [EditorSelectionOrCaret](https://docs.obsidian.md/Reference/TypeScript+API/EditorSelectionOrCaret) |
| EditorSuggestContext | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [EditorSuggestContext](https://docs.obsidian.md/Reference/TypeScript+API/EditorSuggestContext) |
| EditorSuggestTriggerInfo | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [EditorSuggestTriggerInfo](https://docs.obsidian.md/Reference/TypeScript+API/EditorSuggestTriggerInfo) |
| EditorTransaction | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [EditorTransaction](https://docs.obsidian.md/Reference/TypeScript+API/EditorTransaction) |
| EmbedCache | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [EmbedCache](https://docs.obsidian.md/Reference/TypeScript+API/EmbedCache) |
| EventRef | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [EventRef](https://docs.obsidian.md/Reference/TypeScript+API/EventRef) |
| FileStats | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [FileStats](https://docs.obsidian.md/Reference/TypeScript+API/FileStats) |
| FootnoteCache | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [FootnoteCache](https://docs.obsidian.md/Reference/TypeScript+API/FootnoteCache) |
| FootnoteRefCache | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [FootnoteRefCache](https://docs.obsidian.md/Reference/TypeScript+API/FootnoteRefCache) |
| FootnoteSubpathResult | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [FootnoteSubpathResult](https://docs.obsidian.md/Reference/TypeScript+API/FootnoteSubpathResult) |
| FormulaContext | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [FormulaContext](https://docs.obsidian.md/Reference/TypeScript+API/FormulaContext) |
| FrontMatterCache | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [FrontMatterCache](https://docs.obsidian.md/Reference/TypeScript+API/FrontMatterCache) |
| FrontMatterInfo | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [FrontMatterInfo](https://docs.obsidian.md/Reference/TypeScript+API/FrontMatterInfo) |
| FrontmatterLinkCache | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [FrontmatterLinkCache](https://docs.obsidian.md/Reference/TypeScript+API/FrontmatterLinkCache) |
| FuzzyMatch | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [FuzzyMatch](https://docs.obsidian.md/Reference/TypeScript+API/FuzzyMatch) |
| HeadingCache | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [HeadingCache](https://docs.obsidian.md/Reference/TypeScript+API/HeadingCache) |
| HeadingSubpathResult | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [HeadingSubpathResult](https://docs.obsidian.md/Reference/TypeScript+API/HeadingSubpathResult) |
| Hotkey | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [Hotkey](https://docs.obsidian.md/Reference/TypeScript+API/Hotkey) |
| HoverLinkSource | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [HoverLinkSource](https://docs.obsidian.md/Reference/TypeScript+API/HoverLinkSource) |
| HoverParent | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [HoverParent](https://docs.obsidian.md/Reference/TypeScript+API/HoverParent) |
| HSL | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [HSL](https://docs.obsidian.md/Reference/TypeScript+API/HSL) |
| Instruction | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [Instruction](https://docs.obsidian.md/Reference/TypeScript+API/Instruction) |
| ISuggestOwner | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [ISuggestOwner](https://docs.obsidian.md/Reference/TypeScript+API/ISuggestOwner) |
| KeymapContext | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [KeymapContext](https://docs.obsidian.md/Reference/TypeScript+API/KeymapContext) |
| KeymapEventHandler | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [KeymapEventHandler](https://docs.obsidian.md/Reference/TypeScript+API/KeymapEventHandler) |
| KeymapInfo | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [KeymapInfo](https://docs.obsidian.md/Reference/TypeScript+API/KeymapInfo) |
| LinkCache | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [LinkCache](https://docs.obsidian.md/Reference/TypeScript+API/LinkCache) |
| ListedFiles | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [ListedFiles](https://docs.obsidian.md/Reference/TypeScript+API/ListedFiles) |
| ListItemCache | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [ListItemCache](https://docs.obsidian.md/Reference/TypeScript+API/ListItemCache) |
| LivePreviewStateType | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [LivePreviewStateType](https://docs.obsidian.md/Reference/TypeScript+API/LivePreviewStateType) |
| Loc | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [Loc](https://docs.obsidian.md/Reference/TypeScript+API/Loc) |
| MarkdownFileInfo | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [MarkdownFileInfo](https://docs.obsidian.md/Reference/TypeScript+API/MarkdownFileInfo) |
| MarkdownPostProcessor | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [MarkdownPostProcessor](https://docs.obsidian.md/Reference/TypeScript+API/MarkdownPostProcessor) |
| MarkdownPostProcessorContext | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [MarkdownPostProcessorContext](https://docs.obsidian.md/Reference/TypeScript+API/MarkdownPostProcessorContext) |
| MarkdownPreviewEvents | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [MarkdownPreviewEvents](https://docs.obsidian.md/Reference/TypeScript+API/MarkdownPreviewEvents) |
| MarkdownSectionInformation | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [MarkdownSectionInformation](https://docs.obsidian.md/Reference/TypeScript+API/MarkdownSectionInformation) |
| MarkdownSubView | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [MarkdownSubView](https://docs.obsidian.md/Reference/TypeScript+API/MarkdownSubView) |
| MenuPositionDef | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [MenuPositionDef](https://docs.obsidian.md/Reference/TypeScript+API/MenuPositionDef) |
| ObsidianProtocolData | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [ObsidianProtocolData](https://docs.obsidian.md/Reference/TypeScript+API/ObsidianProtocolData) |
| OpenViewState | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [OpenViewState](https://docs.obsidian.md/Reference/TypeScript+API/OpenViewState) |
| PluginManifest | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [PluginManifest](https://docs.obsidian.md/Reference/TypeScript+API/PluginManifest) |
| Point | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [Point](https://docs.obsidian.md/Reference/TypeScript+API/Point) |
| Pos | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [Pos](https://docs.obsidian.md/Reference/TypeScript+API/Pos) |
| Reference | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [Reference](https://docs.obsidian.md/Reference/TypeScript+API/Reference) |
| ReferenceCache | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [ReferenceCache](https://docs.obsidian.md/Reference/TypeScript+API/ReferenceCache) |
| ReferenceLinkCache | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [ReferenceLinkCache](https://docs.obsidian.md/Reference/TypeScript+API/ReferenceLinkCache) |
| RequestUrlParam | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [RequestUrlParam](https://docs.obsidian.md/Reference/TypeScript+API/RequestUrlParam) |
| RequestUrlResponse | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [RequestUrlResponse](https://docs.obsidian.md/Reference/TypeScript+API/RequestUrlResponse) |
| RequestUrlResponsePromise | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [RequestUrlResponsePromise](https://docs.obsidian.md/Reference/TypeScript+API/RequestUrlResponsePromise) |
| RGB | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [RGB](https://docs.obsidian.md/Reference/TypeScript+API/RGB) |
| SearchResult | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [SearchResult](https://docs.obsidian.md/Reference/TypeScript+API/SearchResult) |
| SearchResultContainer | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [SearchResultContainer](https://docs.obsidian.md/Reference/TypeScript+API/SearchResultContainer) |
| SectionCache | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [SectionCache](https://docs.obsidian.md/Reference/TypeScript+API/SectionCache) |
| Stat | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [Stat](https://docs.obsidian.md/Reference/TypeScript+API/Stat) |
| SubpathResult | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [SubpathResult](https://docs.obsidian.md/Reference/TypeScript+API/SubpathResult) |
| TagCache | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [TagCache](https://docs.obsidian.md/Reference/TypeScript+API/TagCache) |
| TooltipOptions | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [TooltipOptions](https://docs.obsidian.md/Reference/TypeScript+API/TooltipOptions) |
| ViewState | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [ViewState](https://docs.obsidian.md/Reference/TypeScript+API/ViewState) |
| ViewStateResult | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [ViewStateResult](https://docs.obsidian.md/Reference/TypeScript+API/ViewStateResult) |
| WorkspaceWindowInitData | Interfaces | Type only; runtime access rejected | Type only; runtime access rejected | [WorkspaceWindowInitData](https://docs.obsidian.md/Reference/TypeScript+API/WorkspaceWindowInitData) |
| apiVersion | Variables | Implemented subset, not full equivalence | Implemented subset, not full equivalence | [apiVersion](https://docs.obsidian.md/Reference/TypeScript+API/apiVersion) |
| editorEditorField | Variables | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [editorEditorField](https://docs.obsidian.md/Reference/TypeScript+API/editorEditorField) |
| editorInfoField | Variables | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [editorInfoField](https://docs.obsidian.md/Reference/TypeScript+API/editorInfoField) |
| editorLivePreviewField | Variables | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [editorLivePreviewField](https://docs.obsidian.md/Reference/TypeScript+API/editorLivePreviewField) |
| editorViewField | Variables | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [editorViewField](https://docs.obsidian.md/Reference/TypeScript+API/editorViewField) |
| livePreviewState | Variables | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [livePreviewState](https://docs.obsidian.md/Reference/TypeScript+API/livePreviewState) |
| moment | Variables | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [moment](https://docs.obsidian.md/Reference/TypeScript+API/moment) |
| Platform | Variables | Unsupported; explicit CompatibilityError | Unsupported; explicit CompatibilityError | [Platform](https://docs.obsidian.md/Reference/TypeScript+API/Platform) |
| BasesAllOptions | Type Aliases | Type only; runtime access rejected | Type only; runtime access rejected | [BasesAllOptions](https://docs.obsidian.md/Reference/TypeScript+API/BasesAllOptions) |
| BasesConfigFileFilter | Type Aliases | Type only; runtime access rejected | Type only; runtime access rejected | [BasesConfigFileFilter](https://docs.obsidian.md/Reference/TypeScript+API/BasesConfigFileFilter) |
| BasesOptions | Type Aliases | Type only; runtime access rejected | Type only; runtime access rejected | [BasesOptions](https://docs.obsidian.md/Reference/TypeScript+API/BasesOptions) |
| BasesPropertyId | Type Aliases | Type only; runtime access rejected | Type only; runtime access rejected | [BasesPropertyId](https://docs.obsidian.md/Reference/TypeScript+API/BasesPropertyId) |
| BasesPropertyType | Type Aliases | Type only; runtime access rejected | Type only; runtime access rejected | [BasesPropertyType](https://docs.obsidian.md/Reference/TypeScript+API/BasesPropertyType) |
| BasesSortConfig | Type Aliases | Type only; runtime access rejected | Type only; runtime access rejected | [BasesSortConfig](https://docs.obsidian.md/Reference/TypeScript+API/BasesSortConfig) |
| BasesViewFactory | Type Aliases | Type only; runtime access rejected | Type only; runtime access rejected | [BasesViewFactory](https://docs.obsidian.md/Reference/TypeScript+API/BasesViewFactory) |
| CliFlags | Type Aliases | Type only; runtime access rejected | Type only; runtime access rejected | [CliFlags](https://docs.obsidian.md/Reference/TypeScript+API/CliFlags) |
| CliHandler | Type Aliases | Type only; runtime access rejected | Type only; runtime access rejected | [CliHandler](https://docs.obsidian.md/Reference/TypeScript+API/CliHandler) |
| Constructor | Type Aliases | Type only; runtime access rejected | Type only; runtime access rejected | [Constructor](https://docs.obsidian.md/Reference/TypeScript+API/Constructor) |
| EditorCommandName | Type Aliases | Type only; runtime access rejected | Type only; runtime access rejected | [EditorCommandName](https://docs.obsidian.md/Reference/TypeScript+API/EditorCommandName) |
| HexString | Type Aliases | Type only; runtime access rejected | Type only; runtime access rejected | [HexString](https://docs.obsidian.md/Reference/TypeScript+API/HexString) |
| IconName | Type Aliases | Type only; runtime access rejected | Type only; runtime access rejected | [IconName](https://docs.obsidian.md/Reference/TypeScript+API/IconName) |
| KeymapEventListener | Type Aliases | Type only; runtime access rejected | Type only; runtime access rejected | [KeymapEventListener](https://docs.obsidian.md/Reference/TypeScript+API/KeymapEventListener) |
| MarkdownViewModeType | Type Aliases | Type only; runtime access rejected | Type only; runtime access rejected | [MarkdownViewModeType](https://docs.obsidian.md/Reference/TypeScript+API/MarkdownViewModeType) |
| Modifier | Type Aliases | Type only; runtime access rejected | Type only; runtime access rejected | [Modifier](https://docs.obsidian.md/Reference/TypeScript+API/Modifier) |
| ObsidianProtocolHandler | Type Aliases | Type only; runtime access rejected | Type only; runtime access rejected | [ObsidianProtocolHandler](https://docs.obsidian.md/Reference/TypeScript+API/ObsidianProtocolHandler) |
| PaneType | Type Aliases | Type only; runtime access rejected | Type only; runtime access rejected | [PaneType](https://docs.obsidian.md/Reference/TypeScript+API/PaneType) |
| SearchMatches | Type Aliases | Type only; runtime access rejected | Type only; runtime access rejected | [SearchMatches](https://docs.obsidian.md/Reference/TypeScript+API/SearchMatches) |
| SearchMatchPart | Type Aliases | Type only; runtime access rejected | Type only; runtime access rejected | [SearchMatchPart](https://docs.obsidian.md/Reference/TypeScript+API/SearchMatchPart) |
| Side | Type Aliases | Type only; runtime access rejected | Type only; runtime access rejected | [Side](https://docs.obsidian.md/Reference/TypeScript+API/Side) |
| SplitDirection | Type Aliases | Type only; runtime access rejected | Type only; runtime access rejected | [SplitDirection](https://docs.obsidian.md/Reference/TypeScript+API/SplitDirection) |
| TooltipPlacement | Type Aliases | Type only; runtime access rejected | Type only; runtime access rejected | [TooltipPlacement](https://docs.obsidian.md/Reference/TypeScript+API/TooltipPlacement) |
| UserEvent | Type Aliases | Type only; runtime access rejected | Type only; runtime access rejected | [UserEvent](https://docs.obsidian.md/Reference/TypeScript+API/UserEvent) |
| ViewCreator | Type Aliases | Type only; runtime access rejected | Type only; runtime access rejected | [ViewCreator](https://docs.obsidian.md/Reference/TypeScript+API/ViewCreator) |
