import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const names = ["IPscans-Plus.exe", "IPscans-Plus-Setup.exe"];

export function createReleaseBundle(directory, checksumsPath, { version, commit, runId }) {
  if (!/^\d+\.\d+\.\d+$/.test(version) || !/^[a-f0-9]{40}$/.test(commit) || !/^\d+$/.test(runId)) {
    throw new Error("A stable version, full verified commit and Windows CI run ID are required.");
  }
  const checksums = JSON.parse(readFileSync(checksumsPath, "utf8").replace(/^\uFEFF/, ""));
  if (!Array.isArray(checksums) || checksums.length !== names.length) {
    throw new Error("Both Windows CI artifact checksums are required.");
  }
  const assets = names.map((name) => {
    const data = readFileSync(path.join(directory, name));
    const sha256 = createHash("sha256").update(data).digest("hex");
    const expected = checksums.find((entry) =>
      typeof entry.Path === "string" && path.win32.basename(entry.Path) === name);
    if (typeof expected?.Hash !== "string" || sha256 !== expected.Hash.toLowerCase()) {
      throw new Error(`Downloaded artifact does not match Windows CI: ${name}`);
    }
    if (data.length < 70 || data[0] !== 0x4d || data[1] !== 0x5a) {
      throw new Error(`Not a Windows executable: ${name}`);
    }
    const pe = data.readUInt32LE(0x3c);
    if (pe + 6 > data.length || data.toString("binary", pe, pe + 4) !== "PE\0\0") {
      throw new Error(`Invalid Windows PE header: ${name}`);
    }
    if (name === "IPscans-Plus.exe" && data.readUInt16LE(pe + 4) !== 0x8664) {
      throw new Error("The portable executable must target Windows x64.");
    }
    return { name, size: data.length, sha256 };
  });
  return {
    product: "IPscans+",
    version,
    commit,
    platform: "Windows 10/11 x64",
    buildRun: `https://github.com/demiirrr25-create/ipscans-depo/actions/runs/${runId}`,
    signed: false,
    validation: "Automated Windows tests, packaged/installed smoke tests, benchmark and installer checks",
    physicalDeviceValidation: "Not performed; real-device interoperability and network accuracy are unmeasured",
    assets,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({
    options: {
      directory: { type: "string" }, checksums: { type: "string" },
      version: { type: "string" }, commit: { type: "string" }, run: { type: "string" },
    },
  });
  if (!values.directory || !values.checksums) {
    throw new Error("--directory and --checksums are required.");
  }
  const manifest = createReleaseBundle(values.directory, values.checksums, {
    version: values.version, commit: values.commit, runId: values.run,
  });
  for (const asset of manifest.assets) {
    writeFileSync(path.join(values.directory, `${asset.name}.sha256`), `${asset.sha256}  ${asset.name}\n`);
  }
  writeFileSync(path.join(values.directory, "release.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify(manifest, null, 2));
}
