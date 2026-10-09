import test from 'node:test';
import assert from 'node:assert/strict';
import { networkGuides } from '../src/content/network-guides.ts';

test('fifty distinct Turkish guides have substantive content and primary references',()=>{
  assert.equal(networkGuides.length,50);
  assert.equal(new Set(networkGuides.map(p=>p.slug)).size,50);
  assert.equal(new Set(networkGuides.map(p=>p.title.tr)).size,50);
  for(const post of networkGuides){
    assert.match(post.slug,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(post.category);
    const body=post.body.tr;
    assert.ok(body.replace(/<[^>]*>/g,' ').trim().split(/\s+/).length>=120,post.slug);
    assert.match(body,/<ol>.*<li>.*<\/ol>/s);
    assert.match(body,/<a href="https:\/\/(www\.rfc-editor\.org|learn\.microsoft\.com|support\.microsoft\.com|nmap\.org|www\.onvif\.org|jrsoftware\.org)\//);
    assert.doesNotMatch(body,/<script|javascript:|TODO|lorem ipsum/i);
  }
});
