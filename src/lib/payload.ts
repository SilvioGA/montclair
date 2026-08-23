import type { Perfume } from "../data/catalog";
import { comboTotal, type Combo } from "../data/catalog";

export function perfumePayload(p: Perfume) {
  return {
    slug: p.slug,
    name: p.name,
    house: p.house,
    image: p.image,
    sizes: p.sizes,
  };
}

export function comboPayload(combo: Combo) {
  return [
    {
      slug: combo.slug,
      name: combo.name,
      house: "Pack",
      size: "pack",
      sizeLabel: `Pack · ${combo.items.length}`,
      price: comboTotal(combo),
      image: combo.image,
    },
  ];
}
