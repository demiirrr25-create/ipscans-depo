/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS entry point loaded by actions/github-script. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function readBundle(directory, commit) {
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'release.json'), 'utf8'));
  if (!/^\d+\.\d+\.\d+$/.test(manifest.version) || manifest.commit !== commit || manifest.signed !== false)
    throw new Error('Release metadata does not match this verified build.');
  const names = [`IPCast-${manifest.version}.exe`, `IPCast-${manifest.version}-Setup.exe`];
  if (!Array.isArray(manifest.assets) || manifest.assets.length !== names.length)
    throw new Error('Both portable and installer artifacts are required.');
  const files = [];
  for (const name of names) {
    const asset = manifest.assets.find(item => item.name === name);
    if (!asset) throw new Error(`Missing artifact metadata: ${name}`);
    const data = fs.readFileSync(path.join(directory, name));
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    if (hash !== asset.sha256 || data.length !== asset.size || data.length < 2 ||
        data[0] !== 0x4d || data[1] !== 0x5a)
      throw new Error(`Artifact validation failed: ${name}`);
    files.push({ name, data, type: 'application/octet-stream' });
    files.push({ name: name + '.sha256', data: Buffer.from(`${hash}  ${name}\n`), type: 'text/plain' });
  }
  files.push({ name: 'release.json', data: Buffer.from(JSON.stringify(manifest, null, 2) + '\n'), type: 'application/json' });
  return { manifest, files };
}

async function publish({ github, context, core, directory = 'release' }) {
  // Validate the entire bundle before making any remote changes.
  const { manifest, files } = readBundle(directory, context.sha);
  const { owner, repo } = context.repo;
  const tag = `ipcast-v${manifest.version}`;
  try {
    const ref = (await github.rest.git.getRef({ owner, repo, ref: 'tags/' + tag })).data;
    if (ref.object.type !== 'commit' || ref.object.sha !== context.sha)
      throw new Error('Release tag does not point to this verified commit.');
  } catch (error) {
    if (error.status !== 404) throw error;
  }
  let release;
  try {
    release = (await github.rest.repos.getReleaseByTag({ owner, repo, tag })).data;
    if (!release.draft) throw new Error(`Version ${manifest.version} is already published. Increase the project version.`);
    if (release.target_commitish !== context.sha) throw new Error('Existing draft belongs to another commit.');
  } catch (error) {
    if (error.status !== 404) throw error;
  }
  const body = [
    `IPCast ${manifest.version} — Windows x64`,
    '',
    'Portable executable and installer built and tested from commit ' + context.sha + '.',
    'These binaries are unsigned. SHA-256 verifies file integrity; it does not authenticate the publisher.',
    'Windows 10/11 testing on two physical devices was waived and was not performed.',
    '',
    'What is new:',
    '- Resumable shared-folder file manager, permission profiles, chat, LAN discovery and Wake-on-LAN.',
    '- Multi-monitor viewing, adaptive JPEG quality, fullscreen, Unicode input and viewer annotations.',
    '- Visible AVI recording, Windows system audio with opt-in consent, and forward/reverse TCP tunnels.',
    '- Device information, owner-confirmed restart, reconnect attempts, tray controls and diagnostic export.',
    '- Update checks verify GitHub asset SHA-256 before opening the installer; binaries remain unsigned.',
    '',
    'Limits: signed-in Windows desktop only; Ctrl+Alt+Del/UAC secure-desktop control, privacy-screen driver and virtual-printer redirection are unavailable.',
    'Annotations are viewer-local. Recording stops at resolution changes or 1.8 GB. Audio/recording are off until allowed.',
    'Reconnect uses a new authenticated session and asks for fresh consent. Audio hardware and cross-network physical-device tests were not performed.',
    '',
    ...manifest.assets.map(asset => `- ${asset.name}: ${asset.size} bytes; SHA-256 ${asset.sha256}`)
  ].join('\n');
  if (!release) {
    release = (await github.rest.repos.createRelease({
      owner, repo, tag_name: tag, target_commitish: context.sha,
      name: `IPCast ${manifest.version}`, body, draft: true, prerelease: false
    })).data;
  }
  // A failed upload leaves an unpublished draft. Retrying replaces only that draft's assets.
  const existing = await github.paginate(github.rest.repos.listReleaseAssets, { owner, repo, release_id: release.id });
  for (const file of files) {
    for (const asset of existing.filter(item => item.name === file.name)) {
      await github.rest.repos.deleteReleaseAsset({ owner, repo, asset_id: asset.id });
    }
    const uploaded = (await github.rest.repos.uploadReleaseAsset({
      owner, repo, release_id: release.id, name: file.name, data: file.data,
      headers: { 'content-type': file.type, 'content-length': file.data.length }
    })).data;
    if (uploaded.size !== file.data.length || uploaded.state !== 'uploaded')
      throw new Error(`Incomplete upload: ${file.name}`);
    const expectedDigest = 'sha256:' + crypto.createHash('sha256').update(file.data).digest('hex');
    if (uploaded.digest && uploaded.digest !== expectedDigest)
      throw new Error(`Remote checksum mismatch: ${file.name}`);
  }
  const published = (await github.rest.repos.updateRelease({
    owner, repo, release_id: release.id, body, draft: false, make_latest: 'false'
  })).data;
  core.notice('Versioned release ready: ' + published.html_url);
}

module.exports = publish;
module.exports.readBundle = readBundle;
