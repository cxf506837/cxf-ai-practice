import {fail,ok,type Result} from './types';
export const MAX_IMAGE_BYTES=4*1024*1024;
export function imageMime(bytes:Uint8Array):string|null{
 if(bytes.length>=8&&[137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b))return 'image/png';
 if(bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
 if(bytes.length>=12&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')return 'image/webp';
 return null;
}
export function validImage(data:unknown):data is string{
 if(typeof data!=='string'||data.length>MAX_IMAGE_BYTES*4/3+100)return false;
 const match=/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(data);
 if(!match)return false;
 try{const binary=atob(match[2]);return binary.length<=MAX_IMAGE_BYTES&&imageMime(Uint8Array.from(binary,c=>c.charCodeAt(0)))===match[1];}catch{return false;}
}
export async function readImage(file:File):Promise<Result<string>>{
 if(file.size>MAX_IMAGE_BYTES)return fail('TOO_LARGE','原图超过4 MiB，请选择较小的图片');
 try{
  const data=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=reject;r.readAsDataURL(file);});
  if(!validImage(data))return fail('VALIDATION','只支持PNG、JPEG、WebP图片');
  return ok(data);
 }catch{return fail('STORAGE_UNAVAILABLE','图片读取失败，当前草稿保留');}
}
