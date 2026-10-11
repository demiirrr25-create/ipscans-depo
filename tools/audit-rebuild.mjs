import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {load,root}=require('./load-content.cjs');
const {posts}=load(path.join(root,'src/content/posts.ts'));
const {applications}=load(path.join(root,'src/content/applications.ts'));
const sitemap=load(path.join(root,'src/app/sitemap.ts')).default();
const report={generated:new Date().toISOString(),articles:posts.length,categories:{},routes:sitemap.length,duplicates:[],brokenInternalLinks:[],content:[],downloads:[]};
const seen=new Set();
for(const p of posts){
 if(seen.has(p.slug))report.duplicates.push(p.slug);seen.add(p.slug);
 report.categories[p.category||'Legacy essentials']=(report.categories[p.category||'Legacy essentials']||0)+1;
 const body=p.body.tr||'';
 const words=body.replace(/<[^>]*>/g,' ').trim().split(/\s+/).length;
 const refs=[...body.matchAll(/href="(https:[^"]+)"/g)].map(m=>m[1]);
 report.content.push({slug:p.slug,words,headings:(body.match(/<h2/g)||[]).length,references:refs.length,locales:Object.keys(p.body).length});
 for(const [,url] of body.matchAll(/href="(\/tr\/blog\/[^"#?]+)"/g))if(!posts.some(q=>'/tr/blog/'+q.slug===url))report.brokenInternalLinks.push({slug:p.slug,url});
}
if(process.argv.includes('--downloads')){
 const urls=[...new Set(applications.flatMap(a=>[a.downloadUrl,a.portableUrl,a.releaseUrl]))];
 await Promise.all(urls.map(async url=>{try{const res=await fetch(url,{method:'HEAD',redirect:'follow',signal:AbortSignal.timeout(30000)});report.downloads.push({url,status:res.status,type:res.headers.get('content-type'),bytes:res.headers.get('content-length')});}catch(e){report.downloads.push({url,error:e.message});}}));
}
const destination=process.argv.find(a=>a.startsWith('--out='))?.slice(6)||'work/rebuild-audit.json';
fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,JSON.stringify(report,null,2));
console.log(JSON.stringify({articles:report.articles,categories:report.categories,routes:report.routes,duplicates:report.duplicates,brokenInternalLinks:report.brokenInternalLinks,downloads:report.downloads,report:destination},null,2));

