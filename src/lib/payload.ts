import type { Perfume } from "../data/catalog";
import { comboLines, type Combo } from "../data/catalog";

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
  return comboLines(combo).map(({ perfume, size }) => ({
    slug: perfume.slug,
    name: perfume.name,
    house: perfume.house,
    size: size.key,
    sizeLabel: size.label,
    price: size.price,
    image: perfume.image,
  }));
}
