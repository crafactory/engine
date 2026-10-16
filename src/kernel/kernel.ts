/* Native plugin assembly kernel.
 *
 * This module owns plugin composition only: manifest validation, the dependency
 * graph, versioned service contracts, scoped effects and lifecycle. It does not
 * parse Markdown, render a workspace or implement any product feature. See
 * docs/KERNEL-SPEC.md for the specification this file implements.
 */
import {AssemblyError, errorDiagnostic, type Diagnostic} from './diagnostics';
import {EffectScope, type Disposable} from './effects';
import {EventBus, type EmitOptions, type EventListener, type EventStrategy} from './events';
import {parseVersion, satisfiesVersion} from './semver';
import {ServiceRegistry, type ResolveOutcome, type ServiceBinding} from './services';

export type ExecutionMode = 'worker' | 'renderer' | 'ipc';
export type ScopeKind = 'runtime' | 'vault' | 'window' | 'leaf' | 'document';

export interface ServiceRequirement {contract: string; range?: string; optional?: boolean}
export interface ServiceProvision {contract: string; version: string}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  engine?: string;
  execution?: ExecutionMode;
  scopes?: ScopeKind[];
  provides?: ServiceProvision[];
  consumes?: ServiceRequirement[];
  permissions?: string[];
}

/** The capabilities a plugin instance may use, bound to its owning scope and effects. */
export interface PluginContext {
  readonly id: string;
  readonly scope: Readonly<{kind: ScopeKind; key: string}>;
  readonly signal: AbortSignal;
  readonly active: boolean;
  effect(cleanup: () => unknown): Disposable;
  on(event: string, listener: EventListener): void;
  emit(event: string, payload?: unknown, options?: EmitOptions): void | Promise<void>;
  provide(contract: string, version: string, value: unknown): void;
  service<T = unknown>(contract: string, range?: string): T;
  diagnostic(diagnostic: Diagnostic): void;
}

export interface PluginDefinition {
  manifest: PluginManifest;
  setup?(context: PluginContext): void | Promise<void>;
  dispose?(context: PluginContext): void | Promise<void>;
}

export interface KernelOptions {
  /** Concrete kernel version used to check each manifest's `engine` range. */
  engineVersion: string;
  /** Optional contract allowlist; unknown contracts become `unknown-contract` errors. */
  contracts?: string[] | Record<string, string>;
  /** Predeclared event strategies keyed by event name. */
  events?: Record<string, EventStrategy>;
  /** Receives every diagnostic as it is recorded. */
  onDiagnostic?: (diagnostic: Diagnostic) => void;
}

const ID_PATTERN = /^[a-z0-9][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)*$/;
const CONTRACT_PATTERN = /^[a-z][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)*\/v\d+$/;
const SCOPE_KINDS: readonly ScopeKind[] = ['runtime', 'vault', 'window', 'leaf', 'document'];
const EXECUTION_MODES: readonly ExecutionMode[] = ['worker', 'renderer', 'ipc'];

interface Instance {
  definition: PluginDefinition;
  manifest: PluginManifest;
  effects: EffectScope;
  abort: AbortController;
  context: PluginContextImpl;
  provided: Set<string>;
}

/** A scope-bound set of service providers, plugin instances and owned effects. */
export class Scope {
  readonly services = new ServiceRegistry();
  readonly instances = new Map<string, Instance>();
  active = false;
  /** Whether the caller intends this scope to be running; cleared by an explicit `Kernel.stop`. */
  wanted = false;
  /** Tail of the per-scope lifecycle operation chain; serializes start/stop/disable/enable. */
  transition?: Promise<void>;
  /** Plugin ids explicitly disabled in this scope until an explicit enable. */
  readonly disabled = new Set<string>();

  /**
   * @param kernel Owning kernel used to look up definitions and report diagnostics.
   * @param kind Scope kind, one of runtime/vault/window/leaf/document.
   * @param key Caller-chosen identity within the kind, such as a vault path.
   * @param parent Scope whose active services are visible for resolution.
   */
  constructor(readonly kernel: Kernel, readonly kind: ScopeKind, readonly key: string, readonly parent?: Scope) {}

  /** Stable label such as `vault:/home/me/notes` for diagnostics and tests. */
  get label(): string { return this.kind + (this.key ? ':' + this.key : ''); }

  /** Whether this scope finished activation and is awaiting deactivation. */
  get isActive(): boolean { return this.active; }

  /** Resolve a contract locally, then through the parent chain. */
  resolveService(contract: string, range = '*'): ResolveOutcome {
    const local = this.services.resolve(contract, range);
    if (local.ok) return local;
    const inherited = this.parent?.resolveService(contract, range);
    if (inherited?.ok) return inherited;
    if (local.reason === 'mismatch') return local;
    return inherited ?? local;
  }

  /** Report whether a contract is bound in this scope or any ancestor. */
  isVisible(contract: string): boolean { return this.services.has(contract) || !!this.parent?.isVisible(contract); }
}

/** Owns the plugin registry, scopes and assembly lifecycle. */
export class Kernel {
  readonly events: EventBus;
  private readonly definitions = new Map<string, PluginDefinition>();
  private readonly scopeList: Scope[] = [];
  private readonly runtimeScope: Scope;
  private readonly diagnosticLog: Diagnostic[] = [];
  private readonly disabledScopes = new Map<string, Set<Scope>>();
  private readonly allowedContracts?: Set<string>;
  private readonly engineVersion: string;
  private readonly observer?: (diagnostic: Diagnostic) => void;

  /** Validate kernel options and create the runtime scope. */
  constructor(options: KernelOptions) {
    if (!parseVersion(options.engineVersion)) throw new Error('Invalid kernel engine version: ' + options.engineVersion);
    this.engineVersion = options.engineVersion;
    this.observer = options.onDiagnostic;
    if (options.contracts) this.allowedContracts = new Set(Array.isArray(options.contracts) ? options.contracts : Object.keys(options.contracts));
    this.events = new EventBus();
    for (const [name, strategy] of Object.entries(options.events ?? {})) this.events.declare(name, strategy);
    this.runtimeScope = new Scope(this, 'runtime', '', undefined);
    this.scopeList.push(this.runtimeScope);
  }

  /** The implicit runtime scope whose parent is absent. */
  get runtime(): Scope { return this.runtimeScope; }

  /** Every diagnostic recorded since construction. */
  get diagnostics(): readonly Diagnostic[] { return this.diagnosticLog; }

  /** Validate and register a plugin definition for later assembly. */
  register(definition: PluginDefinition): void {
    const problems = validateManifest(definition?.manifest);
    if (problems.length) { this.recordAll(problems); throw new AssemblyError(problems); }
    const id = definition.manifest.id;
    if (this.definitions.has(id)) {
      const duplicate = errorDiagnostic('duplicate-plugin', `Plugin ${id} is already registered`, {plugin: id});
      this.record(duplicate);
      throw new AssemblyError([duplicate]);
    }
    this.definitions.set(id, definition);
  }

  /** Get or create a scope. Only one runtime scope exists; other kinds key by identity. */
  createScope(kind: ScopeKind, key = ''): Scope {
    if (!SCOPE_KINDS.includes(kind)) throw new Error('Unknown scope kind: ' + kind);
    if (kind === 'runtime') return this.runtimeScope;
    const existing = this.scopeList.find(scope => scope.kind === kind && scope.key === key);
    if (existing) return existing;
    const scope = new Scope(this, kind, key, this.runtimeScope);
    this.scopeList.push(scope);
    return scope;
  }

  /** Activate the runtime scope first, then every created child in creation order. */
  async start(): Promise<void> {
    for (const scope of [...this.scopeList]) await this.startScope(scope);
  }

  /** Deactivate every scope in reverse creation order. */
  async stop(): Promise<void> {
    for (const scope of [...this.scopeList].reverse()) { scope.wanted = false; await this.stopScope(scope); }
  }

  /** Activate one scope in dependency order; throws with diagnostics on failure. */
  startScope(scope: Scope): Promise<void> {
    if (scope.kernel !== this) return Promise.reject(new Error('Scope does not belong to this kernel'));
    return this.serializeScope(scope, async () => {
      if (scope.active) return;
      await this.activateScope(scope);
      scope.wanted = true;
    });
  }

  /** Deactivate one scope and its active descendants, recording cleanup failures. */
  stopScope(scope: Scope): Promise<void> {
    if (scope.kernel !== this) return Promise.reject(new Error('Scope does not belong to this kernel'));
    return this.serializeScope(scope, async () => {
      if (!scope.active) return;
      for (const child of this.childScopes(scope)) await this.stopScope(child);
      scope.active = false;
      this.recordAll(await this.deactivateInstances([...scope.instances.values()]));
    });
  }

  /** Reload every active scope that owns the given plugin id, restarting descendants too. */
  async reload(id: string): Promise<void> {
    const owning = this.scopeList.filter(scope => scope.isActive && scope.instances.has(id));
    if (!owning.length) throw new Error('Plugin is not active: ' + id);
    // Reload only top-most owners; a descendant owner is restarted with its ancestor.
    const roots = owning.filter(scope => !owning.some(other => other !== scope && isAncestor(other, scope)));
    for (const scope of roots) {
      const restart = this.scopeList.filter(candidate => (candidate === scope || isAncestor(scope, candidate)) && candidate.isActive);
      await this.stopScope(scope);
      for (const candidate of restart) await this.startScope(candidate);
    }
  }

  /**
   * Deactivate a plugin, every active transitive required consumer of its contracts and
   * active descendant scopes, keeping it disabled until an explicit enable. The work is
   * serialized per scope with start/stop so a disposal hook runs once.
   */
  async disable(id: string): Promise<void> {
    const affected: Scope[] = [];
    for (const scope of this.scopeList) {
      if (!scope.active || !scope.instances.has(id)) continue;
      affected.push(scope);
      const descendants = this.scopeList.filter(candidate => candidate.active && isAncestor(scope, candidate));
      for (const child of descendants) affected.push(child);
      await this.serializeScope(scope, async () => {
        if (!scope.active || !scope.instances.has(id)) return;
        scope.disabled.add(id);
        // Stop dependent descendant scopes before removing a provider they may resolve.
        for (const child of descendants) await this.stopScope(child);
        const ids = this.dependentIds(scope, id);
        const instances = [...scope.instances.values()].filter(instance => ids.has(instance.manifest.id));
        this.recordAll(await this.deactivateInstances(instances));
        this.record({code: 'dependency-disabled', severity: 'warning', message: `Disabled ${id} and ${ids.size - 1} dependent plugin(s) in ${scope.label}`, plugin: id, scope: scope.label});
      });
    }
    if (!affected.length) throw new Error('Plugin is not active: ' + id);
    this.disabledScopes.set(id, new Set(affected));
  }

  /**
   * Re-enable a previously disabled plugin. Active affected scopes are restarted with
   * their recorded descendants so every consumer re-resolves a fresh provider; a scope
   * the caller explicitly stopped stays stopped. Disabled state is retained if
   * reactivation fails so the caller can retry.
   */
  async enable(id: string): Promise<void> {
    const scopes = this.disabledScopes.get(id);
    if (!scopes) throw new Error('Plugin is not disabled: ' + id);
    for (const scope of scopes) scope.disabled.delete(id);
    const list = [...scopes];
    const roots = list.filter(scope => !list.some(other => other !== scope && isAncestor(other, scope)));
    const restarted: Scope[] = [];
    try {
      for (const root of roots) {
        if (!root.wanted) continue;
        const restart = this.scopeList.filter(candidate => (candidate === root || isAncestor(root, candidate)) && scopes.has(candidate));
        await this.stopScope(root);
        restarted.push(root);
        for (const candidate of restart) await this.startScope(candidate);
      }
    } catch (error) {
      // Leave no scope running that was restarted before the failure.
      for (const root of restarted) if (root.active) await this.stopScope(root);
      for (const scope of scopes) scope.disabled.add(id);
      throw error;
    }
    this.disabledScopes.delete(id);
  }

  /** Plugin ids that must be disabled with a provider: itself plus transitive required consumers. */
  private dependentIds(scope: Scope, root: string): Set<string> {
    const included = new Set<string>([root]);
    const provided = new Set<string>();
    const include = (id: string): void => {
      included.add(id);
      for (const provision of this.definitions.get(id)?.manifest.provides ?? []) provided.add(provision.contract);
    };
    include(root);
    let changed = true;
    while (changed) {
      changed = false;
      for (const [id, definition] of this.definitions) {
        if (included.has(id) || !scope.instances.has(id) || !scopesFor(definition).includes(scope.kind)) continue;
        const required = (definition.manifest.consumes ?? []).some(requirement => !requirement.optional && provided.has(requirement.contract));
        if (required) { include(id); changed = true; }
      }
    }
    return included;
  }

  /** Run a lifecycle operation per scope, chained behind any in-flight operation on it. */
  private serializeScope<T>(scope: Scope, operation: () => Promise<T>): Promise<T> {
    const run = (scope.transition ?? Promise.resolve()).then(operation, operation);
    scope.transition = run.then(() => undefined, () => undefined);
    return run;
  }

  /** Plugin ids excluded from activation: explicit disables plus their required consumers. */
  private disabledClosure(scope: Scope): Set<string> {
    const included = new Set(scope.disabled);
    const provided = new Set<string>();
    for (const id of included) for (const provision of this.definitions.get(id)?.manifest.provides ?? []) provided.add(provision.contract);
    let changed = true;
    while (changed) {
      changed = false;
      for (const [id, definition] of this.definitions) {
        if (included.has(id) || !scopesFor(definition).includes(scope.kind)) continue;
        if ((definition.manifest.consumes ?? []).some(requirement => !requirement.optional && provided.has(requirement.contract))) {
          included.add(id);
          for (const provision of definition.manifest.provides ?? []) provided.add(provision.contract);
          changed = true;
        }
      }
    }
    return included;
  }

  /** Active children of a scope, used to stop consumers before their provider scope. */
  private childScopes(scope: Scope): Scope[] {
    return [...this.scopeList].reverse().filter(candidate => candidate.parent === scope && candidate.active);
  }

  /** Run activation for a scope that is not already starting. */
  private async activateScope(scope: Scope): Promise<void> {
    const excluded = this.disabledClosure(scope);
    const candidates = [...this.definitions.values()].filter(definition => scopesFor(definition).includes(scope.kind) && !excluded.has(definition.manifest.id));
    const errors = this.collectAssemblyErrors(scope, candidates);
    if (errors.length) { this.recordAll(errors); throw new AssemblyError(errors); }
    const order = topological(candidates.map(definition => definition.manifest.id), this.buildEdges(candidates));
    if (order.cycle) {
      const cycle = errorDiagnostic('dependency-cycle', `Dependency cycle: ${order.cycle.join(' -> ')}`, {scope: scope.label});
      this.record(cycle);
      throw new AssemblyError([cycle]);
    }
    const activated: Instance[] = [];
    try {
      for (const id of order.order) {
        const instance = this.createInstance(scope, this.definitions.get(id)!);
        scope.instances.set(id, instance);
        activated.push(instance);
        await this.startInstance(instance);
      }
      scope.active = true;
    } catch (error) {
      const cleanup = await this.deactivateInstances(activated);
      const failure = errorDiagnostic('activation-failure', error instanceof Error ? error.message : String(error), {scope: scope.label, cause: error instanceof Error ? error.name : undefined});
      const combined = [failure, ...cleanup];
      this.recordAll(combined);
      throw new AssemblyError(combined);
    }
  }

  /** Record one diagnostic to the log and the optional observer. */
  private record(diagnostic: Diagnostic): void {
    this.diagnosticLog.push(diagnostic);
    try { this.observer?.(diagnostic); }
    catch { /* An observer cannot veto assembly or hide the recorded diagnostics. */ }
  }

  /** Record many diagnostics in order. */
  private recordAll(diagnostics: Diagnostic[]): void {
    for (const diagnostic of diagnostics) this.record(diagnostic);
  }

  /** Collect static assembly errors before any activation side effect runs. */
  private collectAssemblyErrors(scope: Scope, candidates: PluginDefinition[]): Diagnostic[] {
    const errors: Diagnostic[] = [];
    const providers = new Map<string, {plugin: string; version: string}>();
    for (const definition of candidates) {
      const manifest = definition.manifest;
      if (manifest.engine && !satisfiesVersion(this.engineVersion, manifest.engine)) {
        errors.push(errorDiagnostic('engine-mismatch', `Plugin ${manifest.id} requires engine ${manifest.engine}, kernel is ${this.engineVersion}`, {plugin: manifest.id, scope: scope.label}));
      }
      for (const provision of manifest.provides ?? []) {
        if (this.allowedContracts && !this.allowedContracts.has(provision.contract)) errors.push(errorDiagnostic('unknown-contract', `Unknown provided contract ${provision.contract}`, {plugin: manifest.id, contract: provision.contract, scope: scope.label}));
        const existing = providers.get(provision.contract);
        if (existing) errors.push(errorDiagnostic('duplicate-provider', `${provision.contract} is provided by both ${existing.plugin} and ${manifest.id}`, {plugin: manifest.id, contract: provision.contract, scope: scope.label}));
        else providers.set(provision.contract, {plugin: manifest.id, version: provision.version});
      }
      for (const requirement of manifest.consumes ?? []) {
        if (this.allowedContracts && !this.allowedContracts.has(requirement.contract)) errors.push(errorDiagnostic('unknown-contract', `Unknown required contract ${requirement.contract}`, {plugin: manifest.id, contract: requirement.contract, scope: scope.label}));
      }
    }
    for (const definition of candidates) {
      for (const requirement of definition.manifest.consumes ?? []) {
        const range = requirement.range ?? '*';
        const provider = providers.get(requirement.contract);
        if (provider) {
          if (!satisfiesVersion(provider.version, range)) errors.push(errorDiagnostic('version-mismatch', `${definition.manifest.id} needs ${requirement.contract} ${range} but ${provider.plugin} provides ${provider.version}`, {plugin: definition.manifest.id, contract: requirement.contract, scope: scope.label}));
          continue;
        }
        const inherited = scope.parent?.resolveService(requirement.contract, range);
        if (inherited?.ok) continue;
        if (requirement.optional) continue;
        if (inherited?.reason === 'mismatch') errors.push(errorDiagnostic('version-mismatch', `${definition.manifest.id} needs ${requirement.contract} ${range} but ancestor provides ${inherited.binding.version}`, {plugin: definition.manifest.id, contract: requirement.contract, scope: scope.label}));
        else errors.push(errorDiagnostic('missing-provider', `No provider for ${requirement.contract} ${range} in ${scope.label} or its ancestors`, {plugin: definition.manifest.id, contract: requirement.contract, scope: scope.label}));
      }
    }
    return errors;
  }

  /** Build dependency edges from each consumer to its in-scope providers. */
  private buildEdges(candidates: PluginDefinition[]): Map<string, Set<string>> {
    const providers = new Map<string, string>();
    for (const definition of candidates) for (const provision of definition.manifest.provides ?? []) providers.set(provision.contract, definition.manifest.id);
    const edges = new Map<string, Set<string>>();
    for (const definition of candidates) {
      const id = definition.manifest.id;
      const dependencies = edges.get(id) ?? new Set<string>();
      edges.set(id, dependencies);
      for (const requirement of definition.manifest.consumes ?? []) {
        const provider = providers.get(requirement.contract);
        if (provider && provider !== id) dependencies.add(provider);
      }
    }
    return edges;
  }

  /** Create the isolated context and effects owned by one plugin instance. */
  private createInstance(scope: Scope, definition: PluginDefinition): Instance {
    const abort = new AbortController();
    const manifest = definition.manifest;
    const effects = new EffectScope(() => this.record({code: 'late-registration', severity: 'warning', message: `Late effect registration after ${manifest.id} was disposed`, plugin: manifest.id, scope: scope.label}));
    const instance: Instance = {definition, manifest, effects, abort, context: undefined as unknown as PluginContextImpl, provided: new Set()};
    instance.context = new PluginContextImpl(this, scope, instance);
    return instance;
  }

  /** Run one plugin's setup, verify its declared provisions were actually supplied. */
  private async startInstance(instance: Instance): Promise<void> {
    await instance.definition.setup?.(instance.context);
    for (const provision of instance.manifest.provides ?? []) {
      if (!instance.provided.has(provision.contract)) throw new Error(`Plugin ${instance.manifest.id} declared ${provision.contract} but did not provide it`);
    }
  }

  /** Dispose instances in reverse activation order and record any cleanup failures. */
  private async deactivateInstances(instances: Instance[]): Promise<Diagnostic[]> {
    const failures: Diagnostic[] = [];
    for (const instance of [...instances].reverse()) {
      const scope = instance.context.scopeRef;
      instance.context.deactivate();
      try { await instance.definition.dispose?.(instance.context); }
      catch (error) { failures.push(errorDiagnostic('cleanup-failure', `Dispose hook failed for ${instance.manifest.id}`, {plugin: instance.manifest.id, scope: scope.label, cause: error instanceof Error ? error.message : String(error)})); }
      const failedEffects = await instance.effects.dispose();
      if (failedEffects) failures.push(errorDiagnostic('cleanup-failure', `${failedEffects} effect cleanup(s) failed for ${instance.manifest.id}`, {plugin: instance.manifest.id, scope: scope.label}));
      if (scope.instances.get(instance.manifest.id) === instance) {
        scope.services.removeProvider(instance.manifest.id);
        scope.instances.delete(instance.manifest.id);
      }
    }
    return failures;
  }

  /** Bind a plugin-provided service after checking the declaration and duplicate rules. */
  bindService(scope: Scope, instance: Instance, contract: string, version: string, value: unknown): void {
    const declaration = (instance.manifest.provides ?? []).find(provision => provision.contract === contract);
    if (!declaration) throw new Error(`Plugin ${instance.manifest.id} did not declare provided contract ${contract}`);
    if (!parseVersion(version)) throw new Error(`Invalid service version ${version} from ${instance.manifest.id}`);
    if (declaration.version !== version) throw new Error(`Plugin ${instance.manifest.id} provided ${contract} as ${version}, declared ${declaration.version}`);
    if (instance.provided.has(contract)) throw new Error(`Plugin ${instance.manifest.id} already provided ${contract}`);
    const binding: ServiceBinding = {contract, version, provider: instance.manifest.id, scope: scope.label, value};
    const outcome = scope.services.provide(binding);
    if (!outcome.ok) throw new Error(`${contract} is already provided by ${outcome.conflict.provider}`);
    instance.provided.add(contract);
  }

  /** Record a plugin-authored diagnostic and tag it with the plugin scope when omitted. */
  report(scope: Scope, instance: Instance, diagnostic: Diagnostic): void {
    this.record({...diagnostic, plugin: diagnostic.plugin ?? instance.manifest.id, scope: diagnostic.scope ?? scope.label});
  }
}

/** Concrete context handed to a plugin's setup/dispose hooks. */
class PluginContextImpl implements PluginContext {
  private isActive = true;

  constructor(private readonly kernel: Kernel, readonly scopeRef: Scope, private readonly instance: Instance) {}

  get id(): string { return this.instance.manifest.id; }
  get scope(): Readonly<{kind: ScopeKind; key: string}> { return {kind: this.scopeRef.kind, key: this.scopeRef.key}; }
  get signal(): AbortSignal { return this.instance.abort.signal; }
  get active(): boolean { return this.isActive; }

  /** Revoke this context immediately: reject new effects and abort waiters. */
  deactivate(): void { this.isActive = false; this.instance.abort.abort(); }

  /** Own a cleanup callback for this plugin instance. */
  effect(cleanup: () => unknown): Disposable { return this.instance.effects.add(cleanup); }

  /** Subscribe to a declared event; the listener is removed with this instance. */
  on(event: string, listener: EventListener): void {
    if (!this.isActive) throw new Error(`Plugin ${this.id} is not active`);
    this.kernel.events.on(event, listener, this.instance.effects);
  }

  /** Emit a declared event using its fixed delivery strategy. */
  emit(event: string, payload?: unknown, options?: EmitOptions): void | Promise<void> {
    if (!this.isActive) throw new Error(`Plugin ${this.id} is not active`);
    return this.kernel.events.emit(event, payload, options);
  }

  /** Publish a service value for the declared contract. */
  provide(contract: string, version: string, value: unknown): void {
    if (!this.isActive) throw new Error(`Plugin ${this.id} is not active`);
    this.kernel.bindService(this.scopeRef, this.instance, contract, version, value);
  }

  /** Resolve a required service, throwing a precise message when unavailable. */
  service<T = unknown>(contract: string, range = '*'): T {
    const outcome = this.scopeRef.resolveService(contract, range);
    if (!outcome.ok) {
      if (outcome.reason === 'mismatch') throw new Error(`Service ${contract} ${range}: provider ${outcome.binding.provider} has version ${outcome.binding.version}`);
      throw new Error(`Service ${contract} ${range} is not provided in ${this.scopeRef.label} or its ancestors`);
    }
    return outcome.binding.value as T;
  }

  /** Attach a plugin-authored diagnostic to the kernel log. */
  diagnostic(diagnostic: Diagnostic): void { this.kernel.report(this.scopeRef, this.instance, diagnostic); }
}

/** Resolve the effective scope kinds a definition targets, defaulting to runtime. */
function scopesFor(definition: PluginDefinition): ScopeKind[] {
  const scopes = definition.manifest.scopes;
  return scopes && scopes.length ? scopes : ['runtime'];
}

/** Report whether `ancestor` is a strict ancestor of `scope` in the parent chain. */
function isAncestor(ancestor: Scope, scope: Scope): boolean {
  let parent = scope.parent;
  while (parent) {
    if (parent === ancestor) return true;
    parent = parent.parent;
  }
  return false;
}

interface TopologicalResult {order: string[]; cycle?: string[]}

/** Kahn topological sort; returns the remaining cycle members when no order exists. */
function topological(nodes: string[], edges: Map<string, Set<string>>): TopologicalResult {
  const dependencies = new Map<string, Set<string>>(nodes.map(node => [node, new Set(edges.get(node) ?? [])]));
  const dependents = new Map<string, Set<string>>(nodes.map(node => [node, new Set<string>()]));
  for (const [node, requires] of dependencies) for (const dependency of requires) dependents.get(dependency)?.add(node);
  const ready = nodes.filter(node => dependencies.get(node)!.size === 0).sort();
  const order: string[] = [];
  while (ready.length) {
    const node = ready.shift()!;
    order.push(node);
    for (const dependent of dependents.get(node) ?? []) {
      const requires = dependencies.get(dependent)!;
      requires.delete(node);
      if (requires.size === 0) ready.push(dependent);
    }
    ready.sort();
  }
  if (order.length !== nodes.length) return {order, cycle: nodes.filter(node => !order.includes(node))};
  return {order};
}

/** Validate a manifest and return every `invalid-manifest` diagnostic it earns. */
function validateManifest(manifest: PluginManifest | undefined): Diagnostic[] {
  const errors: Diagnostic[] = [];
  const invalid = (message: string, plugin?: string) => errors.push(errorDiagnostic('invalid-manifest', message, plugin ? {plugin} : {}));
  if (!manifest || typeof manifest !== 'object') return [errorDiagnostic('invalid-manifest', 'Manifest is missing')];
  if (typeof manifest.id !== 'string' || !ID_PATTERN.test(manifest.id)) invalid('Manifest id must be a lowercase dotted/dashed identifier');
  if (typeof manifest.name !== 'string' || !manifest.name.trim()) invalid('Manifest name is required', manifest.id);
  if (typeof manifest.version !== 'string' || !parseVersion(manifest.version)) invalid('Manifest version must be semantic (major.minor.patch)', manifest.id);
  if (manifest.engine !== undefined && (typeof manifest.engine !== 'string' || !manifest.engine.trim())) invalid('Manifest engine range must be a non-empty string', manifest.id);
  if (manifest.execution !== undefined && !EXECUTION_MODES.includes(manifest.execution)) invalid('Manifest execution must be worker, renderer or ipc', manifest.id);
  if (manifest.scopes !== undefined && (!Array.isArray(manifest.scopes) || manifest.scopes.some(scope => !SCOPE_KINDS.includes(scope)))) invalid('Manifest scopes contain an unknown kind', manifest.id);
  if (manifest.provides !== undefined && !Array.isArray(manifest.provides)) invalid('Manifest provides must be an array', manifest.id);
  if (manifest.consumes !== undefined && !Array.isArray(manifest.consumes)) invalid('Manifest consumes must be an array', manifest.id);
  for (const provision of asArray(manifest.provides)) {
    if (!provision || typeof provision.contract !== 'string' || !CONTRACT_PATTERN.test(provision.contract)) invalid(`Invalid provided contract ${String(provision?.contract)}`, manifest.id);
    if (!provision || typeof provision.version !== 'string' || !parseVersion(provision.version)) invalid(`Invalid provided version for ${String(provision?.contract)}`, manifest.id);
  }
  for (const requirement of asArray(manifest.consumes)) {
    if (!requirement || typeof requirement.contract !== 'string' || !CONTRACT_PATTERN.test(requirement.contract)) invalid(`Invalid required contract ${String(requirement?.contract)}`, manifest.id);
    if (requirement && requirement.range !== undefined && typeof requirement.range !== 'string') invalid(`Invalid range for ${String(requirement.contract)}`, manifest.id);
  }
  if (manifest.permissions !== undefined && (!Array.isArray(manifest.permissions) || manifest.permissions.some(permission => typeof permission !== 'string'))) invalid('Manifest permissions must be strings', manifest.id);
  return errors;
}

/** Read a manifest collection defensively; registration validation already rejects non-arrays. */
function asArray<T>(value: T[] | undefined): T[] { return Array.isArray(value) ? value : []; }
