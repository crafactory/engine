/* Native render/format service contract (`engine.render/v1`).
 *
 * A format maps a file extension to a view type. Format providers register their own
 * formats; consumers resolve a path to a format without importing any editor, Canvas or
 * Bases implementation.
 */
import type {PluginDefinition} from '../kernel';
import {storageExtension} from './storage';

export const RENDER_CONTRACT = 'engine.render/v1';
export const RENDER_VERSION = '1.0.0';

export interface FormatRegistration {extension: string; viewType: string; label?: string}

/** Resolve a vault path to the format that should render it. */
export interface RenderService {
  registerFormat(registration: FormatRegistration): () => void;
  resolve(path: string): FormatRegistration | undefined;
  list(): FormatRegistration[];
}

const normalizeExtension = (extension: string): string => extension.replace(/^\./, '').toLowerCase();

/** Format registry keyed by case-insensitive extension. */
export class FormatRegistry implements RenderService {
  private readonly formats: FormatRegistration[] = [];
  private readonly previous = new WeakMap<FormatRegistration, FormatRegistration | undefined>();
  private readonly revoked = new WeakSet<FormatRegistration>();

  /** Register or replace a format; the returned disposer restores the previous state. */
  registerFormat(registration: FormatRegistration): () => void {
    if (!registration || typeof registration.extension !== 'string' || typeof registration.viewType !== 'string' || !registration.extension || !registration.viewType) throw new Error('Invalid format registration');
    const extension = normalizeExtension(registration.extension);
    const normalized: FormatRegistration = {...registration, extension};
    const index = this.formats.findIndex(candidate => candidate.extension === extension);
    this.previous.set(normalized, index >= 0 ? this.formats[index] : undefined);
    if (index >= 0) this.formats[index] = normalized; else this.formats.push(normalized);
    return () => {
      this.revoked.add(normalized);
      const current = this.formats.findIndex(candidate => candidate.extension === extension);
      if (current < 0 || this.formats[current] !== normalized) return;
      let replacement = this.previous.get(normalized);
      while (replacement && this.revoked.has(replacement)) replacement = this.previous.get(replacement);
      if (replacement) this.formats[current] = replacement; else this.formats.splice(current, 1);
    };
  }

  /** Resolve a path by its lowercase extension, or undefined when no format matches. */
  resolve(path: string): FormatRegistration | undefined {
    const extension = normalizeExtension(storageExtension(path));
    return this.formats.find(format => format.extension === extension);
  }

  /** List registered formats in registration order. */
  list(): FormatRegistration[] { return [...this.formats]; }
}

/** Wrap a render service as a runtime-scoped native plugin that provides the contract. */
export function renderPlugin(service: RenderService): PluginDefinition {
  return {
    manifest: {id: 'engine.render', name: 'Render', version: RENDER_VERSION, scopes: ['runtime'], provides: [{contract: RENDER_CONTRACT, version: RENDER_VERSION}]},
    setup(context) { context.provide(RENDER_CONTRACT, RENDER_VERSION, service); }
  };
}
