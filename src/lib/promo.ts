import type { Promotion, SizeOption } from "../data/catalog";

export type PromoStatus = "scheduled" | "active" | "paused" | "ended";

export interface Priced {
  price: number;
  was: number | null;
  pct: number;
  promoId: string | null;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export function promoStatus(p: Promotion, now = Date.now()): PromoStatus {
  if (!p.enabled) return "paused";
  const start = Date.parse(p.startsAt);
  const end = p.endsAt ? Date.parse(p.endsAt) : Number.POSITIVE_INFINITY;
  if (Number.isFinite(start) && now < start) return "scheduled";
  if (now > end) return "ended";
  return "active";
}

export function isActive(p: Promotion, now = Date.now()) {
  return promoStatus(p, now) === "active";
}

export function activePromoFor(promos: Promotion[], slug: string, now = Date.now()) {
  const hits = promos.filter((p) => p.perfumeSlug === slug && isActive(p, now));
  if (!hits.length) return null;
  return [...hits].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
}

export function coversSize(p: Promotion, sizeKey: string) {
  if (!p.sizeKeys) return true;
  return p.sizeKeys.includes(sizeKey);
}

/** Precio en oferta para una medida. null si la oferta no la cubre. Entero, nunca menor a 1. */
export function promoPrice(listPrice: number, sizeKey: string, p: Promotion): number | null {
  if (!coversSize(p, sizeKey)) return null;
  let next: number;
  if (p.kind === "percent") next = Math.floor(listPrice * (1 - p.value / 100));
  else if (p.kind === "amount") next = listPrice - p.value;
  else {
    const fixed = p.prices?.[sizeKey];
    if (typeof fixed !== "number" || !Number.isFinite(fixed)) return null;
    next = Math.floor(fixed);
  }
  if (!Number.isFinite(next)) return null;
  if (next >= listPrice) return null;
  return Math.max(1, next);
}

export function effectivePrice(size: Pick<SizeOption, "key" | "price">, promo: Promotion | null): Priced {
  if (!promo) return { price: size.price, was: null, pct: 0, promoId: null };
  const next = promoPrice(size.price, size.key, promo);
  if (next === null) return { price: size.price, was: null, pct: 0, promoId: null };
  const pct = size.price > 0 ? Math.round((1 - next / size.price) * 100) : 0;
  return { price: next, was: size.price, pct, promoId: promo.id };
}

/** El mayor porcentaje que da la oferta entre las medidas que cubre. */
export function bestPct(sizes: Pick<SizeOption, "key" | "price">[], promo: Promotion | null) {
  if (!promo) return 0;
  return sizes.reduce((best, s) => Math.max(best, effectivePrice(s, promo).pct), 0);
}

export function endsToday(p: Promotion, now = Date.now()) {
  if (!p.endsAt) return false;
  const end = new Date(p.endsAt);
  const cur = new Date(now);
  return end.getFullYear() === cur.getFullYear() && end.getMonth() === cur.getMonth() && end.getDate() === cur.getDate();
}

/** "5 d 3 h" · "3 h 12 min" · "12 min" · "" si no hay fin. */
export function timeLeft(p: Promotion, now = Date.now()) {
  if (!p.endsAt) return "";
  const ms = Date.parse(p.endsAt) - now;
  if (!Number.isFinite(ms) || ms <= 0) return "0 min";
  const d = Math.floor(ms / DAY);
  const h = Math.floor((ms % DAY) / HOUR);
  const m = Math.floor((ms % HOUR) / 60000);
  if (d >= 1) return `${d} d ${h} h`;
  if (h >= 1) return `${h} h ${m} min`;
  return `${m} min`;
}

const DAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/** "hasta el domingo" · "termina hoy" · "" si no hay fin. */
export function untilText(p: Promotion, now = Date.now()) {
  if (!p.endsAt) return "";
  if (endsToday(p, now)) return "termina hoy";
  const end = new Date(p.endsAt);
  const days = Math.ceil((end.getTime() - now) / DAY);
  if (days <= 6) return `hasta el ${DAYS[end.getDay()]}`;
  return `hasta el ${end.getDate()}/${end.getMonth() + 1}`;
}

/** Texto corto de la rebaja: "−20 %" · "C$ 40 menos" · "Precio fijo". */
export function discountText(p: Promotion, symbol = "C$") {
  if (p.kind === "percent") return `−${p.value} %`;
  if (p.kind === "amount") return `${symbol} ${p.value} menos`;
  return "Precio fijo";
}

/** "23:59" · hora local a la que termina. */
export function endHour(p: Promotion) {
  if (!p.endsAt) return "";
  const d = new Date(p.endsAt);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Lo que va en el badge de la foto. El último día empuja: "Último día · −20 %". */
export function promoBadge(p: Promotion, sizes: Pick<SizeOption, "key" | "price">[], now = Date.now()) {
  const pct = bestPct(sizes, p);
  const cut = pct > 0 ? `−${pct} %` : "Oferta";
  if (endsToday(p, now)) return `Último día · ${cut}`;
  if (p.title.trim()) return p.title.trim();
  return cut;
}

export function overlaps(a: Promotion, b: Promotion) {
  if (a.id === b.id || a.perfumeSlug !== b.perfumeSlug) return false;
  const aStart = Date.parse(a.startsAt);
  const aEnd = a.endsAt ? Date.parse(a.endsAt) : Number.POSITIVE_INFINITY;
  const bStart = Date.parse(b.startsAt);
  const bEnd = b.endsAt ? Date.parse(b.endsAt) : Number.POSITIVE_INFINITY;
  return aStart <= bEnd && bStart <= aEnd;
}

export function newPromoId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `promo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

/** Para <input type="datetime-local">: hora local, sin segundos. */
export function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function startOfToday(now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 0, 0);
  return d;
}

/** Atajos de duración del panel. */
export function spanDates(span: "today" | "weekend" | "week" | "forever", now = new Date()) {
  const start = startOfToday(now);
  if (span === "forever") return { startsAt: start.toISOString(), endsAt: null };
  if (span === "today") return { startsAt: start.toISOString(), endsAt: endOfDay(start).toISOString() };
  if (span === "weekend") {
    const sunday = new Date(start);
    sunday.setDate(start.getDate() + ((7 - start.getDay()) % 7));
    return { startsAt: start.toISOString(), endsAt: endOfDay(sunday).toISOString() };
  }
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { startsAt: start.toISOString(), endsAt: endOfDay(end).toISOString() };
}

const SHORT_DAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const SHORT_MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function shortDate(iso: string | null) {
  if (!iso) return "sin fin";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${SHORT_DAYS[d.getDay()]} ${d.getDate()} ${SHORT_MONTHS[d.getMonth()]} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Cuánto del tiempo de la oferta ya pasó, 0-1. */
export function progress(p: Promotion, now = Date.now()) {
  const start = Date.parse(p.startsAt);
  if (!p.endsAt) return 0;
  const end = Date.parse(p.endsAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 1;
  return Math.min(1, Math.max(0, (now - start) / (end - start)));
}

/** Medida ml inmediatamente mayor a la elegida. Hoy no se usa en la tienda; queda por si vuelve el salto de medida. */
export function nextBigger(sizes: SizeOption[], key: string) {
  const ml = (s: SizeOption) => (s.kind === "bottle" || s.key === "frasco" ? Number.POSITIVE_INFINITY : Number(s.ml ?? s.key));
  const cur = sizes.find((s) => s.key === key);
  if (!cur || !Number.isFinite(ml(cur))) return null;
  const bigger = sizes.filter((s) => Number.isFinite(ml(s)) && ml(s) > ml(cur)).sort((a, b) => ml(a) - ml(b));
  return bigger[0] ?? null;
}

/**
 * "Por C$ 300 más te llevas 10 ml. Sale a C$ 70 el ml en vez de C$ 80."
 * null si no hay medida mayor o el grande no sale más barato por ml.
 */
export function sizeJump(
  sizes: SizeOption[],
  key: string,
  priceOf: (s: SizeOption) => number,
  fmt: (n: number) => string,
) {
  const cur = sizes.find((s) => s.key === key);
  const next = nextBigger(sizes, key);
  if (!cur || !next) return null;
  const curMl = Number(cur.ml ?? cur.key);
  const nextMl = Number(next.ml ?? next.key);
  if (!curMl || !nextMl) return null;
  const curPrice = priceOf(cur);
  const nextPrice = priceOf(next);
  const perCur = curPrice / curMl;
  const perNext = nextPrice / nextMl;
  if (perNext >= perCur || nextPrice <= curPrice) return null;
  return {
    next,
    extra: nextPrice - curPrice,
    text: `Por ${fmt(nextPrice - curPrice)} más te llevas ${next.label}. Sale a ${fmt(Math.round(perNext))} el ml en vez de ${fmt(Math.round(perCur))}.`,
  };
}
