import type { Promotion, SizeOption } from "../data/catalog";

/**
 * Datos vivos de la tienda en modo prueba: lo que el panel guardó en este navegador.
 * Cuando exista Supabase, esta función pasa a leer de la base con el mismo resultado.
 */

export const LIVE_KEY = "montclair-admin-v2";

export interface LivePerfume {
  slug: string;
  available: boolean;
  lowStock: boolean;
  sizes: SizeOption[];
}

export interface LiveState {
  perfumes: LivePerfume[];
  promotions: Promotion[];
  freeShippingFrom: number;
}

export function readLive(): LiveState | null {
  try {
    const raw = localStorage.getItem(LIVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      perfumes?: LivePerfume[];
      promotions?: Promotion[];
      store?: { freeShippingFrom?: number };
    };
    if (!Array.isArray(parsed.perfumes)) return null;
    return {
      perfumes: parsed.perfumes.map((p) => ({
        slug: p.slug,
        available: p.available !== false,
        lowStock: p.lowStock === true,
        sizes: Array.isArray(p.sizes) ? p.sizes : [],
      })),
      promotions: Array.isArray(parsed.promotions) ? parsed.promotions : [],
      freeShippingFrom: Number(parsed.store?.freeShippingFrom) || 0,
    };
  } catch {
    return null;
  }
}
