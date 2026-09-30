import { test } from 'node:test';
import assert from 'node:assert/strict';
import { xhrUpload } from '../src/lib/speed-upload.ts';

class FakeXHR {
  static latest;
  upload = {};
  status = 0;
  constructor() { FakeXHR.latest = this; }
  open() {}
  send() {}
  abort() { this.onabort(); }
}

test('aborted upload counts observed bytes, never the unsent remainder', async () => {
  globalThis.XMLHttpRequest = FakeXHR;
  let bytes = 0;
  const upload = xhrUpload(new Uint8Array(2_000_000), delta => bytes += delta);
  FakeXHR.latest.upload.onprogress({ loaded: 1200 });
  upload.abort();
  assert.equal(await upload.promise, false);
  assert.equal(bytes, 1200);
});

test('failed upload without progress does not fabricate a speed', async () => {
  globalThis.XMLHttpRequest = FakeXHR;
  let bytes = 0;
  const upload = xhrUpload(new Uint8Array(2_000_000), delta => bytes += delta);
  FakeXHR.latest.onerror();
  assert.equal(await upload.promise, false);
  assert.equal(bytes, 0);
});

test('successful upload accounts for the remainder only once', async () => {
  globalThis.XMLHttpRequest = FakeXHR;
  let bytes = 0;
  const upload = xhrUpload(new Uint8Array(2000), delta => bytes += delta);
  FakeXHR.latest.upload.onprogress({ loaded: 500 });
  FakeXHR.latest.status = 200;
  FakeXHR.latest.onload();
  assert.equal(await upload.promise, true);
  assert.equal(bytes, 2000);
});
