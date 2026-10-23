import {fail,ok,type ItemInput,type Result} from './types';
import {validImage} from './images';
export const normalize = (text:string) => text.normalize('NFKC').replace(/\s+/gu,' ').trim().toLowerCase();
export const length = (text:string) => Array.from(text).length;
export function canonicalUrl(url:string):string|null {
  try { const parsed=new URL(url); return ['http:','https:'].includes(parsed.protocol) && !parsed.username && !parsed.password ? parsed.href : null; } catch { return null; }
}
export function validateInput(input:unknown):Result<ItemInput> {
  if(!input || typeof input!=='object') return fail('VALIDATION','收藏格式不正确');
  const i=input as ItemInput;
  if(!['text','link'].includes(i.kind)) return fail('VALIDATION','请选择文字或链接','kind');
  for(const [field,max,label] of [['title',120,'标题'],['body',20000,'正文'],['note',2000,'备注']] as const) {
    if(typeof i[field]!=='string'||length(i[field])>max) return fail('VALIDATION',`${label}最多 ${max} 个字符`,field);
  }
  if(!i.title.trim()) return fail('VALIDATION','请填写标题','title');
  if(i.imageDataUrl!==undefined&&!validImage(i.imageDataUrl))return fail('VALIDATION','图片需为不超过4 MiB的PNG、JPEG或WebP','imageDataUrl');
  if(i.kind==='text'&&!i.body.trim()&&!i.imageDataUrl) return fail('VALIDATION','请填写要保存的文字或选择图片','body');
  if(i.url!==null && (typeof i.url!=='string'||length(i.url)>4096||!canonicalUrl(i.url))) return fail('VALIDATION','网址需为有效 HTTP/HTTPS 链接，不包含登录凭证','url');
  if(i.kind==='link'&&!i.url) return fail('VALIDATION','请填写网址','url');
  if(!Array.isArray(i.tagIds)||i.tagIds.length>10||i.tagIds.some(t=>typeof t!=='string'||!t)||new Set(i.tagIds).size!==i.tagIds.length) return fail('VALIDATION','最多选择 10 个不同标签','tagIds');
  return ok({kind:i.kind,title:i.title.trim(),body:i.body,note:i.note,url:i.url,tagIds:[...i.tagIds],...(i.imageDataUrl?{imageDataUrl:i.imageDataUrl}:{})});
}
export function validateTag(name:string):Result<string> {
  if(typeof name!=='string'||!name.trim()||length(name.trim())>20) return fail('VALIDATION','标签名需为 1–20 个字符');
  return ok(name.trim());
}
