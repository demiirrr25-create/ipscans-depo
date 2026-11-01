import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function resolveRustScannerBinary(): string | null {
  const candidates = [
    path.join(process.cwd(), "target", "release", "ipscans-network-scanner.exe"),
    path.join(process.cwd(), "dist", "ipscans-network-scanner.exe"),
    path.join(process.cwd(), "tools", "scanner", "ipscans-network-scanner.exe"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(/*turbopackIgnore: true*/ candidate)) {
      return candidate;
    }
  }
  return null;
}

export async function runRustPortScan(
  host: string,
  ports: number[]
): Promise<{ port: number; service: string; status: string; latencyMs: number }[] | null> {
  const bin = resolveRustScannerBinary();
  if (!bin) return null;
  try {
    const { stdout } = await execFileAsync(
      bin,
      ["--ports", host, ports.join(",")],
      { timeout: 6000, windowsHide: true }
    );
    const parsed = JSON.parse(stdout.trim());
    if (Array.isArray(parsed?.results)) {
      return parsed.results;
    }
  } catch {
    // Fallback to Node socket probe when serverless or timed out
  }
  return null;
}

export async function runRustSentinelIncident(prompt: string): Promise<Record<string, unknown> | null> {
  const bin = resolveRustScannerBinary();
  if (!bin) return null;
  try {
    const { stdout } = await execFileAsync(
      bin,
      ["--incident", prompt],
      { timeout: 18000, windowsHide: true }
    );
    return JSON.parse(stdout.trim());
  } catch {
    return null;
  }
}
