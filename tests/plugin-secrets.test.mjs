import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import secrets from '../electron/plugin-secrets.cjs';

const { createPluginSecrets } = secrets;
let scope, profile, root, other;
beforeEach(() => {
  scope = fs.mkdtempSync(path.join(os.tmpdir(), 'engine-secrets-'));
  profile = path.join(scope, 'profile');
  root = fs.mkdtempSync(path.join(scope, 'vault-'));
  other = fs.mkdtempSync(path.join(scope, 'vault-'));
});
afterEach(() => fs.rmSync(scope, { recursive: true, force: true }));

function fakeStorage(backend = 'gnome_libsecret', version = 'v11') {
  const values = new Map();
  return {
    isEncryptionAvailable: () => true,
    getSelectedStorageBackend: () => backend,
    encryptString: vi.fn((value) => {
      const token = version + String(values.size);
      values.set(token, value);
      return Buffer.from(token);
    }),
    decryptString: vi.fn((bytes) => values.get(bytes.toString())),
  };
}

describe('native plugin secret store', () => {
  it('scopes encrypted values by profile and canonical vault; never writes to the vault', () => {
    const keychain = fakeStorage();
    const storage = createPluginSecrets(profile, keychain, 'linux');
    expect(storage(root, 'get', 'api-key')).toBeNull();
    storage(root, 'set', 'api-key', 'synthetic-only');
    storage(root, 'set', 'retired', '');
    expect(createPluginSecrets(profile, keychain, 'linux')(root, 'get', 'api-key')).toBe(
      'synthetic-only',
    );
    expect(storage(root, 'get', 'retired')).toBe('');
    expect(storage(root, 'list')).toEqual(['api-key', 'retired']);
    expect(storage(other, 'list')).toEqual([]);
    expect(createPluginSecrets(other, keychain, 'linux')(root, 'list')).toEqual([]);
    expect(fs.readdirSync(root)).toEqual([]);
    const dir = path.join(profile, 'plugin-secrets');
    expect(fs.readFileSync(path.join(dir, fs.readdirSync(dir)[0], 'api-key'), 'utf8')).toBe('v110');
    expect(() => storage(root, 'set', '../escape', 'synthetic-only')).toThrow('Invalid');
  });

  it('rejects unavailable encryption, basic backends, and fallback ciphertext', () => {
    const unavailable = fakeStorage();
    unavailable.isEncryptionAvailable = () => false;
    for (const backend of [unavailable, fakeStorage('basic_text'), fakeStorage('unknown')]) {
      const storage = createPluginSecrets(profile, backend, 'linux');
      expect(storage(root, 'available')).toBe(false);
      expect(() => storage(root, 'set', 'api-key', 'synthetic-only')).toThrow('keychain');
      expect(backend.encryptString).not.toHaveBeenCalled();
    }
    const fallback = createPluginSecrets(profile, fakeStorage('gnome_libsecret', 'v10'), 'linux');
    expect(() => fallback(root, 'set', 'api-key', 'synthetic-only')).toThrow('keychain-backed');
    expect(fs.existsSync(profile)).toBe(false);
  });
});
