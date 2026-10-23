const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {load}=require('./modules.cjs');
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aDT8AAAAASUVORK5CYII=';
const input={kind:'text',title:'图片笔记',body:'',note:'',url:null,tagIds:[],imageDataUrl:png};
test('image-only record valid, exact original data survives validation',()=>{const r=load('validation').validateInput(input);assert.equal(r.ok,true);assert.equal(r.value.imageDataUrl,png);});
test('image bytes must match declared MIME, size and safe formats',()=>{const v=load('validation').validateInput;assert.equal(v({...input,imageDataUrl:png.replace('image/png','image/jpeg')}).ok,false);assert.equal(v({...input,imageDataUrl:'data:image/svg+xml;base64,PHN2Zy8+'}).ok,false);assert.equal(v({...input,imageDataUrl:'data:image/png;base64,'+'A'.repeat(6*1024*1024)}).ok,false);});
const record={...input,id:'00000000-0000-4000-8000-000000000001',sourceDomain:null,starred:false,archived:false,deletedAt:null,createdAt:1,updatedAt:1,revision:1,captureId:null,importKey:null};
test('v2 image backups accepted, v1 cannot silently discard image, future version rejected',()=>{const p=load('backup').parseBackup,b={format:'ribbon-inbox',schemaVersion:2,exportedAt:1,items:[record],tags:[]};assert.equal(p(JSON.stringify(b)).ok,true);assert.equal(p(JSON.stringify({...b,schemaVersion:1})).ok,false);assert.equal(p(JSON.stringify({...b,schemaVersion:99})).ok,false);assert.notEqual(load('backup').comparable(record,[]),load('backup').comparable({...record,imageDataUrl:undefined},[]));});
test('question limits and source IDs checked',()=>{const c=load('cloud'),items=[{...record,body:'记得阅读'}];assert.equal(c.validateQuestion('阅读建议',items),true);assert.equal(c.validateQuestion('文'.repeat(501),items),false);assert.equal(c.validateQuestion('问题',Array(6).fill(record)),false);assert.equal(c.validateAnswer({answer:'建议阅读',sourceIds:[record.id]},items),true);assert.equal(c.validateAnswer({answer:'伪造',sourceIds:['outside']},items),false);assert.equal(c.validateAnswer({answer:'重复',sourceIds:[record.id,record.id]},items),false);});
test('Android direct request does not rely on LAN CA or configurable host',()=>{const s=fs.readFileSync(path.join(__dirname,'../android/app/src/main/java/com/ribboninbox/app/CloudAi.kt'),'utf8');assert.ok(s.includes('https://api.deepseek.com'));assert.ok(!s.includes('R.raw.cloud_gateway'));assert.ok(!s.includes('192.168.'));assert.ok(!s.includes('sslSocketFactory'));});
exports.png=png;
const http=require('node:http'),{createGateway}=require('../server/ai-gateway.cjs');
async function gatewayTest(fn){
 let calls=0,output={},sent;
 const g=createGateway({key:'synthetic-provider',pairCode:'0123456789abcdef',fetch:async(url,init)=>{calls++;sent=JSON.parse(init.body);return {ok:true,status:200,text:async()=>JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(output)}}]})};}}),server=http.createServer((q,r)=>g.handle(q,r,'paired'));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const post=(op,data,auth=true)=>fetch('http://127.0.0.1:'+server.address().port+'/api/ai/'+op,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer 0123456789abcdef'}:{})},body:JSON.stringify(data)});
 try{await fn({post,calls:()=>calls,setOutput:o=>{output=o},sent:()=>sent});}finally{await new Promise(r=>server.close(r));}
}
test('OCR requires auth and valid inline image, never visits external URLs',()=>gatewayTest(async({post,calls,setOutput,sent})=>{
 assert.equal((await post('recognize',{imageDataUrl:png},false)).status,401);
 for(const imageDataUrl of ['https://example.org/image.png',png.replace('image/png','image/jpeg')])assert.equal((await post('recognize',{imageDataUrl})).status,400);
 assert.equal(calls(),0);setOutput({text:'合成截图文字'});const r=await post('recognize',{imageDataUrl:png});assert.equal((await r.json()).value.text,'合成截图文字');assert.equal(sent().messages[1].content[1].image_url.detail,'original');
}));
test('question endpoint bounds evidence and rejects hallucinated source',()=>gatewayTest(async({post,setOutput,calls})=>{
 const item={id:record.id,title:'阅读',body:'周末读两篇文章',note:''},data={question:'我应做什么？',items:[item]};
 assert.equal((await post('ask',{...data,items:Array(6).fill(item)})).status,400);assert.equal((await post('ask',{...data,items:[null]})).status,400);assert.equal(calls(),0);
 setOutput({answer:'阅读两篇文章',sourceIds:['fabricated']});assert.equal((await post('ask',data)).status,502);
 setOutput({answer:'阅读两篇文章',sourceIds:[item.id]});assert.equal((await post('ask',data)).status,200);
}));
