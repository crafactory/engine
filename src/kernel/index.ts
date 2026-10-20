/* Public surface of the native plugin kernel. See docs/KERNEL-SPEC.md. */
export {Kernel, Scope} from './kernel';
export type {ExecutionMode, KernelOptions, PluginContext, PluginDefinition, PluginManifest, ScopeKind, ServiceProvision, ServiceRequirement} from './kernel';
export {AssemblyError, formatDiagnostic, errorDiagnostic} from './diagnostics';
export type {Diagnostic, DiagnosticCode, DiagnosticSeverity} from './diagnostics';
export {EffectScope} from './effects';
export type {Disposable} from './effects';
export {EventBus} from './events';
export type {EmitOptions, EventDeclaration, EventListener, EventRef, EventStrategy} from './events';
export {ServiceRegistry} from './services';
export type {ProvideOutcome, ResolveOutcome, ServiceBinding} from './services';
export {compareVersions, parseVersion, satisfiesVersion} from './semver';
export type {ParsedVersion} from './semver';
export {PLUGIN_PERMISSIONS, requiredPermission, checkPermission, readableSnapshot} from './permissions';
export type {PluginPermission} from './permissions';
export {validatePluginPackage} from './package';
export type {PackageIssue, PackageIssueCode, PackageValidation, PluginPackageInput} from './package';
