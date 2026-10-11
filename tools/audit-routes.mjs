import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{load,root}=require('./load-content.cjs');
const base=process.argv[2]||'http://127.0.0.1:3001';
const sitemap=load(path.join(root,'src/app/sitemap.ts')).default();
const paths=[...new Set(sitemap.map(p=>new URL(p.url).pathname))];
const results=[],failures=[];
let cursor=0;
await Promise.all(Array.from({length:4},async()=>{
 while(cursor<paths.length){
  const route=paths[cursor++];
  try{
   const res=await fetch(base+route,{signal:AbortSignal.timeout(30000)}),html=await res.text();
   const headings=(html.match(/<h1(?:\s|>)/g)||[]).length;
   const canonical=html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
   const data={route,status:res.status,h1:headings,canonical:canonical||null};
   results.push(data);
   if(res.status!==200||headings!==1||!canonical)failures.push(data);
  }catch(e){failures.push({route,error:e.message});}
 }
}));
const apiCases=[['/api/ports?host=127.0.0.1',403],['/api/ports?host=100.64.0.1',403],['/api/ports?host=invalid!',400],['/api/dns?domain=invalid!',400],['/api/whois?domain=invalid!',400],['/api/ip?ip=invalid',400],['/tr/not-a-real-black-infinity-route',404],['/tr/applications/missing',404]];
for(const [route,expected]of apiCases){
 const r=await fetch(base+route);if(r.status!==expected)failures.push({route,status:r.status,expected});
}
fs.mkdirSync('work',{recursive:true});fs.writeFileSync('work/route-audit.json',JSON.stringify({base,count:results.length,failures,results},null,2));
console.log(JSON.stringify({count:results.length,apiCases:apiCases.length,failures},null,2));
if(failures.length)process.exitCode=1;

