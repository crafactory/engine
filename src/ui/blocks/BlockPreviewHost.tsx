import {lazy,Suspense,useMemo} from 'react';
import {ViewBoundary} from '../../views';
import type {BlockContribution} from '../../services/ui';
import {loadBlockComponent} from './contract';

/** Lazily render one opt-in plugin block preview. */
export function BlockPreviewHost({contribution,source,path}:{contribution:BlockContribution;source:string;path:string}){
  const Component=useMemo(()=>lazy(async()=>({default:await loadBlockComponent(contribution)})),[contribution]);
  return <Suspense fallback={<div className="block-preview-loading"/>}><ViewBoundary resetKey={contribution.id}><Component source={source} language={contribution.language} path={path}/></ViewBoundary></Suspense>;
}
