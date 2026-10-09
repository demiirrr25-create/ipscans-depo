import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createReleaseBundle } from "./scanner-release.mjs";
import { desktopRelease, scannerApplication } from "../src/content/applications.ts";
import { scannerCopy } from "../src/content/scanner.ts";
import { locales } from "../src/i18n/config.ts";

const metadata = { version: "3.0.0", commit: "a".repeat(40), runId: "12345" };

function fixture(t) {
  const directory = mkdtempSync(path.join(os.tmpdir(), "ipscans-release-"));
  t.after(() => rmSync(directory, { recursive: true }));
  const checksums = ["IPscans-Plus.exe", "IPscans-Plus-Setup.exe"].map((name) => {
    const data = Buffer.alloc(100);
    data.write("MZ");
    data.writeUInt32LE(64, 0x3c);
    data.write("PE\0\0", 64, "binary");
    data.writeUInt16LE(name.endsWith("-Setup.exe") ? 0x14c : 0x8664, 68);
    writeFileSync(path.join(directory, name), data);
    return { Path: `D:\\build\\${name}`, Hash: createHash("sha256").update(data).digest("hex").toUpperCase() };
  });
  const checksumsPath = path.join(directory, "checksums.json");
  writeFileSync(checksumsPath, JSON.stringify(checksums));
  return { directory, checksumsPath };
}

test("release bundle matches both Windows CI checksums and records validation limits", (t) => {
  const { directory, checksumsPath } = fixture(t);
  const bundle = createReleaseBundle(directory, checksumsPath, metadata);
  assert.equal(bundle.assets.length, 2);
  assert.equal(bundle.commit, metadata.commit);
  assert.equal(bundle.signed, false);
  assert.match(bundle.physicalDeviceValidation, /Not performed/);
  assert.equal(bundle.assets[0].size, 100);
});

test("tampered or missing binaries cannot be prepared for publication", (t) => {
  const { directory, checksumsPath } = fixture(t);
  writeFileSync(path.join(directory, "IPscans-Plus.exe"), "tampered");
  assert.throws(() => createReleaseBundle(directory, checksumsPath, metadata), /does not match Windows CI/);
});

test("release metadata must identify the tested stable version and commit", (t) => {
  const { directory, checksumsPath } = fixture(t);
  assert.throws(() => createReleaseBundle(directory, checksumsPath, { ...metadata, commit: "main" }), /verified commit/);
  assert.throws(() => createReleaseBundle(directory, checksumsPath, { ...metadata, version: "3.0.0-preview" }), /stable version/);
});

test("catalog and legacy redirect use the same versioned scanner release", () => {
  const scanner = desktopRelease.scanner;
  assert.equal(scannerApplication.version, scanner.version);
  assert.equal(scannerApplication.downloadUrl, scanner.installerUrl);
  assert.equal(scannerApplication.portableUrl, scanner.portableUrl);
  for (const url of [scanner.installerUrl, scanner.portableUrl, scanner.releaseUrl]) {
    assert.equal(new URL(url).protocol, "https:");
    assert.ok(url.includes(`ipscans-plus-v${scanner.version}`));
  }
  assert.match(scanner.installerSha256, /^[a-f0-9]{64}$/);
  assert.match(scanner.portableSha256, /^[a-f0-9]{64}$/);
  assert.ok(scanner.installerBytes > 0 && scanner.portableBytes > 0);
  const redirect = readFileSync(new URL("../src/app/downloads/ipscans-network-scanner.exe/route.ts", import.meta.url), "utf8");
  assert.match(redirect, /desktopRelease\.scanner\.installerUrl/);
});

test("every website locale has actual features and explicit discovery limitations", () => {
  assert.deepEqual(Object.keys(scannerCopy).sort(), [...locales].sort());
  for (const locale of locales) {
    const copy = scannerCopy[locale];
    assert.equal(copy.features.length, 8);
    assert.ok(copy.features.every((feature) => feature.length > 30));
    assert.ok(copy.limitations.length > 100);
    assert.ok(copy.mapIntro.length > 60);
    assert.ok(copy.releaseNotes.length > 5);
    assert.ok(!scannerApplication.description[locale].includes("IP TREE"));
  }
});
