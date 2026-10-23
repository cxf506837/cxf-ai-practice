import {type ItemInput} from './types';

// Synthetic welcome content. No personal data or fetched website body.
export const welcomeSamples:ItemInput[]=[
 {kind:'text',title:'示例 · 周末阅读清单',body:'周末留半小时阅读：先挑一篇文章，记下最有用的一句话，再写一点自己的理解。',note:'试着搜索“阅读 清单”，多个词可以分别命中标题、正文和备注。',url:null,tagIds:[]},
 {kind:'text',title:'示例 · 界面动效笔记',body:'点击时给一点反馈；拖动跟随手指；松开后自然归位。让动效帮助理解操作，也给阅读留一点安静。',note:'做个人作品集界面时参考。',url:null,tagIds:[]},
 {kind:'link',title:'示例 · Android 开发文档',body:'仅保存官方文档入口，没有自动抓取网页正文。',note:'学习安卓开发时打开原链接查看。',url:'https://developer.android.com/',tagIds:[]},
 {kind:'link',title:'示例 · MDN 网页技术文档',body:'JavaScript、CSS 和网页 API 的参考入口。',note:'搜索“网页 API”可以找回这个入口。',url:'https://developer.mozilla.org/zh-CN/',tagIds:[]},
 {kind:'text',title:'示例 · 先备份，再换手机',body:'在“更多”里导出 JSON 备份并保存文件。换手机后导入，先看预览再确认合并。卸载前也记得备份。',note:'这五条都是可编辑、可删除的合成示例，不会删除后又自动出现。',url:null,tagIds:[]},
];
