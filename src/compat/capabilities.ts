/** Shared failure type for explicitly unsupported compatibility capabilities. */
export class CompatibilityError extends Error {
  constructor(readonly capability: string) {
    super('Unsupported Obsidian capability: ' + capability + '. See docs/PLUGIN-COMPATIBILITY.md.');
    this.name = 'CompatibilityError';
  }
}
export const unsupported = (name: string): never => {
  throw new CompatibilityError(name);
};

/** Bounded native filesystem facade; operations retain the host's vault boundaries. */
export class FileSystemAdapter {
  constructor(
    private readonly root = '',
    private readonly files?: {
      read: (path: string) => Promise<ArrayBuffer>;
      readText: (path: string) => Promise<string>;
      writeText: (path: string, data: string) => Promise<unknown>;
      write: (path: string, data: ArrayBuffer | ArrayBufferView) => Promise<unknown>;
      exists: (path: string) => Promise<boolean>;
    },
  ) {}
  getBasePath() {
    if (!this.root) return unsupported('FileSystemAdapter.getBasePath');
    return this.root;
  }
  getName() {
    if (!this.root) return unsupported('FileSystemAdapter.getName');
    return this.root.split(/[\\/]/).filter(Boolean).pop() || '';
  }
  async readBinary(path: string) {
    if (!this.files) return unsupported('FileSystemAdapter.readBinary');
    return this.files.read(path);
  }
  async read(path: string) {
    if (!this.files) return unsupported('FileSystemAdapter.read');
    return this.files.readText(path);
  }
  async write(path: string, data: string, options?: unknown) {
    if (options !== undefined) return unsupported('FileSystemAdapter.write options');
    if (!this.files) return unsupported('FileSystemAdapter.write');
    await this.files.writeText(path, data);
  }
  async writeBinary(path: string, data: ArrayBuffer | ArrayBufferView) {
    if (!this.files) return unsupported('FileSystemAdapter.writeBinary');
    await this.files.write(path, data);
  }
  async exists(path: string) {
    if (!this.files) return unsupported('FileSystemAdapter.exists');
    return this.files.exists(path);
  }
}
