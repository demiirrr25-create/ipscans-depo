import test from 'node:test';
import assert from 'node:assert/strict';
import {
  median,
  minLatency,
  jitter,
  variation,
  bytesToMbps,
  getBufferbloatGrade,
  analyzeStability,
  evaluateActivities,
  parseCloudflareTrace,
  resolveColoLocation,
  runSpeedTest,
} from '../src/lib/speed-engine.ts';
import { locales } from '../src/i18n/config.ts';
import { speedTestCopy } from '../src/components/speedtest/copy.ts';

test('latency statistics use actual samples and unavailable values stay null', () => {
  assert.equal(median([]), null);
  assert.equal(median([4, 1, 2, 3]), 2.5);
  assert.equal(median([12, 8, 20]), 12);

  assert.equal(minLatency([]), null);
  assert.equal(minLatency([18, 9.5, 14, 11]), 9.5);

  assert.equal(jitter([10]), null);
  assert.equal(jitter([10, 20, 15]), 7.5);

  assert.equal(variation([1, 1]), null);
  assert.equal(variation([10, 10, 10, 10]), 0);
  const cv = variation([80, 100, 120, 100]);
  assert.ok(cv !== null && cv > 14 && cv < 15);
});

test('bytesToMbps converts byte counts and millisecond windows to decimal Mbps (bits / 1e6 / s)', () => {
  assert.equal(bytesToMbps(0, 1000), 0);
  assert.equal(bytesToMbps(1_000_000, 0), 0);
  assert.equal(bytesToMbps(-500, 1000), 0);
  // 1,000,000 bytes in 1.0s = 8,000,000 bits/s = 8 Mbps
  assert.equal(bytesToMbps(1_000_000, 1000), 8);
  // 12,500,000 bytes in 1.0s = 100 Mbps
  assert.equal(bytesToMbps(12_500_000, 1000), 100);
});

test('stability and bufferbloat grading reflect real sample variance and latency delta', () => {
  assert.equal(getBufferbloatGrade(null), null);
  assert.equal(getBufferbloatGrade(3), 'A+');
  assert.equal(getBufferbloatGrade(12), 'A');
  assert.equal(getBufferbloatGrade(25), 'B');
  assert.equal(getBufferbloatGrade(50), 'C');
  assert.equal(getBufferbloatGrade(90), 'D');
  assert.equal(getBufferbloatGrade(180), 'F');

  const unknown = analyzeStability(null, null, null);
  assert.equal(unknown.rating, 'unknown');
  assert.equal(unknown.score, null);

  const excellent = analyzeStability(4.5, 1.2, 4);
  assert.equal(excellent.rating, 'excellent');
  assert.ok(excellent.score !== null && excellent.score >= 85);
  assert.equal(excellent.bufferbloatGrade, 'A+');

  const poor = analyzeStability(48, 25, 140);
  assert.equal(poor.rating, 'poor');
  assert.ok(poor.score !== null && poor.score < 50);
  assert.equal(poor.bufferbloatGrade, 'F');
});

test('activity suitability evaluates real download, upload, ping and jitter thresholds', () => {
  const fiber = evaluateActivities(250, 100, 10, 1.5);
  assert.equal(fiber.length, 4);
  assert.ok(fiber.every((a) => a.rating === 'optimal'));

  const constrained = evaluateActivities(12, 4, 85, 25);
  assert.equal(constrained.find((a) => a.id === 'streaming4k')?.rating, 'limited');
  assert.equal(constrained.find((a) => a.id === 'gaming')?.rating, 'limited');
  assert.equal(constrained.find((a) => a.id === 'videoCalls')?.rating, 'good');
  assert.equal(constrained.find((a) => a.id === 'cloudBackup')?.rating, 'limited');
});

test('Cloudflare trace parser and IATA colo resolver extract real edge metadata without fabrication', () => {
  const parsed = parseCloudflareTrace('fl=982f14\nip=78.180.213.195\ncolo=IST\nloc=TR\ntls=TLSv1.3\n');
  assert.equal(parsed.ip, '78.180.213.195');
  assert.equal(parsed.colo, 'IST');
  assert.equal(parsed.loc, 'TR');
  assert.equal(parsed.tls, 'TLSv1.3');

  assert.equal(resolveColoLocation('IST'), 'Istanbul, TR');
  assert.equal(resolveColoLocation('fra'), 'Frankfurt, DE');
  assert.equal(resolveColoLocation('UNKNOWN_CODE'), null);
  assert.equal(resolveColoLocation(null), null);
});

test('cancelled speed test performs no transfer and never returns fabricated measurements', async () => {
  const c = new AbortController();
  c.abort();
  await assert.rejects(runSpeedTest(c.signal, () => {}), { name: 'AbortError' });
});

test('runSpeedTest measures streaming download and XHR upload across warm-up and steady-state windows', async () => {
  const origFetch = globalThis.fetch;
  const origXHR = globalThis.XMLHttpRequest;

  globalThis.fetch = async (url, init) => {
    init?.signal?.throwIfAborted?.();
    const u = String(url);
    if (u.includes('/ping')) {
      return new Response(new Uint8Array(0), { status: 200 });
    }
    if (u.includes('/download')) {
      let pulls = 0;
      const chunk = new Uint8Array(65536);
      const stream = new ReadableStream({
        async pull(controller) {
          if (init?.signal?.aborted || pulls >= 6) {
            controller.close();
            return;
          }
          pulls++;
          await new Promise((r) => setTimeout(r, 15));
          if (init?.signal?.aborted) {
            controller.close();
            return;
          }
          controller.enqueue(chunk);
        },
      });
      return new Response(stream, { status: 200 });
    }
    throw new Error('Unexpected URL: ' + u);
  };

  class MockUploadXHR {
    upload = {};
    status = 200;
    #timer = null;
    open() {}
    send(body) {
      const size = body?.byteLength ?? 250_000;
      const half = Math.floor(size / 2);
      this.#timer = setTimeout(() => {
        this.upload.onprogress?.({ loaded: half });
        this.#timer = setTimeout(() => {
          this.upload.onprogress?.({ loaded: size });
          this.onload?.();
        }, 15);
      }, 15);
    }
    abort() {
      if (this.#timer) clearTimeout(this.#timer);
      this.onabort?.();
    }
  }
  globalThis.XMLHttpRequest = MockUploadXHR;

  try {
    const phases = new Set();
    const ac = new AbortController();
    const result = await runSpeedTest(
      ac.signal,
      (u) => {
        phases.add(u.phase);
      },
      {
        warmupMs: 40,
        durationMs: 280,
        pingSamples: 4,
        pingIntervalMs: 5,
        workers: 2,
        endpoints: {
          ping: 'http://test.local/ping',
          download: 'http://test.local/download',
          upload: 'http://test.local/upload',
        },
      }
    );

    assert.ok(phases.has('latency'));
    assert.ok(phases.has('download'));
    assert.ok(phases.has('upload'));
    assert.ok(result.download > 0);
    assert.ok(result.upload > 0);
    assert.ok(result.idle >= 0);
    assert.ok(result.minPing <= result.idle);
    assert.ok(result.bytes > 0);
    assert.ok(result.downloadBytes > 0);
    assert.ok(result.uploadBytes > 0);
  } finally {
    globalThis.fetch = origFetch;
    globalThis.XMLHttpRequest = origXHR;
  }
});

test('all 14 locales have complete speedTestCopy translations', () => {
  for (const locale of locales) {
    const copy = speedTestCopy[locale];
    assert.ok(copy, `Missing speedTestCopy for ${locale}`);
    assert.ok(copy.eyebrow.trim(), `${locale}: eyebrow`);
    assert.ok(copy.stop.trim(), `${locale}: stop`);
    assert.ok(copy.retry.trim(), `${locale}: retry`);
    assert.equal(copy.methodology.items.length, 3, `${locale}: methodology items`);
    for (const key of ['streaming4k', 'gaming', 'videoCalls', 'cloudBackup']) {
      assert.ok(copy.results.activities[key].title.trim(), `${locale}: activity ${key}`);
      assert.ok(copy.results.activities[key].desc.trim(), `${locale}: activity desc ${key}`);
    }
  }
});
