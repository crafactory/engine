import {expect,it} from 'vitest';
import {recordPluginDocumentView,type PluginDocumentView} from '../src/plugin-document-views';

it('moves only the same owner/leaf registration to its new path',()=>{
  const views=new Map<string,PluginDocumentView>();
  recordPluginDocumentView(views,'owner','drawing','Old.md','leaf');
  recordPluginDocumentView(views,'owner','board','Other.md','other-leaf');
  recordPluginDocumentView(views,'another-owner','text','Foreign.md','leaf');
  recordPluginDocumentView(views,'owner','drawing','New.md','leaf');
  expect([...views.keys()]).toEqual(['Other.md','Foreign.md','New.md']);
  expect(views.get('New.md')).toEqual({pluginId:'owner',viewType:'drawing',leafId:'leaf'});
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
