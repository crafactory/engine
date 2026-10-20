# Native plugin kernel specification (stage 1)

Status: implemented for the assembly kernel only. This document fixes the manifest,
scope, service, event and effect contracts that later migration stages build on. It
does not migrate any product feature yet. Original MIT code; no reference application
source, SDK, type declarations or sample-plugin code is used.

Stage 1 covers the first migration gate in [NATIVE-PLUGIN-ARCHITECTURE.md](NATIVE-PLUGIN-ARCHITECTURE.md):
a native manifest schema, scopes, versioned service contracts, declared event
strategies and effect ownership, with tests for missing dependencies, cycles,
duplicate providers, startup rollback, late callbacks and cross-vault isolation.
Source lives in `src/kernel/` and executes in Node/Vitest and the browser bundle; it
does not import the editor, Vault, Markdown, Canvas, Bases or Obsidian-compatibility
modules.

## Responsibilities of the kernel

The kernel only composes plugins:

- manifest and schema validation;
- dependency-graph construction, version matching and topological ordering;
- diagnostics for missing/duplicate providers, version and engine mismatches and cycles;
- startup rollback, deactivation and scope reload;
- scope-bound service resolution and effect ownership;
- declared event delivery.

It does not parse Markdown, render a workspace, store notes or know any reference
class name. Product capabilities are expected to become providers in later stages.

## Manifest (`engine.plugin/v1`)

```jsonc
{
  "id": "engine.markdown",          // lowercase dotted/dashed identifier
  "name": "Markdown",               // non-empty display name
  "version": "1.0.0",               // major.minor.patch[-prerelease]
  "engine": "^1.0.0",               // optional kernel range
  "execution": "worker",            // worker | renderer | ipc (default worker)
  "scopes": ["runtime"],            // runtime | vault | window | leaf | document
  "provides": [{"contract": "engine.render/v1", "version": "1.0.0"}],
  "consumes": [{"contract": "engine.documents/v1", "range": "^1.0.0", "optional": false}],
  "permissions": []                 // declared capability names, not a sandbox
}
```

Validation rejects malformed ids, names, versions, contract names, execution modes,
scope kinds and permission shapes with `invalid-manifest` diagnostics. Contract names
use the form `namespace.name/vN`; service versions are semantic versions. A manifest
that fails validation is not registered.

`permissions` is a declaration only. It is not a security boundary; enforcement must
live in the actual execution boundary of each provider (Worker, IPC or trusted
renderer), as recorded in PLUGIN-COMPATIBILITY.md.

`validatePluginPackage` checks untrusted package metadata before it is offered to the
loader: id/name/version, engine range, an optional caller-supplied relative `.js`/`.mjs`
entry (the current discovery path reads the fixed `main.js`), known permission names, and
`provides`/`consumes` shapes. The application host additionally enforces a declared
permission set per operation (`vault:read`, `vault:write`, `vault:trash`, `editor:write`,
`storage:plugin-data`); a manifest without `permissions` keeps legacy unrestricted
access, and a declared set without `vault:read` receives startup/sync snapshots with no
note content or editor text. This host check is not a sandbox for arbitrary code and does
not yet gate UI capabilities such as commands or tabs.

### Bounded version ranges

`satisfiesVersion` implements a documented subset: exact versions, `^`, `~`,
`>=`/`>`/`<=`/`<`/`=`, `x`/`*` wildcards, optional prerelease suffixes and `||`
alternatives. Build metadata is ignored. Partial bounds round to the last specified
field (`>1` means `>=2.0.0`, `<=1.2` means `<1.3.0`). Prerelease versions match only an
alternative that carries a prerelease on the same core tuple (`^1.2.3-beta` accepts
`1.2.3-beta.2` but not `2.0.0-beta`), following the conventional semver rule. Numeric
identifiers above `Number.MAX_SAFE_INTEGER - 1` are rejected rather than compared after
a lossy conversion. Full npm range grammar is deliberately out of scope and pinned by
tests.

## Scopes

Every plugin targets one or more scope kinds. A scope is identified by kind and a
caller-chosen key (for example `vault:/home/me/notes`). The runtime scope exists once
and is the parent of every other scope.

- A plugin is instantiated once per matching scope.
- Service resolution checks the local scope, then the parent chain. A consumer never
  imports a concrete provider.
- A runtime-scoped plugin cannot depend on a vault/window/leaf/document service; the
  dependency is reported as `missing-provider` during runtime assembly.
- Disposing one scope removes only that scope's instances, services and effects.

Later stages add window/leaf/document scope kinds at their real integration points;
stage 1 fixes the kinds and the isolation rule.

## Service contracts

`Contract/vN` names are the public dependency surface. Within one scope a contract has
exactly one provider; a second provider is a `duplicate-provider` error and aborts
assembly. Consumers state a range; a provider whose version does not satisfy the range
produces `version-mismatch` rather than a silently resolved value. Providers bind their
value from `setup` via `context.provide(contract, version, value)`; the supplied version
must equal the manifest declaration, and a declared provision that is never supplied
fails activation.

## Events

Each event name is declared once with a fixed delivery strategy, so callers never
guess return type, ordering or exceptions:

| Strategy | Delivery | Failure |
|---|---|---|
| `sync-broadcast` | all listeners synchronously, in order | all run, then `AggregateError` |
| `async-concurrent` | all listeners started together | all settle, then `AggregateError` |
| `async-serial` | awaited in order | first rejection aborts later listeners |
| `abortable` | awaited in order, checks the signal before each | stops when the signal aborts |

Emitting an undeclared event throws. Listeners registered through a plugin context are
removed with that plugin's effects.

## Effect ownership

Every registration a plugin makes (effects, event listeners) belongs to that plugin's
`EffectScope`:

- disposal revokes admission first, then runs cleanups in reverse registration order
  and awaits them together;
- a registration that arrives after disposal runs immediately and records a
  `late-registration` warning, so a late asynchronous continuation cannot retain
  resources;
- the plugin's `AbortSignal` is aborted and `context.active` becomes false at the start
  of deactivation, before any hook is awaited;
- cleanup failures are recorded as `cleanup-failure` diagnostics rather than swallowed.

This cannot forcibly interrupt arbitrary trusted JavaScript; it bounds ownership and
reports failures, matching the recorded renderer limits.

## Lifecycle

- **Activation:** static errors are collected first and abort before any side effect.
  Plugins are then activated in dependency order (providers before consumers). A
  failure rolls back every already-activated instance in reverse order and throws an
  `AssemblyError` carrying the activation failure and any cleanup failures.
- **Deactivation:** instances are disposed in reverse activation order, and a scope
  stops its active descendant scopes first, so a provider is torn down only after its
  consumers. An in-flight stop is recorded on the scope and a concurrent start waits
  for it, so a restart cannot interleave with a teardown that still holds the old bindings.
- **Reload:** `reload(id)` stops and restarts every active scope that owns the plugin,
  including its active descendants, re-establishing dependencies exactly. Sibling
  plugins in the same scope restart too; per-instance hot reload is a later stage.
- **Dependency loss and rebinding:** `disable(id)` deactivates the plugin, every active
  transitive *required* consumer of a contract it provides, and active descendant scopes
  that may depend on it, recording a `dependency-disabled` diagnostic. Optional consumers
  are unaffected, and a disabled plugin stays disabled across scope restarts and sibling
  reloads until `enable`. `enable(id)` restarts only the scopes the caller still intends to
  run, so an explicit `Kernel.stop` is not undone, and it retains disabled state if
  reactivation fails so the caller can retry. Lifecycle operations are serialized per
  scope, so a disposal hook runs once even when `disable` overlaps a scope stop.
- **Diagnostics:** `kernel.diagnostics` and the `onDiagnostic` observer receive every
  diagnostic with a stable code, plugin id, contract and scope.

## Confirming dependency relationships

A relationship is confirmed at three levels:

1. **Static:** the manifest `provides`/`consumes` graph and version ranges are checked at
   assembly (`missing-provider`, `duplicate-provider`, `version-mismatch`,
   `dependency-cycle`), and activation order is topological (providers first).
2. **Runtime updates:** a service that changes state offers its own subscription
   (for example `engine.bookmarks/v1` exposes `subscribe`), or the change is published on
   the kernel's declared event bus with a fixed delivery strategy.
3. **Lifecycle:** `disable`/`enable` and `reload` re-establish or invalidate relationships
   and rebind consumers to fresh instances.

## Known stage-1 boundaries

- No product feature is migrated yet; the running application does not yet use the
  kernel.
- Plugins are registered programmatically. Loading signed packages, integrity
  metadata and permission enforcement are later stages.
- Per-plugin `disable`/`enable` and scope-level `reload` are supported; swapping a
  provider without restarting its consumers, cross-process activation and real
  window/leaf/document scope integration are not implemented.
- There is no automatic fallback product feature; a failed assembly reports an error
  instead of pretending success.

## Evidence

`tests/kernel.test.ts` covers bounded semantic-version matching including partial-bound
rounding, prerelease gating and the numeric representability bound; provider-before-consumer ordering and versioned
resolution; missing provider, optional provider, version mismatch, duplicate provider,
cycle, engine mismatch and contract allowlist; manifest validation; startup rollback
including cleanup failures, unsupplied provisions and a provision whose supplied
version differs from the declaration; effect ordering, late registration
and abort signals; cross-vault scope isolation and rejection of an upward dependency;
scope reload and descendant-scope teardown; serialized restart behind an in-flight stop;
all four event strategies; and the diagnostic observer, including containment of a
throwing observer. `tests/dependency-flow.test.ts` covers provider disable/enable with
transitive required consumers, optional consumers staying active, child-scope
stop/restart, a migrated core-feature provider as a consumer, reload rebinding,
persisted disabled state across restarts, retry after a failed enable, explicit-stop
intent and single disposal under a disable/stop overlap. This is assembly-unit evidence, not a migrated product feature or
real-plugin compatibility.
