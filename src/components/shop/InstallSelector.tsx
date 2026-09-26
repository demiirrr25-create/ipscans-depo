"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import type { InstallOption } from "@/content/products";
import type { Locale } from "@/i18n/config";

type InstallDict = { label: string; desc: string; price: string };

export function InstallSelector({
  locale,
  productSlug,
  productName,
  price,
  installTitle,
  installOptions,
  addToCartLabel,
  addedLabel,
  goToCartLabel,
}: {
  locale: Locale;
  productSlug: string;
  productName: string;
  price: number;
  installTitle: string;
  installOptions: Record<InstallOption, InstallDict>;
  addToCartLabel: string;
  addedLabel: string;
  goToCartLabel: string;
}) {
  const { addItem } = useCart();
  const [selected, setSelected] = useState<InstallOption>("none");
  const [added, setAdded] = useState(false);

  const options: InstallOption[] = ["none", "install", "installPlus"];

  return (
    <div>
      <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-white">
        {installTitle}
      </h2>
      <div className="mt-4 grid gap-3">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => {
              setSelected(opt);
              setAdded(false);
            }}
            className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
              selected === opt
                ? opt === "none"
                  ? "border-[#00C2FF]/60 bg-[#00C2FF]/10"
                  : "border-amber-400/60 bg-amber-400/10"
                : "border-white/10 bg-white/[0.02] hover:border-white/25"
            }`}
          >
            <span>
              <span className="block text-sm font-semibold text-white">
                {installOptions[opt].label}
              </span>
              <span className="block text-xs text-neutral-400">
                {installOptions[opt].desc}
              </span>
            </span>
            <span className="shrink-0 font-mono text-sm text-neutral-300">
              {installOptions[opt].price}
            </span>
          </button>
        ))}
      </div>

      <button
        onClick={() => {
          addItem({
            productSlug,
            name: productName,
            unitPrice: price,
            installOption: selected,
          });
          setAdded(true);
        }}
        className="btn-primary mt-6 w-full rounded-xl px-6 py-3 font-semibold"
      >
        {addToCartLabel}
      </button>

      {added && (
        <p className="mt-3 text-center text-sm text-[#00F5A0]">
          {addedLabel}{" "}
          <Link href={`/${locale}/cart`} className="underline">
            {goToCartLabel}
          </Link>
        </p>
      )}
    </div>
  );
}
