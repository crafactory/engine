import {lazy,Suspense,useCallback,useEffect,useMemo,useRef,useState,type ComponentType,type LazyExoticComponent} from 'react';
import {
  Files,Search,Network,LayoutDashboard,CalendarDays,Terminal,Settings as SettingsIcon,
  PanelLeftClose,PanelLeftOpen,PanelRightClose,PanelRightOpen,Plus,X,ChevronRight,ChevronDown,Sparkles,
  FileText,Folder,FolderPlus,FilePlus,MoreHorizontal,BookOpen,Code2,Pencil,Bookmark,Hash,
  List,ArrowLeft,ArrowRight,Link2,Check,HardDrive,Clock,Pin,Download,Trash2,
  Copy,Scissors,Mic,Square,Table2,ExternalLink,RefreshCw,Star,Globe,Presentation,Layers,Menu
} from 'lucide-react';
import {parse,stringify} from 'yaml';
import {bridge,defaults} from './bridge';
import {renameDestination} from './file-path';
import {title,isNote,frontmatter,setProperties,resolveLink,headings,applyTemplate,rewriteLinks} from './knowledge';
import type {EditorHandle} from './Editor';
import {Markdown,renderMarkdown} from './Markdown';
import {Settings} from './Settings';
import {Palette,type Choice} from './Palette';
import {Slides} from './Slides';
import {useDialog} from './Dialog';
import {startPlugin,type HoverLinkPayload,type PluginCommand,type PluginController} from './plugins';
import {startRendererPlugin} from './plugin-renderer';
import type {PluginTab} from './compat-dom';
import type {Extension} from '@codemirror/state';
import type {PluginSnapshot} from './compat-core';
import type {Note,Entry,Settings as Preferences,VaultState,Workspace,PluginManifest,Snapshot} from './types';
import {checkPermission, validatePluginPackage, readableSnapshot} from './kernel';
import {createViewsRuntime, loadViewComponent, ViewBoundary, PluginViewHost, type ViewsRuntime, type ViewComponent, type PanelComponent, type SidePanelTab, type GraphViewProps} from './views';
import {editorSettingsPlugin} from './ui/settings/plugin';
import {ENGINE_VERSION} from './services';
import {createWorkspaceRuntime,createEditorRuntime,createBookmarksRuntime,createDailyNotesRuntime,createNavigationRuntime,createCommandsRuntime,createStorageRuntime,createWorkspacesRuntime,createUniqueNoteRuntime,createWordCountRuntime,createSlidesRuntime,createFormatConverterRuntime,createNoteComposerRuntime,createWebViewerRuntime,createSlashCommandsRuntime,createPagePreviewRuntime,createAudioRecorderRuntime,BridgeStorage,type WorkspaceRuntime,type WorkspaceViewService,type EditorRuntime,type EditorSession,type BookmarksRuntime,type DailyNotesRuntime,type NavigationRuntime,type CommandsRuntime,type CommandsService,type NativeCommand,type AppStorageRuntime,type StoredNote,type WorkspacesRuntime,type UniqueNoteRuntime,type WordCountRuntime,type SlidesRuntime,type FormatConverterRuntime,type NoteComposerRuntime,type WebViewerRuntime,type SlashCommandsRuntime,type PagePreviewRuntime,type AudioRecorderRuntime,type ViewContribution,createUiRuntime,type UiRuntime} from './services';
const Editor=lazy(()=>import('./Editor').then(m=>({default:m.Editor})));
const Graph=lazy(()=>import('./Graph').then(m=>({default:m.Graph})));

const textFile=(path:string)=>/\.(md|markdown|canvas|base|txt|csv|json|css)$/i.test(path);
const validPath=(path:string)=>path&&!path.startsWith('/')&&!path.includes('\\')&&!path.split('/').some(p=>!p||p.startsWith('.'))&&!path.includes('\0');
const defaultKeys:Record<string,string>={'new-note':'mod+n','quick-switcher':'mod+o','command-palette':'mod+p','search':'mod+shift+f','toggle-mode':'mod+e','settings':'mod+,','close-tab':'mod+w','daily-note':'mod+shift+d'};
/** Render a normalized key binding (`mod+shift+f`) as display text (`⌘ ⇧ F`). */
const keyLabels:Record<string,string>={mod:'⌘',alt:'⌥',shift:'⇧'};
const formatHotkey=(binding:string)=>binding.split('+').map(part=>keyLabels[part]??(part.length===1?part.toUpperCase():part)).join(' ');
function Logo(){return <svg viewBox="0 0 32 32" fill="none" aria-label="Crafactory Engine"><path d="M23 9H12l-5 7 5 7h11M18 9l-5 7 5 7M13 16h12" stroke="currentColor" strokeWidth="2.3" strokeLinejoin="round"/></svg>;}
function IconButton({label,children,onClick,active=false,className='',testid}:{label:string;children:React.ReactNode;onClick:()=>void;active?:boolean;className?:string;testid?:string}){
  return <button className={'icon-button '+(active?'active ':'')+className} aria-label={label} title={label} onClick={onClick} data-testid={testid||label.toLowerCase().replace(/[^a-z0-9]+/g,'-')}>{children}</button>;
}
function download(name:string,content:string|Blob,type='text/plain'){
  const url=URL.createObjectURL(typeof content==='string'?new Blob([content],{type}):content);
  const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
/** Compose the local-first vault workspace and explicitly authorized plugin controllers. */
export function App(){
  const [notes,setNotes]=useState<Note[]>([]),[entries,setEntries]=useState<Entry[]>([]);
  const [vaultName,setVaultName]=useState('Crafactory Vault'),[root,setRoot]=useState('');
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [settings,setSettings]=useState<Preferences>(defaults),[mode,setMode]=useState<Preferences['mode']>('reading');
  const [tabs,setTabs]=useState<string[]>([]),[active,setActive]=useState(''),[split,setSplit]=useState<string|null>(null);
  const [uiRevision,setUiRevision]=useState(0);
  const [pluginFormats,setPluginFormats]=useState<Record<string,{viewType:string;pluginId:string}>>({});
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
  const [pluginModes,setPluginModes]=useState<Record<string,string>>({}),[pluginTabs,setPluginTabs]=useState<Record<string,PluginTab[]>>({}),[pluginExtensions,setPluginExtensions]=useState<Record<string,unknown[]>>({});
  const allPluginExtensions=useMemo(()=>Object.values(pluginExtensions).flat() as Extension[],[pluginExtensions]);
  const [dirtyCount,setDirtyCount]=useState(0),[recording,setRecording]=useState(false);
  const [serviceCommands,setServiceCommands]=useState<Choice[]>([]);
  const notesRef=useRef<Note[]>([]),settingsRef=useRef(settings),editor=useRef<EditorHandle>(null);
  const timers=useRef(new Map<string,ReturnType<typeof setTimeout>>()),saves=useRef(new Map<string,Promise<void>>());
  const savedContent=useRef(new Map<string,string>()),versions=useRef(new Map<string,string|undefined>());
  const history=useRef<string[]>([]),historyIndex=useRef(-1),recordingPath=useRef('');
  const importInput=useRef<HTMLInputElement>(null),attachmentInput=useRef<HTMLInputElement>(null);
  const pluginStops=useRef(new Map<string,PluginController>()),loaded=useRef(false),vaultGeneration=useRef(0);
  const pluginStarting=useRef(new Set<string>()),pluginRequests=useRef(new Set<Promise<unknown>>());
  const workspaceRuntime=useRef<WorkspaceRuntime|null>(null),workspaceViews=useRef<WorkspaceViewService|null>(null),unmounted=useRef(false);
  const editorRuntime=useRef<EditorRuntime|null>(null),editorSessions=useRef(new Map<string,EditorSession>());
  const bookmarksRuntime=useRef<BookmarksRuntime|null>(null),bookmarksUnsub=useRef<(()=>void)|null>(null);
  const templatesRuntime=useRef<DailyNotesRuntime|null>(null);
  const indexRuntime=useRef<NavigationRuntime|null>(null);
  const commandsRuntime=useRef<CommandsRuntime|null>(null),commandDisposers=useRef(new Map<string,()=>void>());
  const storageRuntime=useRef<AppStorageRuntime|null>(null),bridgeStorageFallback=useRef<BridgeStorage|null>(null);
  const workspacesRuntime=useRef<WorkspacesRuntime|null>(null),workspacesUnsub=useRef<(()=>void)|null>(null);
  const uniqueNoteRuntime=useRef<UniqueNoteRuntime|null>(null),wordCountRuntime=useRef<WordCountRuntime|null>(null);
  const slidesRuntime=useRef<SlidesRuntime|null>(null),converterRuntime=useRef<FormatConverterRuntime|null>(null);
  const composerRuntime=useRef<NoteComposerRuntime|null>(null);
  const webViewerRuntime=useRef<WebViewerRuntime|null>(null),slashRuntime=useRef<SlashCommandsRuntime|null>(null);
  const pagePreviewRuntime=useRef<PagePreviewRuntime|null>(null),audioRuntime=useRef<AudioRecorderRuntime|null>(null);
  const viewsRuntime=useRef<ViewsRuntime|null>(null),viewComponents=useRef(new Map<ViewContribution,LazyExoticComponent<ViewComponent>>()),panelComponents=useRef(new Map<ViewContribution,LazyExoticComponent<PanelComponent>>());
  const uiRuntime=useRef<UiRuntime|null>(null),uiUnsub=useRef<(()=>void)|null>(null);
  const uiRibbon=uiRuntime.current?.ui.ribbon()??[];
  const uiStatus=uiRuntime.current?.ui.status()??[];
  const uiSettings=uiRuntime.current?.ui.settings()??[];
  const pluginState=useRef({entries,vaultName,active,mode});pluginState.current={entries,vaultName,active,mode};
  const pluginManifests=useRef(new Map<string,PluginManifest>());
  const pluginFormatStacks=useRef(new Map<string,{pluginId:string;viewType:string;dispose:()=>void}[]>());
  const pluginViewCleanups=useRef(new Map<string,()=>void>());
  /** Build the snapshot for one plugin, hiding vault content without `vault:read`. */
  function pluginSnapshot(manifest?:PluginManifest):PluginSnapshot{
    const s=pluginState.current;
    return readableSnapshot({name:s.vaultName,entries:s.entries,notes:notesRef.current,active:s.active,
      editor:s.mode!=='reading'&&isNote(s.active)&&editor.current?.path()===s.active?editor.current.snapshot():null},manifest??{});
  }
  /** Deliver a hover-link event to every registered renderer hover source. */
  function dispatchHoverLink(payload:Omit<HoverLinkPayload,'source'>){
    for(const controller of pluginStops.current.values())for(const source of controller.hoverSources?.()??[])controller.hoverLink?.({...payload,source});
  }
  /** Resolve a file path to a compatibility plugin view registered for its extension. */
  function pluginViewFor(path:string){
    const extension=path.split('.').pop()?.toLowerCase()??'';
    return Object.prototype.hasOwnProperty.call(pluginFormats,extension)?pluginFormats[extension]:undefined;
  }
  /** Register a plugin view type and its file extensions with the native render/workspace services. */
  function addPluginExtensions(id:string,extensions:string[],viewType:string){
    const render=workspaceRuntime.current?.render,workspace=workspaceViews.current;
    if(!render||!workspace)return;
    const viewKey=id+':'+viewType;
    if(!pluginViewCleanups.current.has(viewKey))pluginViewCleanups.current.set(viewKey,workspace.registerView({viewType,slot:'main',label:viewType}));
    for(const extension of extensions){
      const stack=pluginFormatStacks.current.get(extension)??[];
      stack.push({pluginId:id,viewType,dispose:render.registerFormat({extension,viewType})});
      pluginFormatStacks.current.set(extension,stack);
    }
    setPluginFormats(formats=>{const next={...formats};for(const extension of extensions)next[extension]={viewType,pluginId:id};return next;});
  }
  /** Remove plugin extension mappings, optionally for one plugin's subset, restoring the top remaining registration. */
  function removePluginExtensions(id:string,extensions?:string[]){
    const targets=extensions??[...pluginFormatStacks.current].filter(([,stack])=>stack.some(entry=>entry.pluginId===id)).map(([extension])=>extension);
    const updates:Record<string,{viewType:string;pluginId:string}|null>={};
    for(const extension of targets){
      const stack=pluginFormatStacks.current.get(extension);
      if(!stack)continue;
      const index=stack.map(entry=>entry.pluginId).lastIndexOf(id);
      if(index>=0)stack.splice(index,1)[0].dispose();
      if(stack.length){const top=stack[stack.length-1];updates[extension]={viewType:top.viewType,pluginId:top.pluginId};}
      else{pluginFormatStacks.current.delete(extension);updates[extension]=null;}
    }
    setPluginFormats(formats=>{const next={...formats};for(const [extension,value]of Object.entries(updates)){if(value)next[extension]=value;else delete next[extension];}return next;});
  }
  /** Remove all view/format registrations owned by a plugin. */
  function clearPluginExtensions(id:string){
    removePluginExtensions(id);
    for(const [key,dispose] of [...pluginViewCleanups.current])if(key.startsWith(id+':')){dispose();pluginViewCleanups.current.delete(key);}
  }
  async function stopPlugins(){
    try{await Promise.allSettled([...pluginStops.current.values()].map(controller=>controller.stop()));await Promise.allSettled([...pluginRequests.current]);}
    finally{
      for(const stack of pluginFormatStacks.current.values())for(const entry of stack)entry.dispose();
      for(const dispose of pluginViewCleanups.current.values())dispose();
      pluginFormatStacks.current.clear();pluginViewCleanups.current.clear();setPluginFormats({});
      pluginStops.current.clear();pluginManifests.current.clear();setEnabledPlugins([]);setPluginCommands([]);
    }
  }
  const dialog=useDialog();
  settingsRef.current=settings;
  const enabled=(id:string)=>!settings.disabledPlugins.includes(id);
  const activeNote=notes.find(n=>n.path===active),activeMarkdown=activeNote&&isNote(active);
  function updateNotes(next:Note[]){notesRef.current=next;setNotes(next);}
  function report(e:unknown){setError(e instanceof Error?e.message:String(e));}
  function toast(message:string){setNotice(message);}
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),5000);return()=>clearTimeout(timer);},[notice]);

  /** Validate discovered packages before they are offered in Settings or enabled. */
  async function loadPluginPackages(){
    const packages=await bridge.plugins(),valid:{manifest:PluginManifest;code:string}[]=[];
    for(const pkg of packages){
      const validation=validatePluginPackage({manifest:pkg.manifest},ENGINE_VERSION);
      if(validation.ok)valid.push(pkg);
      else console.warn('Skipped invalid plugin package',pkg.manifest?.id,validation.issues);
    }
    setPluginList(valid);
  }
  async function initialize(){
    setLoading(true);setError('');
    try {
      if(!workspaceRuntime.current){
        const runtime=await createWorkspaceRuntime();
        if(unmounted.current){void runtime.kernel.stop();return;}
        if(workspaceRuntime.current)void runtime.kernel.stop();else{workspaceRuntime.current=runtime;workspaceViews.current=runtime.workspace;}
      }
      if(!editorRuntime.current){const runtime=await createEditorRuntime('codemirror');if(unmounted.current){void runtime.kernel.stop();return;}editorRuntime.current=runtime;}
      if(!bookmarksRuntime.current){const runtime=await createBookmarksRuntime();if(unmounted.current){void runtime.kernel.stop();return;}bookmarksRuntime.current=runtime;bookmarksUnsub.current=runtime.service.subscribe(next=>setBookmarks(next));}
      if(!templatesRuntime.current){const runtime=await createDailyNotesRuntime();if(unmounted.current){void runtime.kernel.stop();return;}templatesRuntime.current=runtime;}
      if(!indexRuntime.current){const runtime=await createNavigationRuntime();if(unmounted.current){void runtime.kernel.stop();return;}indexRuntime.current=runtime;}
      if(!commandsRuntime.current){const runtime=await createCommandsRuntime();if(unmounted.current){void runtime.kernel.stop();return;}commandsRuntime.current=runtime;}
      if(!storageRuntime.current){try{const runtime=await createStorageRuntime({bridge});if(unmounted.current)void runtime.kernel.stop();else storageRuntime.current=runtime;}catch(e){report(e);}}
      if(!workspacesRuntime.current){const runtime=await createWorkspacesRuntime();if(unmounted.current){void runtime.kernel.stop();return;}workspacesRuntime.current=runtime;workspacesUnsub.current=runtime.service.subscribe(record=>setWorkspaces(record));}
      if(!uniqueNoteRuntime.current){const runtime=await createUniqueNoteRuntime();if(unmounted.current){void runtime.kernel.stop();return;}uniqueNoteRuntime.current=runtime;}
      if(!wordCountRuntime.current){const runtime=await createWordCountRuntime();if(unmounted.current){void runtime.kernel.stop();return;}wordCountRuntime.current=runtime;}
      if(!slidesRuntime.current){const runtime=await createSlidesRuntime();if(unmounted.current){void runtime.kernel.stop();return;}slidesRuntime.current=runtime;}
      if(!converterRuntime.current){const runtime=await createFormatConverterRuntime();if(unmounted.current){void runtime.kernel.stop();return;}converterRuntime.current=runtime;}
      if(!composerRuntime.current){const runtime=await createNoteComposerRuntime();if(unmounted.current){void runtime.kernel.stop();return;}composerRuntime.current=runtime;}
      if(!webViewerRuntime.current){const runtime=await createWebViewerRuntime();if(unmounted.current){void runtime.kernel.stop();return;}webViewerRuntime.current=runtime;}
      if(!slashRuntime.current){const runtime=await createSlashCommandsRuntime();if(unmounted.current){void runtime.kernel.stop();return;}slashRuntime.current=runtime;}
      if(!pagePreviewRuntime.current){const runtime=await createPagePreviewRuntime();if(unmounted.current){void runtime.kernel.stop();return;}pagePreviewRuntime.current=runtime;}
      if(!audioRuntime.current){const runtime=await createAudioRecorderRuntime();if(unmounted.current){void runtime.kernel.stop();return;}audioRuntime.current=runtime;}
      if(!viewsRuntime.current){const runtime=await createViewsRuntime();if(unmounted.current){void runtime.kernel.stop();return;}viewsRuntime.current=runtime;}
      if(!uiRuntime.current){const runtime=await createUiRuntime({plugins:[editorSettingsPlugin]});if(unmounted.current){void runtime.kernel.stop();return;}uiRuntime.current=runtime;uiUnsub.current=runtime.ui.subscribe(()=>setUiRevision(v=>v+1));}
      editorSessions.current.clear();
      const vault=await bridge.vault();
      const all=await Promise.all(vault.entries.filter(e=>!e.folder&&textFile(e.path)).map(e=>bridge.read(e.path)));
      vaultGeneration.current++;
      savedContent.current=new Map(all.map(n=>[n.path,n.content]));versions.current=new Map(all.map(n=>[n.path,n.version]));
      updateNotes(all);setEntries(vault.entries);setVaultName(vault.name);setRoot(vault.root);
      const state=vault.state;
      const pref={...defaults,...state.settings};setSettings(pref);setMode(bridge.desktop?pref.mode:'reading');
      setBookmarksFromService(state.bookmarks||[]);setWorkspacesFromService(state.workspaces||{});setRecent(state.recent||[]);
      const path=all.find(n=>n.path==='Welcome.md')?.path||all.find(n=>isNote(n.path))?.path||all[0]?.path||'';
      setTabs(path?[path]:[]);setActive(path);setSplit(null);history.current=path?[path]:[];historyIndex.current=path?0:-1;
      loaded.current=true;await loadPluginPackages();
    }catch(e){report(e);}finally{setLoading(false);}
  }
  useEffect(()=>{initialize();return()=>{unmounted.current=true;for(const timer of timers.current.values())clearTimeout(timer);if(audioRuntime.current)void audioRuntime.current.service.dispose().catch(()=>{});for(const controller of pluginStops.current.values())void controller.stop();void workspaceRuntime.current?.kernel.stop();void editorRuntime.current?.kernel.stop();bookmarksUnsub.current?.();void bookmarksRuntime.current?.kernel.stop();void templatesRuntime.current?.kernel.stop();void indexRuntime.current?.kernel.stop();void commandsRuntime.current?.kernel.stop();void storageRuntime.current?.kernel.stop();workspacesUnsub.current?.();void workspacesRuntime.current?.kernel.stop();void uniqueNoteRuntime.current?.kernel.stop();void wordCountRuntime.current?.kernel.stop();void slidesRuntime.current?.kernel.stop();void converterRuntime.current?.kernel.stop();void composerRuntime.current?.kernel.stop();void webViewerRuntime.current?.kernel.stop();void slashRuntime.current?.kernel.stop();void pagePreviewRuntime.current?.kernel.stop();void audioRuntime.current?.kernel.stop();void viewsRuntime.current?.kernel.stop();uiUnsub.current?.();void uiRuntime.current?.kernel.stop();};},[]);
  useEffect(()=>{
    const handler=(event:Event)=>{const url=(event as CustomEvent<unknown>).detail;if(typeof url!=='string')return;for(const controller of pluginStops.current.values())void controller.dispatchProtocol?.(url);};
    window.addEventListener('engine:protocol',handler);return()=>window.removeEventListener('engine:protocol',handler);
  },[]);
  useEffect(()=>{for(const [id,controller] of pluginStops.current)controller.sync(pluginSnapshot(pluginManifests.current.get(id)));},[notes,entries,active,mode]);
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
  closeHandler.current=()=>{stopPlugins().then(flush).then(()=>bridge.state({settings,bookmarks,workspaces,recent})).then(()=>bridge.closeReady?.()).catch(report);};
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
  /** Create a note without stealing focus from a subsequently opened dialog or another document. */
  async function createNote(initial?:string,content?:string){
    try {
      const value=initial || await dialog.ask('New note','Untitled.md','Enter a filename or a path relative to this vault.');
      if(!value)return;
      const path=value.match(/\.(md|canvas|base|txt|csv|json)$/i)?value:value+'.md';
      if(!validPath(path))throw new Error('Use a relative path without hidden folders or parent segments.');
      if(entries.some(e=>e.path===path)){open(path);return;}
      const result=await bridge.create(path,content ?? (isNote(path)?`# ${title(path)}\n\n`:''));
      versions.current.set(path,result.version);savedContent.current.set(path,result.content);
      updateNotes([...notesRef.current.filter(n=>n.path!==path),result]);setEntries(await bridge.list());open(path);
      setMode(isNote(path)?settings.mode:'reading');
      const focusOrigin=document.activeElement;
      /** Preserve subsequent modal/input/document focus instead of stealing it after creation. */
      function focusCreatedNote(){
        // A later dialog, input or note switch takes precedence over deferred creation focus.
        if(editor.current?.path()!==path||document.querySelector('[aria-modal="true"],.modal-backdrop'))return;
        if(document.activeElement!==focusOrigin&&document.activeElement!==document.body)return;
        editor.current?.focus();
      }
      setTimeout(focusCreatedNote,100);
    }catch(e){report(e);}
  }
  async function newFolder(){
    const path=await dialog.ask('New folder','New folder');
    if(path)try{if(!validPath(path))throw new Error('Invalid folder path');await bridge.mkdir(path);setEntries(await bridge.list());setExpanded(e=>new Set([...e,path]));}catch(e){report(e);}
  }
  /** Rename without changing file format; `strict` rethrows and rejects adjusted destinations. */
  async function renamePath(from:string,requested?:string,strict=false):Promise<string|undefined>{
    const input=requested || await dialog.ask('Rename or move',from,'The original file extension is preserved. Internal links will be updated where their targets can be resolved.');
    if(!input)return undefined;
    try{
      const to=renameDestination(from,input,entries.some(e=>e.path===from&&e.folder));
      if(strict&&to!==input)throw new Error(`Rename destination would be adjusted to ${to}`);
      if(to===from)return to;
      if(!validPath(to))throw new Error('Invalid destination path');await flush();
      const before=[...notesRef.current];
      const documents=storageRuntime.current?.documents;
      if(documents)await documents.rename(from,to);else await bridge.rename(from,to);
      const moved=before.filter(n=>n.path===from||n.path.startsWith(from+'/'));
      const mappings=moved.map(n=>({from:n.path,to:to+n.path.slice(from.length)}));
      for(const pair of mappings){savedContent.current.set(pair.to,savedContent.current.get(pair.from)!);versions.current.set(pair.to,versions.current.get(pair.from));savedContent.current.delete(pair.from);versions.current.delete(pair.from);editorSessions.current.delete(pair.from);}
      const updated=before.map(n=>({...n,path:mappings.find(p=>p.from===n.path)?.to||n.path}));
      updateNotes(updated);
      for(const note of before){
        const newPath=mappings.find(p=>p.from===note.path)?.to||note.path;
        let content=note.content;
        if(isNote(note.path))for(const pair of mappings)content=rewriteLinks(content,pair.from,pair.to,note.path,before);
        if(content!==note.content)editNote(newPath,content);
      }
      const remap=(p:string)=>mappings.find(pair=>pair.from===p)?.to||p;
      setTabs(t=>t.map(remap));setActive(remap);setBookmarksFromService(bookmarkPaths().map(remap));setRecent(r=>r.map(remap));
      setEntries(await bridge.list());await flush();toast('Moved file and updated resolvable note links.');return to;
    }catch(e){if(strict)throw e;report(e);return undefined;}
  }
  /** Move a path to trash (or the bridge fallback) and remap in-memory workspace state. */
  async function trashPath(path:string){
    await flush();
    const storage=storageRuntime.current?.storage;
    if(storage)await storage.trash(path);else await bridge.trash(path);
    const removed=(p:string)=>p===path||p.startsWith(path+'/');
    updateNotes(notesRef.current.filter(n=>!removed(n.path)));
    for(const p of [...editorSessions.current.keys()])if(removed(p))editorSessions.current.delete(p);
    setEntries(await (storage?storage.list():bridge.list()));
    setTabs(t=>t.filter(p=>!removed(p)));
    if(removed(active))setActive('');
    setBookmarksFromService(bookmarkPaths().filter(p=>!removed(p)));
    toast('Moved to trash.');
  }
  async function deletePath(path:string){
    setContext(null);
    if(!await dialog.confirm('Move to trash?',`${path} will be moved out of the vault. Desktop files are retained in .crafactory/trash.`,true))return;
    try{await trashPath(path);}catch(e){report(e);}
  }
  async function chooseVault(create=false){
    try{await stopPlugins();await flush();await bridge.state({settings,bookmarks,workspaces,recent});if(await bridge.choose(create))await initialize();}catch(e){report(e);}
  }
  async function dailyNote(){
    const template=notes.find(n=>n.path===settings.dailyTemplate)?.content||'# {{date}}\n\n';
    const runtime=templatesRuntime.current;
    const note=runtime?runtime.dailyNotes.today({folder:settings.dailyFolder,templateContent:template}):{path:`${settings.dailyFolder}/${applyTemplate('{{date}}','')}.md`,content:applyTemplate(template,applyTemplate('{{date}}',''))};
    if(notes.some(n=>n.path===note.path)){open(note.path);return;}
    await createNote(note.path,note.content);
  }
  /** Create a Canvas while retaining the requested extension spelling. */
  async function createCanvas(){const name=await dialog.ask('New canvas','Untitled.canvas');if(name)createNote(/\.canvas$/i.test(name)?name:name+'.canvas','{"nodes":[],"edges":[]}');}
  /** Create a Base while retaining the requested extension spelling. */
  async function createBase(){const name=await dialog.ask('New base','Library.base');if(name)createNote(/\.base$/i.test(name)?name:name+'.base','views:\n  - type: table\n    name: All notes\n    order: [file.name, note.status, note.tags, file.folder]\n');}
  function toggleBookmark(){if(active)toggleBookmarkPath(active);}
  async function insertTemplate(path:string){
    if(!activeNote||!isNote(active)){toast('Open a Markdown note first.');return;}
    const template=notes.find(n=>n.path===path);if(!template)return;
    const runtime=templatesRuntime.current;
    const content=runtime?runtime.templates.apply(template.content,{title:title(active)}):applyTemplate(template.content,title(active));
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
    editor.current?.replaceSelection(composerRuntime.current?.service.extractLink(target)??`[[${target.replace(/\.md$/,'')}]]`);await createNote(target,selection);
  }
  async function mergeInto(target:string){
    if(!activeNote||target===active)return;
    const destination=notes.find(n=>n.path===target);if(!destination)return;
    if(!await dialog.confirm('Merge notes?',`Append ${active} to ${target} and move the original to trash.`))return;
    try{
      await flush();
      editNote(target,composerRuntime.current?.service.merge(destination.content,activeNote.content)??destination.content+'\n\n'+frontmatter(activeNote.content).body);
      for(const n of notesRef.current.filter(n=>n.path!==active)) {
        const updated=rewriteLinks(n.content,active,target,n.path,notesRef.current);
        if(updated!==n.content)editNote(n.path,updated);
      }
      await flush();await bridge.trash(active);updateNotes(notesRef.current.filter(n=>n.path!==active));setTabs(t=>t.filter(p=>p!==active));setEntries(await bridge.list());open(target);
    }catch(e){report(e);}
  }
  async function showRecovery(){
    if(!activeNote)return;try{await flush();const documents=storageRuntime.current?.documents;setRecovery(documents?await documents.history(active):await bridge.snapshots(active));}catch(e){report(e);}
  }
  async function restoreSnapshot(id:string){
    try{const documents=storageRuntime.current?.documents;const restored=documents?await documents.restore(id):await bridge.restore(id);versions.current.set(restored.path,restored.version);savedContent.current.set(restored.path,restored.content);updateNotes(notesRef.current.map(n=>n.path===restored.path?restored:n));setRecovery(null);toast('Previous version restored.');}catch(e){report(e);}
  }
  async function saveWorkspace(){
    const name=await dialog.ask('Save workspace','My workspace');
    if(name){const workspace={tabs,active,split,left,right,mode};const service=workspacesRuntime.current?.service;if(service)service.save(name,workspace);else setWorkspaces(w=>({...w,[name]:workspace}));}
  }
  function loadWorkspace(name:string){const w=workspacesRuntime.current?.service.get(name)??workspaces[name];if(w){setTabs(w.tabs);setActive(w.active);setSplit(w.split);setLeft(w.left);setRight(w.right);setMode(w.mode);}}
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
    const service=audioRuntime.current?.service;
    if(recording){
      try{
        const result=await service!.stop();
        const name='Recording-'+Date.now()+result.extension;
        const attachment=await bridge.attach(name,result.data);
        const note=notesRef.current.find(n=>n.path===recordingPath.current);
        if(note)editNote(recordingPath.current,note.content+`\n![[${attachment}]]\n`);
        setEntries(await bridge.list());setRecording(false);
      }catch(e){report(e);setRecording(false);}
      return;
    }
    if(!activeNote||!isNote(active)){toast('Open a note before recording.');return;}
    if(!service){toast('Audio recording is unavailable.');return;}
    recordingPath.current=active;
    try{await service.start();setRecording(true);}catch(e){report(e);}
  }
  async function openWeb(){
    const url=await dialog.ask('Open web viewer','https://example.com','Only HTTPS pages are supported. Some sites block embedded viewing.');
    if(!url)return;try{const viewer=webViewerRuntime.current?.service;const normalized=viewer?viewer.normalize(url):(()=>{const parsed=new URL(url);if(parsed.protocol!=='https:')throw new Error('Use an HTTPS URL');return url;})();open('web:'+normalized);}catch(e){report(e);}
  }
  async function togglePlugin(id:string){
    if(pluginStarting.current.has(id))return;
    if(enabledPlugins.includes(id)){
      try{await pluginStops.current.get(id)?.stop();}
      finally{clearPluginExtensions(id);pluginStops.current.delete(id);pluginManifests.current.delete(id);setEnabledPlugins(e=>e.filter(p=>p!==id));setPluginCommands(c=>c.filter(p=>p.plugin!==id));}
      return;
    }
    const plugin=pluginList.find(p=>p.manifest.id===id);if(!plugin)return;
    const renderer=pluginModes[id]==='renderer';
    if(!await dialog.confirm('Enable '+plugin.manifest.name+'?',renderer?
      'Trusted renderer mode is NOT sandboxed. This code can access the entire UI and vault bridge, including notes and workspace metadata, during startup, commands and unload. It can freeze the application and cannot be forcibly stopped. Only enable code you trust. Back up your vault first.':
      'This local Worker plugin can read and modify vault notes and save plugin data during startup, commands and unload. Only enable code you trust.'))return;
    const generation=vaultGeneration.current;
    const operation=async(name:string,args:unknown[])=>{
      if(generation!==vaultGeneration.current)throw new Error('Plugin belongs to a closed vault');
      checkPermission(plugin.manifest,name);
      const storage=storageRuntime.current?.storage??(bridgeStorageFallback.current??=new BridgeStorage(bridge));
      if(name==='loadData')return storage.pluginData(id);
      if(name==='saveData')return storage.pluginData(id,args[0],true);
      if(typeof args[0]!=='string'||!validPath(args[0]))throw new Error('Invalid plugin vault path');
      const path=args[0];
      if(name==='rename'){const to=args[1];if(typeof to!=='string'||!validPath(to))throw new Error('Invalid rename target');const actual=await renamePath(path,to,true);return actual??to;}
      if(name==='trash'){await trashPath(path);return;}
      if(name==='asset')return storage.asset(path);
      if(name==='read')return (await storage.read(path)).content;
      if(name==='open'){if(!notesRef.current.some(n=>n.path===path))throw new Error('File not found');open(path);pluginState.current.active=path;return;}
      if(name==='editor'){
        if(path!==pluginState.current.active||pluginState.current.mode==='reading'||editor.current?.path()!==path)throw new Error('Editor no longer active');
        const [base,text,from,to]=args.slice(1);
        if(typeof base!=='string'||typeof text!=='string'||!Number.isInteger(from)||!Number.isInteger(to))throw new Error('Invalid editor mutation');
        if(!editor.current.applyPluginEdit(base,text,from as number,to as number))throw new Error('CONFLICT: Editor changed before plugin edit');
        return;
      }
      if(name==='mkdir'){await storage.mkdir(path);}
      else if(['create','modify','append','writeLegacy'].includes(name)){
        const text=args[1];if(typeof text!=='string'||(name==='writeLegacy'&&!isNote(path)))throw new Error('Invalid plugin text');
        await flush();
        const before=notesRef.current.find(n=>n.path===path)?.content;
        let result:StoredNote;
        if(name==='create')result=await storage.create(path,text);
        else if(name==='append')result=await storage.append(path,text);
        else if(name==='modify'){const disk=await storage.read(path);result=await storage.write(path,text,disk.version);}
        else result=await storage.write(path,text,versions.current.get(path));
        savedContent.current.set(path,result.content);versions.current.set(path,result.version);
        const existing=notesRef.current.find(n=>n.path===path);
        updateNotes(existing?notesRef.current.map(n=>n.path===path&&n.content===before?result:n):[...notesRef.current,result]);
      }else throw new Error('Unsupported plugin host operation: '+name);
      const next=await storage.list();pluginState.current.entries=next;setEntries(next);
    };
    pluginStarting.current.add(id);
    try{
      const native={resolveLink:(link:string,from:string)=>indexRuntime.current?.index.resolve(link,from),
        editor:{providerId:editorRuntime.current?.provider.id??'unknown',codeMirrorExtensions:editorRuntime.current?.provider.capabilities().codeMirrorExtensions??false}};
      const onCommands=(commands:PluginCommand[])=>setPluginCommands(c=>[...c.filter(p=>p.plugin!==id),...commands]);
      const onOperation=(name:string,args:unknown[])=>{const request=operation(name,args);pluginRequests.current.add(request);request.then(()=>pluginRequests.current.delete(request),()=>pluginRequests.current.delete(request));return request;};
      const onFailure=()=>{clearPluginExtensions(id);pluginStops.current.delete(id);pluginManifests.current.delete(id);setEnabledPlugins(e=>e.filter(p=>p!==id));};
      const onTabs=(tabs:PluginTab[])=>setPluginTabs(t=>({...t,[id]:tabs}));
      const onExtensions=(extensions:unknown[])=>setPluginExtensions(e=>({...e,[id]:extensions}));
      const onFileExtensions=(nextExtensions:string[],viewType?:string)=>{if(viewType)addPluginExtensions(id,nextExtensions,viewType);else removePluginExtensions(id,nextExtensions);};
      const controller=renderer
        ?startRendererPlugin(plugin.manifest,plugin.code,()=>pluginSnapshot(plugin.manifest),onCommands,onOperation,toast,onFailure,onTabs,onExtensions,native,onFileExtensions)
        :startPlugin(plugin.manifest,plugin.code,()=>pluginSnapshot(plugin.manifest),onCommands,onOperation,toast,onFailure);
      pluginManifests.current.set(id,plugin.manifest);pluginStops.current.set(id,controller);await controller.ready;
      if(generation!==vaultGeneration.current){clearPluginExtensions(id);await controller.stop();}else setEnabledPlugins(e=>[...e.filter(p=>p!==id),id]);
    }catch(e){clearPluginExtensions(id);pluginStops.current.delete(id);pluginManifests.current.delete(id);report(e);}finally{pluginStarting.current.delete(id);}
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
    {id:'unique-note',label:'Create unique note',run:()=>{const note=uniqueNoteRuntime.current?.uniqueNote.create();if(note){createNote(note.path,note.content);return;}createNote(new Date().toISOString().replace(/\D/g,'').slice(0,14)+'.md');}},
    {id:'graph',label:'Open graph view',run:()=>open('@graph')},
    {id:'local-graph',label:'Open local graph',run:()=>open('@local:'+active)},
    {id:'new-canvas',label:'Create new canvas',run:createCanvas},
    {id:'new-base',label:'Create new base',run:createBase},
    {id:'random-note',label:'Open a random note',run:()=>{const path=indexRuntime.current?.navigation.randomNote();if(path){open(path);return;}const n=notes.filter(n=>isNote(n.path));if(n.length)open(n[Math.floor(Math.random()*n.length)].path);}},
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
    {id:'converter',label:'Convert Markdown formatting',run:()=>{if(activeNote){const converter=converterRuntime.current?.service;editNote(active,converter?converter.convert(activeNote.content):activeNote.content.replace(/<mark>([\s\S]*?)<\/mark>/g,'==$1==').replace(/\[([^\]]+)\]\(([^):]+)\.md\)/g,'[[$2|$1]]'));}}},
    {id:'find',label:'Find and replace in current note',run:()=>{setMode('source');setTimeout(()=>editor.current?.find(),100);}},
    {id:'left-sidebar',label:'Toggle left sidebar',run:()=>setLeft(l=>!l)},
    {id:'right-sidebar',label:'Toggle right sidebar',run:()=>setRight(r=>!r)},
    {id:'theme',label:'Toggle light and dark theme',run:()=>setSettings(s=>({...s,theme:s.theme==='dark'?'light':'dark'}))},
    {id:'settings',label:'Open settings',shortcut:'⌘ ,',run:async()=>{await loadPluginPackages();setShowSettings(true);}},
    ...pluginCommands
  ].filter(c=>{
    const group:Record<string,string>={'graph':'graph','local-graph':'graph','daily-note':'daily','unique-note':'unique','new-canvas':'canvas','new-base':'bases','random-note':'random','insert-template':'templates','bookmark':'bookmarks','merge-note':'composer','extract-note':'composer','recovery':'recovery','save-workspace':'workspaces','load-workspace':'workspaces','slides':'slides','web-viewer':'web','audio':'audio','converter':'converter','search':'search','quick-switcher':'switcher','command-palette':'commands'};
    return !group[c.id]||enabled(group[c.id]);
  });
  const commandsRef=useRef(commands);commandsRef.current=commands;
  /** Publish the application command set into the native command service. */
  useEffect(()=>{
    const service=commandsRuntime.current?.service;if(!service)return;
    const disposers=commandDisposers.current;
    for(const dispose of disposers.values())dispose();
    disposers.clear();
    for(const command of commandsRef.current){
      const registered:NativeCommand={id:command.id,name:command.label,run:()=>command.run(),...(defaultKeys[command.id]?{hotkey:defaultKeys[command.id]}:{})};
      try{disposers.set(command.id,service.register(registered));}catch{/* already registered from a previous render */ }
    }
    setServiceCommands(service.list().map(command=>({id:command.id,label:command.name,shortcut:command.hotkey?formatHotkey(command.hotkey):undefined,run:()=>runCommand(command.id)})));
    return()=>{for(const dispose of disposers.values())dispose();disposers.clear();setServiceCommands([]);};
  },[notes,active,mode,settings,pluginCommands,recording,dirtyCount]);
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
  /** Rebuild the native notes index for the current note set before deriving panels. */
  const indexed=useMemo(()=>{const service=indexRuntime.current?.index??null;if(service)service.rebuild(notes);return service;},[notes]);
  const tagCounts=useMemo(()=>(indexed?.tags(notes.filter(n=>isNote(n.path)).map(n=>n.path))??[]).map(entry=>[entry.tag,entry.count] as [string,number]),[indexed,notes]);
  const searchPaths=useMemo(()=>indexed?.search(query,{caseSensitive})??[],[indexed,query,caseSensitive]);
  const results=useMemo(()=>{
    const matched=new Set(searchPaths.filter(path=>isNote(path)||/\.canvas$/i.test(path)));
    return notes.filter(n=>matched.has(n.path)).sort((a,b)=>searchSort==='modified'?(entries.find(e=>e.path===b.path)?.mtime||0)-(entries.find(e=>e.path===a.path)?.mtime||0):a.path.localeCompare(b.path));
  },[searchPaths,notes,searchSort,entries]);
  const incoming=useMemo(()=>{const set=new Set(indexed?.backlinks(active).map(entry=>entry.path)??[]);return activeNote?notes.filter(n=>set.has(n.path)):[];},[indexed,active,activeNote,notes]);
  const outgoing=activeNote&&indexed?indexed.outgoing(active):[];
  const mentions=activeNote?notes.filter(n=>n.path!==active&&!incoming.includes(n)&&isNote(n.path)&&frontmatter(n.content).body.toLowerCase().includes(title(active).toLowerCase())):[];
  const hs=activeNote&&indexed?indexed.headings(active):[];
  const wordCount=wordCountRuntime.current?.service;
  const words=activeNote?(wordCount?wordCount.count(frontmatter(activeNote.content).body).words:(frontmatter(activeNote.content).body.match(/[\p{L}\p{N}]+/gu)?.length||0)):0;
  const characters=activeNote?(wordCount?wordCount.count(activeNote.content).characters:activeNote.content.length):0;
  const tabTitle=(path:string)=>path==='@graph'?'Graph view':path.startsWith('@local:')?'Local graph':path.startsWith('web:')?new URL(path.slice(4)).hostname:title(path);
  function treeChildren(parent=''):Entry[]{
    const explorer=storageRuntime.current?.explorer;
    return explorer?explorer.children(entries,parent,fileSort==='modified'?'modified':'name'):entries.filter(e=>e.path.includes('/')?e.path.slice(0,e.path.lastIndexOf('/'))===parent:!parent).sort((a,b)=>Number(b.folder)-Number(a.folder)||(fileSort==='modified'?b.mtime-a.mtime:a.name.localeCompare(b.name)));
  }
  function propertyEditor(note:Note){
    const fm=frontmatter(note.content),props=indexed?indexed.properties(note.path):fm.properties;
    if(fm.error)return <div className="property-error">Invalid YAML: fix it in source mode.</div>;
    return <details className="properties" open={undefined}><summary><Layers size={14}/>Properties<span>{Object.keys(props).length}</span></summary>
      <div className="property-list">{Object.entries(props).map(([key,value])=><div className="property-row" key={key}><span><Hash size={12}/>{key}</span><button title={'Edit '+key} onClick={async()=>{const v=await dialog.ask('Edit '+key,stringify(value).trim(),'Use a YAML value: text, number, true / false, or [a, b].');if(v!==null)try{editNote(note.path,setProperties(note.content,{...props,[key]:parse(v)}));}catch(e){report(e);}}}>{Array.isArray(value)?value.map((v,i)=><span className="property-chip" key={i}>{String(v)}</span>):String(value??'Empty')}</button><button className="property-remove" aria-label={'Remove '+key} onClick={()=>{const p={...props};delete p[key];try{editNote(note.path,setProperties(note.content,p));}catch(e){report(e);}}}><X size={12}/></button></div>)}
      <button className="add-property" onClick={async()=>{const key=await dialog.ask('Add property','property');if(key&& !['__proto__','constructor','prototype'].includes(key))try{editNote(note.path,setProperties(note.content,{...props,[key]:''}));}catch(e){report(e);}}}><Plus size={13}/>Add property</button></div></details>;
  }
  /** Resolve a path to its registered format view, defaulting to Markdown. */
  function viewType(path:string){return workspaceViews.current?.resolveView(path)?.viewType??'markdown';}
  /** Resolve a registered view type to a lazy host component, cached per contribution. */
  function viewComponent(type:string){
    const contribution=viewsRuntime.current?.views.resolve(type);
    if(!contribution)return undefined;
    let component=viewComponents.current.get(contribution);
    if(!component){
      component=lazy(async()=>{
        try{return {default:await loadViewComponent(contribution)};}
        catch(error){if(viewComponents.current.get(contribution)===component)viewComponents.current.delete(contribution);throw error;}
      });
      viewComponents.current.set(contribution,component);
    }
    return component;
  }
  /** Resolve a registered left-slot panel contribution. */
  function panelComponent(type:string,slot:'left'|'right'){
    const contribution=viewsRuntime.current?.views.resolve(type);
    if(!contribution||(contribution.slot??'main')!==slot)return undefined;
    let component=panelComponents.current.get(contribution);
    if(!component){
      component=lazy(async()=>{
        try{return {default:await loadViewComponent(contribution) as unknown as PanelComponent};}
        catch(error){if(panelComponents.current.get(contribution)===component)panelComponents.current.delete(contribution);throw error;}
      });
      panelComponents.current.set(contribution,component);
    }
    return component;
  }
  /** Return the provider-backed editing session for a note, created on first use. */
  function editorSession(path:string){
    if(!editorRuntime.current)return undefined;
    let session=editorSessions.current.get(path);
    if(!session){const note=notesRef.current.find(n=>n.path===path);session=editorRuntime.current.provider.open(path,{text:note?.content??'',version:savedContent.current.get(path)??''});editorSessions.current.set(path,session);}
    return session;
  }
  /** Current bookmark paths from the native plugin, or local state before it is ready. */
  function bookmarkPaths(){return bookmarksRuntime.current?.service.list()??bookmarks;}
  /** Replace bookmarks through the native plugin, falling back to local state. */
  function setBookmarksFromService(paths:string[]){const service=bookmarksRuntime.current?.service;if(service)service.replace(paths);else setBookmarks(paths);}
  /** Replace workspaces through the native plugin, falling back to local state. */
  function setWorkspacesFromService(record:Record<string,Workspace>){const service=workspacesRuntime.current?.service;if(service)service.replace(record);else setWorkspaces(record);}
  /** Toggle a bookmark through the native plugin, falling back to local state. */
  function toggleBookmarkPath(path:string){const service=bookmarksRuntime.current?.service;if(service)service.toggle(path);else setBookmarks(b=>b.includes(path)?b.filter(p=>p!==path):[...b,path]);}
  /** Remove a bookmark through the native plugin, falling back to local state. */
  function removeBookmarkPath(path:string){const service=bookmarksRuntime.current?.service;if(service)service.remove(path);else setBookmarks(b=>b.filter(p=>p!==path));}
  /** Select the registered format view, without converting the file's contents. */
  function showNote(path:string,secondary=false){
    const note=notes.find(n=>n.path===path);
    if(path==='@graph'||path.startsWith('@local:')){
      if(!indexed)return <div className="empty workspace-empty"><Network size={30}/><h1>Graph unavailable</h1><p>The knowledge graph needs the notes index, which failed to start. Reload to try again.</p></div>;
      const activePath=path.startsWith('@local:')?path.slice(7):recent.find(p=>isNote(p))||'',local=path.startsWith('@local:');
      const GraphView=viewComponent('graph') as LazyExoticComponent<ComponentType<GraphViewProps>>|undefined;
      return GraphView?<GraphView notes={notes} index={indexed} active={activePath} local={local} onOpen={open}/>:<Graph notes={notes} index={indexed} active={activePath} onOpen={open} local={local}/>;
    }
    if(path.startsWith('web:'))return <section className="web-view"><header><Globe size={16}/><span>{path.slice(4)}</span><a href={path.slice(4)} target="_blank" rel="noreferrer">Open in browser<ExternalLink size={13}/></a></header><p className="web-notice">This site may block embedding. Use “Open in browser” if the page is blank.</p><iframe title="Web viewer" src={path.slice(4)} sandbox="allow-scripts allow-forms allow-same-origin" referrerPolicy="no-referrer"/></section>;
    const customView=pluginViewFor(path);
    if(customView)return <PluginViewHost path={path} viewType={customView.viewType} controller={pluginStops.current.get(customView.pluginId)}/>;
    if(!note){
      if(path&&entries.some(e=>e.path===path&&!e.folder))return <Attachment path={path}/>;
      return <div className="empty workspace-empty"><Logo/><h1>A place to think</h1><p>Create a note, open a vault, or follow an idea.<br/>Your files stay yours.</p><button className="primary" onClick={()=>createNote()}><Plus size={15}/>Create a note</button><button onClick={()=>chooseVault()}><Folder size={15}/>Open local vault</button><small>{bridge.desktop?'Local-first · Markdown · MIT':'Temporary preview · Install desktop for local files'}</small></div>;
    }
    const activeView=viewType(note.path);
    const allowed=activeView==='markdown'||(activeView==='canvas'&&enabled('canvas'))||(activeView==='base'&&enabled('bases'));
    const resolvedView=allowed?activeView:'markdown';
    const View=viewComponent(resolvedView);
    const pluginBases:Record<string,{controller:PluginController;id:string}>={};for(const [pluginId,controller] of pluginStops.current)for(const viewId of controller.basesViews?.()??[])pluginBases[viewId]={controller,id:viewId};
    const viewProps={note,notes,entries,path:note.path,mode,previews:pagePreviewRuntime.current?.service,pluginBases,onOpen:open,onOpenLink:openLink,onHoverLink:dispatchHoverLink,onChange:(content:string)=>editNote(note.path,content),onNoteChange:editNote,ask:dialog.ask};
    if(resolvedView!=='markdown'&&mode!=='source'&&View)return <ViewBoundary resetKey={note.path}><View {...viewProps}/></ViewBoundary>;
    return <div className="note-document" onDragOver={e=>e.preventDefault()} onDrop={e=>{if(e.dataTransfer.files.length){e.preventDefault();importFiles(e.dataTransfer.files);}}}>
      <div className={'document-inner '+(settings.readableWidth?'readable':'')} style={{fontSize:settings.fontSize}}>
        <div className="note-title"><h1>{title(note.path)}</h1><button className={bookmarks.includes(path)?'is-bookmarked':''} onClick={()=>toggleBookmarkPath(path)} aria-label="Bookmark note" title="Bookmark note"><Bookmark size={19} fill={bookmarks.includes(path)?'currentColor':'none'}/></button></div>
        {enabled('properties')&&isNote(note.path)&&propertyEditor(note)}
      </div>
      {mode==='reading'&&isNote(note.path)?<div className={'reading-surface '+(settings.readableWidth?'readable':'')} style={{fontSize:settings.fontSize}}>{View?<ViewBoundary resetKey={note.path}><View {...viewProps}/></ViewBoundary>:<Markdown content={note.content} notes={notes} path={note.path} previews={pagePreviewRuntime.current?.service} onOpen={openLink} onChange={content=>editNote(note.path,content)}/>}</div>:
        <Editor ref={secondary?undefined:editor} note={note} notes={notes} session={secondary?undefined:editorSession(note.path)} slashCommands={slashRuntime.current?.service} pluginExtensions={secondary?undefined:allPluginExtensions} settings={{...settings,mode:mode==='reading'?'source':mode}} onChange={content=>editNote(note.path,content)} onOpen={openLink} onCommand={runCommand} suggest={(context)=>{const text=context.state.doc.toString();for(const controller of pluginStops.current.values()){if(!controller.editorSuggest)continue;const result=controller.editorSuggest(text,context.pos);if(result)return Promise.resolve(result).then(value=>{console.log('PLUGIN_SUGGEST_VALUE',value);return value?{from:value.from,filter:false,options:value.options.map(option=>({label:option.label,detail:option.detail,apply:()=>{void option.apply();}}))}:null;});}return null;}}/>}
    </div>;
  }
  let paletteItems:Choice[]=[];
  if(palette==='commands')paletteItems=serviceCommands.length?serviceCommands:commands;
  if(palette==='files')paletteItems=(indexRuntime.current?.navigation.quickSwitch({recent})??[...notes].sort((a,b)=>{const x=recent.indexOf(a.path),y=recent.indexOf(b.path);return (x<0?999:x)-(y<0?999:y);}).map(n=>n.path)).map(path=>({id:path,label:title(path),description:path,run:()=>open(path)}));
  if(palette==='templates')paletteItems=notes.filter(n=>isNote(n.path)&&n.path.startsWith(settings.templatesFolder+'/')).map(n=>({id:n.path,label:title(n.path),description:n.path,run:()=>insertTemplate(n.path)}));
  if(palette==='workspaces')paletteItems=(workspacesRuntime.current?.service.list()??Object.keys(workspaces)).map(name=>({id:name,label:name,run:()=>loadWorkspace(name)}));
  if(palette==='merge')paletteItems=notes.filter(n=>isNote(n.path)&&n.path!==active).map(n=>({id:n.path,label:title(n.path),description:n.path,run:()=>mergeInto(n.path)}));

  const headingJump=(heading:{level:number;text:string;offset:number})=>{if(mode!=='reading')editor.current?.jump(heading.offset);else document.getElementById('heading-'+heading.text.toLowerCase().replace(/\s+/g,'-'))?.scrollIntoView({behavior:'smooth'});};
  const panelBase={notes,bookmarks,recent,tags:tagCounts,headings:hs,incoming,mentions,activeTitle:title(active),active,outgoing,onOpen:open,onOpenLink:openLink,onRemoveBookmark:removeBookmarkPath,onSelectTag:(tag:string)=>{setQuery('tag:#'+tag);setSideTab('search');},onJumpHeading:headingJump};
  const panelType:SidePanelTab|undefined=sideTab==='bookmarks'||sideTab==='recent'||sideTab==='tags'?sideTab:undefined;
  const SidePanel=panelType?panelComponent(panelType,'left'):undefined;
  const panelProps=panelType?{sideTab:panelType,...panelBase}:undefined;
  const OutlineView=rightTab==='outline'?panelComponent('outline','right'):undefined;
  const outlineProps=OutlineView?{sideTab:'outline' as const,...panelBase}:undefined;
  const BacklinksView=rightTab==='outline'||rightTab==='backlinks'?panelComponent('backlinks','right'):undefined;
  const backlinksProps=BacklinksView?{sideTab:'backlinks' as const,...panelBase}:undefined;
  const SearchView=sideTab==='search'?panelComponent('search','left'):undefined;
  const searchProps=SearchView?{...panelBase,sideTab:'search' as const,query,caseSensitive,searchSort,results,onQuery:setQuery,onToggleCase:()=>setCaseSensitive(value=>!value),onSearchSort:setSearchSort,onCopy:()=>{void navigator.clipboard?.writeText(results.map(note=>`[[${note.path.replace(/\.md$/,'')}]]`).join('\n')).then(()=>toast('Search results copied.')).catch(report);},onOpenFile:open}:undefined;
  const FilesView=sideTab==='files'?panelComponent('files','left'):undefined;
  const filesProps=FilesView?{...panelBase,sideTab:'files' as const,entries,activePath:active,fileSort,expanded,loading,childrenFor:treeChildren,onToggleFolder:(path:string)=>setExpanded(current=>{const next=new Set(current);next.has(path)?next.delete(path):next.add(path);return next;}),onOpenFile:open,onFileContextMenu:(path:string,x:number,y:number)=>setContext({path,x:Math.min(x,window.innerWidth-225),y:Math.min(y,window.innerHeight-260)}),onDropFile:(from:string,folder:string)=>renamePath(from,folder+'/'+from.split('/').pop()),onCollapseAll:()=>setExpanded(new Set()),onFileSortChange:setFileSort,onCreateNote:()=>createNote()}:undefined;
  const PropertiesView=rightTab==='properties'?panelComponent('properties','right'):undefined;
  const propertiesProps=PropertiesView?{...panelBase,sideTab:'properties' as const,note:activeNote,propertyKeys:[...new Set(indexed?.propertyKeys()??[])],onSearchProperty:(key:string)=>{setLeft(true);setSideTab('search');setQuery('['+key+']');},onNoteChange:editNote,ask:dialog.ask,onError:report}:undefined;
  const OutgoingView=rightTab==='outgoing'?panelComponent('outgoing','right'):undefined;
  const outgoingProps=OutgoingView?{sideTab:'outgoing' as const,...panelBase}:undefined;
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
          {uiRibbon.map(item=><IconButton key={item.id} label={item.label} onClick={item.run}><Sparkles size={20}/></IconButton>)}
          <div id="plugin-ribbon" aria-label="Plugin ribbon"/>
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
        {sideTab==='files'&&(FilesView&&filesProps?<Suspense fallback={<div className="skeleton-list"><i/><i/><i/><i/></div>}><ViewBoundary resetKey={sideTab}><FilesView {...filesProps}/></ViewBoundary></Suspense>:<p className="sidebar-hint">File explorer unavailable.</p>)}
        {sideTab==='search'&&(SearchView&&searchProps?<Suspense fallback={<div className="skeleton-list"><i/><i/><i/></div>}><ViewBoundary resetKey={sideTab}><SearchView {...searchProps}/></ViewBoundary></Suspense>:<p className="sidebar-hint">Search unavailable.</p>)}
        {SidePanel&&panelProps&&<Suspense fallback={<div className="skeleton-list"><i/><i/><i/></div>}><ViewBoundary resetKey={sideTab}><SidePanel {...panelProps}/></ViewBoundary></Suspense>}
        <footer className="sidebar-footer"><button onClick={()=>chooseVault()}><HardDrive size={14}/><span>{vaultName}</span><ChevronDown size={13}/></button><span>{entries.filter(e=>!e.folder&&isNote(e.path)).length} notes</span></footer>
      </aside>}
      <main className="main-workspace">
        <div className="tabbar">
          {!left&&<IconButton label="Expand sidebar" onClick={()=>setLeft(true)}><PanelLeftOpen size={17}/></IconButton>}
          <div className="tabs" role="tablist" aria-label="Open files">{tabs.map(path=><div className={'tab '+(active===path?'active':'')} role="tab" aria-selected={active===path} key={path} draggable
            onDragStart={e=>e.dataTransfer.setData('engine/tab',path)} onDragOver={e=>e.preventDefault()} onDrop={e=>{const from=e.dataTransfer.getData('engine/tab');if(from){const next=tabs.filter(t=>t!==from);next.splice(next.indexOf(path),0,from);setTabs(next);}}}>
            <button onClick={()=>open(path,false)}>{path==='@graph'||path.startsWith('@local:')?<Network size={14}/>:/\.canvas$/i.test(path)?<LayoutDashboard size={14}/>:/\.base$/i.test(path)?<Table2 size={14}/>:<FileText size={14}/>}<span>{tabTitle(path)}</span></button><button aria-label={'Close '+tabTitle(path)} onClick={()=>closeTab(path)}><X size={12}/></button>
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
        {rightTab==='outline'&&enabled('outline')&&<><div className="section-heading"><span>Outline</span><List size={13}/></div>{OutlineView&&outlineProps?<Suspense fallback={<div className="skeleton-list"><i/><i/></div>}><ViewBoundary resetKey={rightTab}><OutlineView {...outlineProps}/></ViewBoundary></Suspense>:<p className="sidebar-hint">Outline unavailable.</p>}</>}
        {rightTab==='properties'&&enabled('properties')&&activeNote&&(PropertiesView&&propertiesProps?<Suspense fallback={<div className="skeleton-list"><i/><i/></div>}><ViewBoundary resetKey={rightTab}><PropertiesView {...propertiesProps}/></ViewBoundary></Suspense>:<p className="sidebar-hint">Properties unavailable.</p>)}
        {(rightTab==='outline'||rightTab==='backlinks')&&enabled('backlinks')&&(BacklinksView&&backlinksProps?<Suspense fallback={<div className="skeleton-list"><i/><i/></div>}><ViewBoundary resetKey={rightTab}><BacklinksView {...backlinksProps}/></ViewBoundary></Suspense>:<p className="sidebar-hint">Backlinks unavailable.</p>)}
        {rightTab==='outgoing'&&enabled('outgoing')&&(OutgoingView&&outgoingProps?<Suspense fallback={<div className="skeleton-list"><i/><i/></div>}><ViewBoundary resetKey={rightTab}><OutgoingView {...outgoingProps}/></ViewBoundary></Suspense>:<p className="sidebar-hint">Outgoing links unavailable.</p>)}
        <footer className="context-footer"><div><Network size={15}/><span>Everything connects</span></div><p>Follow a link. Find a new perspective.</p>{enabled('graph')&&activeNote&&<button onClick={()=>open('@local:'+active)}>Explore local graph<ArrowRight size={13}/></button>}</footer>
      </aside>}
    </div>
    <footer className="statusbar"><span><span className={'status-dot '+(dirtyCount?'pending':'')}/>{dirtyCount?`${dirtyCount} unsaved`:bridge.desktop?'Saved locally':'Preview vault'}</span><span>{uiStatus.map(item=><span key={item.id} title={item.label}>{item.text}</span>)}{activeMarkdown&&enabled('words')?<>{words.toLocaleString()} words<span className="status-divider"/>{characters.toLocaleString()} characters</>:activeNote?active.split('.').pop()?.toUpperCase():''}</span><span>{recording&&<button onClick={audio}><Square size={12}/>Recording · Stop</button>}{mode==='reading'?'Reading':mode==='live'?'Live editing':'Source'}<span className="status-divider"/>{bridge.desktop?'Local-first':'Changes reset on refresh'}</span></footer>
    {enabled('graph')&&activeNote&&<nav className="compact-context" aria-label="Compact note context"><button onClick={()=>open('@local:'+active)}>Explore local graph<ArrowRight size={13}/></button></nav>}
    <div id="plugin-views" aria-label="Plugin views"/>
    <div id="plugin-status" aria-label="Plugin status"/>
    {notice&&<div className="toast" role="status"><Check size={15}/>{notice}</div>}
    {context&&<div className="context-menu" style={{left:context.x,top:context.y}} onClick={e=>e.stopPropagation()}><button onClick={()=>{open(context.path);setContext(null);}}><FileText size={14}/>Open</button><button onClick={()=>{setSplit(context.path);setContext(null);}}><PanelRightOpen size={14}/>Open in split</button><button onClick={()=>{setContext(null);renamePath(context.path);}}><Pencil size={14}/>Rename or move</button><button onClick={()=>{if(!bookmarkPaths().includes(context.path))toggleBookmarkPath(context.path);setContext(null);}}><Bookmark size={14}/>Bookmark</button><button onClick={()=>{navigator.clipboard?.writeText(context.path);setContext(null);}}><Copy size={14}/>Copy path</button><hr/><button className="danger-text" onClick={()=>deletePath(context.path)}><Trash2 size={14}/>Move to trash</button></div>}
    {palette&&<Palette key={palette} title={palette==='commands'?'Command palette':palette==='files'?'Quick switcher':palette==='templates'?'Insert template':palette==='merge'?'Merge into note':'Load workspace'} items={paletteItems} onClose={()=>setPalette(null)} onCreate={palette==='files'?name=>createNote(name):undefined}/>}
    {showSettings&&<Settings value={settings} onChange={s=>{setSettings(s);if(s.mode!==settings.mode)setMode(s.mode);}} onClose={()=>setShowSettings(false)} nativeSettings={uiSettings} plugins={pluginList.map(p=>p.manifest)} enabled={enabledPlugins} onTogglePlugin={togglePlugin} pluginTabs={Object.values(pluginTabs).flat()} modes={pluginModes} onMode={(id,mode)=>{if(!enabledPlugins.includes(id)&&!pluginStarting.current.has(id))setPluginModes(m=>({...m,[id]:mode}));}}/>}
    {recovery&&<div className="modal-backdrop"><section className="modal recovery-modal" role="dialog" aria-label="File recovery"><header><h2>File recovery</h2><button onClick={()=>setRecovery(null)} aria-label="Close recovery"><X size={18}/></button></header><p>Previous saved versions of {active}. Restoring a version also snapshots the current content.</p>{recovery.length?recovery.map(s=><button key={s.id} onClick={()=>restoreSnapshot(s.id)}><Clock size={15}/>{new Date(s.time).toLocaleString()}<span>Restore</span></button>):<div className="empty"><Clock size={25}/><p>No previous versions yet. Snapshots are created when saved content changes.</p></div>}</section></div>}
    {slides&&activeNote&&<Slides note={activeNote} notes={notes} service={slidesRuntime.current?.service} onOpen={openLink} onClose={()=>setSlides(false)}/>}
    {dialog.ui}
  </div>;
}
function Attachment({path}:{path:string}){
  const [asset,setAsset]=useState(''),[error,setError]=useState('');
  useEffect(()=>{let canceled=false;bridge.asset(path).then(a=>{if(!canceled)setAsset(a);}).catch(e=>setError(String(e)));return()=>{canceled=true;};},[path]);
  return <div className="attachment-view"><h2>{path.split('/').pop()}</h2>{error?<p>{error}</p>:!asset?<p>Loading attachment…</p>:/\.(png|jpe?g|gif|webp|svg)$/i.test(path)?<img src={asset} alt={path}/>: /\.(mp3|wav|ogg|webm)$/i.test(path)?<audio controls src={asset}/>:path.endsWith('.mp4')?<video controls src={asset}/>:<a href={asset} download={path.split('/').pop()}>Download attachment</a>}</div>;
}
