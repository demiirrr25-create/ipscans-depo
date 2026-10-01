import type { Locale } from "@/i18n/config";
import { ipcastRelease, platformCopy } from "@/content/applications";

export function IPCastReleaseDetails({ locale }: { locale: Locale }) {
  const copy = platformCopy[locale];
  return (
    <dl className="mt-6 space-y-3 rounded-xl border border-white/15 bg-white/[0.03] p-4 text-sm">
      <div className="flex flex-wrap justify-between gap-2"><dt className="text-neutral-400">{copy.version}</dt><dd className="text-white">{ipcastRelease.version} · {copy.preview}</dd></div>
      <div className="flex flex-wrap justify-between gap-2"><dt className="text-neutral-400">{copy.platform}</dt><dd className="text-white">{ipcastRelease.platform}</dd></div>
      <div className="flex flex-wrap justify-between gap-2"><dt className="text-neutral-400">{copy.size}</dt><dd className="text-white">{(ipcastRelease.bytes / 1024 / 1024).toFixed(1)} MiB</dd></div>
      <div><dt className="text-neutral-400">{copy.checksum}</dt><dd className="mt-1 break-all font-mono text-xs text-white">{ipcastRelease.sha256}</dd></div>
    </dl>
  );
}
