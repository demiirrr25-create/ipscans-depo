"use client";

import { useState } from "react";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { useCart } from "@/context/CartContext";

const TIME_SLOTS = ["10:00", "12:00", "14:00", "16:00", "18:00"];

function nextDays(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return d.toISOString().slice(0, 10);
  });
}

export function CartView({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const { items, removeItem, updateBooking, totalPrice, clear } = useCart();
  const [placing, setPlacing] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const days = nextDays(7);

  const hasInstall = items.some((i) => i.installOption !== "none");

  async function checkout() {
    setPlacing(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      setOrderId(data.orderId);
      clear();
    } finally {
      setPlacing(false);
    }
  }

  if (orderId) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-[#00F5A0]/30 bg-[#00F5A0]/5 p-8 text-center">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">
          {dict.cart.orderSuccessTitle}
        </h2>
        <p className="mt-3 text-neutral-300">
          {dict.cart.orderSuccessBody}{" "}
          <span className="font-mono text-[#00F5A0]">{orderId}</span>
        </p>
        <p className="mt-2 text-sm text-neutral-500">
          {dict.cart.orderSuccessNote}
        </p>
        <Link
          href={`/${locale}/shop`}
          className="btn-primary mt-6 inline-block rounded-xl px-6 py-3 font-semibold"
        >
          {dict.shop.backToShop}
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center">
        <p className="text-neutral-400">{dict.cart.empty}</p>
        <Link
          href={`/${locale}/shop`}
          className="btn-primary mt-6 inline-block rounded-xl px-6 py-3 font-semibold"
        >
          {dict.cart.continueShopping}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-white">{item.name}</h3>
                <p className="mt-1 text-sm text-neutral-400">
                  {dict.cart.installLabel}:{" "}
                  {dict.shop.installOptions[item.installOption].label}
                </p>
              </div>
              <div className="text-right">
                <div className="font-mono font-semibold text-white">
                  {(
                    (item.unitPrice + item.installPrice) *
                    item.qty
                  ).toLocaleString(locale === "tr" ? "tr-TR" : "en-US")}
                  ₺
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  className="mt-2 text-xs text-neutral-500 hover:text-red-300"
                >
                  {dict.cart.remove}
                </button>
              </div>
            </div>

            {item.installOption !== "none" && (
              <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-3">
                <div>
                  <label className="text-xs text-neutral-500">
                    {dict.cart.dateLabel}
                  </label>
                  <select
                    value={item.bookingDate ?? ""}
                    onChange={(e) =>
                      updateBooking(item.id, { bookingDate: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                  >
                    <option value="">—</option>
                    {days.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-neutral-500">
                    {dict.cart.timeLabel}
                  </label>
                  <select
                    value={item.bookingTime ?? ""}
                    onChange={(e) =>
                      updateBooking(item.id, { bookingTime: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                  >
                    <option value="">—</option>
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-1">
                  <label className="text-xs text-neutral-500">
                    {dict.cart.addressLabel}
                  </label>
                  <input
                    value={item.address ?? ""}
                    onChange={(e) =>
                      updateBooking(item.id, { address: e.target.value })
                    }
                    placeholder={dict.cart.addressPlaceholder}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <span className="text-neutral-400">{dict.cart.total}</span>
        <span className="font-mono text-2xl font-bold text-white">
          {totalPrice.toLocaleString(locale === "tr" ? "tr-TR" : "en-US")}₺
        </span>
      </div>

      {hasInstall && (
        <p className="mt-3 text-xs text-amber-300/80">
          {dict.cart.bookingTitle}: {dict.cart.dateLabel}/{dict.cart.timeLabel}
        </p>
      )}

      <button
        onClick={checkout}
        disabled={placing}
        className="btn-primary mt-6 w-full rounded-xl px-6 py-3 font-semibold disabled:opacity-60"
      >
        {placing ? dict.cart.placingOrder : dict.cart.checkout}
      </button>
    </div>
  );
}
