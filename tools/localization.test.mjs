import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const cache=new Map();
function load(file){
 if(cache.has(file))return cache.get(file).exports;
 if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(file,'utf8'));
 const mod={exports:{}};cache.set(file,mod);
 const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',compiled)(name=>{
   let target=name.startsWith('@/')?path.join(root,'src',name.slice(2)):path.resolve(path.dirname(file),name);
   if(!path.extname(target))target+='.ts';
   return load(target);
 },mod,mod.exports);
 return mod.exports;
}
const {posts,postCategory}=load(path.join(root,'src/content/posts.ts'));
const {locales}=load(path.join(root,'src/i18n/config.ts'));
const links=html=>[...html.matchAll(/href="(https:[^"]+)"/g)].map(m=>m[1]);
const codes=html=>[...html.matchAll(/<code>(.*?)<\/code>/gs)].map(m=>m[1]);
test('all 54 articles have complete translations in every supported language',()=>{
 assert.equal(posts.length,54);
 for(const locale of locales)for(const post of posts){
  for(const field of ['title','excerpt','body'])assert.ok(post[field][locale]?.trim(),`${locale}/${post.slug}: ${field}`);
  const source=locale==='tr'?post.body.tr:post.body.en;
  assert.deepEqual(links(post.body[locale]),links(source),`${locale}/${post.slug}: references`);
  assert.deepEqual(codes(post.body[locale]),codes(source),`${locale}/${post.slug}: code`);
  assert.doesNotMatch(post.body[locale],/<script|javascript:|\[\d{3}\]/i);
  assert.ok(postCategory(post,locale));
 }
});
test('public UI, legal pages and application details cover every locale',()=>{
 const ui=load(path.join(root,'src/i18n/ui-messages.json'));
 const {privacyPolicy,termsOfService}=load(path.join(root,'src/content/legal.ts'));
 const {ipcastProductCopy}=load(path.join(root,'src/content/ipcast-product.ts'));
 const reference=Object.keys(ui.de).sort();
 assert.ok(reference.length>=123);
 for(const locale of locales){
  if(!['en','tr'].includes(locale)){
   assert.deepEqual(Object.keys(ui[locale]).sort(),reference,locale);
   for(const value of Object.values(ui[locale]))assert.ok(value.trim(),locale);
  }
  assert.ok(privacyPolicy[locale]?.includes('<h2>'),locale);
  assert.ok(termsOfService[locale]?.includes('<h2>'),locale);
  assert.ok(ipcastProductCopy[locale]?.faq.length>=3,locale);
 }
});
test('sitemap exposes 756 article routes with matching language alternates',()=>{
 const sitemap=load(path.join(root,'src/app/sitemap.ts')).default();
 const articles=sitemap.filter(p=>p.url.includes('/blog/'));
 assert.equal(articles.length,54*14);
 for(const page of articles)assert.equal(Object.keys(page.alternates.languages).length,15);
 for(const locale of locales)for(const slug of ['blog','privacy','terms']){
  const entry=sitemap.find(p=>p.url===`https://ipscans.com/${locale}/${slug}`);
  assert.equal(Object.keys(entry.alternates.languages).length,15,`${locale}/${slug}`);
 }
});
