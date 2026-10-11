/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS loader evaluates the static TypeScript content in Node audit scripts. */
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
const cache=new Map();
function load(file){
 if(cache.has(file))return cache.get(file).exports;
 if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(file,'utf8'));
 const mod={exports:{}};cache.set(file,mod);
 const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',compiled)(name=>{
  if(name.startsWith('node:'))return require(name);
  let target=name.startsWith('@/')?path.join(root,'src',name.slice(2)):path.resolve(path.dirname(file),name);
  if(!path.extname(target))target+='.ts';
  return load(target);
 },mod,mod.exports);
 return mod.exports;
}
module.exports={load,root};

