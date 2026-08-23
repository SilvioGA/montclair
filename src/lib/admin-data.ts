import {
  combos as seedCombos,
  collections as seedCollections,
  normalizeSize,
  perfumes as seedPerfumes,
  type Combo,
  type Gender,
  type Mood,
  type Perfume,
  type SizeKey,
  type SizeOption,
  type World,
} from "../data/catalog";
import { store as seedStore } from "../data/config";

const KEY = "montclair-admin-v2";
const GATE = "montclair-admin-in";

export type Collection = (typeof seedCollections)[number];
export type SymbolPlace = "before" | "after";

export type PayTransfer = { on: boolean; bank: string; holder: string; account: string };
export type PayMobile = { on: boolean; phone: string };
export type PayCash = { on: boolean; note: string };

export type StoreData = {
  name: string;
  tagline: string;
  whatsapp: string;
  greeting: string;
  hours: string;
  city: string;
  coverage: string;
  cities: string[];
  shippingNote: string;
  shippingLocal: number;
  shippingUpcountry: number;
  takingOrders: boolean;
  minOrder: number;
  socials: { name: string; href: string }[];
  symbol: string;
  symbolPlace: SymbolPlace;
  payments: {
    transfer: PayTransfer;
    mobile: PayMobile;
    cash: PayCash;
  };
};

export const SYMBOLS = ["C$", "$", "US$", "USD", "€"];

export const BANKS = ["Banpro", "BAC", "Lafise", "Ficohsa", "BDF", "Promerica", "Otro"];

export const SOCIAL_PRESETS = ["Instagram", "TikTok", "Facebook", "YouTube"];

export const ML_SUGGESTIONS = [2, 3, 5, 7, 8, 10, 15, 20, 30, 50];

export type AdminState = {
  perfumes: Perfume[];
  combos: Combo[];
  collections: Collection[];
  store: StoreData;
};

export const IMAGES = [
  "/products/le-beau.jpg",
  "/products/212-men.jpg",
  "/products/eros.jpg",
  "/products/light-blue.jpg",
  "/products/light-blue-dama.jpg",
  "/products/santal-33.jpg",
  "/products/valentino-bir.jpg",
  "/products/le-male-elixir.jpg",
  "/products/ysl-y.jpg",
  "/products/valentino-dama.jpg",
  "/products/most-wanted.jpg",
  "/products/combo-noche.jpg",
  "/products/combo-todo-el-dia.jpg",
  "/products/combo-oficina.jpg",
  "/products/combo-ella.jpg",
];

export const GENDERS: Gender[] = ["el", "ella", "ambos"];
export const WORLDS: World[] = ["disenador", "nicho", "arabes"];
export const MOODS: Mood[] = ["dulce", "fresco", "noche", "oficina"];

export const STORE_PANES = [
  ["pagos", "Pagos"],
  ["pedidos", "Pedidos"],
  ["envios", "Envíos"],
  ["precios", "Precios"],
  ["marca", "Marca"],
] as const;

export const COVERS = [
  "/collections/arabes.jpg",
  "/collections/nicho.jpg",
  "/collections/diseno.jpg",
  "/collections/noche.jpg",
  "/collections/dulce.jpg",
  "/collections/fresco.jpg",
  "/collections/oficina.jpg",
];

export const RELATED_MAX = 2;

export type StorePane = (typeof STORE_PANES)[number][0];

export function genderLabel(g: Gender) {
  return g === "el" ? "Él" : g === "ella" ? "Ella" : "Los dos";
}

export function worldLabel(w: World) {
  return w === "disenador" ? "Diseño" : w === "nicho" ? "Nicho" : "Árabes";
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function decants(p3: number, p5: number, p10: number, bottle: number): SizeOption[] {
  return [
    { key: "3", label: "3 ml", price: p3, hint: "Para olerlo", kind: "ml", ml: 3 },
    { key: "5", label: "5 ml", price: p5, hint: "El que más piden", kind: "ml", ml: 5 },
    { key: "10", label: "10 ml", price: p10, hint: "Para usarlo seguido", kind: "ml", ml: 10 },
    { key: "frasco", label: "Frasco", price: bottle, hint: "Si ya lo conoces. Precio estimado.", kind: "bottle" },
  ];
}

function defaultPayments(): StoreData["payments"] {
  return {
    transfer: { on: true, bank: "Banpro", holder: "", account: "" },
    mobile: { on: true, phone: seedStore.whatsapp },
    cash: { on: true, note: "Si estamos en tu zona" },
  };
}

function defaultStore(): StoreData {
  return {
    ...structuredClone(seedStore),
    tagline: "DECANT / FRAGRANCE",
    greeting: "Hola, quiero pedir desde Montclair.",
    hours: "Lunes a sábado, 9 a 7",
    takingOrders: true,
    minOrder: 0,
    shippingLocal: 0,
    shippingUpcountry: 0,
    symbol: "C$",
    symbolPlace: "before",
    payments: defaultPayments(),
  };
}

function asOn(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  return fallback;
}

function paymentsFrom(raw: unknown): StoreData["payments"] {
  const base = defaultPayments();
  if (!raw || typeof raw !== "object") return base;
  const p = raw as Record<string, unknown>;

  const transferRaw = p.transfer;
  const mobileRaw = p.mobile;
  const cashRaw = p.cash;

  const transfer =
    typeof transferRaw === "boolean"
      ? { ...base.transfer, on: transferRaw }
      : transferRaw && typeof transferRaw === "object"
        ? {
            ...base.transfer,
            ...(transferRaw as Partial<PayTransfer>),
            on: asOn((transferRaw as PayTransfer).on, true),
          }
        : base.transfer;

  const mobile =
    typeof mobileRaw === "boolean"
      ? { ...base.mobile, on: mobileRaw }
      : mobileRaw && typeof mobileRaw === "object"
        ? {
            ...base.mobile,
            ...(mobileRaw as Partial<PayMobile>),
            on: asOn((mobileRaw as PayMobile).on, true),
          }
        : base.mobile;

  const cash =
    typeof cashRaw === "boolean"
      ? { ...base.cash, on: cashRaw }
      : cashRaw && typeof cashRaw === "object"
        ? {
            ...base.cash,
            ...(cashRaw as Partial<PayCash>),
            on: asOn((cashRaw as PayCash).on, true),
          }
        : base.cash;

  return { transfer, mobile, cash };
}

function symbolFrom(store: Record<string, unknown>) {
  const direct = store.symbol;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  if (store.currency === "USD") return "US$";
  if (store.currency === "NIO") return "C$";
  if (typeof store.currency === "string" && store.currency.trim()) {
    if (store.currency === "USD") return "US$";
    if (store.currency === "NIO") return "C$";
    return store.currency.trim();
  }
  return "C$";
}

export function seed(): AdminState {
  return {
    perfumes: structuredClone(seedPerfumes),
    combos: structuredClone(seedCombos),
    collections: structuredClone(seedCollections),
    store: defaultStore(),
  };
}

export function loadState(): AdminState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as AdminState;
    if (!parsed.perfumes || !parsed.combos || !parsed.collections || !parsed.store) return seed();
    const base = seed();
    const bag = parsed.store as StoreData & { currency?: string };
    parsed.store = {
      ...base.store,
      ...parsed.store,
      symbol: symbolFrom(bag as unknown as Record<string, unknown>),
      symbolPlace: bag.symbolPlace === "after" ? "after" : "before",
      payments: paymentsFrom(parsed.store.payments),
      socials:
        Array.isArray(parsed.store.socials) && parsed.store.socials.length
          ? parsed.store.socials
          : base.store.socials,
      cities: Array.isArray(parsed.store.cities) && parsed.store.cities.length ? parsed.store.cities : base.store.cities,
      takingOrders: parsed.store.takingOrders !== false,
      minOrder: Number(parsed.store.minOrder) || 0,
      shippingLocal: Number(parsed.store.shippingLocal) || 0,
      shippingUpcountry: Number(parsed.store.shippingUpcountry) || 0,
    };
    parsed.perfumes = parsed.perfumes.map((p) => ({
      ...p,
      sizes: (p.sizes || []).map((s) => normalizeSize(s)),
      related: (p.related || []).slice(0, 2),
    }));
    parsed.combos = parsed.combos.map((c) => {
      const items = Array.isArray(c.items) && c.items.length ? c.items : [];
      let price = Number((c as Combo).price);
      if (!Number.isFinite(price) || price <= 0) {
        price = items.reduce((sum, item) => {
          const p = parsed.perfumes.find((x) => x.slug === item.slug);
          const sz = p?.sizes.find((s) => s.key === item.size);
          return sum + (sz?.price ?? 0);
        }, 0);
      }
      return { ...c, items, price };
    });
    parsed.collections = parsed.collections.map((c) => {
      const match = base.collections.find((x) => x.slug === c.slug);
      return {
        ...c,
        href: c.href || `/catalogo/${c.slug}`,
        cover: c.cover || match?.cover || `/collections/${c.slug}.jpg`,
        intro: c.intro ?? match?.intro ?? "",
      } as Collection;
    });
    return parsed;
  } catch {
    return seed();
  }
}

export function saveState(state: AdminState) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function resetState() {
  const next = seed();
  saveState(next);
  return next;
}

export function isIn() {
  try {
    return sessionStorage.getItem(GATE) === "1";
  } catch {
    return false;
  }
}

export function enter(password: string) {
  if (password !== "montclair") return false;
  sessionStorage.setItem(GATE, "1");
  return true;
}

export function leave() {
  sessionStorage.removeItem(GATE);
}

export function money(n: number, symbol = "C$", place: SymbolPlace = "before") {
  const num = n.toLocaleString("es-NI");
  const s = symbol.trim() || "C$";
  return place === "after" ? `${num} ${s}` : `${s} ${num}`;
}

export function priceOf(p: Perfume, key: SizeKey) {
  return p.sizes.find((s) => s.key === key)?.price ?? 0;
}

export function waDisplay(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("505") && digits.length === 11) {
    return `+505 ${digits.slice(3, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 8) return `+505 ${digits.slice(0, 4)} ${digits.slice(4)}`;
  return raw || "—";
}

export function nextMl(existing: number[]) {
  return ML_SUGGESTIONS.find((n) => !existing.includes(n)) ?? Math.max(1, ...existing, 0) + 1;
}
