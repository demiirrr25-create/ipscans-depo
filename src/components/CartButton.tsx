"use client";

import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { useCart } from "@/context/CartContext";

export function CartButton({ locale }: { locale: Locale }) {
  const { totalCount } = useCart();
  return (
    <Link
      href={`/${locale}/cart`}
      aria-label="Cart"
      className="relative rounded-lg p-2 text-neutral-300 transition hover:bg-white/5 hover:text-white"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
      {totalCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-black">
          {totalCount}
        </span>
      )}
    </Link>
  );
}
