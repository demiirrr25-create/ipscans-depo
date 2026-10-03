const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const publish = require('./publish-ipcast-release.cjs');

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ipcast-release-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const data = Buffer.from('MZ-test-artifact');
  const assets = ['IPCast-2.1.0.exe', 'IPCast-2.1.0-Setup.exe'].map(name => {
    fs.writeFileSync(path.join(directory, name), data);
    return { name, size: data.length, sha256: crypto.createHash('sha256').update(data).digest('hex') };
  });
  fs.writeFileSync(path.join(directory, 'release.json'), JSON.stringify({
    version: '2.1.0', commit: 'verified-commit', signed: false, assets
  }));
  const calls = [];
  const repos = {
    getReleaseByTag: async () => { throw Object.assign(new Error('missing'), { status: 404 }); },
    createRelease: async args => { calls.push(['create', args]); return { data: { id: 1 } }; },
    listReleaseAssets: () => {},
    deleteReleaseAsset: async () => { throw new Error('Published assets must not be deleted'); },
    uploadReleaseAsset: async args => { calls.push(['upload', args.name]); return { data: { size: args.data.length, state: 'uploaded' } }; },
    updateRelease: async args => { calls.push(['publish', args]); return { data: { html_url: 'https://example.invalid/release' } }; }
  };
  return { directory, calls, repos, args: {
    github: { rest: { repos, git: { getRef: async () => { throw Object.assign(new Error('missing'), { status: 404 }); } } }, paginate: async () => [] },
    context: { sha: 'verified-commit', repo: { owner: 'owner', repo: 'repo' } },
    core: { notice() {} }, directory
  } };
}

test('publishes only after both verified binaries and metadata finish uploading', async t => {
  const f = fixture(t);
  await publish(f.args);
  assert.equal(f.calls[0][0], 'create');
  assert.equal(f.calls[0][1].draft, true);
  assert.equal(f.calls.filter(call => call[0] === 'upload').length, 5);
  assert.equal(f.calls.at(-1)[0], 'publish');
});

test('tampered binary causes zero remote changes', async t => {
  const f = fixture(t);
  fs.appendFileSync(path.join(f.directory, 'IPCast-2.1.0.exe'), 'tampered');
  await assert.rejects(publish(f.args), /validation failed/);
  assert.deepEqual(f.calls, []);
});

test('failed upload leaves the release unpublished', async t => {
  const f = fixture(t);
  f.repos.uploadReleaseAsset = async () => { throw new Error('network interrupted'); };
  await assert.rejects(publish(f.args), /network interrupted/);
  assert.equal(f.calls.some(call => call[0] === 'publish'), false);
});

test('refuses to modify an already published version', async t => {
  const f = fixture(t);
  f.repos.getReleaseByTag = async () => ({ data: { id: 9, draft: false } });
  await assert.rejects(publish(f.args), /already published/);
  assert.deepEqual(f.calls, []);
});
