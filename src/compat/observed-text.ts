import type { StoredNote } from '../services/storage';

/** Each plugin owns its read versions; reads must never bless a native editor draft. */
export function observePluginText(
  read: (path: string) => Promise<StoredNote>,
  write: (path: string, text: string, version?: string) => Promise<StoredNote>,
  ensureOpen: () => void,
) {
  const observed = new Map<string, string>();
  const readVersioned = async (path: string) => {
    ensureOpen();
    const note = await read(path);
    ensureOpen();
    observed.set(path, note.version);
    return note;
  };
  return {
    readVersioned,
    read: async (path: string) => (await readVersioned(path)).content,
    write: async (path: string, text: string) => {
      ensureOpen();
      const note = await write(path, text, observed.get(path));
      ensureOpen();
      observed.set(path, note.version);
      return note;
    },
  };
}
