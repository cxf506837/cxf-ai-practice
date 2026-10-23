const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const base = path.resolve(__dirname, '../web/src/features/collection');
exports.bundle = () => {
  const sources = Object.fromEntries(fs.readdirSync(base).filter(p => p.endsWith('.ts')).map(p => [p.slice(0,-3), ts.transpileModule(fs.readFileSync(path.join(base,p),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText]));
  return `(function(){const sources=${JSON.stringify(sources)},cache={};function load(id){if(id.startsWith('./'))id=id.slice(2);if(cache[id])return cache[id].exports;const m={exports:{}};cache[id]=m;new Function('require','module','exports',sources[id])(load,m,m.exports);return m.exports;}window.collectionModules=load;})();`;
};
exports.load = id => {
  const sources = {};
  function load(name) {
    name=name.replace(/^\.\//,'');
    if(sources[name])return sources[name].exports;
    const m={exports:{}};sources[name]=m;
    const js=ts.transpileModule(fs.readFileSync(path.join(base,name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
    new Function('require','module','exports',js)(load,m,m.exports);return m.exports;
  }
  return load(id);
};
