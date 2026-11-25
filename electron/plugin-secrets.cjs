const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');

const validId = (id) => typeof id === 'string' && /^[a-z0-9-]{1,64}$/.test(id);

/** The plugin API is synchronous. Only invoke it from an already native-trusted profile. */
function createPluginSecrets(profileDir, storage, platform = process.platform) {
  const available = () =>
    storage.isEncryptionAvailable() &&
    (platform !== 'linux' ||
      /^(gnome_libsecret|kwallet[56]?)$/.test(storage.getSelectedStorageBackend()));

  function requireEncryption() {
    if (!available())
      throw new Error('An operating-system keychain is required for plugin secrets');
  }
  function requireKeychainCiphertext(encrypted) {
    // Chromium's Linux v10 format uses the public "peanuts" fallback password.
    if (platform === 'linux' && encrypted.subarray(0, 3).toString() !== 'v11')
      throw new Error('Linux plugin secrets require keychain-backed encryption');
    return encrypted;
  }

  return (root, operation, id, value) => {
    if (operation === 'available') return available();
    requireEncryption();
    const scope = createHash('sha256').update(fs.realpathSync(root)).digest('hex');
    const directory = path.join(profileDir, 'plugin-secrets', scope);
    if (operation === 'list') {
      if (!fs.existsSync(directory)) return [];
      return fs
        .readdirSync(directory, { withFileTypes: true })
        .filter((entry) => entry.isFile() && validId(entry.name))
        .map((entry) => entry.name)
        .sort();
    }
    if (!validId(id)) throw new Error('Invalid plugin secret ID');
    const file = path.join(directory, id);
    if (operation === 'get') {
      if (!fs.existsSync(file)) return null;
      return storage.decryptString(requireKeychainCiphertext(fs.readFileSync(file)));
    }
    if (operation !== 'set' || typeof value !== 'string' || Buffer.byteLength(value) > 16384)
      throw new Error('Invalid plugin secret operation or value');
    const encrypted = requireKeychainCiphertext(storage.encryptString(value));
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    const pending = path.join(directory, '.' + randomUUID());
    try {
      fs.writeFileSync(pending, encrypted, { mode: 0o600, flag: 'wx' });
      fs.renameSync(pending, file);
    } finally {
      fs.rmSync(pending, { force: true });
    }
  };
}

module.exports = { createPluginSecrets };
