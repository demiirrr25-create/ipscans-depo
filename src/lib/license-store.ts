import { get, put } from "@vercel/blob";
import { createHash, randomBytes, timingSafeEqual } from "crypto";

/**
 * Server-only persistence for ipscans Network Health Pro licenses and
 * multi-site sync data — backed by Vercel Blob (private access).
 *
 * Blob pathnames are derived by hashing the normalized email, never from
 * raw user input, so there is no path-traversal / arbitrary-blob-write
 * surface from request bodies.
 */

export type Plan = "PRO" | "BUSINESS" | "ENTERPRISE";
export type LicenseStatusValue = "TRIAL" | "ACTIVE" | "EXPIRED";

export type LicenseRecord = {
  email: string;
  key: string;
  plan: Plan;
  status: LicenseStatusValue;
  createdAt: string;
  expiresAt: string;
};

export type SiteSummary = {
  name: string;
  deviceCount: number;
  onlineCount: number;
  offlineCount: number;
  conflictCount: number;
  healthScore: number;
  lastSyncedAt: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const TRIAL_DAYS = 30;

export function isValidEmail(email: unknown): email is string {
  return (
    typeof email === "string" &&
    email.length > 0 &&
    email.length <= MAX_EMAIL_LENGTH &&
    EMAIL_RE.test(email)
  );
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function emailHash(email: string): string {
  return createHash("sha256").update(normalizeEmail(email)).digest("hex");
}

function licensePath(email: string): string {
  return `licenses/${emailHash(email)}.json`;
}

function sitesPath(email: string): string {
  return `sites/${emailHash(email)}.json`;
}

export function generateLicenseKey(): string {
  // "IPS-XXXXXXXX-XXXXXXXX", uppercase hex — easy to read/type, not
  // guessable (64 bits of entropy from crypto.randomBytes).
  const part = () => randomBytes(4).toString("hex").toUpperCase();
  return `IPS-${part()}-${part()}`;
}

/** Constant-time comparison — avoids leaking key length/prefix via timing. */
export function keysMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

async function readJson<T>(path: string): Promise<T | null> {
  const result = await get(path, { access: "private", useCache: false });
  if (!result) return null;
  const text = await new Response(result.stream).text();
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function writeJson(path: string, data: unknown): Promise<void> {
  await put(path, JSON.stringify(data), {
    access: "private",
    contentType: "application/json",
    allowOverwrite: true,
  });
}

export async function getLicense(email: string): Promise<LicenseRecord | null> {
  return readJson<LicenseRecord>(licensePath(email));
}

/**
 * Idempotent: an email that already has a (possibly expired) license gets
 * that same record back rather than a fresh trial window every call — this
 * is the only abuse guard Phase 1 has, since there's no payment yet to gate
 * on. Real paid activation (Stripe) will replace this in Phase 2.2.
 */
export async function getOrCreateTrialLicense(email: string): Promise<LicenseRecord> {
  const existing = await getLicense(email);
  if (existing) return existing;

  const now = new Date();
  const expires = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const record: LicenseRecord = {
    email: normalizeEmail(email),
    key: generateLicenseKey(),
    plan: "PRO",
    status: "TRIAL",
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  };
  await writeJson(licensePath(email), record);
  return record;
}

export function effectiveStatus(record: LicenseRecord): LicenseStatusValue {
  if (record.status === "EXPIRED") return "EXPIRED";
  return new Date(record.expiresAt).getTime() < Date.now() ? "EXPIRED" : record.status;
}

export async function getSites(email: string): Promise<SiteSummary[]> {
  return (await readJson<SiteSummary[]>(sitesPath(email))) ?? [];
}

export async function upsertSite(email: string, site: SiteSummary): Promise<SiteSummary[]> {
  const sites = await getSites(email);
  const index = sites.findIndex((s) => s.name === site.name);
  if (index >= 0) sites[index] = site;
  else sites.push(site);
  await writeJson(sitesPath(email), sites);
  return sites;
}
