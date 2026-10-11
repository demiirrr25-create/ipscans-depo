import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),{load,root}=require('./load-content.cjs');
const {posts,legacyPosts}=load(path.join(root,'src/content/posts.ts'));
const added=posts.filter(p=>!legacyPosts.some(old=>old.slug===p.slug));
test('160 new articles cover eight categories with 20 distinct entries each',()=>{
 assert.equal(added.length,160);
 assert.equal(new Set(posts.map(p=>p.slug)).size,posts.length);
 assert.equal(new Set(added.map(p=>p.title.tr)).size,160);
 assert.equal(new Set(added.map(p=>p.excerpt.tr)).size,160);
 const counts=Object.groupBy(added,p=>p.category);
 assert.equal(Object.keys(counts).length,8);
 for(const group of Object.values(counts))assert.equal(group.length,20);
});
test('every new article contains original body, dated primary references and valid internal reading links',()=>{
 for(const p of added){
  assert.match(p.slug,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  const body=p.body.tr;
  assert.ok(body.replace(/<[^>]*>/g,' ').trim().split(/\s+/).length>=250,p.slug);
  assert.ok((body.match(/<h2/g)||[]).length>=3,p.slug);
  assert.ok((body.match(/href="https:\/\//g)||[]).length>=1,p.slug);
  assert.match(body,/2026/,p.slug);
  assert.doesNotMatch(body,/<script|javascript:|TODO|lorem ipsum/i,p.slug);
  const links=[...body.matchAll(/href="\/tr\/blog\/([^"#?]+)"/g)];
  assert.ok(links.length,p.slug);
  for(const [,slug]of links)assert.ok(posts.some(p=>p.slug===slug),`${p.slug} -> ${slug}`);
 }
});
