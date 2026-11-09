import { Switch } from './components/ui/switch';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Textarea } from './components/ui/textarea';
import { CommunitySettings } from './components/settings/CommunitySettings';
import { settingRow as row } from './components/settings/row';
import { Dialog, DialogContent, DialogPortal, DialogTitle } from './components/ui/dialog';
import { useOverlayFocusReturn } from './ui/overlay-focus';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { PluginTab } from './compat-dom';
import {
  X,
  Sun,
  Moon,
  Shield,
  Keyboard,
  FileText,
  Palette,
  Puzzle,
  Info,
  Folder,
  Blocks,
} from 'lucide-react';
import type { Settings as Preferences, PluginManifest } from './types';
import type { SettingsContribution } from './services/ui';
import { loadSettingsComponent } from './ui/contract';
import { ViewBoundary } from './views';
import { bridge } from './bridge';
import { version } from '../package.json';
export const corePlugins = [
  ['audio', 'Audio recorder', 'Record audio and insert it into the active note.'],
  ['backlinks', 'Backlinks', 'Follow linked and unlinked mentions.'],
  ['bases', 'Bases', 'Browse YAML note properties in tables, lists, and cards.'],
  ['bookmarks', 'Bookmarks', 'Keep frequently used notes close.'],
  ['canvas', 'Canvas', 'Arrange cards and connections in JSON Canvas files.'],
  ['commands', 'Command palette', 'Run actions from the keyboard.'],
  [
    'compat',
    'Obsidian plugin support',
    'Load local Obsidian-compatible plugins in a Worker or trusted renderer.',
  ],
  ['daily', 'Daily notes', 'Create a note for each day.'],
  ['explorer', 'File explorer', 'Browse your local files and folders.'],
  ['recovery', 'File recovery', 'Recover previous versions from local snapshots.'],
  ['converter', 'Format converter', 'Convert common links and highlights to Markdown.'],
  ['footnotes', 'Footnotes view', 'List, edit, and navigate footnotes in the active note.'],
  ['graph', 'Graph view', 'Explore global and local note relationships.'],
  ['composer', 'Note composer', 'Merge notes and extract selected text.'],
  ['outgoing', 'Outgoing links', 'See where the active note leads.'],
  ['outline', 'Outline', 'Navigate headings in a note.'],
  ['preview', 'Page preview', 'Preview linked notes in reading view.'],
  ['properties', 'Properties', 'Edit YAML frontmatter values.'],
  ['switcher', 'Quick switcher', 'Find, create, and open notes.'],
  ['random', 'Random note', 'Visit a random note in your vault.'],
  ['search', 'Search', 'Find notes with operators and regular expressions.'],
  ['slash', 'Slash commands', 'Insert Markdown structures from the editor.'],
  ['slides', 'Slides', 'Present notes separated by horizontal rules.'],
  ['tags', 'Tags', 'Browse nested tags.'],
  ['templates', 'Templates', 'Insert reusable Markdown templates.'],
  ['unique', 'Unique note creator', 'Create notes with timestamp-based names.'],
  ['web', 'Web viewer', 'View pages that permit embedding.'],
  ['words', 'Word count', 'Count words and characters.'],
  ['workspaces', 'Workspaces', 'Save and restore workspace layouts.'],
];
function PluginSettings({ tab }: { tab: PluginTab }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    host.current!.append(tab.containerEl);
    tab.display();
    return () => {
      tab.hide();
      tab.containerEl.remove();
    };
  }, [tab.id]);
  return <div ref={host} />;
}
/** Render one native settings contribution with a local lazy boundary. */
function NativeSetting({
  contribution,
  value,
  onChange,
}: {
  contribution: SettingsContribution;
  value: Preferences;
  onChange: (value: Preferences) => void;
}) {
  const Component = useMemo(
    () => lazy(async () => ({ default: await loadSettingsComponent(contribution) })),
    [contribution],
  );
  return (
    <section className="native-setting">
      <h3>{contribution.label}</h3>
      <Suspense
        fallback={
          <div className="skeleton-list">
            <i />
            <i />
          </div>
        }
      >
        <ViewBoundary resetKey={contribution.id}>
          <Component value={value} onChange={onChange} />
        </ViewBoundary>
      </Suspense>
    </section>
  );
}

/** Render owned preference panels and reconcile saved trust flags with startup privileges. */
export function Settings({
  value,
  onChange,
  onClose,
  plugins,
  enabled,
  onTogglePlugin,
  pluginTabs = [],
  modes = {},
  onMode = () => {},
  nativeSettings = [],
}: {
  value: Preferences;
  onChange: (value: Preferences) => void;
  onClose: () => void;
  plugins: PluginManifest[];
  enabled: string[];
  onTogglePlugin: (id: string) => void;
  pluginTabs?: PluginTab[];
  modes?: Record<string, string>;
  onMode?: (id: string, mode: string) => void;
  nativeSettings?: SettingsContribution[];
}) {
  const [tab, setTab] = useState('appearance');
  const [pluginQuery, setPluginQuery] = useState('');
  const returnFocus = useOverlayFocusReturn();
  const update = (key: keyof Preferences, v: any) => onChange({ ...value, [key]: v });
  const toggle = (key: keyof Preferences) => (
    <Switch
      aria-label={String(key)}
      checked={!!value[key]}
      onCheckedChange={(checked) => update(key, checked)}
    />
  );
  const contributed = nativeSettings.filter(
    (contribution) => (contribution.tab ?? 'extensions') === tab,
  );
  return (
    <Dialog
      open
      modal={false}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPortal>
        <div className="app-settings-scrim" aria-hidden="true" />
      </DialogPortal>
      <DialogContent
        className="settings-modal app-settings"
        showCloseButton={false}
        showOverlay={false}
        aria-label="Settings"
        aria-describedby={undefined}
        onCloseAutoFocus={returnFocus}
        onEscapeKeyDown={(event) => {
          // Radix listens in document capture; let the imperative top modal handle
          // Escape later without also dismissing this underlying settings dialog.
          if (
            document.querySelector('.plugin-modal-backdrop') ||
            (event.target instanceof Element && event.target.closest('[role="menu"]'))
          )
            event.preventDefault();
          else event.stopPropagation();
        }}
        onInteractOutside={(event) => {
          // Close on our own scrim only, matching the original backdrop behavior.
          // Plugin menus/modals and nested permission dialogs portal independently.
          const target = event.detail.originalEvent.target;
          if (!(target instanceof Element && target.classList.contains('app-settings-scrim')))
            event.preventDefault();
        }}
      >
        <DialogTitle className="ui:sr-only">Settings</DialogTitle>
        <nav>
          <div className="settings-label">Settings</div>
          {[
            ['appearance', Palette, 'Appearance'],
            ['editor', FileText, 'Editor'],
            ['files', Folder, 'Files & links'],
            ['hotkeys', Keyboard, 'Hotkeys'],
            ['core', Puzzle, 'Core plugins'],
            ['community', Shield, 'Community plugins'],
            ['extensions', Blocks, 'Extensions'],
            ['about', Info, 'About'],
          ].map(([id, Icon, label]) => (
            <Button
              variant={tab === id ? 'secondary' : 'ghost'}
              key={String(id)}
              onClick={() => setTab(String(id))}
              className={tab === id ? 'selected' : ''}
            >
              {typeof Icon !== 'string' && <Icon size={16} />} {String(label)}
            </Button>
          ))}
        </nav>
        <div className="settings-content">
          <header>
            <h2>
              {pluginTabs.find((p) => p.id === tab)?.name ||
                (tab === 'core'
                  ? 'Core plugins'
                  : tab === 'community'
                    ? 'Community plugins'
                    : tab === 'files'
                      ? 'Files & links'
                      : tab === 'extensions'
                        ? 'Extensions'
                        : tab[0].toUpperCase() + tab.slice(1))}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close settings"
              data-testid="settings-close"
            >
              <X size={18} />
            </Button>
          </header>
          {!!pluginTabs.length && (
            <div className="plugin-settings-tabs">
              {pluginTabs.map((p) => (
                <Button
                  variant="ghost"
                  key={p.id}
                  onClick={() => setTab(p.id)}
                  aria-label={'Plugin settings ' + p.name}
                >
                  {p.name}
                </Button>
              ))}
            </div>
          )}
          {pluginTabs.find((p) => p.id === tab) && (
            <PluginSettings tab={pluginTabs.find((p) => p.id === tab)!} />
          )}
          {contributed.length ? (
            <div className="native-settings">
              {contributed.map((contribution) => (
                <NativeSetting
                  key={contribution.id}
                  contribution={contribution}
                  value={value}
                  onChange={onChange}
                />
              ))}
            </div>
          ) : tab === 'extensions' ? (
            <p className="sidebar-hint">Extensions that contribute settings will appear here.</p>
          ) : null}
          {tab === 'appearance' && (
            <>
              {row(
                'Color theme',
                'A quiet workspace in light or dark.',
                <div className="segmented">
                  <Button
                    variant={value.theme === 'dark' ? 'secondary' : 'ghost'}
                    size="sm"
                    className={value.theme === 'dark' ? 'selected' : ''}
                    onClick={() => update('theme', 'dark')}
                    data-testid="theme-dark"
                  >
                    <Moon size={14} />
                    Dark
                  </Button>
                  <Button
                    variant={value.theme === 'light' ? 'secondary' : 'ghost'}
                    size="sm"
                    className={value.theme === 'light' ? 'selected' : ''}
                    onClick={() => update('theme', 'light')}
                    data-testid="theme-light"
                  >
                    <Sun size={14} />
                    Light
                  </Button>
                </div>,
              )}
              {row(
                'Text size',
                'Font size for reading and editing.',
                <Input
                  aria-label="Text size"
                  type="number"
                  min="12"
                  max="28"
                  value={value.fontSize}
                  onChange={(e) =>
                    update('fontSize', Math.min(28, Math.max(12, Number(e.target.value))))
                  }
                />,
              )}
              {row(
                'Readable line length',
                'Keep the writing column comfortably narrow.',
                toggle('readableWidth'),
              )}
              <label className="setting-block">
                <strong>CSS snippet</strong>
                <p>Local styling applied to this workspace. Paste CSS, not JavaScript.</p>
                <Textarea
                  aria-label="CSS snippet"
                  placeholder=".markdown { line-height: 1.8; }"
                  value={value.css}
                  onChange={(e) => update('css', e.target.value)}
                />
              </label>
            </>
          )}
          {tab === 'files' && (
            <>
              {(
                ['dailyFolder', 'dailyTemplate', 'templatesFolder', 'attachmentFolder'] as const
              ).map((key) =>
                row(
                  {
                    dailyFolder: 'Daily note folder',
                    dailyTemplate: 'Daily note template',
                    templatesFolder: 'Templates folder',
                    attachmentFolder: 'Attachment folder',
                  }[key],
                  'Path relative to the current vault.',
                  <Input
                    key={key}
                    aria-label={key}
                    value={value[key]}
                    onChange={(e) => update(key, e.target.value)}
                  />,
                ),
              )}
              <p className="settings-note">
                {bridge.platform === 'android'
                  ? 'Deleted files and up to 100 prior saved versions per text file remain in this app’s private profile. Export your vault before uninstalling; uninstalling removes private files. Shared-folder vaults are not supported in this Android pilot.'
                  : 'Deleted files stay in .crafactory/trash. Up to 100 prior saved versions per text file are retained in .crafactory/recovery. Nothing is synced to a remote service.'}
              </p>
            </>
          )}
          {tab === 'hotkeys' && (
            <>
              <p>
                Shortcuts use Ctrl on Windows / Linux and Command on macOS. Custom values use{' '}
                <code>mod+shift+x</code> notation.
              </p>
              {Object.entries({
                'new-note': 'mod+n',
                'quick-switcher': 'mod+o',
                'command-palette': 'mod+p',
                search: 'mod+shift+f',
                'toggle-mode': 'mod+e',
                settings: 'mod+,',
                'close-tab': 'mod+w',
                'daily-note': 'mod+shift+d',
              }).map(([id, shortcut]) =>
                row(
                  id.replaceAll('-', ' '),
                  '',
                  <Input
                    aria-label={'Hotkey ' + id}
                    value={value.hotkeys[id] || shortcut}
                    onChange={(e) => update('hotkeys', { ...value.hotkeys, [id]: e.target.value })}
                  />,
                ),
              )}
            </>
          )}
          {tab === 'core' && (
            <>
              <label className="setting-block">
                <Input
                  placeholder="Find a core plugin…"
                  aria-label="Find a core plugin"
                  value={pluginQuery}
                  onChange={(e) => setPluginQuery(e.target.value)}
                />
              </label>
              {corePlugins
                .filter((p) => p[1].toLowerCase().includes(pluginQuery.toLowerCase()))
                .map(([id, name, description]) =>
                  row(
                    name,
                    description,
                    <Switch
                      key={id}
                      aria-label={'Enable ' + name}
                      checked={!value.disabledPlugins.includes(id)}
                      onCheckedChange={(checked) =>
                        update(
                          'disabledPlugins',
                          checked
                            ? value.disabledPlugins.filter((p) => p !== id)
                            : [...value.disabledPlugins, id],
                        )
                      }
                    />,
                  ),
                )}
            </>
          )}
          {tab === 'community' && (
            <CommunitySettings
              plugins={plugins}
              enabled={enabled}
              onTogglePlugin={onTogglePlugin}
              modes={modes}
              onMode={onMode}
            />
          )}
          {tab === 'about' && (
            <div className="about">
              <img src="./icon.svg" width="64" height="64" alt="Crafactory Engine" />
              <h2>Crafactory Engine</h2>
              <p>Version {version} · MIT license</p>
              <p>
                An independently implemented Markdown workspace. No Obsidian source code, branded
                assets, or subscription services are included.
              </p>
              <p>
                {bridge.platform === 'android'
                  ? 'Android pilot: persisted app-private vault. Export before uninstalling. No shared-folder or desktop Node.js support.'
                  : bridge.desktop
                    ? 'Desktop mode: local filesystem vault.'
                    : 'Browser preview: temporary in-memory vault. Refreshing resets your changes.'}
              </p>
              <p>
                Functional parity is a project goal, not a claim of this release. See docs/PARITY.md
                for the current boundary.
              </p>
              <a href="https://github.com/crafactory/engine" target="_blank" rel="noreferrer">
                Repository & documentation
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
