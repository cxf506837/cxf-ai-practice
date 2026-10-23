import {fail,ok,defaultQuery,type Result,type CollectionItem,type ItemInput,type Tag,type Draft,type Preferences,type Query,type Page,type ImportPreview} from './types';
import {validateInput,validateTag,normalize,canonicalUrl} from './validation';
import {queryItems,type SearchCache} from './search';
import {parseBackup,comparable,digest,MAX_BACKUP_BYTES} from './backup';
import {welcomeSamples} from './samples';
const defaults:Preferences={schemaVersion:1,motionEnabled:true,onboardingSeen:false,lastBackupAt:null};
const request=<T>(r:IDBRequest<T>)=>new Promise<T>((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
function storageError(error:unknown):Result<never> {
  if(error instanceof DOMException && error.name==='QuotaExceededError') return fail('STORAGE_FULL','本地空间不足，操作未保存。请先导出备份后重试');
  return fail('STORAGE_UNAVAILABLE','本地存储未能完成，请重试；不会清空已有内容');
}
type ImportPlan={revision:number;items:CollectionItem[];tags:Tag[];skipped:number;preview:ImportPreview};
export class CollectionRepository {
  private database?:Promise<IDBDatabase>;
  private plans=new Map<string,ImportPlan>();
  private searchCache:SearchCache={tagsKey:'',entries:new Map()};
  constructor(public name='ribbon-inbox'){}
  private open():Promise<IDBDatabase> {
    if(!this.database) this.database=new Promise((resolve,reject)=>{
      const r=indexedDB.open(this.name,1);
      r.onupgradeneeded=()=>{
        const db=r.result,items=db.createObjectStore('items',{keyPath:'id'});
        items.createIndex('captureId','captureId',{unique:true});items.createIndex('importKey','importKey',{unique:true});
        db.createObjectStore('tags',{keyPath:'id'});db.createObjectStore('drafts',{keyPath:'id'});db.createObjectStore('meta');
      };
      r.onerror=()=>{this.database=undefined;reject(r.error);};
      r.onblocked=()=>{this.database=undefined;reject(new Error('请关闭其他旧版本页面后重试'));};
      r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();this.database=undefined;};resolve(r.result);};
    });
    return this.database;
  }
  private async transaction<T>(write:boolean,fn:(tx:IDBTransaction)=>Promise<Result<T>>):Promise<Result<T>> {
    let tx:IDBTransaction|undefined;
    try {
      const db=await this.open();tx=db.transaction(['items','tags','drafts','meta'],write?'readwrite':'readonly');
      const done=new Promise<void>((resolve,reject)=>{tx!.oncomplete=()=>resolve();tx!.onabort=()=>reject(tx!.error??new Error('事务取消'));tx!.onerror=()=>{};});
      // Observe immediately so a rejected request never creates an unhandled abort promise.
      done.catch(()=>{});
      try {
        const result=await fn(tx);
        if(!result.ok){tx.abort();await done.catch(()=>{});return result;}
        if(write){const m=tx.objectStore('meta');const rev=(await request(m.get('revision')) as number|undefined)??0;await request(m.put(rev+1,'revision'));}
        await done;return result;
      } catch(error){try{tx.abort();}catch{}await done.catch(()=>{});return storageError(error);}
    } catch(error){return storageError(error);}
  }
  async create(input:ItemInput,captureId?:string,draftId?:string):Promise<Result<CollectionItem>> {
    const valid=validateInput(input);if(!valid.ok)return valid;
    return this.transaction(true,async tx=>{
      const store=tx.objectStore('items');
      if(captureId){const existing=await request(store.index('captureId').get(captureId)) as CollectionItem|undefined;if(existing){if(draftId)await request(tx.objectStore('drafts').delete(draftId));return ok(existing);}}
      for(const id of valid.value.tagIds) if(!await request(tx.objectStore('tags').get(id)))return fail('VALIDATION','标签已不存在，请重新选择','tagIds');
      const time=Date.now();const item:CollectionItem={...valid.value,id:crypto.randomUUID(),sourceDomain:input.url?new URL(input.url).hostname:null,starred:false,archived:false,deletedAt:null,createdAt:time,updatedAt:time,revision:1,captureId:captureId??null,importKey:null};
      await request(store.add(item));if(draftId)await request(tx.objectStore('drafts').delete(draftId));return ok(item);
    });
  }
  async get(id:string):Promise<Result<CollectionItem>> {return this.transaction(false,async tx=>{const i=await request(tx.objectStore('items').get(id));return i?ok(i):fail('NOT_FOUND','收藏不存在');});}
  async applyOrganization(id:string,revision:number,summary:string,names:string[]):Promise<Result<CollectionItem>>{
    if(typeof summary!=='string'||!summary.trim()||Array.from(summary).length>600||!Array.isArray(names)||names.length>5||names.some(n=>!validateTag(n).ok)||new Set(names.map(normalize)).size!==names.length)return fail('VALIDATION','整理结果格式不正确');
    return this.change(id,revision,async(i,tx)=>{
      if(i.deletedAt!==null)return fail('VALIDATION','请先恢复收藏再整理');
      const note=[i.note,`AI 摘要（DeepSeek V4.1 Flash）\n${summary.trim()}`].filter(Boolean).join('\n\n');
      if(Array.from(note).length>2000)return fail('VALIDATION','追加摘要后备注超过 2000 字，请先编辑备注；本次未保存');
      const store=tx.objectStore('tags'),all=await request(store.getAll()) as Tag[],tagIds=[...i.tagIds];
      for(const name of names){let tag=all.find(t=>normalize(t.name)===normalize(name));if(!tag){const time=Date.now();tag={id:crypto.randomUUID(),name:name.trim(),createdAt:time,updatedAt:time};await request(store.add(tag));all.push(tag);}if(!tagIds.includes(tag.id))tagIds.push(tag.id);}
      if(tagIds.length>10)return fail('VALIDATION','加入后超过 10 个标签，请减少勾选；本次未保存');
      return ok({...i,note,tagIds});
    });
  }
  private async change(id:string,revision:number,transform:(item:CollectionItem,tx:IDBTransaction)=>Promise<Result<CollectionItem>>,draftId?:string):Promise<Result<CollectionItem>> {
    return this.transaction(true,async tx=>{
      const store=tx.objectStore('items'),i=await request(store.get(id)) as CollectionItem|undefined;
      if(!i)return fail('NOT_FOUND','收藏已不存在');if(i.revision!==revision)return fail('CONFLICT','内容已在其他页面更新，草稿保留，请重新载入后编辑');
      const result=await transform(i,tx);if(!result.ok)return result;
      const updated={...result.value,updatedAt:Date.now(),revision:i.revision+1};await request(store.put(updated));
      if(draftId)await request(tx.objectStore('drafts').delete(draftId));return ok(updated);
    });
  }
  async update(id:string,revision:number,input:ItemInput,draftId?:string):Promise<Result<CollectionItem>> {
    const valid=validateInput(input);if(!valid.ok)return valid;
    return this.change(id,revision,async(i,tx)=>{
      for(const t of valid.value.tagIds)if(!await request(tx.objectStore('tags').get(t)))return fail('VALIDATION','标签已不存在');
      return ok({...i,...valid.value,sourceDomain:input.url?new URL(input.url).hostname:null});
    },draftId);
  }
  async setFlags(id:string,revision:number,flags:{starred?:boolean;archived?:boolean}) {return this.change(id,revision,async i=>ok({...i,...flags}));}
  async trash(id:string,revision:number){return this.change(id,revision,async i=>ok({...i,deletedAt:Date.now()}));}
  async restore(id:string,revision:number){return this.change(id,revision,async i=>ok({...i,deletedAt:null}));}
  async permanentlyDelete(id:string,revision:number):Promise<Result<void>> {
    return this.transaction(true,async tx=>{const s=tx.objectStore('items'),i=await request(s.get(id)) as CollectionItem|undefined;if(!i)return fail('NOT_FOUND','记录不存在');if(i.revision!==revision)return fail('CONFLICT','内容已更新');if(i.deletedAt===null)return fail('VALIDATION','只有回收站记录可以永久删除');await request(s.delete(id));return ok(undefined);});
  }
  async query(query:Partial<Query>):Promise<Result<Page>> {
    const q={...defaultQuery,...query};if(!Number.isInteger(q.offset)||q.offset<0||!Number.isInteger(q.limit)||q.limit<1||q.limit>100)return fail('VALIDATION','分页范围不正确');
    return this.transaction(false,async tx=>{const [items,tags]=await Promise.all([request(tx.objectStore('items').getAll()),request(tx.objectStore('tags').getAll())]);return ok(queryItems(items,tags,q,this.searchCache));});
  }
  async duplicate(url:string,excludeId?:string):Promise<Result<CollectionItem[]>> {
    return this.transaction(false,async tx=>ok((await request(tx.objectStore('items').getAll()) as CollectionItem[]).filter(i=>i.deletedAt===null&&i.id!==excludeId&&i.url&&canonicalUrl(i.url)===canonicalUrl(url))));
  }
  async listTags():Promise<Result<Tag[]>>{return this.transaction(false,async tx=>ok((await request(tx.objectStore('tags').getAll()) as Tag[]).sort((a,b)=>a.name.localeCompare(b.name))));}
  async createTag(name:string):Promise<Result<Tag>> {
    const valid=validateTag(name);if(!valid.ok)return valid;
    return this.transaction(true,async tx=>{const s=tx.objectStore('tags'),tags=await request(s.getAll()) as Tag[];if(tags.some(t=>normalize(t.name)===normalize(name)))return fail('CONFLICT','同名标签已存在');const time=Date.now(),tag={id:crypto.randomUUID(),name:valid.value,createdAt:time,updatedAt:time};await request(s.add(tag));return ok(tag);});
  }
  async renameTag(id:string,name:string):Promise<Result<Tag>> {
    const valid=validateTag(name);if(!valid.ok)return valid;
    return this.transaction(true,async tx=>{const s=tx.objectStore('tags'),tags=await request(s.getAll()) as Tag[],tag=tags.find(t=>t.id===id);if(!tag)return fail('NOT_FOUND','标签不存在');if(tags.some(t=>t.id!==id&&normalize(t.name)===normalize(name)))return fail('CONFLICT','同名标签已存在');const updated={...tag,name:valid.value,updatedAt:Date.now()};await request(s.put(updated));return ok(updated);});
  }
  async deleteTag(id:string):Promise<Result<{unlinkedItems:number}>> {
    return this.transaction(true,async tx=>{const s=tx.objectStore('items'),all=await request(s.getAll()) as CollectionItem[],affected=all.filter(i=>i.tagIds.includes(id));for(const i of affected)await request(s.put({...i,tagIds:i.tagIds.filter(t=>t!==id),revision:i.revision+1,updatedAt:Date.now()}));
      const drafts=await request(tx.objectStore('drafts').getAll()) as Draft[];for(const d of drafts)if(d.input.tagIds.includes(id))await request(tx.objectStore('drafts').put({...d,input:{...d.input,tagIds:d.input.tagIds.filter(t=>t!==id)}}));
      await request(tx.objectStore('tags').delete(id));return ok({unlinkedItems:affected.length});});
  }
  async saveDraft(draft:Draft):Promise<Result<void>>{return this.transaction(true,async tx=>{await request(tx.objectStore('drafts').put(draft));return ok(undefined);});}
  async initializeSamples():Promise<Result<number>> {
    return this.transaction(true,async tx=>{
      const meta=tx.objectStore('meta'),items=tx.objectStore('items');
      if(await request(meta.get('welcomeSamplesV1')))return ok(0);
      // Existing libraries and unfinished drafts are never altered by initialization.
      if(await request(items.count())||await request(tx.objectStore('drafts').count())||await request(tx.objectStore('tags').count())){await request(meta.put(true,'welcomeSamplesV1'));return ok(0);}
      // Stable IDs/timestamps allow backup migration between two fresh installations.
      const now=Date.UTC(2026,9,10),tag:Tag={id:'51000000-0000-4000-8000-000000000000',name:'示例',createdAt:now,updatedAt:now};
      await request(tx.objectStore('tags').add(tag));
      for(const [index,input] of welcomeSamples.entries()){const item:CollectionItem={...input,id:'51000000-0000-4000-8000-'+String(index+1).padStart(12,'0'),tagIds:[tag.id],sourceDomain:input.url?new URL(input.url).hostname:null,createdAt:now,updatedAt:now,starred:false,archived:false,deletedAt:null,revision:1,captureId:null,importKey:null};await request(items.add(item));}
      await request(meta.put(true,'welcomeSamplesV1'));return ok(welcomeSamples.length);
    });
  }
  async listDrafts():Promise<Result<Draft[]>>{return this.transaction(false,async tx=>ok(await request(tx.objectStore('drafts').getAll())));}
  async discardDraft(id:string):Promise<Result<void>>{return this.transaction(true,async tx=>{await request(tx.objectStore('drafts').delete(id));return ok(undefined);});}
  async preferences():Promise<Result<Preferences>>{return this.transaction(false,async tx=>ok({...defaults,...await request(tx.objectStore('meta').get('preferences'))}));}
  async setPreferences(p:Partial<Preferences>):Promise<Result<Preferences>>{return this.transaction(true,async tx=>{const m=tx.objectStore('meta'),updated={...defaults,...await request(m.get('preferences')),...p};await request(m.put(updated,'preferences'));return ok(updated);});}
  private async snapshot(){return this.transaction(false,async tx=>{const [items,tags,revision]=await Promise.all([request(tx.objectStore('items').getAll()),request(tx.objectStore('tags').getAll()),request(tx.objectStore('meta').get('revision'))]);return ok({items:items as CollectionItem[],tags:tags as Tag[],revision:(revision as number|undefined)??0});});}
  async exportBackup():Promise<Result<string>> {
    const s=await this.snapshot();if(!s.ok)return s;
    const json=JSON.stringify({format:'ribbon-inbox',schemaVersion:s.value.items.some(i=>i.imageDataUrl)?2:1,exportedAt:Date.now(),items:s.value.items,tags:s.value.tags},null,2);
    return new TextEncoder().encode(json).length>MAX_BACKUP_BYTES?fail('TOO_LARGE','完整备份超过 50 MiB，未生成截断文件'):ok(json);
  }
  async previewImport(json:string):Promise<Result<ImportPreview>> {
    const parsed=parseBackup(json);if(!parsed.ok)return parsed;
    const s=await this.snapshot();if(!s.ok)return s;
    try {
      const b=parsed.value,newTags:Tag[]=[],map=new Map<string,string>(),current=s.value;
      for(const t of b.tags){const same=current.tags.find(x=>normalize(x.name)===normalize(t.name));const target=same?.id??(current.tags.some(x=>x.id===t.id)?crypto.randomUUID():t.id);map.set(t.id,target);if(!same)newTags.push({...t,id:target});}
      const items:CollectionItem[]=[];let identical=0,conflicts=0;
      for(const i of b.items){const same=current.items.find(x=>x.id===i.id),content=comparable(i,b.tags),importKey=i.id+':'+await digest(content);
        if(same&&comparable(same,current.tags)===content||current.items.some(x=>x.importKey===importKey)){identical++;continue;}
        const clash=!!same;if(clash)conflicts++;
        const used=[...current.items,...items];
        const captureId=!clash&&i.captureId&&!used.some(x=>x.captureId===i.captureId)?i.captureId:null;
        let key=i.importKey;
        if(clash)key=importKey;
        else if(key&&used.some(x=>x.importKey===key))key=null;
        items.push({...i,id:clash?crypto.randomUUID():i.id,tagIds:i.tagIds.map(t=>map.get(t)!),captureId,importKey:key,sourceDomain:i.url?new URL(i.url).hostname:null});
      }
      const token=await digest(json)+':'+crypto.randomUUID(),preview={token,added:items.length-conflicts,identical,conflicts,warnings:conflicts?['冲突记录保留原内容，作为导入副本保存']:[]};
      this.plans.clear();this.plans.set(token,{revision:current.revision,items,tags:newTags,skipped:identical,preview});return ok(preview);
    }catch{return fail('INVALID_BACKUP','备份无法准备，现有数据未改动');}
  }
  async commitImport(token:string):Promise<Result<{added:number;skipped:number}>> {
    const plan=this.plans.get(token);if(!plan)return fail('CONFLICT','请重新选择备份并预览');
    const result=await this.transaction(true,async tx=>{const revision=(await request(tx.objectStore('meta').get('revision')) as number|undefined)??0;if(revision!==plan.revision)return fail('CONFLICT','预览之后数据有变动，请重新预览');for(const t of plan.tags)await request(tx.objectStore('tags').add(t));for(const i of plan.items)await request(tx.objectStore('items').add(i));return ok({added:plan.items.length,skipped:plan.skipped});});
    this.plans.delete(token);return result;
  }
}
