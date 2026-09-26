"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { INSTALL_PRICES, type InstallOption } from "@/content/products";

export type CartItem = {
  id: string;
  productSlug: string;
  name: string;
  unitPrice: number;
  installOption: InstallOption;
  installPrice: number;
  qty: number;
  bookingDate?: string;
  bookingTime?: string;
  address?: string;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (item: {
    productSlug: string;
    name: string;
    unitPrice: number;
    installOption: InstallOption;
  }) => void;
  removeItem: (id: string) => void;
  updateBooking: (
    id: string,
    booking: { bookingDate?: string; bookingTime?: string; address?: string }
  ) => void;
  clear: () => void;
  totalCount: number;
  totalPrice: number;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "ipscans_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      // one-time hydration from localStorage on mount, before persistence effect runs
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // ignore corrupt storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addItem = useCallback<CartContextValue["addItem"]>((item) => {
    setItems((prev) => {
      const id = `${item.productSlug}__${item.installOption}`;
      const existing = prev.find((p) => p.id === id);
      if (existing) {
        return prev.map((p) =>
          p.id === id ? { ...p, qty: p.qty + 1 } : p
        );
      }
      return [
        ...prev,
        {
          id,
          productSlug: item.productSlug,
          name: item.name,
          unitPrice: item.unitPrice,
          installOption: item.installOption,
          installPrice: INSTALL_PRICES[item.installOption],
          qty: 1,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const updateBooking = useCallback<CartContextValue["updateBooking"]>(
    (id, booking) => {
      setItems((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...booking } : p))
      );
    },
    []
  );

  const clear = useCallback(() => setItems([]), []);

  const totalCount = useMemo(
    () => items.reduce((sum, i) => sum + i.qty, 0),
    [items]
  );
  const totalPrice = useMemo(
    () =>
      items.reduce(
        (sum, i) => sum + (i.unitPrice + i.installPrice) * i.qty,
        0
      ),
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateBooking,
        clear,
        totalCount,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
