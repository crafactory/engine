import {expect,it,vi} from 'vitest';
import {recordPluginDocumentView,retirePluginFileViews,type PluginDocumentView} from '../src/plugin-document-views';

it('moves only the same owner/leaf registration to its new path',()=>{
  const views=new Map<string,PluginDocumentView>();
  recordPluginDocumentView(views,'owner','drawing','Old.md','leaf');
  recordPluginDocumentView(views,'owner','board','Other.md','other-leaf');
  recordPluginDocumentView(views,'another-owner','text','Foreign.md','leaf');
  recordPluginDocumentView(views,'owner','drawing','New.md','leaf');
  expect([...views.keys()]).toEqual(['Other.md','Foreign.md','New.md']);
  expect(views.get('New.md')).toEqual({pluginId:'owner',viewType:'drawing',leafId:'leaf'});
});

it('does not retire any owner when another owner cannot finish its final save',async()=>{
  const change={seal:vi.fn(),commit:vi.fn(async()=>{}),rollback:vi.fn()},restore=vi.fn(),error=new Error('save failed');
  await expect(retirePluginFileViews([{prepareFileViews:async()=>change},{prepareFileViews:async()=>{throw error;}}],'Note.md',restore)).rejects.toBe(error);
  expect(change.seal).not.toHaveBeenCalled();expect(change.commit).not.toHaveBeenCalled();expect(change.rollback).toHaveBeenCalledOnce();expect(restore).not.toHaveBeenCalled();
});

it('rolls back all seals before retirement if a draft changed during preparation',async()=>{
  const first={seal:vi.fn(),commit:vi.fn(async()=>{}),rollback:vi.fn()},second={seal:vi.fn(()=>{throw new Error('draft changed');}),commit:vi.fn(async()=>{}),rollback:vi.fn()},restore=vi.fn();
  await expect(retirePluginFileViews([{prepareFileViews:async()=>first},{prepareFileViews:async()=>second}],'Note.md',restore)).rejects.toThrow('draft changed');
  for(const change of [first,second]){expect(change.commit).not.toHaveBeenCalled();expect(change.rollback).toHaveBeenCalledOnce();}expect(restore).not.toHaveBeenCalled();
});

it('restores persisted views if owner cleanup fails after retirement starts',async()=>{
  const first={seal:vi.fn(),commit:vi.fn(async()=>{}),rollback:vi.fn()},second={seal:vi.fn(),commit:vi.fn(async()=>{throw new Error('close failed');}),rollback:vi.fn()},restore=vi.fn();
  await expect(retirePluginFileViews([{prepareFileViews:async()=>first},{prepareFileViews:async()=>second}],'Note.md',restore)).rejects.toThrow('close failed');expect(restore).toHaveBeenCalledOnce();
});

it('ignores stale/foreign close notifications and removes only the current matching registration',()=>{
  const views=new Map<string,PluginDocumentView>();
  recordPluginDocumentView(views,'owner','drawing','Old.md','leaf');
  recordPluginDocumentView(views,'owner','drawing','New.md','leaf');
  recordPluginDocumentView(views,'owner',null,'Old.md','leaf');
  recordPluginDocumentView(views,'owner',null,'New.md','old-leaf');
  recordPluginDocumentView(views,'another-owner',null,'New.md','leaf');
  expect([...views.keys()]).toEqual(['New.md']);
  recordPluginDocumentView(views,'owner',null,'New.md','leaf');
  expect(views.size).toBe(0);
});
