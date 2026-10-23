import {native,isAndroid} from './platform';
import {fail,type Result,type CollectionItem} from './types';
import {length} from './validation';
import {validImage} from './images';
export type Organization={summary:string;tags:string[];model:string};
export type Answer={answer:string;sourceIds:string[]};
export function validateQuestion(question:string,items:CollectionItem[]):boolean{
 return typeof question==='string'&&!!question.trim()&&length(question)<=500&&items.length>0&&items.length<=5&&new Set(items.map(i=>i.id)).size===items.length&&items.every(i=>i.deletedAt===null&&!!(i.body.trim()||i.note.trim()))&&items.reduce((sum,i)=>sum+length(i.body)+length(i.note),0)<=30000;
}
export function validateAnswer(value:unknown,items:CollectionItem[]):value is Answer{
 if(!value||typeof value!=='object')return false;
 const a=value as Answer;
 return typeof a.answer==='string'&&!!a.answer.trim()&&length(a.answer)<=2000&&Array.isArray(a.sourceIds)&&new Set(a.sourceIds).size===a.sourceIds.length&&a.sourceIds.length<=items.length&&a.sourceIds.every(id=>typeof id==='string'&&items.some(i=>i.id===id));
}
async function request<T>(operation:'organize'|'recognize'|'ask',payload:unknown,signal:AbortSignal):Promise<Result<T>>{
 if(signal.aborted)return fail('CANCELLED','已取消请求');
 if(isAndroid()){
  const cancel=()=>{void native('cloudCancel');};signal.addEventListener('abort',cancel,{once:true});
  try{return await native<T>('cloud'+operation[0].toUpperCase()+operation.slice(1),payload);}finally{signal.removeEventListener('abort',cancel);}
 }
 try{
  const response=await fetch('/api/ai/'+operation,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.any([signal,AbortSignal.timeout(55000)])});
  const result=await response.json() as Result<T>;
  if(!result||typeof result.ok!=='boolean')return fail('STORAGE_UNAVAILABLE','返回格式异常，请手动重试');
  return result;
 }catch{return fail(signal.aborted?'CANCELLED':'STORAGE_UNAVAILABLE',signal.aborted?'已取消请求':'模型网络不可用，请检查连接后手动重试');}
}
export async function recognize(imageDataUrl:string,signal:AbortSignal):Promise<Result<{text:string}>>{
 if(!validImage(imageDataUrl))return fail('VALIDATION','图片格式或大小不符合要求');
 const r=await request<{text:string}>('recognize',{imageDataUrl},signal);
 return r.ok&&(typeof r.value?.text!=='string'||length(r.value.text)>20000)?fail('STORAGE_UNAVAILABLE','识别结果格式异常，请手动重试'):r;
}
export async function ask(question:string,items:CollectionItem[],signal:AbortSignal):Promise<Result<Answer>>{
 if(!validateQuestion(question,items))return fail('VALIDATION','请选择1–5条有文字的收藏；问题最多500字，所选正文与备注合计最多30000字');
 const r=await request<Answer>('ask',{question,items:items.map(({id,title,body,note})=>({id,title,body,note}))},signal);
 return r.ok&&!validateAnswer(r.value,items)?fail('STORAGE_UNAVAILABLE','回答来源不符合所选资料，请手动重试'):r;
}
export async function organize(item:CollectionItem,signal:AbortSignal):Promise<Result<Organization>>{
 return request<Organization>('organize',{title:item.title,body:item.body,note:item.note},signal);
}
