"use client";

import { useState } from "react";

export interface Product {
  id: string;
  name: string;
  category: string;
  price: string;
  fabric: string;
  details: string;
  badge: string;
}

interface ProductPreviewModalProps {
  title: string;
  quickLook: string;
  closeText: string;
  products: readonly Product[];
}

export function ProductPreviewModal({
  title,
  quickLook,
  closeText,
  products,
}: ProductPreviewModalProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  return (
    <section className="my-20">
      <div className="text-center max-w-xl mx-auto mb-12">
        <span className="text-xs uppercase tracking-[0.25em] text-amber-400 font-semibold">
          Harry Villegas Haute Couture
        </span>
        <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold text-white mt-2">
          {title}
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((prod) => (
          <div
            key={prod.id}
            className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:border-amber-500/40 hover:bg-white/[0.04] transition-all"
          >
            <div>
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-gradient-to-br from-neutral-800 to-neutral-950 flex flex-col items-center justify-center p-6 border border-white/5">
                <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider text-amber-300 px-2 py-0.5 rounded bg-black/60 backdrop-blur border border-amber-500/20">
                  {prod.badge}
                </span>

                <div className="w-16 h-16 rounded-full border border-amber-500/30 bg-amber-500/10 flex items-center justify-center text-amber-300 mb-2 group-hover:scale-110 transition-transform">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M20.38 3.46L16 2 12 5 8 2 3.62 3.46A2 2 0 002 5.38V21a1 1 0 001.38.92L8 20l4 2 4-2 4.62 1.92A1 1 0 0022 21V5.38a2 2 0 00-1.62-1.92z" />
                  </svg>
                </div>

                <span className="text-[11px] text-neutral-400 font-medium text-center">
                  {prod.fabric}
                </span>
              </div>

              <div className="mt-4">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
                  {prod.category}
                </span>
                <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-white mt-1 group-hover:text-amber-200 transition">
                  {prod.name}
                </h3>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between pt-3 border-t border-white/10">
              <span className="text-lg font-extrabold text-amber-300">
                {prod.price}
              </span>
              <button
                onClick={() => setSelectedProduct(prod)}
                className="px-3.5 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500 hover:text-black font-semibold text-xs transition"
              >
                {quickLook}
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl border border-amber-500/30 bg-neutral-900 p-6 sm:p-8 shadow-2xl text-left">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white text-xl p-2"
              aria-label={closeText}
            >
              ✕
            </button>

            <span className="inline-block px-3 py-1 text-[10px] uppercase font-bold tracking-widest text-amber-300 border border-amber-500/30 rounded bg-amber-500/10 mb-2">
              {selectedProduct.badge}
            </span>

            <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">
              {selectedProduct.name}
            </h3>

            <p className="text-amber-400 font-bold text-xl mt-2">
              {selectedProduct.price}
            </p>

            <div className="my-6 space-y-3 text-sm text-neutral-300 border-y border-white/10 py-4">
              <div>
                <span className="font-semibold text-amber-200">Kumaş / Fabric:</span>{" "}
                {selectedProduct.fabric}
              </div>
              <div>
                <span className="font-semibold text-amber-200">Detaylar / Specifications:</span>{" "}
                {selectedProduct.details}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400 italic">
                * Açılışa özel sipariş ve randevu kaydı aktiftir.
              </span>
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-5 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs hover:bg-amber-400 transition"
              >
                {closeText}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
