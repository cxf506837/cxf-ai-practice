const {test}=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./modules.cjs');
const v=load('validation'),s=load('search');
const text={kind:'text',title:'中文笔记',body:'离线收集',note:'',url:null,tagIds:[]};
test('empty text and unsafe protocols cannot be saved',()=>{
 assert.equal(v.validateInput({...text,body:'  '}).ok,false);
 assert.equal(v.validateInput({...text,kind:'link',url:'javascript:alert(1)'}).ok,false);
 assert.equal(v.validateInput({...text,kind:'link',url:'https://example.org/a?q=1#x'}).ok,true);
});
test('unicode lengths and duplicate tags enforced without truncation',()=>{
 assert.equal(v.validateInput({...text,title:'😀'.repeat(120)}).ok,true);
 assert.equal(v.validateInput({...text,title:'😀'.repeat(121)}).ok,false);
 assert.equal(v.validateInput({...text,body:'文'.repeat(20001)}).ok,false);
 assert.equal(v.validateInput({...text,tagIds:['a','a']}).ok,false);
});
test('conservative URL comparison keeps query and fragment',()=>{
 assert.equal(v.canonicalUrl('HTTPS://EXAMPLE.ORG:443/a?sig=abc#x'),'https://example.org/a?sig=abc#x');
 assert.notEqual(v.canonicalUrl('https://example.org/a?q=1'),v.canonicalUrl('https://example.org/a?q=2'));
});
const item=(id,title,body,rest={})=>({...text,id,title,body,note:'',createdAt:1,updatedAt:1,starred:false,archived:false,deletedAt:null,sourceDomain:null,revision:1,captureId:null,importKey:null,...rest});
const q={text:'中文 REACT',scope:'all',kind:'all',tagIds:[],starredOnly:false,offset:0,limit:50};
const records=[item('a','中文 REACT',''),item('b','中文','React 教程'),item('c','别的','中文 React'),item('d','中文','无关'),item('e','中文 REACT','',{deletedAt:2})];
test('Chinese substring plus casefold multiword AND, title ranking and trash scope',()=>{
 assert.deepEqual(s.queryItems(records,[],q).items.map(x=>x.id),['a','b','c']);
 assert.deepEqual(s.queryItems(records,[],{...q,scope:'trash'}).items.map(x=>x.id),['e']);
 assert.deepEqual(s.queryItems(records,[],{...q,text:'中 文'}).items.map(x=>x.id),['a','b','d','c']);
});
test('literal special chars, tags AND and stable pagination',()=>{
 const all=[item('b','１００% _ (x)','',{tagIds:['t','u']}),item('a','100% _ (x)','',{tagIds:['t']})];
 assert.equal(s.queryItems(all,[],{...q,text:'100% _ (x)',tagIds:['t','u']}).total,1);
 assert.deepEqual(s.queryItems(all,[],{...q,text:'',limit:1,offset:1}).items.map(x=>x.id),['b']);
});
test('cached search refreshes on edits and tag renames',()=>{
 const cache={tagsKey:'',entries:new Map()},i=item('a','笔记','旧内容',{tagIds:['t']}),tags=[{id:'t',name:'工作'}];
 assert.equal(s.queryItems([i],tags,{...q,text:'旧内容'},cache).total,1);
 const edited={...i,body:'新内容',revision:2};
 assert.equal(s.queryItems([edited],tags,{...q,text:'旧内容'},cache).total,0);
 assert.equal(s.queryItems([edited],tags,{...q,text:'新内容 工作'},cache).total,1);
 assert.equal(s.queryItems([edited],[{id:'t',name:'阅读'}],{...q,text:'工作'},cache).total,0);
 assert.equal(s.queryItems([edited],[{id:'t',name:'阅读'}],{...q,text:'阅读'},cache).total,1);
});
