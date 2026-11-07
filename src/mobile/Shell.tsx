import {useCallback,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {createPortal,flushSync} from 'react-dom';
import {ArrowLeft,ArrowRight,BookOpen,PanelLeft,Menu,MoreVertical,Pencil,Plus,Search,X} from 'lucide-react';
import {Button} from '../components/ui/button';
import {Sheet,SheetContent,SheetDescription,SheetTitle} from '../components/ui/sheet';
import type {Settings} from '../types';
import './shell.css';

export type MobileSheetKind='tools'|'tabs'|null;
export interface MobileAction {id:string;label:string;ariaLabel?:string;run:()=>void;disabled?:boolean;selected?:boolean;testid?:string}

/** Platform-specific composition, using shadcn widgets over the shared editor/vault. */
export function MobileHeader({filesOpen,reading,editable,unsaved,onFiles,onReading,onTools}:{
  filesOpen:boolean;reading:boolean;editable:boolean;unsaved:number;
  onFiles:()=>void;onReading:()=>void;onTools:()=>void;
}){
  return <header className="mobile-topbar">
    <Button variant="ghost" size="icon" aria-label="Mobile files" title="Files" aria-pressed={filesOpen} onClick={onFiles}><PanelLeft className="ui:size-6"/></Button>
    <div className="mobile-top-actions">
      <Button variant="ghost" size="icon" aria-label={reading?'Edit note':'Reading view'} title={reading?'Edit note':'Reading view'} disabled={!editable} onClick={onReading}>{reading?<Pencil className="ui:size-6"/>:<BookOpen className="ui:size-6"/>}</Button>
      <Button variant="ghost" size="icon" aria-label="Mobile more actions" title="More actions" onClick={onTools}><MoreVertical className="ui:size-6"/>{unsaved>0&&<span className="mobile-unsaved-dot" aria-label={`${unsaved} unsaved`}/>}</Button>
    </div>
  </header>;
}

export function MobileNavigation({count,canBack,canForward,searchEnabled,loading,onBack,onForward,onSearch,onNew,onTabs,onTools}:{
  count:number;canBack:boolean;canForward:boolean;searchEnabled:boolean;loading:boolean;
  onBack:()=>void;onForward:()=>void;onSearch:()=>void;onNew:()=>void;onTabs:()=>void;onTools:()=>void;
}){
  return <nav className="mobile-nav" aria-label="Mobile navigation">
    <Button variant="ghost" size="icon" aria-label="Mobile back" title="Back" disabled={!canBack} onClick={onBack}><ArrowLeft className="ui:size-6"/></Button>
    <Button variant="ghost" size="icon" aria-label="Mobile forward" title="Forward" disabled={!canForward} onClick={onForward}><ArrowRight className="ui:size-6"/></Button>
    <Button variant="ghost" size="icon" aria-label="Mobile search" title="Search" disabled={!searchEnabled} onClick={onSearch}><Search className="ui:size-6"/></Button>
    <Button variant="ghost" size="icon" aria-label="Mobile new note" title="New note" disabled={loading} onClick={onNew}><Plus className="ui:size-6"/></Button>
    <Button variant="ghost" size="icon" aria-label="Mobile open tabs" title={`${count} open tabs`} onClick={onTabs}><span className="mobile-tab-count">{count}</span></Button>
    <Button variant="ghost" size="icon" aria-label="Mobile tools" title="Tools" onClick={onTools}><Menu className="ui:size-6"/></Button>
  </nav>;
}

/** Radix may unmount its sheet; the owned portal container keeps plugin nodes alive. */
export function MobileSheet({sheet,onClose,tabs,active,tabTitle,onOpen,onCloseTab,actions,mode,saveStatus,children}:{
  sheet:MobileSheetKind;onClose:()=>void;tabs:string[];active:string;tabTitle:(path:string)=>string;
  onOpen:(path:string)=>void;onCloseTab:(path:string)=>void;actions:MobileAction[];mode:Settings['mode'];
  saveStatus:string;children:ReactNode;
}){
  const home=useRef<HTMLDivElement>(null),returnFocus=useRef<HTMLElement|null>(null);
  const [pluginMount]=useState(()=>document.createElement('div'));
  const mountPlugins=useCallback((node:HTMLDivElement|null)=>{(node??home.current)?.append(pluginMount);},[pluginMount]);
  useLayoutEffect(()=>{
    if(!pluginMount.parentElement)home.current?.append(pluginMount);
    return()=>pluginMount.remove();
  },[pluginMount]);
  useLayoutEffect(()=>{if(sheet)returnFocus.current=document.activeElement as HTMLElement;},[sheet]);
  function dismiss(){flushSync(onClose);}
  function run(action:()=>void){dismiss();action();}
  return <>
    <div ref={home} hidden/>
    <Sheet open={sheet!==null} onOpenChange={open=>{if(!open)onClose();}}>
      <SheetContent side="bottom" showCloseButton={false} className="mobile-shell mobile-sheet"
        onCloseAutoFocus={event=>{
          event.preventDefault();
          // A command/plugin may already have focused its new modal. Do not steal it.
          if(document.activeElement===document.body||document.activeElement?.closest('.mobile-sheet'))returnFocus.current?.focus();
        }}>
        <section className="mobile-sheet-surface">
          <header><SheetTitle>{sheet==='tabs'?'Open tabs':'Tools'}</SheetTitle><Button autoFocus variant="ghost" size="icon" aria-label="Close mobile sheet" onClick={dismiss}><X size={22}/></Button></header>
          <SheetDescription className="ui:sr-only">{sheet==='tabs'?'Switch or close your open documents.':'Note actions, workspace tools and plugin contributions.'}</SheetDescription>
          {sheet==='tabs'?<div className="mobile-tab-list">
            {tabs.length?tabs.map(path=><div key={path} className="mobile-tab-row">
              <Button variant="ghost" aria-label={`Open tab ${path}`} aria-current={active===path?'page':undefined} onClick={()=>run(()=>onOpen(path))}><span>{tabTitle(path)}</span><small>{path}</small></Button>
              <Button variant="ghost" size="icon" aria-label={`Close tab ${path}`} onClick={()=>onCloseTab(path)}><X size={20}/></Button>
            </div>):<p>No open notes. Use + to create a note, or Files to open one.</p>}
          </div>:<div className="mobile-tools-content">
            <p className="mobile-save-status" role="status" aria-label="Save status">{saveStatus} · {mode==='live'?'Live editing':mode==='source'?'Source':'Reading'}</p>
            <div className="mobile-menu-actions">{actions.map(action=><Button variant="ghost" key={action.id} aria-label={action.ariaLabel??action.label} aria-pressed={action.selected} disabled={action.disabled} data-testid={action.testid} onClick={()=>run(action.run)}>{action.label}</Button>)}</div>
            <div ref={mountPlugins}/>
          </div>}
        </section>
      </SheetContent>
    </Sheet>
    {createPortal(<div onClickCapture={event=>{if((event.target as Element).closest('button,a,[role="button"],.clickable-icon'))dismiss();}}>{children}</div>,pluginMount)}
  </>;
}
