/* Native documents service contract (`engine.documents/v1`).
 *
 * Adds format registration, rename and history on top of `engine.storage/v1`.
 * Link rewriting and workspace identity remapping stay in the application until the
 * workspace and editor providers are migrated. */
import type {PluginDefinition} from '../kernel';
import {storageExtension, STORAGE_CONTRACT, type StorageService, type StorageSnapshot, type StoredNote} from './storage';

export const DOCUMENTS_CONTRACT = 'engine.documents/v1';
export const DOCUMENTS_VERSION = '1.0.0';

export interface DocumentFormat {extension: string; view: string; label?: string}

/** Format registry and document transactions built on versioned storage. */
export interface DocumentsService {
  listFormats(): DocumentFormat[];
  formatOf(path: string): DocumentFormat | undefined;
  registerFormat(format: DocumentFormat): () => void;
  rename(from: string, to: string): Promise<void>;
  read(path: string): Promise<StoredNote>;
  history(path: string): Promise<StorageSnapshot[]>;
  restore(id: string): Promise<StoredNote>;
}

/** Built-in format registry; extensions are normalized to lowercase without dots. */
export const DEFAULT_FORMATS: DocumentFormat[] = [
  {extension: 'md', view: 'markdown', label: 'Markdown'},
  {extension: 'markdown', view: 'markdown', label: 'Markdown'},
  {extension: 'canvas', view: 'canvas', label: 'Canvas'},
  {extension: 'base', view: 'base', label: 'Base'},
  {extension: 'txt', view: 'plaintext', label: 'Plain text'},
  {extension: 'csv', view: 'csv', label: 'CSV'},
  {extension: 'json', view: 'json', label: 'JSON'},
  {extension: 'css', view: 'css', label: 'CSS'}
];

const normalizeExtension = (extension: string): string => extension.replace(/^\./, '').toLowerCase();

/** Documents provider that delegates persistence to a storage contract. */
export class DocumentStore implements DocumentsService {
  private readonly formats: DocumentFormat[];

  /**
   * @param storage Storage provider used for rename, read, history and restore.
   * @param formats Initial format registry; defaults to the built-in formats.
   */
  constructor(private readonly storage: StorageService, formats: DocumentFormat[] = DEFAULT_FORMATS) {
    this.formats = formats.map(format => ({...format, extension: normalizeExtension(format.extension)}));
  }

  /** List registered formats in registration order. */
  listFormats(): DocumentFormat[] { return [...this.formats]; }

  /** Resolve the format for a path by its case-insensitive extension. */
  formatOf(path: string): DocumentFormat | undefined {
    const extension = normalizeExtension(storageExtension(path));
    return this.formats.find(format => format.extension === extension);
  }

  /** Register or replace a format and return a disposer that restores the prior state. */
  registerFormat(format: DocumentFormat): () => void {
    if (!format || typeof format.extension !== 'string' || typeof format.view !== 'string' || !format.extension || !format.view) throw new Error('Invalid document format');
    const extension = normalizeExtension(format.extension);
    const index = this.formats.findIndex(candidate => candidate.extension === extension);
    const previous = index >= 0 ? this.formats[index] : undefined;
    const normalized = {...format, extension};
    if (index >= 0) this.formats[index] = normalized; else this.formats.push(normalized);
    return () => {
      const current = this.formats.findIndex(candidate => candidate.extension === extension);
      if (current < 0 || this.formats[current] !== normalized) return;
      if (previous) this.formats[current] = previous; else this.formats.splice(current, 1);
    };
  }

  /** Rename a document without converting its bytes or format. */
  rename(from: string, to: string): Promise<void> { return this.storage.rename(from, to); }

  /** Read a document's current content and version. */
  read(path: string): Promise<StoredNote> { return this.storage.read(path); }

  /** Return previous saved versions of a document. */
  history(path: string): Promise<StorageSnapshot[]> { return this.storage.snapshots(path); }

  /** Restore a previous saved version. */
  restore(id: string): Promise<StoredNote> { return this.storage.restore(id); }
}

/** Wrap a documents service as a runtime-scoped provider that consumes storage. */
export function documentsPlugin(service: DocumentsService): PluginDefinition {
  return {
    manifest: {
      id: 'engine.documents', name: 'Documents', version: DOCUMENTS_VERSION, scopes: ['runtime'],
      provides: [{contract: DOCUMENTS_CONTRACT, version: DOCUMENTS_VERSION}],
      consumes: [{contract: STORAGE_CONTRACT, range: '^1.0.0'}]
    },
    setup(context) { context.provide(DOCUMENTS_CONTRACT, DOCUMENTS_VERSION, service); }
  };
}

/** Default documents provider that builds on the resolved storage service. */
export function createDocumentsPlugin(): PluginDefinition {
  return {
    manifest: {
      id: 'engine.documents', name: 'Documents', version: DOCUMENTS_VERSION, scopes: ['runtime'],
      provides: [{contract: DOCUMENTS_CONTRACT, version: DOCUMENTS_VERSION}],
      consumes: [{contract: STORAGE_CONTRACT, range: '^1.0.0'}]
    },
    setup(context) {
      const storage = context.service<StorageService>(STORAGE_CONTRACT);
      context.provide(DOCUMENTS_CONTRACT, DOCUMENTS_VERSION, new DocumentStore(storage));
    }
  };
}
