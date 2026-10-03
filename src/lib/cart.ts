import type { SizeKey } from "../data/catalog";

export interface CartItem {
  id: string;
  slug: string;
  name: string;
  house: string;
  size: SizeKey;
  sizeLabel: string;
  price: number;
  /** Precio de lista cuando se sumó. Si es mayor a price, iba en oferta. */
  listPrice?: number;
  promoId?: string | null;
  qty: number;
  image: string;
}

export interface Cart {
  items: CartItem[];
  count: number;
  total: number;
  /** Lo que se ahorró por ofertas. */
  saved: number;
}

export function itemId(slug: string, size: SizeKey) {
  return `${slug}__${size}`;
}

export function emptyCart(): Cart {
  return { items: [], count: 0, total: 0, saved: 0 };
}

export function itemSaved(i: CartItem) {
  const list = typeof i.listPrice === "number" ? i.listPrice : i.price;
  return Math.max(0, list - i.price) * i.qty;
}

export function totals(items: CartItem[]): Cart {
  return {
    items,
    count: items.reduce((a, i) => a + i.qty, 0),
    total: items.reduce((a, i) => a + i.price * i.qty, 0),
    saved: items.reduce((a, i) => a + itemSaved(i), 0),
  };
}
