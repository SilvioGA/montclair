export type Gender = "ella" | "el" | "ambos";
export type World = "disenador" | "nicho" | "arabes";
export type Mood = "dulce" | "fresco" | "noche" | "oficina";
export type SizeKey = string;
export type SizeKind = "ml" | "bottle";

export interface SizeOption {
  key: SizeKey;
  label: string;
  price: number;
  hint: string;
  kind?: SizeKind;
  ml?: number;
}

export interface Perfume {
  slug: string;
  name: string;
  house: string;
  smell: string;
  gender: Gender;
  world: World;
  moods: Mood[];
  image: string;
  available: boolean;
  sizes: SizeOption[];
  related: string[];
}

export interface ComboItem {
  slug: string;
  size: SizeKey;
}

export interface Combo {
  slug: string;
  name: string;
  blurb: string;
  image: string;
  gender: Gender;
  moods: Mood[];
  items: ComboItem[];
  price: number;
}

function decants(p3: number, p5: number, p10: number, bottle: number): SizeOption[] {
  return [
    { key: "3", label: "3 ml", price: p3, hint: "Para olerlo", kind: "ml", ml: 3 },
    { key: "5", label: "5 ml", price: p5, hint: "El que más piden", kind: "ml", ml: 5 },
    { key: "10", label: "10 ml", price: p10, hint: "Para usarlo seguido", kind: "ml", ml: 10 },
    { key: "frasco", label: "Frasco", price: bottle, hint: "Si ya lo conoces. Precio estimado.", kind: "bottle" },
  ];
}

export function isBottle(size: SizeOption) {
  return size.kind === "bottle" || size.key === "frasco";
}

export function sizeMl(size: SizeOption) {
  if (isBottle(size)) return Number.POSITIVE_INFINITY;
  if (typeof size.ml === "number" && Number.isFinite(size.ml)) return size.ml;
  const n = Number(size.key);
  return Number.isFinite(n) ? n : 0;
}

export function normalizeSize(raw: Partial<SizeOption> & { key: string; price: number }): SizeOption {
  const bottle = raw.kind === "bottle" || raw.key === "frasco";
  const ml = bottle ? undefined : Number(raw.ml ?? raw.key);
  const amount = bottle || !Number.isFinite(ml as number) ? undefined : (ml as number);
  return {
    key: bottle ? "frasco" : String(amount ?? raw.key),
    label: raw.label || (bottle ? "Frasco" : `${amount} ml`),
    price: Number(raw.price) || 0,
    hint: raw.hint || "",
    kind: bottle ? "bottle" : "ml",
    ml: amount,
  };
}

export const perfumes: Perfume[] = [
  {
    slug: "le-beau-le-parfum",
    name: "Le Beau Le Parfum",
    house: "Jean Paul Gaultier",
    smell: "Dulce, coco y piña. De noche y para salir.",
    gender: "el",
    world: "disenador",
    moods: ["dulce", "noche"],
    image: "/products/le-beau.jpg",
    available: true,
    related: ["le-male-elixir", "eros-edp"],
    sizes: decants(250, 400, 700, 4900),
  },
  {
    slug: "212-men-edt",
    name: "212 Men EDT",
    house: "Carolina Herrera",
    smell: "Fresco, limpio. Para el día y la oficina.",
    gender: "el",
    world: "disenador",
    moods: ["fresco", "oficina"],
    image: "/products/212-men.jpg",
    available: true,
    related: ["light-blue", "eros-edp"],
    sizes: decants(170, 260, 490, 3450),
  },
  {
    slug: "eros-edp",
    name: "Eros Eau de Parfum",
    house: "Versace",
    smell: "Menta, vainilla, presencia. El que más piden.",
    gender: "el",
    world: "disenador",
    moods: ["dulce", "noche"],
    image: "/products/eros.jpg",
    available: true,
    related: ["le-beau-le-parfum", "most-wanted"],
    sizes: decants(160, 240, 440, 3100),
  },
  {
    slug: "light-blue",
    name: "Light Blue",
    house: "Dolce & Gabbana",
    smell: "Cítrico, de día. Ligero, no aturde.",
    gender: "el",
    world: "disenador",
    moods: ["fresco", "oficina"],
    image: "/products/light-blue.jpg",
    available: true,
    related: ["212-men-edt", "light-blue-dama"],
    sizes: decants(150, 220, 420, 2950),
  },
  {
    slug: "light-blue-dama",
    name: "Light Blue Dama",
    house: "Dolce & Gabbana",
    smell: "Limón, manzana, fresco. Para el día.",
    gender: "ella",
    world: "disenador",
    moods: ["fresco"],
    image: "/products/light-blue-dama.jpg",
    available: true,
    related: ["valentino-dama-bir", "light-blue"],
    sizes: decants(160, 240, 440, 3100),
  },
  {
    slug: "santal-33",
    name: "Santal 33",
    house: "Le Labo",
    smell: "Sándalo, cuero, seco. Nicho, se queda.",
    gender: "ambos",
    world: "nicho",
    moods: ["oficina", "noche"],
    image: "/products/santal-33.jpg",
    available: true,
    related: ["most-wanted", "le-male-elixir"],
    sizes: decants(510, 830, 1640, 8900),
  },
  {
    slug: "valentino-bir-intense",
    name: "Born in Roma Intense",
    house: "Valentino",
    smell: "Dulce, vainilla, intenso.",
    gender: "ella",
    world: "disenador",
    moods: ["dulce", "noche"],
    image: "/products/valentino-bir.jpg",
    available: false,
    related: ["valentino-dama-bir", "light-blue-dama"],
    sizes: decants(250, 400, 700, 4900),
  },
  {
    slug: "le-male-elixir",
    name: "Le Male Elixir",
    house: "Jean Paul Gaultier",
    smell: "Miel, lavanda, tabaco. Dulce y de noche.",
    gender: "el",
    world: "disenador",
    moods: ["dulce", "noche"],
    image: "/products/le-male-elixir.jpg",
    available: true,
    related: ["le-beau-le-parfum", "most-wanted"],
    sizes: decants(250, 400, 700, 4900),
  },
  {
    slug: "ysl-y-edp",
    name: "Y Eau de Parfum",
    house: "Yves Saint Laurent",
    smell: "Manzana, jengibre, fresco con presencia.",
    gender: "el",
    world: "disenador",
    moods: ["fresco", "oficina"],
    image: "/products/ysl-y.jpg",
    available: false,
    related: ["212-men-edt", "light-blue"],
    sizes: decants(220, 380, 680, 4750),
  },
  {
    slug: "valentino-dama-bir",
    name: "Born in Roma Intense Dama",
    house: "Valentino",
    smell: "Dulce, floral, vainilla. Para salir.",
    gender: "ella",
    world: "disenador",
    moods: ["dulce", "noche"],
    image: "/products/valentino-dama.jpg",
    available: true,
    related: ["light-blue-dama", "santal-33"],
    sizes: decants(280, 440, 850, 5950),
  },
  {
    slug: "most-wanted",
    name: "The Most Wanted Parfum",
    house: "Azzaro",
    smell: "Toffee, cardamomo, dulce. De noche.",
    gender: "el",
    world: "disenador",
    moods: ["dulce", "noche"],
    image: "/products/most-wanted.jpg",
    available: true,
    related: ["le-male-elixir", "eros-edp"],
    sizes: decants(200, 320, 600, 4200),
  },
];

export const combos: Combo[] = [
  {
    slug: "noche",
    name: "Noche",
    blurb: "Dulces, se quedan. Para salir.",
    image: "/products/combo-noche.jpg",
    gender: "el",
    moods: ["noche", "dulce"],
    items: [
      { slug: "le-male-elixir", size: "5" },
      { slug: "most-wanted", size: "5" },
      { slug: "le-beau-le-parfum", size: "5" },
    ],
    price: 1120,
  },
  {
    slug: "todo-el-dia",
    name: "Todo el día",
    blurb: "Frescos, limpios. Oficina y calle.",
    image: "/products/combo-todo-el-dia.jpg",
    gender: "el",
    moods: ["fresco", "oficina"],
    items: [
      { slug: "212-men-edt", size: "5" },
      { slug: "light-blue", size: "5" },
      { slug: "eros-edp", size: "5" },
    ],
    price: 720,
  },
  {
    slug: "oficina",
    name: "Oficina",
    blurb: "No aturden. Para el día a día.",
    image: "/products/combo-oficina.jpg",
    gender: "el",
    moods: ["oficina", "fresco"],
    items: [
      { slug: "light-blue", size: "5" },
      { slug: "212-men-edt", size: "5" },
      { slug: "santal-33", size: "5" },
    ],
    price: 1310,
  },
  {
    slug: "ella",
    name: "Ella",
    blurb: "Los que más piden para ella.",
    image: "/products/combo-ella.jpg",
    gender: "ella",
    moods: ["dulce", "noche"],
    items: [
      { slug: "valentino-dama-bir", size: "5" },
      { slug: "light-blue-dama", size: "5" },
      { slug: "santal-33", size: "5" },
    ],
    price: 1510,
  },
];

export const collections = [
  {
    slug: "arabes",
    name: "Árabes",
    href: "/catalogo/arabes",
    kind: "world" as const,
    world: "arabes" as World,
    cover: "/collections/arabes.jpg",
    intro: "Dulces, densos, se quedan en la piel. Si te gusta Baccarat, empiezas aquí.",
  },
  {
    slug: "nicho",
    name: "Nicho",
    href: "/catalogo/nicho",
    kind: "world" as const,
    world: "nicho" as World,
    cover: "/collections/nicho.jpg",
    intro: "Casas chicas, jugo caro. Para oler distinto.",
  },
  {
    slug: "diseno",
    name: "Diseño",
    href: "/catalogo/diseno",
    kind: "world" as const,
    world: "disenador" as World,
    cover: "/collections/diseno.jpg",
    intro: "Los que todo el mundo conoce. Seguros para regalar.",
  },
  {
    slug: "noche",
    name: "Noche",
    href: "/catalogo/noche",
    kind: "mood" as const,
    mood: "noche" as Mood,
    cover: "/collections/noche.jpg",
    intro: "Se quedan. Para salir, no para la oficina.",
  },
  {
    slug: "dulce",
    name: "Dulce",
    href: "/catalogo/dulce",
    kind: "mood" as const,
    mood: "dulce" as Mood,
    cover: "/collections/dulce.jpg",
    intro: "Vainilla, dátil, azúcar. Si te gusta lo denso.",
  },
  {
    slug: "fresco",
    name: "Fresco",
    href: "/catalogo/fresco",
    kind: "mood" as const,
    mood: "fresco" as Mood,
    cover: "/collections/fresco.jpg",
    intro: "Limpios, de día. No aturden.",
  },
  {
    slug: "oficina",
    name: "Oficina",
    href: "/catalogo/oficina",
    kind: "mood" as const,
    mood: "oficina" as Mood,
    cover: "/collections/oficina.jpg",
    intro: "Cortos y educados. Nadie se queja en el ascensor.",
  },
];

export function getPerfume(slug: string) {
  return perfumes.find((p) => p.slug === slug);
}

export function getCombo(slug: string) {
  return combos.find((c) => c.slug === slug);
}

export function sizeOf(perfume: Perfume, key: SizeKey) {
  return perfume.sizes.find((s) => s.key === key);
}

export function comboLines(combo: Combo) {
  return combo.items.map((item) => {
    const perfume = getPerfume(item.slug);
    if (!perfume) throw new Error(`Perfume missing: ${item.slug}`);
    const size = sizeOf(perfume, item.size);
    if (!size) throw new Error(`Size missing: ${item.slug} ${item.size}`);
    return { perfume, size };
  });
}

export function comboPartsSum(combo: Combo) {
  return comboLines(combo).reduce((acc, line) => acc + line.size.price, 0);
}

export function comboTotal(combo: Combo) {
  if (typeof combo.price === "number" && Number.isFinite(combo.price) && combo.price > 0) {
    return combo.price;
  }
  return comboPartsSum(combo);
}

export function smallestSize(perfume: Perfume) {
  if (!perfume.sizes.length) {
    return normalizeSize({ key: "5", price: 0, kind: "ml", ml: 5 });
  }
  return [...perfume.sizes].sort((a, b) => sizeMl(a) - sizeMl(b))[0];
}

export function filterPerfumes(opts: {
  para?: Gender | "todos";
  world?: World;
  mood?: Mood;
  q?: string;
  availableOnly?: boolean;
}) {
  const q = opts.q?.trim().toLowerCase() ?? "";
  return perfumes.filter((p) => {
    if (opts.availableOnly && !p.available) return false;
    if (opts.para && opts.para !== "todos") {
      if (opts.para === "ambos") {
        /* show all */
      } else if (p.gender !== opts.para && p.gender !== "ambos") {
        return false;
      }
    }
    if (opts.world && p.world !== opts.world) return false;
    if (opts.mood && !p.moods.includes(opts.mood)) return false;
    if (q) {
      const hay = `${p.name} ${p.house} ${p.smell}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export const worldLabel: Record<World, string> = {
  disenador: "Diseñador",
  nicho: "Nicho",
  arabes: "Árabe",
};

export const genderLabel: Record<Gender, string> = {
  ella: "Ella",
  el: "Él",
  ambos: "Los dos",
};

export const moodLabel: Record<Mood, string> = {
  dulce: "Dulce",
  fresco: "Fresco",
  noche: "Noche",
  oficina: "Oficina",
};
