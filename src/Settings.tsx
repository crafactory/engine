import {useState,useEffect,useRef} from 'react';
import type {PluginTab} from './compat-dom';
import {X,Sun,Moon,Shield,Keyboard,FileText,Palette,Puzzle,Info,Folder,HardDrive,Check,Download} from 'lucide-react';
import type {Settings as Preferences,PluginManifest} from './types';
import {bridge} from './bridge';
import {version} from '../package.json';
export const corePlugins=[
  ['audio','Audio recorder','Record audio and insert it into the active note.'],
  ['backlinks','Backlinks','Follow linked and unlinked mentions.'],
  ['bases','Bases','Browse YAML note properties in tables, lists, and cards.'],
  ['bookmarks','Bookmarks','Keep frequently used notes close.'],
  ['canvas','Canvas','Arrange cards and connections in JSON Canvas files.'],
  ['commands','Command palette','Run actions from the keyboard.'],
  ['daily','Daily notes','Create a note for each day.'],
  ['explorer','File explorer','Browse your local files and folders.'],
  ['recovery','File recovery','Recover previous versions from local snapshots.'],
  ['converter','Format converter','Convert common links and highlights to Markdown.'],
  ['graph','Graph view','Explore global and local note relationships.'],
  ['composer','Note composer','Merge notes and extract selected text.'],
  ['outgoing','Outgoing links','See where the active note leads.'],
  ['outline','Outline','Navigate headings in a note.'],
  ['preview','Page preview','Preview linked notes in reading view.'],
  ['properties','Properties','Edit YAML frontmatter values.'],
  ['switcher','Quick switcher','Find, create, and open notes.'],
  ['random','Random note','Visit a random note in your vault.'],
  ['search','Search','Find notes with operators and regular expressions.'],
  ['slash','Slash commands','Insert Markdown structures from the editor.'],
  ['slides','Slides','Present notes separated by horizontal rules.'],
  ['tags','Tags','Browse nested tags.'],
  ['templates','Templates','Insert reusable Markdown templates.'],
  ['unique','Unique note creator','Create notes with timestamp-based names.'],
  ['web','Web viewer','View pages that permit embedding.'],
  ['words','Word count','Count words and characters.'],
  ['workspaces','Workspaces','Save and restore workspace layouts.']
];
function PluginSettings({tab}:{tab:PluginTab}){const host=useRef<HTMLDivElement>(null);useEffect(()=>{host.current!.append(tab.containerEl);tab.display();return()=>{tab.hide();tab.containerEl.remove();};},[tab.id]);return <div ref={host}/>;}
export function Settings({value,onChange,onClose,plugins,enabled,onTogglePlugin,pluginTabs=[],modes={},onMode=()=>{}}:{value:Preferences;onChange:(value:Preferences)=>void;onClose:()=>void;plugins:PluginManifest[];enabled:string[];onTogglePlugin:(id:string)=>void;pluginTabs?:PluginTab[];modes?:Record<string,string>;onMode?:(id:string,mode:string)=>void}) {
  const [tab,setTab]=useState('appearance'),[pluginQuery,setPluginQuery]=useState('');
  const update=(key:keyof Preferences,v:any)=>onChange({...value,[key]:v});
  const row=(name:string,description:string,control:React.ReactNode)=><div className="setting-row"><div><strong>{name}</strong><p>{description}</p></div>{control}</div>;
  const toggle=(key:keyof Preferences)=><input aria-label={String(key)} type="checkbox" role="switch" checked={!!value[key]} onChange={e=>update(key,e.target.checked)}/>;
  return <div className="modal-backdrop" onClick={onClose}><section className="settings-modal" role="dialog" aria-modal="true" aria-label="Settings" onClick={e=>e.stopPropagation()}>
    <nav><div className="settings-label">Settings</div>{[['appearance',Palette,'Appearance'],['editor',FileText,'Editor'],['files',Folder,'Files & links'],['hotkeys',Keyboard,'Hotkeys'],['core',Puzzle,'Core plugins'],['community',Shield,'Community plugins'],['about',Info,'About']].map(([id,Icon,label])=><button key={String(id)} onClick={()=>setTab(String(id))} className={tab===id?'selected':''}>{typeof Icon!=='string'&&<Icon size={16}/>} {String(label)}</button>)}</nav>
    <div className="settings-content"><header><h2>{pluginTabs.find(p=>p.id===tab)?.name|| (tab==='core'?'Core plugins':tab==='community'?'Community plugins':tab==='files'?'Files & links':tab[0].toUpperCase()+tab.slice(1))}</h2><button onClick={onClose} aria-label="Close settings" data-testid="settings-close"><X size={18}/></button></header>
      {!!pluginTabs.length&&<div className="plugin-settings-tabs">{pluginTabs.map(p=><button key={p.id} onClick={()=>setTab(p.id)} aria-label={'Plugin settings '+p.name}>{p.name}</button>)}</div>}
      {pluginTabs.find(p=>p.id===tab)&&<PluginSettings tab={pluginTabs.find(p=>p.id===tab)!}/>}
      {tab==='appearance'&&<>
        {row('Color theme','A quiet workspace in light or dark.',<div className="segmented"><button className={value.theme==='dark'?'selected':''} onClick={()=>update('theme','dark')} data-testid="theme-dark"><Moon size={14}/>Dark</button><button className={value.theme==='light'?'selected':''} onClick={()=>update('theme','light')} data-testid="theme-light"><Sun size={14}/>Light</button></div>)}
        {row('Text size','Font size for reading and editing.',<input aria-label="Text size" type="number" min="12" max="28" value={value.fontSize} onChange={e=>update('fontSize',Math.min(28,Math.max(12,Number(e.target.value))))}/>)}
        {row('Readable line length','Keep the writing column comfortably narrow.',toggle('readableWidth'))}
        <label className="setting-block"><strong>CSS snippet</strong><p>Local styling applied to this workspace. Paste CSS, not JavaScript.</p><textarea aria-label="CSS snippet" placeholder=".markdown { line-height: 1.8; }" value={value.css} onChange={e=>update('css',e.target.value)}/></label>
      </>}
      {tab==='editor'&&<>
        {row('Default editing mode','Source shows syntax. Live mode hides some inline syntax away from the cursor.',<select aria-label="Default editing mode" value={value.mode} onChange={e=>update('mode',e.target.value)}><option value="live">Live editing</option><option value="source">Source</option><option value="reading">Reading</option></select>)}
        {row('Line numbers','Show line numbers in the editor.',toggle('lineNumbers'))}
        {row('Spellcheck','Use the operating system spellchecker.',toggle('spellcheck'))}
        <p className="settings-note">Live editing is currently an inline-formatting subset, not full rendered-block parity. Vim bindings are not yet implemented.</p>
      </>}
      {tab==='files'&&<>
        {(['dailyFolder','dailyTemplate','templatesFolder','attachmentFolder']as const).map(key=>row(({dailyFolder:'Daily note folder',dailyTemplate:'Daily note template',templatesFolder:'Templates folder',attachmentFolder:'Attachment folder'})[key],'Path relative to the current vault.',<input key={key} aria-label={key} value={value[key]} onChange={e=>update(key,e.target.value)}/>))}
        <p className="settings-note">Deleted files stay in .crafactory/trash. Up to 100 prior saved versions per text file are retained in .crafactory/recovery. Nothing is synced to a remote service.</p>
      </>}
      {tab==='hotkeys'&&<>
        <p>Shortcuts use Ctrl on Windows / Linux and Command on macOS. Custom values use <code>mod+shift+x</code> notation.</p>
        {Object.entries({'new-note':'mod+n','quick-switcher':'mod+o','command-palette':'mod+p','search':'mod+shift+f','toggle-mode':'mod+e','settings':'mod+,','close-tab':'mod+w','daily-note':'mod+shift+d'}).map(([id,shortcut])=>row(id.replaceAll('-',' '),'',<input aria-label={'Hotkey '+id} value={value.hotkeys[id]||shortcut} onChange={e=>update('hotkeys',{...value.hotkeys,[id]:e.target.value})}/>))}
      </>}
      {tab==='core'&&<>
        <label className="setting-block"><input placeholder="Find a core plugin…" aria-label="Find a core plugin" value={pluginQuery} onChange={e=>setPluginQuery(e.target.value)}/></label>
        {corePlugins.filter(p=>p[1].toLowerCase().includes(pluginQuery.toLowerCase())).map(([id,name,description])=>row(name,description,<input key={id} type="checkbox" role="switch" aria-label={'Enable '+name} checked={!value.disabledPlugins.includes(id)} onChange={e=>update('disabledPlugins',e.target.checked?value.disabledPlugins.filter(p=>p!==id):[...value.disabledPlugins,id])}/>))}
      </>}
      {tab==='community'&&<>
        <div className="security-notice"><Shield size={20}/><div><strong>Restricted mode by default</strong><p>Local plugins may use the Engine API or an experimental CommonJS Obsidian API subset. Full community-plugin compatibility is not supported. Unsupported APIs fail explicitly. Enabled plugins can read and modify notes and store data, including during startup. Only enable trusted code.</p></div></div>
        <p className="settings-note">Worker is the default. Trusted renderer adds DOM and CodeMirror integration but is not isolated from the application or vault bridge and cannot be forcibly interrupted. Runtime choices and enabled state reset on restart; no plugin runs automatically.</p>
        {!plugins.length?<div className="empty"><Puzzle size={28}/><h3>No local plugins installed</h3><p>Place a manifest.json and main.js in .crafactory/plugins/plugin-id, then reopen settings. An example plugin is included in the repository.</p></div>:plugins.map(p=><div key={p.id}>{row(p.name,`${p.description||''} · ${p.version}`,<input type="checkbox" role="switch" aria-label={'Enable '+p.name} checked={enabled.includes(p.id)} onChange={()=>onTogglePlugin(p.id)}/>)}<label className="plugin-runtime">Runtime for {p.name}<select aria-label={'Runtime for '+p.name} value={modes[p.id]||'worker'} disabled={enabled.includes(p.id)} onChange={e=>onMode(p.id,e.target.value)}><option value="worker">Worker (default)</option><option value="renderer">Trusted renderer (not sandboxed)</option></select></label></div>)}
      </>}
      {tab==='about'&&<div className="about"><img src="./icon.svg" width="64" height="64" alt="Crafactory Engine"/><h2>Crafactory Engine</h2><p>Version {version} · MIT license</p><p>An independently implemented Markdown workspace. No Obsidian source code, branded assets, or subscription services are included.</p><p>{bridge.desktop?'Desktop mode: local filesystem vault.':'Browser preview: temporary in-memory vault. Refreshing resets your changes.'}</p><p>Functional parity is a project goal, not a claim of this release. See docs/PARITY.md for the current boundary.</p><a href="https://github.com/crafactory/engine" target="_blank" rel="noreferrer">Repository & documentation</a></div>}
    </div>
  </section></div>;
}
