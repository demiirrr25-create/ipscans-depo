import test from 'node:test';
import assert from 'node:assert/strict';
import {median,jitter,variation,runSpeedTest} from '../src/lib/speed-engine.ts';
test('latency statistics use actual samples and unavailable values stay null',()=>{
  assert.equal(median([]),null); assert.equal(median([4,1,2,3]),2.5);
  assert.equal(jitter([10]),null); assert.equal(jitter([10,20,15]),7.5);
  assert.equal(variation([1,1]),null); assert.equal(variation([10,10,10,10]),0);
});
test('cancelled speed test performs no transfer and never returns fabricated measurements',async()=>{
  const c=new AbortController(); c.abort();
  await assert.rejects(runSpeedTest(c.signal,()=>{}),{name:'AbortError'});
});
