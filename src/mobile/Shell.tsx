import {useEffect,useRef,type ReactNode} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,Files,Menu,MoreVertical,Pencil,Plus,Search,X} from 'lucide-react';
import type {Settings} from '../types';
import './shell.css';

export type MobileSheetKind='tools'|'tabs'|null;
export interface MobileAction {id:string;label:string;ariaLabel?:string;run:()=>void;disabled?:boolean;selected?:boolean;testid?:string}

/** Native-only chrome. The editor, storage and plugin hosts stay shared with desktop. */
export function MobileHeader({filesOpen,reading,editable,unsaved,onFiles,onReading,onTools}:{
  filesOpen:boolean;reading:boolean;editable:boolean;unsaved:number;
  onFiles:()=>void;onReading:()=>void;onTools:()=>void;
}){
  return <header className="mobile-topbar">
    <button aria-label="Mobile files" title="Files" aria-pressed={filesOpen} onClick={onFiles}><Files size={22}/></button>
    <div className="mobile-top-actions">
      <button aria-label={reading?'Edit note':'Reading view'} title={reading?'Edit note':'Reading view'} disabled={!editable} onClick={onReading}>{reading?<Pencil size={22}/>:<BookOpen size={22}/>}</button>
      <button aria-label="Mobile more actions" title="More actions" onClick={onTools}><MoreVertical size={22}/>{unsaved>0&&<span className="mobile-unsaved-dot" aria-label={`${unsaved} unsaved`}/>}</button>
    </div>
  </header>;
}

export function MobileNavigation({count,canBack,canForward,searchEnabled,loading,onBack,onForward,onSearch,onNew,onTabs,onTools}:{
  count:number;canBack:boolean;canForward:boolean;searchEnabled:boolean;loading:boolean;
  onBack:()=>void;onForward:()=>void;onSearch:()=>void;onNew:()=>void;onTabs:()=>void;onTools:()=>void;
}){
  return <nav className="mobile-nav" aria-label="Mobile navigation">
    <button aria-label="Mobile back" title="Back" disabled={!canBack} onClick={onBack}><ArrowLeft size={22}/></button>
    <button aria-label="Mobile forward" title="Forward" disabled={!canForward} onClick={onForward}><ArrowRight size={22}/></button>
    <button aria-label="Mobile search" title="Search" disabled={!searchEnabled} onClick={onSearch}><Search size={23}/></button>
    <button aria-label="Mobile new note" title="New note" disabled={loading} onClick={onNew}><Plus size={24}/></button>
    <button aria-label="Mobile open tabs" title={`${count} open tabs`} onClick={onTabs}><span className="mobile-tab-count">{count}</span></button>
    <button aria-label="Mobile tools" title="Tools" onClick={onTools}><Menu size={23}/></button>
  </nav>;
}

/** Keep plugin mount points alive while closed; native dialog supplies focus/inert ownership. */
export function MobileSheet({sheet,onClose,tabs,active,tabTitle,onOpen,onCloseTab,actions,mode,saveStatus,children}:{
  sheet:MobileSheetKind;onClose:()=>void;tabs:string[];active:string;tabTitle:(path:string)=>string;
  onOpen:(path:string)=>void;onCloseTab:(path:string)=>void;actions:MobileAction[];mode:Settings['mode'];
  saveStatus:string;children:ReactNode;
}){
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    const node=dialog.current;if(!node)return;
    if(sheet){if(!node.open)node.showModal();}else if(node.open)node.close();
  },[sheet]);
  function dismiss(){dialog.current?.close();onClose();}
  function run(action:()=>void){dismiss();action();}
  return <dialog ref={dialog} className="mobile-sheet" aria-label={sheet==='tabs'?'Open tabs':'Mobile tools'}
    onCancel={event=>{event.preventDefault();dismiss();}} onClick={event=>{if(event.target===event.currentTarget)dismiss();}}>
    <section className="mobile-sheet-surface">
      <header><h2>{sheet==='tabs'?'Open tabs':'Tools'}</h2><button autoFocus aria-label="Close mobile sheet" onClick={dismiss}><X size={22}/></button></header>
      <div hidden={sheet!=='tabs'} className="mobile-tab-list">
        {tabs.length?tabs.map(path=><div key={path} className="mobile-tab-row">
          <button aria-label={`Open tab ${path}`} aria-current={active===path?'page':undefined} onClick={()=>run(()=>onOpen(path))}><span>{tabTitle(path)}</span><small>{path}</small></button>
          <button aria-label={`Close tab ${path}`} onClick={()=>onCloseTab(path)}><X size={20}/></button>
        </div>):<p>No open notes. Use + to create a note, or Files to open one.</p>}
      </div>
      <div hidden={sheet!=='tools'} className="mobile-tools-content">
        <p className="mobile-save-status" role="status" aria-label="Save status">{saveStatus} · {mode==='live'?'Live editing':mode==='source'?'Source':'Reading'}</p>
        <div className="mobile-menu-actions">{actions.map(action=><button key={action.id} aria-label={action.ariaLabel??action.label} aria-pressed={action.selected} disabled={action.disabled} data-testid={action.testid} onClick={()=>run(action.run)}>{action.label}</button>)}</div>
        <div onClickCapture={event=>{if((event.target as Element).closest('button,a,[role="button"],.clickable-icon'))dismiss();}}>{children}</div>
      </div>
    </section>
  </dialog>;
}
