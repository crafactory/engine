import {lazy,Suspense,useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {
  Files,Search,Network,LayoutDashboard,CalendarDays,Terminal,Settings as SettingsIcon,
  PanelLeftClose,PanelLeftOpen,PanelRightClose,PanelRightOpen,Plus,X,ChevronRight,ChevronDown,
  FileText,Folder,FolderPlus,FilePlus,MoreHorizontal,BookOpen,Code2,Pencil,Bookmark,Hash,
  List,ArrowLeft,ArrowRight,Link2,Check,HardDrive,Clock,Pin,Download,Trash2,
  Copy,Scissors,Mic,Square,Table2,ExternalLink,RefreshCw,Star,Globe,Presentation,Layers,Menu
} from 'lucide-react';
import {parse,stringify} from 'yaml';
import {bridge,defaults} from './bridge';
import {title,isNote,frontmatter,setProperties,links,resolveLink,tags,headings,search,applyTemplate,rewriteLinks} from './knowledge';
import type {EditorHandle} from './Editor';
import {Markdown,renderMarkdown} from './Markdown';
import {Settings} from './Settings';
import {Palette,type Choice} from './Palette';
import {Slides} from './Slides';
import {useDialog} from './Dialog';
import {startPlugin,type PluginCommand} from './plugins';
import type {Note,Entry,Settings as Preferences,VaultState,Workspace,PluginManifest,Snapshot} from './types';
const Editor=lazy(()=>import('./Editor').then(m=>({default:m.Editor})));
const Graph=lazy(()=>import('./Graph').then(m=>({default:m.Graph})));
const Canvas=lazy(()=>import('./Canvas').then(m=>({default:m.Canvas})));
const Bases=lazy(()=>import('./Bases').then(m=>({default:m.Bases})));

const textFile=(path:string)=>/\.(md|markdown|canvas|base|txt|csv|json|css)$/i.test(path);
const validPath=(path:string)=>path&&!path.startsWith('/')&&!path.includes('\\')&&!path.split('/').some(p=>!p||p.startsWith('.'))&&!path.includes('\0');
const defaultKeys:Record<string,string>={'new-note':'mod+n','quick-switcher':'mod+o','command-palette':'mod+p','search':'mod+shift+f','toggle-mode':'mod+e','settings':'mod+,','close-tab':'mod+w','daily-note':'mod+shift+d'};
function Logo(){return <svg viewBox="0 0 32 32" fill="none" aria-label="Crafactory Engine"><path d="M23 9H12l-5 7 5 7h11M18 9l-5 7 5 7M13 16h12" stroke="currentColor" strokeWidth="2.3" strokeLinejoin="round"/></svg>;}
function IconButton({label,children,onClick,active=false,className='',testid}:{label:string;children:React.ReactNode;onClick:()=>void;active?:boolean;className?:string;testid?:string}){
  return <button className={'icon-button '+(active?'active ':'')+className} aria-label={label} title={label} onClick={onClick} data-testid={testid||label.toLowerCase().replace(/[^a-z0-9]+/g,'-')}>{children}</button>;
}
function download(name:string,content:string|Blob,type='text/plain'){
  const url=URL.createObjectURL(typeof content==='string'?new Blob([content],{type}):content);
  const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
export function App(){
  const [notes,setNotes]=useState<Note[]>([]),[entries,setEntries]=useState<Entry[]>([]);
  const [vaultName,setVaultName]=useState('Crafactory Vault'),[root,setRoot]=useState('');
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [settings,setSettings]=useState<Preferences>(defaults),[mode,setMode]=useState<Preferences['mode']>('reading');
  const [tabs,setTabs]=useState<string[]>([]),[active,setActive]=useState(''),[split,setSplit]=useState<string|null>(null);
  const [left,setLeft]=useState(()=>window.innerWidth>650),[right,setRight]=useState(true),[sideTab,setSideTab]=useState('files'),[rightTab,setRightTab]=useState('outline');
  const [expanded,setExpanded]=useState<Set<string>>(new Set(['Guides','Ideas','Projects']));
  const [bookmarks,setBookmarks]=useState<string[]>([]),[recent,setRecent]=useState<string[]>([]);
  const [workspaces,setWorkspaces]=useState<Record<string,Workspace>>({});
  const [query,setQuery]=useState(''),[caseSensitive,setCaseSensitive]=useState(false),[searchSort,setSearchSort]=useState('name'),[fileSort,setFileSort]=useState('name');
  const [palette,setPalette]=useState<'commands'|'files'|'templates'|'workspaces'|'merge'|null>(null);
  const [showSettings,setShowSettings]=useState(false),[slides,setSlides]=useState(false);
  const [context,setContext]=useState<{path:string;x:number;y:number}|null>(null);
  const [recovery,setRecovery]=useState<Snapshot[]|null>(null);
  const [pluginList,setPluginList]=useState<{manifest:PluginManifest;code:string}[]>([]),[enabledPlugins,setEnabledPlugins]=useState<string[]>([]),[pluginCommands,setPluginCommands]=useState<PluginCommand[]>([]);
  const [dirtyCount,setDirtyCount]=useState(0),[recording,setRecording]=useState(false);
  const notesRef=useRef<Note[]>([]),settingsRef=useRef(settings),editor=useRef<EditorHandle>(null);
  const timers=useRef(new Map<string,ReturnType<typeof setTimeout>>()),saves=useRef(new Map<string,Promise<void>>());
  const savedContent=useRef(new Map<string,string>()),versions=useRef(new Map<string,string|undefined>());
  const history=useRef<string[]>([]),historyIndex=useRef(-1),recorder=useRef<MediaRecorder|null>(null),stream=useRef<MediaStream|null>(null);
  const importInput=useRef<HTMLInputElement>(null),attachmentInput=useRef<HTMLInputElement>(null);
  const pluginStops=useRef(new Map<string,()=>void>()),loaded=useRef(false),vaultGeneration=useRef(0);
  const dialog=useDialog();
  settingsRef.current=settings;
  const enabled=(id:string)=>!settings.disabledPlugins.includes(id);
  const activeNote=notes.find(n=>n.path===active),activeMarkdown=activeNote&&isNote(active);
  function updateNotes(next:Note[]){notesRef.current=next;setNotes(next);}
  function report(e:unknown){setError(e instanceof Error?e.message:String(e));}
  function toast(message:string){setNotice(message);}
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),5000);return()=>clearTimeout(timer);},[notice]);

  async function initialize(){
    setLoading(true);setError('');
    try {
      const vault=await bridge.vault();
      const all=await Promise.all(vault.entries.filter(e=>!e.folder&&textFile(e.path)).map(e=>bridge.read(e.path)));
      vaultGeneration.current++;
      savedContent.current=new Map(all.map(n=>[n.path,n.content]));versions.current=new Map(all.map(n=>[n.path,n.version]));
      updateNotes(all);setEntries(vault.entries);setVaultName(vault.name);setRoot(vault.root);
      const state=vault.state;
      const pref={...defaults,...state.settings};setSettings(pref);setMode(bridge.desktop?pref.mode:'reading');
      setBookmarks(state.bookmarks||[]);setWorkspaces(state.workspaces||{});setRecent(state.recent||[]);
      const path=all.find(n=>n.path==='Welcome.md')?.path||all.find(n=>isNote(n.path))?.path||all[0]?.path||'';
      setTabs(path?[path]:[]);setActive(path);setSplit(null);history.current=path?[path]:[];historyIndex.current=path?0:-1;
      loaded.current=true;setPluginList(await bridge.plugins());
    }catch(e){report(e);}finally{setLoading(false);}
  }
  useEffect(()=>{initialize();return()=>{for(const timer of timers.current.values())clearTimeout(timer);stream.current?.getTracks().forEach(t=>t.stop());for(const stop of pluginStops.current.values())stop();};},[]);
  useEffect(()=>{
    if(!loaded.current)return;
    const timer=setTimeout(()=>{bridge.state({settings,bookmarks,workspaces,recent}).catch(report);},700);
    return()=>clearTimeout(timer);
  },[settings,bookmarks,workspaces,recent]);
  useEffect(()=>{document.documentElement.dataset.theme=settings.theme;},[settings.theme]);
  const refresh=useCallback(async()=>{
    try{
      const nextEntries=await bridge.list();
      const disk=await Promise.all(nextEntries.filter(e=>!e.folder&&textFile(e.path)).map(e=>bridge.read(e.path)));
      const next:Note[]=[];
      for(const note of disk){
        const current=notesRef.current.find(n=>n.path===note.path);
        if(current&&savedContent.current.get(note.path)!==current.content){
          if(savedContent.current.get(note.path)!==note.content&&!saves.current.has(note.path))setError('External edit detected for '+note.path+'. Your unsaved draft was kept. Use Save a copy before reloading.');
          next.push(current);
        }else{next.push(note);savedContent.current.set(note.path,note.content);versions.current.set(note.path,note.version);}
      }
      for(const note of notesRef.current)if(!disk.some(n=>n.path===note.path)&&savedContent.current.get(note.path)!==note.content)next.push(note);
      updateNotes(next);setEntries(nextEntries);
    }catch(e){report(e);}
  },[]);
  useEffect(()=>{let timer:ReturnType<typeof setTimeout>;const off=bridge.onChange(()=>{clearTimeout(timer);timer=setTimeout(refresh,350);});return()=>{clearTimeout(timer);off();};},[refresh]);
  async function persist(path:string){
    if(saves.current.has(path))return saves.current.get(path);
    const generation=vaultGeneration.current;
    const promise=(async()=>{
      try {
        for(;;){
          const draft=notesRef.current.find(n=>n.path===path);
          if(!draft||savedContent.current.get(path)===draft.content||generation!==vaultGeneration.current)break;
          const result=await bridge.write(path,draft.content,versions.current.get(path));
          if(generation!==vaultGeneration.current)break;
          versions.current.set(path,result.version);savedContent.current.set(path,result.content);
        }
        setEntries(await bridge.list());
      }catch(e){report(e);throw e;}
      finally{saves.current.delete(path);setDirtyCount(notesRef.current.filter(n=>savedContent.current.get(n.path)!==n.content).length);}
    })();
    saves.current.set(path,promise);return promise;
  }
  function editNote(path:string,content:string){
    const existing=notesRef.current.some(n=>n.path===path);
    updateNotes(existing?notesRef.current.map(n=>n.path===path?{...n,content}:n):[...notesRef.current,{path,content}]);
    setDirtyCount(notesRef.current.filter(n=>savedContent.current.get(n.path)!==n.content).length);
    clearTimeout(timers.current.get(path));
    timers.current.set(path,setTimeout(()=>{persist(path).catch(()=>{});timers.current.delete(path);},500));
  }
  async function flush(){
    for(const timer of timers.current.values())clearTimeout(timer);timers.current.clear();
    await Promise.all(notesRef.current.filter(n=>savedContent.current.get(n.path)!==n.content).map(n=>persist(n.path)));
  }
  const closeHandler=useRef<()=>void>(()=>{});
  closeHandler.current=()=>{flush().then(()=>bridge.state({settings,bookmarks,workspaces,recent})).then(()=>bridge.closeReady?.()).catch(report);};
  useEffect(()=>bridge.onBeforeClose?.(()=>closeHandler.current()),[]);
  useEffect(()=>{
    const unload=(event:BeforeUnloadEvent)=>{if(notesRef.current.some(n=>savedContent.current.get(n.path)!==n.content)){event.preventDefault();event.returnValue='There are unsaved changes.';}};
    window.addEventListener('beforeunload',unload);return()=>window.removeEventListener('beforeunload',unload);
  },[]);
  const open=useCallback((path:string,track=true)=>{
    setActive(path);setTabs(t=>t.includes(path)?t:[...t,path]);setRecent(r=>[path,...r.filter(p=>p!==path)].slice(0,30));
    if(track){history.current=history.current.slice(0,historyIndex.current+1);history.current.push(path);historyIndex.current=history.current.length-1;}
    if(window.innerWidth<700)setLeft(false);
  },[]);
  const openLink=useCallback((target:string)=>{
    const [path,...fragment]=target.split('#');
    const note=resolveLink(path,active,notesRef.current);
    if(note){
      open(note.path);
      if(fragment.length)setTimeout(()=>{
        const heading=headings(note.content).find(h=>h.text.toLowerCase()===fragment.join('#').toLowerCase());
        if(heading)editor.current?.jump(heading.offset);
        document.getElementById('heading-'+fragment.join('#').toLowerCase().replace(/\s+/g,'-'))?.scrollIntoView({behavior:'smooth'});
      },100);
    }else if(path)createNote(path.endsWith('.md')?path:path+'.md');
  },[active,open]);
  function closeTab(path:string){
    const next=tabs.filter(t=>t!==path);setTabs(next);
    if(active===path)setActive(next[Math.max(0,tabs.indexOf(path)-1)]||'');
  }
  function back(direction:number){const next=historyIndex.current+direction;if(next>=0&&next<history.current.length){historyIndex.current=next;open(history.current[next],false);}}
  async function createNote(initial?:string,content?:string){
    try {
      const value=initial || await dialog.ask('New note','Untitled.md','Enter a filename or a path relative to this vault.');
      if(!value)return;
      const path=value.match(/\.(md|canvas|base|txt|csv|json)$/i)?value:value+'.md';
      if(!validPath(path))throw new Error('Use a relative path without hidden folders or parent segments.');
      if(entries.some(e=>e.path===path)){open(path);return;}
      const result=await bridge.write(path,content ?? (isNote(path)?`# ${title(path)}\n\n`:''));
      versions.current.set(path,result.version);savedContent.current.set(path,result.content);
      updateNotes([...notesRef.current.filter(n=>n.path!==path),result]);setEntries(await bridge.list());open(path);
      setMode(isNote(path)?settings.mode:'reading');setTimeout(()=>editor.current?.focus(),100);
    }catch(e){report(e);}
  }
  async function newFolder(){
    const path=await dialog.ask('New folder','New folder');
    if(path)try{if(!validPath(path))throw new Error('Invalid folder path');await bridge.mkdir(path);setEntries(await bridge.list());setExpanded(e=>new Set([...e,path]));}catch(e){report(e);}
  }
  async function renamePath(from:string,requested?:string){
    const to=requested || await dialog.ask('Rename or move',from,'Internal links will be updated where their targets can be resolved.');
    if(!to||to===from)return;
    try{
      if(!validPath(to))throw new Error('Invalid destination path');await flush();
      const before=[...notesRef.current];
      await bridge.rename(from,to);
      const moved=before.filter(n=>n.path===from||n.path.startsWith(from+'/'));
      const mappings=moved.map(n=>({from:n.path,to:to+n.path.slice(from.length)}));
      for(const pair of mappings){savedContent.current.set(pair.to,savedContent.current.get(pair.from)!);versions.current.set(pair.to,versions.current.get(pair.from));savedContent.current.delete(pair.from);versions.current.delete(pair.from);}
      const updated=before.map(n=>({...n,path:mappings.find(p=>p.from===n.path)?.to||n.path}));
      updateNotes(updated);
      for(const note of before){
        const newPath=mappings.find(p=>p.from===note.path)?.to||note.path;
        let content=note.content;
        for(const pair of mappings)content=rewriteLinks(content,pair.from,pair.to,note.path,before);
        if(content!==note.content)editNote(newPath,content);
      }
      const remap=(p:string)=>mappings.find(pair=>pair.from===p)?.to||p;
      setTabs(t=>t.map(remap));setActive(remap);setBookmarks(b=>b.map(remap));setRecent(r=>r.map(remap));
      setEntries(await bridge.list());await flush();toast('Moved file and updated resolvable note links.');
    }catch(e){report(e);}
  }
  async function deletePath(path:string){
    setContext(null);
    if(!await dialog.confirm('Move to trash?',`${path} will be moved out of the vault. Desktop files are retained in .crafactory/trash.`,true))return;
    try{await flush();await bridge.trash(path);const removed=(p:string)=>p===path||p.startsWith(path+'/');updateNotes(notesRef.current.filter(n=>!removed(n.path)));setEntries(await bridge.list());setTabs(t=>t.filter(p=>!removed(p)));if(removed(active))setActive('');setBookmarks(b=>b.filter(p=>!removed(p)));toast('Moved to trash.');}catch(e){report(e);}
  }
  async function chooseVault(create=false){
    try{await flush();await bridge.state({settings,bookmarks,workspaces,recent});if(await bridge.choose(create)){for(const stop of pluginStops.current.values())stop();pluginStops.current.clear();setEnabledPlugins([]);setPluginCommands([]);await initialize();}}catch(e){report(e);}
  }
  async function dailyNote(){
    const date=applyTemplate('{{date}}',''),path=`${settings.dailyFolder}/${date}.md`;
    if(notes.some(n=>n.path===path)){open(path);return;}
    const template=notes.find(n=>n.path===settings.dailyTemplate)?.content||'# {{date}}\n\n';
    await createNote(path,applyTemplate(template,date));
  }
  async function createCanvas(){const name=await dialog.ask('New canvas','Untitled.canvas');if(name)createNote(name.endsWith('.canvas')?name:name+'.canvas','{"nodes":[],"edges":[]}');}
  async function createBase(){const name=await dialog.ask('New base','Library.base');if(name)createNote(name.endsWith('.base')?name:name+'.base','views:\n  - type: table\n    name: All notes\n    order: [file.name, note.status, note.tags, file.folder]\n');}
  function toggleBookmark(){if(active)setBookmarks(b=>b.includes(active)?b.filter(p=>p!==active):[...b,active]);}
  async function insertTemplate(path:string){
    if(!activeNote||!isNote(active)){toast('Open a Markdown note first.');return;}
    const template=notes.find(n=>n.path===path);if(!template)return;
    const content=applyTemplate(template.content,title(active));
    const templateMeta=frontmatter(content),currentMeta=frontmatter(activeNote.content);
    if(templateMeta.error||currentMeta.error){report(new Error('Fix invalid frontmatter before inserting a template.'));return;}
    if(mode==='reading'||templateMeta.raw){
      const combined=setProperties(activeNote.content,{...templateMeta.properties,...currentMeta.properties})+'\n'+templateMeta.body;
      editNote(active,combined);setMode(settings.mode==='reading'?'live':settings.mode);
      setTimeout(()=>editor.current?.jump(combined.length),100);
    }else editor.current?.insert(content);
  }
  async function extractSelection(){
    const selection=editor.current?.selection();
    if(!selection){toast('Select text in the editor first.');return;}
    const name=await dialog.ask('Extract selection to note','Extracted note.md');
    if(!name)return;
    const target=name.endsWith('.md')?name:name+'.md';
    if(notes.some(n=>n.path===target)){report(new Error('Target note already exists'));return;}
    editor.current?.replaceSelection(`[[${target.replace(/\.md$/,'')}]]`);await createNote(target,selection);
  }
  async function mergeInto(target:string){
    if(!activeNote||target===active)return;
    const destination=notes.find(n=>n.path===target);if(!destination)return;
    if(!await dialog.confirm('Merge notes?',`Append ${active} to ${target} and move the original to trash.`))return;
    try{
      await flush();
      editNote(target,destination.content+'\n\n'+frontmatter(activeNote.content).body);
      for(const n of notesRef.current.filter(n=>n.path!==active)) {
        const updated=rewriteLinks(n.content,active,target,n.path,notesRef.current);
        if(updated!==n.content)editNote(n.path,updated);
      }
      await flush();await bridge.trash(active);updateNotes(notesRef.current.filter(n=>n.path!==active));setTabs(t=>t.filter(p=>p!==active));setEntries(await bridge.list());open(target);
    }catch(e){report(e);}
  }
  async function showRecovery(){
    if(!activeNote)return;try{await flush();setRecovery(await bridge.snapshots(active));}catch(e){report(e);}
  }
  async function restoreSnapshot(id:string){
    try{const restored=await bridge.restore(id);versions.current.set(restored.path,restored.version);savedContent.current.set(restored.path,restored.content);updateNotes(notesRef.current.map(n=>n.path===restored.path?restored:n));setRecovery(null);toast('Previous version restored.');}catch(e){report(e);}
  }
  async function saveWorkspace(){
    const name=await dialog.ask('Save workspace','My workspace');if(name)setWorkspaces(w=>({...w,[name]:{tabs,active,split,left,right,mode}}));
  }
  function loadWorkspace(name:string){const w=workspaces[name];if(w){setTabs(w.tabs);setActive(w.active);setSplit(w.split);setLeft(w.left);setRight(w.right);setMode(w.mode);}}
  async function exportVault(){
    try{
      await flush();const {default:JSZip}=await import('jszip');const zip=new JSZip();
      for(const e of entries.filter(e=>!e.folder)){
        const note=notesRef.current.find(n=>n.path===e.path);
        if(note)zip.file(e.path,note.content);
        else {const asset=await bridge.asset(e.path);if(asset.startsWith('data:'))zip.file(e.path,asset.split(',')[1],{base64:true});else if(asset){const response=await fetch(asset);zip.file(e.path,await response.blob());}}
      }
      zip.file('.crafactory/state.json',JSON.stringify({settings,bookmarks,workspaces,recent},null,2));
      download(vaultName+'.zip',await zip.generateAsync({type:'blob'}),'application/zip');toast('Vault exported.');
    }catch(e){report(e);}
  }
  async function importFiles(fileList:FileList|null){
    if(!fileList)return;
    try{
      for(const file of Array.from(fileList)){
        if(textFile(file.name)){let path=file.name;if(entries.some(e=>e.path===path)){const dot=path.lastIndexOf('.');path=path.slice(0,dot)+'-'+Date.now()+path.slice(dot);}await createNote(path,await file.text());}
        else {const path=await bridge.attach(file.name,Array.from(new Uint8Array(await file.arrayBuffer())));if(activeNote&&isNote(active))editNote(active,(notesRef.current.find(n=>n.path===active)?.content||'')+`\n![[${path}]]\n`);}
      }
      setEntries(await bridge.list());toast('Files imported.');
    }catch(e){report(e);}
  }
  async function audio(){
    if(recording){recorder.current?.stop();return;}
    if(!activeNote||!isNote(active)){toast('Open a note before recording.');return;}
    const path=active;
    try{
      stream.current=await navigator.mediaDevices.getUserMedia({audio:true});
      const media=new MediaRecorder(stream.current);recorder.current=media;const chunks:Blob[]=[];
      media.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      media.onstop=async()=>{
        setRecording(false);stream.current?.getTracks().forEach(t=>t.stop());
        try{const blob=new Blob(chunks,{type:media.mimeType});const name='Recording-'+Date.now()+(/ogg/.test(media.mimeType)?'.ogg':'.webm');const attachment=await bridge.attach(name,Array.from(new Uint8Array(await blob.arrayBuffer())));const note=notesRef.current.find(n=>n.path===path);if(note)editNote(path,note.content+`\n![[${attachment}]]\n`);setEntries(await bridge.list());}catch(e){report(e);}
      };
      media.start();setRecording(true);
    }catch(e){report(e);}
  }
  async function openWeb(){
    const url=await dialog.ask('Open web viewer','https://example.com','Only HTTPS pages are supported. Some sites block embedded viewing.');
    if(!url)return;try{const parsed=new URL(url);if(parsed.protocol!=='https:')throw new Error('Use an HTTPS URL');open('web:'+url);}catch(e){report(e);}
  }
  async function togglePlugin(id:string){
    if(enabledPlugins.includes(id)){
      pluginStops.current.get(id)?.();pluginStops.current.delete(id);setEnabledPlugins(e=>e.filter(p=>p!==id));setPluginCommands(c=>c.filter(p=>p.plugin!==id));return;
    }
    const plugin=pluginList.find(p=>p.manifest.id===id);if(!plugin)return;
    if(!await dialog.confirm('Enable '+plugin.manifest.name+'?', 'This local plugin can read and modify vault notes when its commands run. Only enable code you trust.'))return;
    const stop=startPlugin(plugin.manifest,plugin.code,()=>notesRef.current,commands=>setPluginCommands(c=>[...c.filter(p=>p.plugin!==id),...commands]),editNote,toast);
    pluginStops.current.set(id,stop);setEnabledPlugins(e=>[...e,id]);
  }
  function toggleMode(){setMode(m=>m==='reading'?'live':'reading');}
  const commands:Choice[]=[
    {id:'new-note',label:'Create new note',shortcut:'⌘ N',run:()=>createNote()},
    {id:'new-folder',label:'Create new folder',run:newFolder},
    {id:'open-vault',label:'Open another vault',run:()=>chooseVault()},
    {id:'new-vault',label:'Create a vault in a folder',run:()=>chooseVault(true)},
    {id:'quick-switcher',label:'Open quick switcher',shortcut:'⌘ O',run:()=>setPalette('files')},
    {id:'command-palette',label:'Open command palette',shortcut:'⌘ P',run:()=>setPalette('commands')},
    {id:'search',label:'Search all notes',shortcut:'⌘ ⇧ F',run:()=>{setLeft(true);setSideTab('search');}},
    {id:'daily-note',label:"Open today's daily note",run:dailyNote},
    {id:'unique-note',label:'Create unique note',run:()=>createNote(new Date().toISOString().replace(/\D/g,'').slice(0,14)+'.md')},
    {id:'graph',label:'Open graph view',run:()=>open('@graph')},
    {id:'local-graph',label:'Open local graph',run:()=>open('@local:'+active)},
    {id:'new-canvas',label:'Create new canvas',run:createCanvas},
    {id:'new-base',label:'Create new base',run:createBase},
    {id:'random-note',label:'Open a random note',run:()=>{const n=notes.filter(n=>isNote(n.path));if(n.length)open(n[Math.floor(Math.random()*n.length)].path);}},
    {id:'insert-template',label:'Insert template',run:()=>setPalette('templates')},
    {id:'bookmark',label:'Toggle bookmark for current note',run:toggleBookmark},
    {id:'toggle-mode',label:'Toggle reading and editing',shortcut:'⌘ E',run:toggleMode},
    {id:'source-mode',label:'Switch to source mode',run:()=>setMode('source')},
    {id:'live-mode',label:'Switch to live editing',run:()=>setMode('live')},
    {id:'split-pane',label:'Split editor right',run:()=>setSplit(active)},
    {id:'close-split',label:'Close split editor',run:()=>setSplit(null)},
    {id:'close-tab',label:'Close current tab',shortcut:'⌘ W',run:()=>closeTab(active)},
    {id:'rename-note',label:'Rename or move current file',run:()=>activeNote&&renamePath(active)},
    {id:'delete-note',label:'Move current file to trash',run:()=>activeNote&&deletePath(active)},
    {id:'save-copy',label:'Save a copy of current note',run:async()=>{if(activeNote){const name=await dialog.ask('Save a copy',title(active)+' copy.md');if(name)createNote(name,activeNote.content);}}},
    {id:'save',label:'Save all pending changes',run:()=>flush().then(()=>toast('All changes saved.')).catch(()=>{})},
    {id:'refresh',label:'Reload files from disk',run:async()=>{if(dirtyCount&&!await dialog.confirm('Discard unsaved drafts?', 'Use Save a copy first if you want to keep your drafts.'))return;for(const t of timers.current.values())clearTimeout(t);timers.current.clear();savedContent.current=new Map(notesRef.current.map(n=>[n.path,n.content]));await refresh();setDirtyCount(0);setError('');}},
    {id:'merge-note',label:'Merge current note into another note',run:()=>setPalette('merge')},
    {id:'extract-note',label:'Extract selection into a new note',run:extractSelection},
    {id:'recovery',label:'Open file recovery',run:showRecovery},
    {id:'save-workspace',label:'Save current workspace',run:saveWorkspace},
    {id:'load-workspace',label:'Load a workspace',run:()=>setPalette('workspaces')},
    {id:'slides',label:'Start presentation',run:()=>activeMarkdown&&setSlides(true)},
    {id:'web-viewer',label:'Open web viewer',run:openWeb},
    {id:'audio',label:recording?'Stop audio recording':'Start audio recording',run:audio},
    {id:'import',label:'Import Markdown notes and attachments',run:()=>importInput.current?.click()},
    {id:'export-vault',label:'Export entire vault as ZIP',run:exportVault},
    {id:'export-markdown',label:'Export current note as Markdown',run:()=>activeNote&&download(active.split('/').pop()!,activeNote.content)},
    {id:'export-html',label:'Export current note as HTML',run:()=>activeNote&&download(title(active)+'.html',`<!doctype html><meta charset="utf-8"><title>${title(active).replace(/[<>]/g,'')}</title><article>${renderMarkdown(activeNote.content)}</article>`,'text/html')},
    {id:'export-pdf',label:'Export current note to PDF',run:async()=>{if(!activeNote)return;setMode('reading');setTimeout(()=>bridge.print().catch(report),100);}},
    {id:'converter',label:'Convert Markdown formatting',run:()=>{if(activeNote)editNote(active,activeNote.content.replace(/<mark>([\s\S]*?)<\/mark>/g,'==$1==').replace(/\[([^\]]+)\]\(([^):]+)\.md\)/g,'[[$2|$1]]'));}},
    {id:'find',label:'Find and replace in current note',run:()=>{setMode('source');setTimeout(()=>editor.current?.find(),100);}},
    {id:'left-sidebar',label:'Toggle left sidebar',run:()=>setLeft(l=>!l)},
    {id:'right-sidebar',label:'Toggle right sidebar',run:()=>setRight(r=>!r)},
    {id:'theme',label:'Toggle light and dark theme',run:()=>setSettings(s=>({...s,theme:s.theme==='dark'?'light':'dark'}))},
    {id:'settings',label:'Open settings',shortcut:'⌘ ,',run:async()=>{setPluginList(await bridge.plugins());setShowSettings(true);}},
    ...pluginCommands
  ].filter(c=>{
    const group:Record<string,string>={'graph':'graph','local-graph':'graph','daily-note':'daily','unique-note':'unique','new-canvas':'canvas','new-base':'bases','random-note':'random','insert-template':'templates','bookmark':'bookmarks','merge-note':'composer','extract-note':'composer','recovery':'recovery','save-workspace':'workspaces','load-workspace':'workspaces','slides':'slides','web-viewer':'web','audio':'audio','converter':'converter','search':'search','quick-switcher':'switcher','command-palette':'commands'};
    return !group[c.id]||enabled(group[c.id]);
  });
  const commandsRef=useRef(commands);commandsRef.current=commands;
  function runCommand(id:string){try{commandsRef.current.find(c=>c.id===id)?.run();}catch(e){report(e);}}
  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){setPalette(null);setContext(null);setShowSettings(false);return;}
      const parts=[...(e.ctrlKey||e.metaKey?['mod']:[]),...(e.altKey?['alt']:[]),...(e.shiftKey?['shift']:[]),e.key.toLowerCase()];
      const combo=parts.join('+');
      const shortcuts={...defaultKeys,...settingsRef.current.hotkeys};
      const id=Object.keys(shortcuts).find(id=>shortcuts[id].toLowerCase()===combo);
      if(id){e.preventDefault();runCommand(id);}
      if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();runCommand('save');}
    };
    const native=(e:Event)=>runCommand((e as CustomEvent).detail);
    window.addEventListener('keydown',key);window.addEventListener('engine-command',native);
    return()=>{window.removeEventListener('keydown',key);window.removeEventListener('engine-command',native);};
  },[]);
  const tagCounts=useMemo(()=>{
    const counts=new Map<string,number>();for(const note of notes.filter(n=>isNote(n.path)))for(const tag of tags(note.content))counts.set(tag,(counts.get(tag)||0)+1);return [...counts].sort((a,b)=>b[1]-a[1]);
  },[notes]);
  const results=useMemo(()=>search(notes.filter(n=>isNote(n.path)||n.path.endsWith('.canvas')),query,caseSensitive).sort((a,b)=>searchSort==='modified'?(entries.find(e=>e.path===b.path)?.mtime||0)-(entries.find(e=>e.path===a.path)?.mtime||0):a.path.localeCompare(b.path)),[notes,query,caseSensitive,searchSort,entries]);
  const incoming=activeNote?notes.filter(n=>n.path!==active&&links(n.content).some(l=>resolveLink(l.target,n.path,notes)?.path===active)):[];
  const outgoing=activeNote?links(activeNote.content):[];
  const mentions=activeNote?notes.filter(n=>n.path!==active&&!incoming.includes(n)&&isNote(n.path)&&frontmatter(n.content).body.toLowerCase().includes(title(active).toLowerCase())):[];
  const hs=activeNote?headings(activeNote.content):[];
  const words=activeNote?frontmatter(activeNote.content).body.match(/[\p{L}\p{N}]+/gu)?.length||0:0;
  const tabTitle=(path:string)=>path==='@graph'?'Graph view':path.startsWith('@local:')?'Local graph':path.startsWith('web:')?new URL(path.slice(4)).hostname:title(path);
  function tree(parent=''):React.ReactNode{
    return entries.filter(e=>e.path.includes('/')?e.path.slice(0,e.path.lastIndexOf('/'))===parent:!parent).sort((a,b)=>Number(b.folder)-Number(a.folder)||(fileSort==='modified'?b.mtime-a.mtime:a.name.localeCompare(b.name))).map(entry=><div key={entry.path} className="tree-item">
      <button className={'tree-row '+(entry.path===active?'selected':'')} style={{paddingLeft:12+(parent?parent.split('/').length:0)*13}} onClick={()=>entry.folder?setExpanded(s=>{const next=new Set(s);next.has(entry.path)?next.delete(entry.path):next.add(entry.path);return next;}):open(entry.path)}
        onContextMenu={e=>{e.preventDefault();setContext({path:entry.path,x:Math.min(e.clientX,window.innerWidth-225),y:Math.min(e.clientY,window.innerHeight-260)});}}
        draggable onDragStart={e=>e.dataTransfer.setData('engine/path',entry.path)} onDragOver={e=>entry.folder&&e.preventDefault()}
        onDrop={e=>{if(entry.folder){e.preventDefault();const path=e.dataTransfer.getData('engine/path');if(path&&path!==entry.path&&!entry.path.startsWith(path+'/'))renamePath(path,entry.path+'/'+path.split('/').pop());}}}
        data-testid={'file-'+entry.path}>
        {entry.folder?(expanded.has(entry.path)?<ChevronDown size={13}/>:<ChevronRight size={13}/>):<span className="tree-indent"/>}
        {entry.folder?<Folder size={14}/>:entry.path.endsWith('.canvas')?<LayoutDashboard size={14}/>:entry.path.endsWith('.base')?<Table2 size={14}/>:<FileText size={14}/>}
        <span>{entry.folder?entry.name:title(entry.path)}</span>
      </button>{entry.folder&&expanded.has(entry.path)&&tree(entry.path)}
    </div>);
  }
  function propertyEditor(note:Note){
    const fm=frontmatter(note.content),props=fm.properties;
    if(fm.error)return <div className="property-error">Invalid YAML: fix it in source mode.</div>;
    return <details className="properties" open={undefined}><summary><Layers size={14}/>Properties<span>{Object.keys(props).length}</span></summary>
      <div className="property-list">{Object.entries(props).map(([key,value])=><div className="property-row" key={key}><span><Hash size={12}/>{key}</span><button title={'Edit '+key} onClick={async()=>{const v=await dialog.ask('Edit '+key,stringify(value).trim(),'Use a YAML value: text, number, true / false, or [a, b].');if(v!==null)try{editNote(note.path,setProperties(note.content,{...props,[key]:parse(v)}));}catch(e){report(e);}}}>{Array.isArray(value)?value.map((v,i)=><span className="property-chip" key={i}>{String(v)}</span>):String(value??'Empty')}</button><button className="property-remove" aria-label={'Remove '+key} onClick={()=>{const p={...props};delete p[key];try{editNote(note.path,setProperties(note.content,p));}catch(e){report(e);}}}><X size={12}/></button></div>)}
      <button className="add-property" onClick={async()=>{const key=await dialog.ask('Add property','property');if(key&& !['__proto__','constructor','prototype'].includes(key))try{editNote(note.path,setProperties(note.content,{...props,[key]:''}));}catch(e){report(e);}}}><Plus size={13}/>Add property</button></div></details>;
  }
  function showNote(path:string,secondary=false){
    const note=notes.find(n=>n.path===path);
    if(path==='@graph'||path.startsWith('@local:'))return <Graph notes={notes} active={path.startsWith('@local:')?path.slice(7):recent.find(p=>isNote(p))||''} onOpen={open} local={path.startsWith('@local:')}/>;
    if(path.startsWith('web:'))return <section className="web-view"><header><Globe size={16}/><span>{path.slice(4)}</span><a href={path.slice(4)} target="_blank" rel="noreferrer">Open in browser<ExternalLink size={13}/></a></header><p className="web-notice">This site may block embedding. Use “Open in browser” if the page is blank.</p><iframe title="Web viewer" src={path.slice(4)} sandbox="allow-scripts allow-forms allow-same-origin" referrerPolicy="no-referrer"/></section>;
    if(!note){
      if(path&&entries.some(e=>e.path===path&&!e.folder))return <Attachment path={path}/>;
      return <div className="empty workspace-empty"><Logo/><h1>A place to think</h1><p>Create a note, open a vault, or follow an idea.<br/>Your files stay yours.</p><button className="primary" onClick={()=>createNote()}><Plus size={15}/>Create a note</button><button onClick={()=>chooseVault()}><Folder size={15}/>Open local vault</button><small>{bridge.desktop?'Local-first · Markdown · MIT':'Temporary preview · Install desktop for local files'}</small></div>;
    }
    if(note.path.endsWith('.canvas')&&mode!=='source'&&enabled('canvas'))return <Canvas note={note} notes={notes} onChange={value=>editNote(note.path,value)} onOpen={open}/>;
    if(note.path.endsWith('.base')&&mode!=='source'&&enabled('bases'))return <Bases note={note} notes={notes} entries={entries} onOpen={open} onChange={value=>editNote(note.path,value)} onNoteChange={editNote} ask={dialog.ask}/>;
    return <div className="note-document" onDragOver={e=>e.preventDefault()} onDrop={e=>{if(e.dataTransfer.files.length){e.preventDefault();importFiles(e.dataTransfer.files);}}}>
      <div className={'document-inner '+(settings.readableWidth?'readable':'')} style={{fontSize:settings.fontSize}}>
        <div className="note-title"><h1>{title(note.path)}</h1><button className={bookmarks.includes(path)?'is-bookmarked':''} onClick={()=>setBookmarks(b=>b.includes(path)?b.filter(p=>p!==path):[...b,path])} aria-label="Bookmark note" title="Bookmark note"><Bookmark size={19} fill={bookmarks.includes(path)?'currentColor':'none'}/></button></div>
        {enabled('properties')&&isNote(note.path)&&propertyEditor(note)}
      </div>
      {mode==='reading'&&isNote(note.path)?<div className={'reading-surface '+(settings.readableWidth?'readable':'')} style={{fontSize:settings.fontSize}}><Markdown content={note.content} notes={notes} path={note.path} onOpen={openLink} onChange={content=>editNote(note.path,content)}/></div>:
        <Editor ref={secondary?undefined:editor} note={note} notes={notes} settings={{...settings,mode:mode==='reading'?'source':mode}} onChange={content=>editNote(note.path,content)} onOpen={openLink} onCommand={runCommand}/>}
    </div>;
  }
  let paletteItems:Choice[]=[];
  if(palette==='commands')paletteItems=commands;
  if(palette==='files')paletteItems=[...notes].sort((a,b)=>{const x=recent.indexOf(a.path),y=recent.indexOf(b.path);return (x<0?999:x)-(y<0?999:y);}).map(n=>({id:n.path,label:title(n.path),description:n.path,run:()=>open(n.path)}));
  if(palette==='templates')paletteItems=notes.filter(n=>isNote(n.path)&&n.path.startsWith(settings.templatesFolder+'/')).map(n=>({id:n.path,label:title(n.path),description:n.path,run:()=>insertTemplate(n.path)}));
  if(palette==='workspaces')paletteItems=Object.keys(workspaces).map(name=>({id:name,label:name,run:()=>loadWorkspace(name)}));
  if(palette==='merge')paletteItems=notes.filter(n=>isNote(n.path)&&n.path!==active).map(n=>({id:n.path,label:title(n.path),description:n.path,run:()=>mergeInto(n.path)}));

  return <div className="app" onClick={()=>context&&setContext(null)}>
    <style>{settings.css}</style>
    <input ref={importInput} type="file" multiple accept=".md,.markdown,.txt,image/*,audio/*,video/*,.pdf,.canvas,.base" className="hidden" aria-label="Import files" onChange={e=>{importFiles(e.target.files);e.target.value='';}}/>
    <input ref={attachmentInput} type="file" multiple className="hidden" aria-label="Add attachment" onChange={e=>{importFiles(e.target.files);e.target.value='';}}/>
    <div className="workspace">
      <nav className="ribbon" aria-label="Workspace tools">
        <div className="ribbon-tools">
          {enabled('explorer')&&<IconButton label="File explorer" onClick={()=>{setLeft(true);setSideTab('files');}} active={left&&sideTab==='files'}><Files size={20}/></IconButton>}
          {enabled('search')&&<IconButton label="Search" onClick={()=>{setLeft(true);setSideTab('search');}} active={left&&sideTab==='search'}><Search size={20}/></IconButton>}
          {enabled('graph')&&<IconButton label="Graph view" onClick={()=>open('@graph')} active={active==='@graph'}><Network size={20}/></IconButton>}
          {enabled('canvas')&&<IconButton label="New canvas" onClick={createCanvas}><LayoutDashboard size={20}/></IconButton>}
          {enabled('daily')&&<IconButton label="Daily note" onClick={dailyNote}><CalendarDays size={20}/></IconButton>}
          {enabled('commands')&&<IconButton label="Command palette" onClick={()=>setPalette('commands')}><Terminal size={20}/></IconButton>}
          {enabled('bookmarks')&&<IconButton label="Bookmarks" onClick={()=>{setLeft(true);setSideTab('bookmarks');}} active={sideTab==='bookmarks'}><Bookmark size={20}/></IconButton>}
          {enabled('tags')&&<IconButton label="Tags" onClick={()=>{setLeft(true);setSideTab('tags');}} active={sideTab==='tags'}><Hash size={20}/></IconButton>}
        </div>
        <div>{enabled('audio')&&<IconButton label={recording?'Stop recording':'Record audio'} onClick={audio} active={recording}><Mic size={19}/></IconButton>}<IconButton label="Open another vault" onClick={()=>chooseVault()}><HardDrive size={19}/></IconButton><IconButton label="Settings" onClick={()=>runCommand('settings')}><SettingsIcon size={20}/></IconButton></div>
      </nav>
      {left&&<aside className="left-sidebar" aria-label="Vault navigation">
        <div className="sidebar-tabs">
          {enabled('explorer')&&<IconButton label="Files tab" onClick={()=>setSideTab('files')} active={sideTab==='files'}><Files size={16}/></IconButton>}
          {enabled('search')&&<IconButton label="Search tab" onClick={()=>setSideTab('search')} active={sideTab==='search'}><Search size={16}/></IconButton>}
          <IconButton label="Recent notes" onClick={()=>setSideTab('recent')} active={sideTab==='recent'}><Clock size={16}/></IconButton>
          <IconButton label="Collapse sidebar" onClick={()=>setLeft(false)} className="push-right"><PanelLeftClose size={16}/></IconButton>
        </div>
        <div className="vault-heading"><span>{sideTab==='files'?vaultName:sideTab==='search'?'Search':sideTab==='tags'?'Tags':sideTab==='bookmarks'?'Bookmarks':'Recent notes'}</span>
          {sideTab==='files'&&<div><IconButton label="New note" onClick={()=>createNote()}><FilePlus size={15}/></IconButton><IconButton label="New folder" onClick={newFolder}><FolderPlus size={15}/></IconButton></div>}
        </div>
        {sideTab==='files'&&<><div className="file-controls"><button onClick={()=>setExpanded(new Set())} title="Collapse all folders">Collapse all</button><select aria-label="Sort files" value={fileSort} onChange={e=>setFileSort(e.target.value)}><option value="name">Name ↑</option><option value="modified">Modified ↓</option></select></div><div className="file-tree">{loading?<div className="skeleton-list"><i/><i/><i/><i/></div>:entries.length?tree():<div className="empty"><Folder size={25}/><p>Your vault is empty. Start with one note.</p><button onClick={()=>createNote()}>New note</button></div>}</div></>}
        {sideTab==='search'&&<><label className="search-input"><Search size={15}/><input autoFocus placeholder="Search notes…" value={query} onChange={e=>setQuery(e.target.value)} aria-label="Search notes" data-testid="search-input"/><button onClick={()=>setCaseSensitive(v=>!v)} className={caseSensitive?'selected':''} aria-label="Match case">Aa</button></label><div className="search-meta"><span>{results.length} results</span><select aria-label="Sort search results" value={searchSort} onChange={e=>setSearchSort(e.target.value)}><option value="name">Name ↑</option><option value="modified">Modified ↓</option></select><button aria-label="Copy search results" onClick={()=>navigator.clipboard?.writeText(results.map(n=>`[[${n.path.replace(/\.md$/,'')}]]`).join('\n')).then(()=>toast('Search results copied.')).catch(report)}><Copy size={13}/></button></div>
          <div className="search-results">{results.map(n=><button key={n.path} onClick={()=>open(n.path)} data-testid={'search-result-'+n.path}><span><FileText size={13}/>{title(n.path)}</span><small>{n.path}</small>{query&&<p>{frontmatter(n.content).body.replace(/[#*`\[\]]/g,'').slice(0,140)}</p>}</button>)}</div><p className="search-help">Try tag:#thinking, path:Ideas, task-todo: or /regex/. Operators can be grouped with parentheses and OR.</p></>}
        {sideTab==='tags'&&<div className="tag-list">{tagCounts.map(([tag,count])=><button key={tag} onClick={()=>{setQuery('tag:#'+tag);setSideTab('search');}}><Hash size={14}/><span>{tag}</span><small>{count}</small></button>)}</div>}
        {(sideTab==='bookmarks'||sideTab==='recent')&&<div className="bookmark-list">{(sideTab==='bookmarks'?bookmarks:recent.filter(p=>notes.some(n=>n.path===p))).map(path=><button key={path} onClick={()=>open(path)}><FileText size={14}/><span>{tabTitle(path)}</span>{sideTab==='bookmarks'&&<span role="button" aria-label="Remove bookmark" onClick={e=>{e.stopPropagation();setBookmarks(b=>b.filter(p=>p!==path));}}><X size={12}/></span>}</button>)}{sideTab==='bookmarks'&&!bookmarks.length&&<div className="empty"><Bookmark size={24}/><p>Bookmark a note to keep it here.</p></div>}</div>}
        <footer className="sidebar-footer"><button onClick={()=>chooseVault()}><HardDrive size={14}/><span>{vaultName}</span><ChevronDown size={13}/></button><span>{entries.filter(e=>!e.folder&&isNote(e.path)).length} notes</span></footer>
      </aside>}
      <main className="main-workspace">
        <div className="tabbar">
          {!left&&<IconButton label="Expand sidebar" onClick={()=>setLeft(true)}><PanelLeftOpen size={17}/></IconButton>}
          <div className="tabs" role="tablist" aria-label="Open files">{tabs.map(path=><div className={'tab '+(active===path?'active':'')} role="tab" aria-selected={active===path} key={path} draggable
            onDragStart={e=>e.dataTransfer.setData('engine/tab',path)} onDragOver={e=>e.preventDefault()} onDrop={e=>{const from=e.dataTransfer.getData('engine/tab');if(from){const next=tabs.filter(t=>t!==from);next.splice(next.indexOf(path),0,from);setTabs(next);}}}>
            <button onClick={()=>open(path,false)}>{path==='@graph'||path.startsWith('@local:')?<Network size={14}/>:path.endsWith('.canvas')?<LayoutDashboard size={14}/>:path.endsWith('.base')?<Table2 size={14}/>:<FileText size={14}/>}<span>{tabTitle(path)}</span></button><button aria-label={'Close '+tabTitle(path)} onClick={()=>closeTab(path)}><X size={12}/></button>
          </div>)}</div><IconButton label="Create note" onClick={()=>createNote()}><Plus size={17}/></IconButton>
          <IconButton label={right?'Collapse right sidebar':'Expand right sidebar'} onClick={()=>setRight(r=>!r)}>{right?<PanelRightClose size={17}/>:<PanelRightOpen size={17}/>}</IconButton>
        </div>
        <div className="note-toolbar"><div className="breadcrumb"><IconButton label="Back" onClick={()=>back(-1)}><ArrowLeft size={15}/></IconButton><IconButton label="Forward" onClick={()=>back(1)}><ArrowRight size={15}/></IconButton><span>{active?active.split('/').slice(0,-1).join(' / ')||vaultName:vaultName}</span>{active&&<><ChevronRight size={12}/><span className="current-crumb">{tabTitle(active)}</span></>}</div>
          <div className="note-actions">{activeNote&&<div className="view-modes" aria-label="Note mode"><IconButton label="Source mode" onClick={()=>setMode('source')} active={mode==='source'} testid="mode-source"><Code2 size={16}/></IconButton><IconButton label="Live editing" onClick={()=>setMode('live')} active={mode==='live'} testid="mode-live"><Pencil size={15}/></IconButton><IconButton label="Reading view" onClick={()=>setMode('reading')} active={mode==='reading'} testid="mode-reading"><BookOpen size={16}/></IconButton></div>}<IconButton label="More actions" onClick={()=>setPalette('commands')}><MoreHorizontal size={19}/></IconButton></div>
        </div>
        {error&&<div className="error-banner" role="alert"><span>{error}</span><button onClick={()=>setError('')} aria-label="Dismiss error"><X size={16}/></button></div>}
        {loading?<div className="workspace-loading"><div className="skeleton-list"><i/><i/><i/></div><p>Opening vault…</p></div>:<Suspense fallback={<div className="workspace-loading"><p>Opening view…</p></div>}><div className={'panes '+(split?'split':'')}><section className="workspace-pane">{showNote(active)}</section>{split&&<section className="workspace-pane secondary-pane"><header><span>{title(split)}</span><button aria-label="Close split pane" onClick={()=>setSplit(null)}><X size={15}/></button></header>{showNote(split,true)}</section>}</div></Suspense>}
      </main>
      {right&&<aside className="right-sidebar" aria-label="Note context">
        <div className="sidebar-tabs"><IconButton label="Outline tab" onClick={()=>setRightTab('outline')} active={rightTab==='outline'}><List size={17}/></IconButton><IconButton label="Backlinks tab" onClick={()=>setRightTab('backlinks')} active={rightTab==='backlinks'}><Link2 size={17}/></IconButton><IconButton label="Properties tab" onClick={()=>setRightTab('properties')} active={rightTab==='properties'}><Layers size={16}/></IconButton><IconButton label="Outgoing links tab" onClick={()=>setRightTab('outgoing')} active={rightTab==='outgoing'}><ArrowRight size={17}/></IconButton></div>
        {rightTab==='outline'&&enabled('outline')&&<><div className="section-heading"><span>Outline</span><List size={13}/></div><div className="outline-list">{hs.length?hs.map((heading,i)=><button key={i} style={{paddingLeft:14+(heading.level-1)*12}} onClick={()=>{if(mode!=='reading')editor.current?.jump(heading.offset);else document.getElementById('heading-'+heading.text.toLowerCase().replace(/\s+/g,'-'))?.scrollIntoView({behavior:'smooth'});}}>{heading.text}</button>):<p className="sidebar-hint">Headings in your note will appear here.</p>}</div></>}
        {rightTab==='properties'&&enabled('properties')&&activeNote&&<><div className="section-heading">Note properties</div><div className="right-properties">{propertyEditor(activeNote)}</div><div className="section-heading">Vault properties</div><div className="tag-list">{[...new Set(notes.flatMap(n=>Object.keys(frontmatter(n.content).properties)))].map(key=><button key={key} onClick={()=>{setLeft(true);setSideTab('search');setQuery('['+key+']');}}><Hash size={13}/>{key}</button>)}</div></>}
        {(rightTab==='outline'||rightTab==='backlinks')&&enabled('backlinks')&&<div className="backlinks-section"><div className="section-heading"><span>Linked mentions</span><small>{incoming.length}</small></div><div className="mention-list">{incoming.map(n=><button key={n.path} onClick={()=>open(n.path)}><span><FileText size={13}/>{title(n.path)}</span><p>{frontmatter(n.content).body.split('\n').find(line=>line.includes('[[')&&line.toLowerCase().includes(title(active).toLowerCase()))?.replace(/[[\]#*]/g,'')||'Links to this note'}</p></button>)}{!incoming.length&&<p className="sidebar-hint">Notes that link here will appear here.</p>}</div><details className="unlinked"><summary>Unlinked mentions <span>{mentions.length}</span></summary>{mentions.map(n=><button key={n.path} onClick={()=>open(n.path)}>{title(n.path)}</button>)}</details></div>}
        {rightTab==='outgoing'&&enabled('outgoing')&&<><div className="section-heading"><span>Outgoing links</span><small>{outgoing.length}</small></div><div className="bookmark-list">{outgoing.map((link,i)=><button key={i} onClick={()=>openLink(link.target+(link.fragment?'#'+link.fragment:''))}><Link2 size={13}/>{link.label||link.target}<span className={resolveLink(link.target,active,notes)?'':'unresolved'}>{resolveLink(link.target,active,notes)?'':'New'}</span></button>)}</div></>}
        <footer className="context-footer"><div><Network size={15}/><span>Everything connects</span></div><p>Follow a link. Find a new perspective.</p>{enabled('graph')&&activeNote&&<button onClick={()=>open('@local:'+active)}>Explore local graph<ArrowRight size={13}/></button>}</footer>
      </aside>}
    </div>
    <footer className="statusbar"><span><span className={'status-dot '+(dirtyCount?'pending':'')}/>{dirtyCount?`${dirtyCount} unsaved`:bridge.desktop?'Saved locally':'Preview vault'}</span><span>{activeMarkdown&&enabled('words')?<>{words.toLocaleString()} words<span className="status-divider"/>{activeNote!.content.length.toLocaleString()} characters</>:activeNote?active.split('.').pop()?.toUpperCase():''}</span><span>{recording&&<button onClick={audio}><Square size={12}/>Recording · Stop</button>}{mode==='reading'?'Reading':mode==='live'?'Live editing':'Source'}<span className="status-divider"/>{bridge.desktop?'Local-first':'Changes reset on refresh'}</span></footer>
    {notice&&<div className="toast" role="status"><Check size={15}/>{notice}</div>}
    {context&&<div className="context-menu" style={{left:context.x,top:context.y}} onClick={e=>e.stopPropagation()}><button onClick={()=>{open(context.path);setContext(null);}}><FileText size={14}/>Open</button><button onClick={()=>{setSplit(context.path);setContext(null);}}><PanelRightOpen size={14}/>Open in split</button><button onClick={()=>{setContext(null);renamePath(context.path);}}><Pencil size={14}/>Rename or move</button><button onClick={()=>{setBookmarks(b=>b.includes(context.path)?b:[...b,context.path]);setContext(null);}}><Bookmark size={14}/>Bookmark</button><button onClick={()=>{navigator.clipboard?.writeText(context.path);setContext(null);}}><Copy size={14}/>Copy path</button><hr/><button className="danger-text" onClick={()=>deletePath(context.path)}><Trash2 size={14}/>Move to trash</button></div>}
    {palette&&<Palette title={palette==='commands'?'Command palette':palette==='files'?'Quick switcher':palette==='templates'?'Insert template':palette==='merge'?'Merge into note':'Load workspace'} items={paletteItems} onClose={()=>setPalette(null)} onCreate={palette==='files'?name=>createNote(name):undefined}/>}
    {showSettings&&<Settings value={settings} onChange={s=>{setSettings(s);if(s.mode!==settings.mode)setMode(s.mode);}} onClose={()=>setShowSettings(false)} plugins={pluginList.map(p=>p.manifest)} enabled={enabledPlugins} onTogglePlugin={togglePlugin}/>}
    {recovery&&<div className="modal-backdrop"><section className="modal recovery-modal" role="dialog" aria-label="File recovery"><header><h2>File recovery</h2><button onClick={()=>setRecovery(null)} aria-label="Close recovery"><X size={18}/></button></header><p>Previous saved versions of {active}. Restoring a version also snapshots the current content.</p>{recovery.length?recovery.map(s=><button key={s.id} onClick={()=>restoreSnapshot(s.id)}><Clock size={15}/>{new Date(s.time).toLocaleString()}<span>Restore</span></button>):<div className="empty"><Clock size={25}/><p>No previous versions yet. Snapshots are created when saved content changes.</p></div>}</section></div>}
    {slides&&activeNote&&<Slides note={activeNote} notes={notes} onOpen={openLink} onClose={()=>setSlides(false)}/>}
    {dialog.ui}
  </div>;
}
function Attachment({path}:{path:string}){
  const [asset,setAsset]=useState(''),[error,setError]=useState('');
  useEffect(()=>{let canceled=false;bridge.asset(path).then(a=>{if(!canceled)setAsset(a);}).catch(e=>setError(String(e)));return()=>{canceled=true;};},[path]);
  return <div className="attachment-view"><h2>{path.split('/').pop()}</h2>{error?<p>{error}</p>:!asset?<p>Loading attachment…</p>:/\.(png|jpe?g|gif|webp|svg)$/i.test(path)?<img src={asset} alt={path}/>: /\.(mp3|wav|ogg|webm)$/i.test(path)?<audio controls src={asset}/>:path.endsWith('.mp4')?<video controls src={asset}/>:<a href={asset} download={path.split('/').pop()}>Download attachment</a>}</div>;
}
