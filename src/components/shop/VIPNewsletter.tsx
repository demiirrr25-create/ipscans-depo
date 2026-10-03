"use client";

import { useState } from "react";

interface VIPNewsletterProps {
  dict: {
    newsletterTitle: string;
    newsletterSubtitle: string;
    emailPlaceholder: string;
    subscribeBtn: string;
    successMsg: string;
  };
}

export function VIPNewsletter({ dict }: VIPNewsletterProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <section className="relative my-16 mx-auto max-w-4xl overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 p-8 sm:p-12 text-center shadow-2xl">
      <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />

      <div className="relative z-10 max-w-2xl mx-auto">
        <span className="inline-block px-3 py-1 mb-4 text-[11px] uppercase tracking-widest text-amber-300 font-semibold border border-amber-500/30 rounded-full bg-amber-500/10">
          VIP Early Access
        </span>

        <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-4xl font-bold text-white tracking-tight">
          {dict.newsletterTitle}
        </h2>

        <p className="mt-3 text-sm sm:text-base text-neutral-300 leading-relaxed">
          {dict.newsletterSubtitle}
        </p>

        {submitted ? (
          <div className="mt-8 p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-sm font-medium animate-fade-in">
            ✓ {dict.successMsg}
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mt-8 flex flex-col sm:flex-row items-center gap-3"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={dict.emailPlaceholder}
              className="w-full sm:flex-1 px-5 py-3.5 rounded-xl border border-white/15 bg-white/5 text-white placeholder-neutral-400 focus:outline-none focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/80 text-sm transition"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-sm tracking-wide shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "..." : dict.subscribeBtn}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
