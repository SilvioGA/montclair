import type { SizeKey } from "../data/catalog";

export interface CartItem {
  id: string;
  slug: string;
  name: string;
  house: string;
  size: SizeKey;
  sizeLabel: string;
  price: number;
  qty: number;
  image: string;
}

export interface Cart {
  items: CartItem[];
  count: number;
  total: number;
}

export function itemId(slug: string, size: SizeKey) {
  return `${slug}__${size}`;
}

export function emptyCart(): Cart {
  return { items: [], count: 0, total: 0 };
}

export function totals(items: CartItem[]): Cart {
  return {
    items,
    count: items.reduce((a, i) => a + i.qty, 0),
    total: items.reduce((a, i) => a + i.price * i.qty, 0),
  };
}
