import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { NativeSelect, NativeSelectOption } from '../ui/native-select';
import { useEffect, useRef, useState } from 'react';
import { Shield, Puzzle } from 'lucide-react';
import type { PluginManifest } from '../../types';
import { bridge } from '../../bridge';
import { settingRow as row } from './row';
export function CommunitySettings({
  plugins,
  enabled,
  onTogglePlugin,
  modes,
  onMode,
}: {
  plugins: PluginManifest[];
  enabled: string[];
  onTogglePlugin: (id: string) => void;
  modes: Record<string, string>;
  onMode: (id: string, mode: string) => void;
}) {
  const [unsafeEval, setUnsafeEval] = useState<boolean | null>(null),
    [unsafeEvalConfirm, setUnsafeEvalConfirm] = useState(false);
  const [nativePlugins, setNativePlugins] = useState(false),
    [nativeConfirm, setNativeConfirm] = useState(false);
  const [activeTrust, setActiveTrust] = useState<{
    unsafeEval: boolean;
    nativePlugins: boolean;
  } | null>(null);
  const trustProfileSequence = useRef(0);
  const unsafeEvalRestart =
      activeTrust !== null && unsafeEval !== null && unsafeEval !== activeTrust.unsafeEval,
    nativeRestart = activeTrust !== null && nativePlugins !== activeTrust.nativePlugins;
  const [nativeBusy, setNativeBusy] = useState(false),
    [nativeError, setNativeError] = useState('');
  const [unsafeBusy, setUnsafeBusy] = useState(false),
    [unsafeError, setUnsafeError] = useState('');
  useEffect(() => {
    let live = true;
    setActiveTrust(null);
    /** Apply a confirmed profile only while this Community panel subscription remains live. */
    const apply = (profile: {
      saved: { unsafeEval: boolean; nativePlugins: boolean };
      active: { unsafeEval: boolean; nativePlugins: boolean };
    }) => {
      if (live) {
        setNativePlugins(profile.saved.nativePlugins);
        setUnsafeEval(profile.saved.unsafeEval);
        setActiveTrust(profile.active);
        setNativeError('');
      }
    };
    const offTrust = bridge.onTrustProfileChange?.((profile) => {
      trustProfileSequence.current++;
      apply(profile);
    });
    const sequence = trustProfileSequence.current;
    if (bridge.desktop && bridge.trustProfile)
      void bridge
        .trustProfile()
        .then((profile) => {
          if (sequence === trustProfileSequence.current) apply(profile);
        })
        .catch((error) => {
          if (live && sequence === trustProfileSequence.current) setNativeError(String(error));
        });
    else {
      setNativePlugins(false);
      setUnsafeEval(false);
    }
    return () => {
      live = false;
      offTrust?.();
    };
  }, []);
  /** Persist only native-confirmed profile changes, preserving UI state on failure. */
  async function changeNativePlugins(enabled: boolean) {
    if (!bridge.desktop || !bridge.setNativePlugins || nativeBusy || !activeTrust) return;
    setNativeBusy(true);
    setNativeError('');
    try {
      const result = await bridge.setNativePlugins(enabled);
      setNativePlugins(result);
      setNativeConfirm(false);
    } catch (error) {
      setNativeConfirm(false);
      setNativeError(String(error));
    } finally {
      setNativeBusy(false);
    }
  }

  /** Persist the desktop-only unsafe-eval opt-in after the inline warning is accepted. */
  async function changeUnsafeEval(enabled: boolean) {
    if (!bridge.desktop || !bridge.setUnsafeEval || unsafeBusy || !activeTrust) return;
    setUnsafeBusy(true);
    setUnsafeError('');
    try {
      const result = await bridge.setUnsafeEval(enabled);
      setUnsafeEval(result);
      setUnsafeEvalConfirm(false);
    } catch (error) {
      setUnsafeEvalConfirm(false);
      setUnsafeError(String(error));
    } finally {
      setUnsafeBusy(false);
    }
  }

  return (
    <>
      <div className="security-notice">
        <Shield size={20} />
        <div>
          <strong>Restricted mode by default</strong>
          <p>
            Local plugins may use the Engine API or an experimental CommonJS Obsidian API subset.
            Full community-plugin compatibility is not supported. Unsupported APIs fail explicitly.
            Enabled plugins can read and modify notes and store data, including during startup. Only
            enable trusted code.
          </p>
        </div>
      </div>
      <p className="settings-note">
        Worker is the default. Trusted renderer adds DOM and CodeMirror integration but is not
        isolated from the application or vault bridge and cannot be forcibly interrupted. Runtime
        choices and enabled state reset on restart; no plugin runs automatically.
      </p>
      {bridge.platform === 'android' && (
        <p className="settings-note">
          Android trusted renderer code also shares this app’s native Capacitor APIs and app-private
          files. This is app-UID trust, not a per-plugin sandbox or desktop Node.js access.
          Desktop-only manifests cannot be enabled; unsafe-eval, Node.js and Electron are
          unavailable.
        </p>
      )}
      <div className="setting-row">
        <div>
          <strong>Allow unsafe-eval in trusted renderer</strong>
          <p>
            Required by DataviewJS and dv.view. This only applies to the packaged desktop app,
            weakens the Content Security Policy and requires a restart. Plugins remain unsandboxed.
          </p>
        </div>
        <Switch
          aria-label="Allow unsafe-eval in trusted renderer"
          checked={!!unsafeEval}
          disabled={!bridge.desktop || unsafeBusy || activeTrust === null}
          onCheckedChange={(checked) => {
            if (checked && !unsafeEval) setUnsafeEvalConfirm(true);
            else void changeUnsafeEval(false);
          }}
        />
      </div>
      {unsafeEvalConfirm && (
        <div className="unsafe-eval-warning" role="alert">
          <p>
            Allowing unsafe-eval lets trusted plugins run eval/Function, including DataviewJS and
            dv.view. It weakens CSP for the whole desktop renderer and does not sandbox plugins.
            Restart is required.
          </p>
          <Button variant="ghost" disabled={unsafeBusy} onClick={() => void changeUnsafeEval(true)}>
            Enable unsafe-eval
          </Button>
          <Button variant="ghost" disabled={unsafeBusy} onClick={() => setUnsafeEvalConfirm(false)}>
            Cancel
          </Button>
        </div>
      )}
      {unsafeError && <p role="alert">{unsafeError}</p>}
      {unsafeEvalRestart && (
        <p className="settings-note" role="status">
          Restart Crafactory Engine to apply the unsafe-eval change.
        </p>
      )}
      <div className="setting-row">
        <div>
          <strong>Allow native Node.js plugins</strong>
          <p>
            Full desktop access for trusted plugins such as Git. All renderer scripts can access
            files outside the vault, execute commands, access credentials and use the network. NOT a
            per-plugin sandbox. Granting or revoking requires a restart.
          </p>
        </div>
        <Switch
          aria-label="Allow native Node.js plugins"
          checked={nativePlugins}
          disabled={!bridge.desktop || nativeBusy || activeTrust === null}
          onCheckedChange={(checked) => {
            if (checked && !nativePlugins) setNativeConfirm(true);
            else void changeNativePlugins(false);
          }}
        />
      </div>
      {nativeConfirm && (
        <div role="alert">
          <p>
            This trusts every script in this desktop renderer with your computer, not only the
            selected plugin. Only enable code you fully trust. Unloading a plugin cannot undo file
            changes or commands.
          </p>
          <Button
            variant="ghost"
            disabled={nativeBusy}
            onClick={() => void changeNativePlugins(true)}
          >
            Enable native plugins
          </Button>
          <Button variant="ghost" disabled={nativeBusy} onClick={() => setNativeConfirm(false)}>
            Cancel
          </Button>
        </div>
      )}
      {nativeError && <p role="alert">{nativeError}</p>}
      {nativeRestart && (
        <p role="status">
          Restart Crafactory Engine to apply the native plugin permission change, including
          revocation.
        </p>
      )}
      {!plugins.length ? (
        <div className="empty">
          <Puzzle size={28} />
          <h3>No local plugins installed</h3>
          <p>
            {bridge.platform === 'android'
              ? 'This pilot has no community-plugin installer or shared-folder import. Debug builds can sideload unchanged packages into the app-private vault’s .crafactory/plugins/plugin-id directory.'
              : 'Place a manifest.json and main.js in .crafactory/plugins/plugin-id, then reopen settings. An example plugin is included in the repository.'}
          </p>
        </div>
      ) : (
        plugins.map((p) => (
          <div key={p.id}>
            {row(
              p.name,
              `${p.description || ''} · ${p.version}${bridge.platform === 'android' && p.isDesktopOnly ? ' · Desktop-only; unavailable on Android' : ''}`,
              <Switch
                aria-label={'Enable ' + p.name}
                checked={enabled.includes(p.id)}
                disabled={bridge.platform === 'android' && p.isDesktopOnly === true}
                onCheckedChange={() => onTogglePlugin(p.id)}
              />,
            )}
            <label className="plugin-runtime">
              Runtime for {p.name}
              <NativeSelect
                aria-label={'Runtime for ' + p.name}
                value={modes[p.id] || 'worker'}
                disabled={
                  enabled.includes(p.id) ||
                  (bridge.platform === 'android' && p.isDesktopOnly === true)
                }
                onChange={(e) => onMode(p.id, e.target.value)}
              >
                <NativeSelectOption value="worker">Worker (default)</NativeSelectOption>
                <NativeSelectOption value="renderer">
                  Trusted renderer (not sandboxed)
                </NativeSelectOption>
              </NativeSelect>
            </label>
          </div>
        ))
      )}
    </>
  );
}
