import {ok,fail,type Result,type PendingCapture,type ItemInput} from './types';
import {canonicalUrl} from './validation';
import {MAX_BACKUP_BYTES} from './backup';
declare global {interface Window {RibbonNative?:{postMessage:(message:string)=>void;onmessage:((event:{data:string})=>void)|null};}}
const pending=new Map<string,{resolve:(r:Result<unknown>)=>void;timer:number}>();
export const isAndroid=()=>typeof window!=='undefined'&&location.origin==='https://appassets.androidplatform.net';
export function native<T>(operation:string,payload:unknown={}):Promise<Result<T>> {
  const bridge=window.RibbonNative;if(!bridge)return Promise.resolve(fail('UNSUPPORTED_PLATFORM','当前 WebView 不支持安全通道，请更新 Android System WebView；仍可手动保存'));
  bridge.onmessage=event=>{try{const data=JSON.parse(event.data),p=pending.get(data.requestId);if(p){clearTimeout(p.timer);pending.delete(data.requestId);p.resolve(data.result);}}catch{}};
  const timeout=operation.startsWith('backup')||operation==='cloudConfigure'||operation==='imagePick'?300000:operation.startsWith('cloud')?65000:10000;
  return new Promise(resolve=>{const requestId=crypto.randomUUID();const timer=window.setTimeout(()=>{pending.delete(requestId);resolve(fail('STORAGE_UNAVAILABLE','操作等待超时，请重试'));},timeout);pending.set(requestId,{resolve:resolve as (r:Result<unknown>)=>void,timer});try{bridge.postMessage(JSON.stringify({version:1,requestId,operation,payload}));}catch{clearTimeout(timer);pending.delete(requestId);resolve(fail('STORAGE_UNAVAILABLE','原生通道不可用'));}});
}
export async function captures():Promise<Result<PendingCapture[]>> {return isAndroid()?native('ready'):ok([]);}
export function sharedInput(c:PendingCapture):ItemInput {
  const candidates=c.text.match(/https?:\/\/[^\s<>"']+/gi)??[],url=candidates.map(u=>canonicalUrl(u.replace(/[。，、；）)]*$/u,''))).find(Boolean)??null;
  const line=c.subject.trim()||c.text.trim().split('\n')[0]||'系统分享';
  return {kind:url?'link':'text',title:Array.from(line).slice(0,120).join(''),body:c.text,note:'',url,tagIds:[]};
}
export async function openExternal(url:string):Promise<Result<void>> {
  if(!canonicalUrl(url))return fail('VALIDATION','只能打开 HTTP/HTTPS 链接');
  if(isAndroid())return native('openExternal',{url:canonicalUrl(url)});
  const tab=window.open(url,'_blank','noopener,noreferrer');
  // noopener browsers deliberately return null; creation is initiated by the user gesture.
  void tab;return ok(undefined);
}
export async function copy(text:string):Promise<Result<void>> {try{await navigator.clipboard.writeText(text);return ok(undefined);}catch{return fail('STORAGE_UNAVAILABLE','复制失败，请长按文字手动复制');}}
export async function exportFile(json:string):Promise<Result<{confirmed:boolean}>> {
  if(new TextEncoder().encode(json).length>MAX_BACKUP_BYTES)return fail('TOO_LARGE','备份超过 50 MiB');
  if(isAndroid()){const result=await native<void>('backupExport',{json});return result.ok?ok({confirmed:true}):result;}
  const blob=new Blob([json],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='拾光收集箱-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);return ok({confirmed:false});
}
