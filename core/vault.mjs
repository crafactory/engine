import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const textExtensions = new Set(['.md', '.markdown', '.txt', '.canvas', '.base', '.csv', '.json', '.css']);
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
export class Vault {
  constructor(root) {this.root = path.resolve(root); this.queue = Promise.resolve();}
  async safe(relative, allowHidden = false) {
    if (typeof relative !== 'string' || relative.includes('\0') || path.isAbsolute(relative)
      || relative.split(/[\\/]/).some(p => p === '..' || (!allowHidden && p.startsWith('.')))) {
      throw new Error('Invalid vault path');
    }
    const full = path.resolve(this.root, relative);
    if (full !== this.root && !full.startsWith(this.root + path.sep)) throw new Error('Path escapes vault');
    let probe = full;
    while (probe.startsWith(this.root)) {
      try {
        const real = await fs.realpath(probe);
        const realRoot = await fs.realpath(this.root);
        if (real !== realRoot && !real.startsWith(realRoot + path.sep)) throw new Error('Symlink escapes vault');
        break;
      } catch (e) {if (e.code !== 'ENOENT') throw e; probe = path.dirname(probe);}
    }
    return full;
  }
  async init() {await fs.mkdir(this.root, {recursive:true}); await fs.mkdir(path.join(this.root,'.crafactory'),{recursive:true}); return this;}
  async list() {
    const result = [];
    const walk = async (dir, prefix = '') => {
      for (const item of await fs.readdir(dir,{withFileTypes:true})) {
        if (item.name.startsWith('.') || item.isSymbolicLink()) continue;
        const relative = prefix + item.name;
        const stat = await fs.stat(path.join(dir,item.name));
        result.push({path:relative,name:item.name,folder:item.isDirectory(),size:stat.size,mtime:stat.mtimeMs,ctime:stat.birthtimeMs});
        if (item.isDirectory()) await walk(path.join(dir,item.name), relative + '/');
      }
    };
    await walk(this.root);
    return result.sort((a,b) => Number(b.folder)-Number(a.folder) || a.path.localeCompare(b.path));
  }
  async read(relative) {
    if (!textExtensions.has(path.extname(relative).toLowerCase())) throw new Error('Not a text file');
    const content = await fs.readFile(await this.safe(relative),'utf8');
    return {path:relative,content,version:hash(content)};
  }
  serialize(fn) {
    const next = this.queue.then(fn);
    this.queue = next.catch(() => {});
    return next;
  }
  async write(relative, content, version) {
    return this.serialize(async () => {
      if (typeof content !== 'string' || Buffer.byteLength(content) > 32*1024*1024) throw new Error('Invalid or oversized text');
      if (!textExtensions.has(path.extname(relative).toLowerCase())) throw new Error('Unsupported text format');
      const full = await this.safe(relative);
      let previous;
      try {previous = await fs.readFile(full,'utf8');} catch(e) {if (e.code !== 'ENOENT') throw e;}
      if (version && (previous === undefined || hash(previous) !== version)) throw new Error('CONFLICT: File changed on disk. Reload or save a separate copy.');
      if (previous !== undefined && previous !== content) await this.snapshot(relative,previous);
      await fs.mkdir(path.dirname(full),{recursive:true});
      const temporary = full + '.engine-' + crypto.randomUUID();
      try {await fs.writeFile(temporary,content,{flag:'wx'}); await fs.rename(temporary,full);}
      finally {await fs.rm(temporary,{force:true});}
      return {path:relative,content,version:hash(content)};
    });
  }
  async mkdir(relative) {await fs.mkdir(await this.safe(relative),{recursive:true});}
  async rename(from,to) {
    return this.serialize(async () => {
      const source = await this.safe(from), target = await this.safe(to);
      if (source === this.root || target === this.root) throw new Error('Cannot rename vault root');
      try {await fs.access(target); throw new Error('Destination already exists');} catch(e) {if (e.code !== 'ENOENT') throw e;}
      await fs.mkdir(path.dirname(target),{recursive:true}); await fs.rename(source,target);
    });
  }
  async trash(relative) {
    return this.serialize(async () => {
      const full = await this.safe(relative);
      if (full === this.root) throw new Error('Cannot delete vault root');
      const dir = await this.safe('.crafactory/trash',true); await fs.mkdir(dir,{recursive:true});
      const id = crypto.randomUUID();
      await fs.rename(full,path.join(dir,id));
      await fs.writeFile(path.join(dir,id+'.json'),JSON.stringify({path:relative,time:Date.now()}));
    });
  }
  async snapshot(relative,content) {
    const dir = await this.safe('.crafactory/recovery',true); await fs.mkdir(dir,{recursive:true});
    const id = `${Date.now()}-${crypto.randomUUID()}`;
    await fs.writeFile(path.join(dir,id+'.json'),JSON.stringify({id,path:relative,time:Date.now(),content}));
    const all = await this.snapshots(relative);
    for (const old of all.slice(100)) await fs.rm(path.join(dir,old.id+'.json'),{force:true});
  }
  async snapshots(relative) {
    const dir = await this.safe('.crafactory/recovery',true);
    let names; try {names = await fs.readdir(dir);} catch(e) {if(e.code === 'ENOENT') return []; throw e;}
    const items = await Promise.all(names.filter(n => n.endsWith('.json')).map(async name => {
      const data = JSON.parse(await fs.readFile(path.join(dir,name),'utf8'));
      return {id:data.id,path:data.path,time:data.time};
    }));
    return items.filter(s => s.path === relative).sort((a,b) => b.time-a.time);
  }
  async restore(id) {
    if (!/^\d+-[a-f0-9-]+$/.test(id)) throw new Error('Invalid snapshot');
    const record = JSON.parse(await fs.readFile(await this.safe(`.crafactory/recovery/${id}.json`,true),'utf8'));
    return this.write(record.path,record.content);
  }
  async loadState() {
    try {return JSON.parse(await fs.readFile(await this.safe('.crafactory/state.json',true),'utf8'));}
    catch(e) {if(e.code==='ENOENT') return {}; throw e;}
  }
  async saveState(state) {
    return this.serialize(async () => {
      const full = await this.safe('.crafactory/state.json',true), temp = full+'.tmp';
      await fs.writeFile(temp,JSON.stringify(state,null,2)); await fs.rename(temp,full);
    });
  }
  async asset(relative) {
    const full = await this.safe(relative);
    const stat = await fs.stat(full); if(stat.size > 64*1024*1024) throw new Error('Attachment exceeds 64 MB');
    const ext = path.extname(relative).slice(1).toLowerCase();
    const mime = {png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',svg:'image/svg+xml',pdf:'application/pdf',mp3:'audio/mpeg',webm:'audio/webm',wav:'audio/wav',ogg:'audio/ogg',mp4:'video/mp4'}[ext] || 'application/octet-stream';
    return `data:${mime};base64,${(await fs.readFile(full)).toString('base64')}`;
  }
  async attach(name,data) {
    if (typeof name !== 'string' || !Array.isArray(data) || data.length > 64*1024*1024 || data.some(n => !Number.isInteger(n) || n<0 || n>255)) throw new Error('Invalid attachment');
    const state = await this.loadState();
    const folder = state.settings?.attachmentFolder || 'Attachments';
    const base = path.basename(name).replace(/[^a-zA-Z0-9_.\-\u0080-\uffff]/g,'_') || 'attachment';
    let relative = `${folder}/${base}`, full = await this.safe(relative);
    try {await fs.access(full); relative = `${folder}/${crypto.randomUUID()}-${base}`; full = await this.safe(relative);} catch(e) {if(e.code!=='ENOENT') throw e;}
    await fs.mkdir(path.dirname(full),{recursive:true}); await fs.writeFile(full,Buffer.from(data),{flag:'wx'});
    return relative;
  }
  async plugins() {
    const dir = await this.safe('.crafactory/plugins',true);
    let names; try {names=await fs.readdir(dir,{withFileTypes:true});} catch(e) {if(e.code==='ENOENT')return[];throw e;}
    const result=[];
    for(const entry of names.filter(e=>e.isDirectory() && /^[a-z0-9-]+$/.test(e.name))) {
      const manifestPath = await this.safe(`.crafactory/plugins/${entry.name}/manifest.json`,true);
      const codePath = await this.safe(`.crafactory/plugins/${entry.name}/main.js`,true);
      try {
        const manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));
        if(manifest.id!==entry.name || typeof manifest.name!=='string' || typeof manifest.version!=='string') continue;
        result.push({manifest,code:await fs.readFile(codePath,'utf8')});
      } catch {}
    }
    return result;
  }
}
