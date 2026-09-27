import { NextRequest, NextResponse } from "next/server";
import { effectiveStatus, getSites, listAllLicenses } from "@/lib/license-store";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Weekly summary report (spec item 24) — triggered by Vercel Cron (see
 * vercel.json). For every active license with at least one synced site,
 * emails a compact weekly summary (device/online/offline/conflict counts,
 * health score per site).
 *
 * Actually SENDING email requires a provider — set RESEND_API_KEY and
 * REPORTS_FROM_EMAIL to enable it. Until then this runs in "dry run" mode:
 * it still does all the work of gathering the data and returns what WOULD
 * have been sent, which is useful for verifying the logic without needing
 * real credentials yet.
 */

type ReportRow = {
  email: string;
  sitesReported: number;
  wouldSend: boolean;
  subject: string;
  body: string;
};

function buildEmailBody(sites: Awaited<ReturnType<typeof getSites>>): string {
  const lines = ["Weekly Network Health Report", ""];
  for (const site of sites) {
    lines.push(
      `${site.name}: ${site.deviceCount} devices, ${site.onlineCount} online, ` +
        `${site.offlineCount} offline, ${site.conflictCount} conflict(s), ` +
        `Health Score ${site.healthScore}% (last synced ${site.lastSyncedAt})`
    );
  }
  return lines.join("\n");
}

async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.REPORTS_FROM_EMAIL;
  if (!apiKey || !from) return false;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, text }),
  });
  return res.ok;
}

export async function GET(request: NextRequest) {
  // Vercel Cron calls this with an Authorization header matching CRON_SECRET
  // when that env var is set — reject anything else so this can't be
  // triggered by an arbitrary public GET.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const licenses = await listAllLicenses();
    const rows: ReportRow[] = [];

    for (const license of licenses) {
      if (effectiveStatus(license) === "EXPIRED") continue;
      const sites = await getSites(license.email);
      if (sites.length === 0) continue;

      const subject = `Weekly Network Health Report — ${sites.length} site(s)`;
      const body = buildEmailBody(sites);
      const sent = await sendEmail(license.email, subject, body);
      rows.push({ email: license.email, sitesReported: sites.length, wouldSend: sent, subject, body });
    }

    const emailConfigured = Boolean(process.env.RESEND_API_KEY && process.env.REPORTS_FROM_EMAIL);
    return NextResponse.json({
      emailConfigured,
      note: emailConfigured
        ? "Emails sent via Resend."
        : "Dry run — set RESEND_API_KEY and REPORTS_FROM_EMAIL to actually send these.",
      reports: rows,
    });
  } catch {
    return NextResponse.json({ error: "Report generation failed" }, { status: 502 });
  }
}
