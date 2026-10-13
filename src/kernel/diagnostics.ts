/* Structured diagnostics for native plugin assembly. */

export type DiagnosticCode =
  | 'invalid-manifest' | 'duplicate-plugin' | 'engine-mismatch' | 'unknown-contract'
  | 'missing-provider' | 'duplicate-provider' | 'version-mismatch' | 'dependency-cycle'
  | 'activation-failure' | 'cleanup-failure' | 'late-registration';

export type DiagnosticSeverity = 'error' | 'warning';

export interface Diagnostic {
  code: DiagnosticCode;
  severity: DiagnosticSeverity;
  message: string;
  plugin?: string;
  contract?: string;
  scope?: string;
  cause?: string;
}

/** An assembly failure that carries every diagnostic collected before it aborted. */
export class AssemblyError extends Error {
  readonly diagnostics: Diagnostic[];

  /** Build an error whose message enumerates the supplied diagnostics in order. */
  constructor(diagnostics: Diagnostic[]) {
    super(diagnostics.map(formatDiagnostic).join('\n') || 'Plugin assembly failed');
    this.name = 'AssemblyError';
    this.diagnostics = diagnostics;
  }
}

/** Render a diagnostic as a stable single-line string for messages and logs. */
export function formatDiagnostic(diagnostic: Diagnostic): string {
  const location = [diagnostic.plugin && `plugin=${diagnostic.plugin}`, diagnostic.contract && `contract=${diagnostic.contract}`, diagnostic.scope && `scope=${diagnostic.scope}`].filter(Boolean).join(' ');
  return `[${diagnostic.severity}] ${diagnostic.code}${location ? ' ' + location : ''}: ${diagnostic.message}${diagnostic.cause ? ` (${diagnostic.cause})` : ''}`;
}

/** Create an error diagnostic, filling the severity default. */
export function errorDiagnostic(code: DiagnosticCode, message: string, extra: Omit<Diagnostic, 'code' | 'severity' | 'message'> = {}): Diagnostic {
  return {code, severity: 'error', message, ...extra};
}
