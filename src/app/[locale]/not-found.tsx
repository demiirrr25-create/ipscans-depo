"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { isLocale } from "@/i18n/config";

export default function NotFound() {
  const { locale: segment } = useParams<{ locale: string }>();
  const locale = isLocale(segment) ? segment : "en";
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-6xl flex-col justify-center px-4 py-20">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-neutral-400">IPSCANS / SIGNAL LOST</p>
      <h1 className="mt-6 font-[family-name:var(--font-display)] text-[clamp(6rem,23vw,16rem)] font-semibold leading-none tracking-[-0.1em]">404<span className="text-neutral-500">.</span></h1>
      <p className="mt-6 max-w-lg text-lg text-neutral-300">This address is not available. Return to the network or find another tool.</p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href={`/${locale}`} className="btn-primary inline-flex min-h-12 items-center rounded-lg px-6 font-semibold">Go home ↗</Link>
        <Link href={`/${locale}/download`} className="btn-ghost inline-flex min-h-12 items-center rounded-lg px-6">Explore tools ↗</Link>
      </div>
    </div>
  );
}
