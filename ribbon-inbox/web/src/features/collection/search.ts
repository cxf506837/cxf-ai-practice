import {normalize} from './validation';
import {type CollectionItem,type Tag,type Query,type Page} from './types';
export type SearchCache={tagsKey:string;entries:Map<string,{revision:number;title:string;fields:string[]}>};
export function queryItems(items:CollectionItem[],tags:Tag[],q:Query,cache?:SearchCache):Page {
  const words=normalize(q.text).split(' ').filter(Boolean), full=normalize(q.text);
  const names=new Map(tags.map(t=>[t.id,t.name]));
  if(cache){const key=JSON.stringify(tags.map(t=>[t.id,t.name]));if(cache.tagsKey!==key){cache.entries.clear();cache.tagsKey=key;}const ids=new Set(items.map(i=>i.id));for(const id of cache.entries.keys())if(!ids.has(id))cache.entries.delete(id);}
  const ranked=items.flatMap(i=>{
    if(q.scope==='trash' ? i.deletedAt===null : i.deletedAt!==null) return [];
    if(q.scope==='inbox'&&i.archived || q.scope==='archive'&&!i.archived) return [];
    if(q.kind!=='all'&&q.kind!==i.kind || q.starredOnly&&!i.starred || !q.tagIds.every(t=>i.tagIds.includes(t))) return [];
    let title='';
    if(words.length){let document=cache?.entries.get(i.id);
      if(!document||document.revision!==i.revision){title=normalize(i.title);document={revision:i.revision,title,fields:[title,normalize(i.body),normalize(i.note),normalize(i.sourceDomain??''),...i.tagIds.map(t=>normalize(names.get(t)??''))]};cache?.entries.set(i.id,document);}
      title=document.title;
      if(!words.every(w=>document.fields.some(f=>f.includes(w))))return [];
    }
    let rank=3;
    if(!words.length) rank=0;
    else if(title===full) rank=0;
    else if(words.every(w=>title.includes(w))) rank=1;
    else if(words.some(w=>title.includes(w))) rank=2;
    return [{item:i,rank}];
  });
  ranked.sort((a,b)=>a.rank-b.rank || Number(b.item.starred)-Number(a.item.starred) || b.item.updatedAt-a.item.updatedAt || a.item.id.localeCompare(b.item.id));
  return {total:ranked.length,items:ranked.slice(q.offset,q.offset+q.limit).map(r=>r.item)};
}
