import {fail,ok,type Backup,type CollectionItem,type Tag,type Result} from './types';
import {validateInput,validateTag,normalize} from './validation';
export const MAX_BACKUP_BYTES=50*1024*1024;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const date=(n:unknown):n is number=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0&&n<=8640000000000000;
export function parseBackup(json:string):Result<Backup> {
  if(new TextEncoder().encode(json).length>MAX_BACKUP_BYTES) return fail('TOO_LARGE','备份文件超过 50 MiB');
  try {
    const b=JSON.parse(json) as Backup;
    if(!b||b.format!=='ribbon-inbox') return fail('INVALID_BACKUP','这不是拾光收集箱备份');
    if(b.schemaVersion!==1&&b.schemaVersion!==2) return fail('UNSUPPORTED_VERSION','不支持该备份版本，请使用相应版本应用');
    if(b.schemaVersion===1&&Array.isArray(b.items)&&b.items.some(i=>i?.imageDataUrl!==undefined))throw Error();
    if(!date(b.exportedAt)||!Array.isArray(b.items)||!Array.isArray(b.tags)) throw Error();
    const ids=new Set<string>(),tagIds=new Set<string>(),tagNames=new Set<string>();
    for(const t of b.tags) {
      if(!t||typeof t.id!=='string'||!uuid.test(t.id)||tagIds.has(t.id)||!validateTag(t.name).ok||tagNames.has(normalize(t.name))||!date(t.createdAt)||!date(t.updatedAt)||t.updatedAt<t.createdAt) throw Error();
      tagIds.add(t.id);tagNames.add(normalize(t.name));
    }
    for(const i of b.items) {
      if(!i||typeof i.id!=='string'||!uuid.test(i.id)||ids.has(i.id)||!validateInput(i).ok||!i.tagIds.every(t=>tagIds.has(t))||typeof i.starred!=='boolean'||typeof i.archived!=='boolean'||!date(i.createdAt)||!date(i.updatedAt)||i.updatedAt<i.createdAt||i.deletedAt!==null&&!date(i.deletedAt)||!Number.isSafeInteger(i.revision)||i.revision<1||i.captureId!==null&&typeof i.captureId!=='string'||i.importKey!==null&&typeof i.importKey!=='string'||i.sourceDomain!==null&&typeof i.sourceDomain!=='string') throw Error();
      ids.add(i.id);
    }
    return ok(b);
  } catch { return fail('INVALID_BACKUP','备份损坏或字段不完整，现有数据未改动'); }
}
export function comparable(i:CollectionItem,tags:Tag[]) {
  const names=new Map(tags.map(t=>[t.id,normalize(t.name)]));
  return JSON.stringify({kind:i.kind,title:i.title,body:i.body,note:i.note,url:i.url,imageDataUrl:i.imageDataUrl,tagNames:i.tagIds.map(id=>names.get(id)).sort(),starred:i.starred,archived:i.archived,deletedAt:i.deletedAt,createdAt:i.createdAt,updatedAt:i.updatedAt});
}
export async function digest(text:string) {
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
