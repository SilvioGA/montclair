import { itemId, totals, type Cart, type CartItem } from "../lib/cart";
import { readLive } from "../lib/live";
import { activePromoFor, bestPct, effectivePrice, endHour, endsToday, progress, timeLeft, untilText } from "../lib/promo";
import type { Promotion, SizeKey, SizeOption } from "../data/catalog";
import { orderMessage, whatsappUrl } from "../lib/whatsapp";
import { money } from "../lib/money";
import { closeSheetMotion, flyToCart, openSheetMotion, popBadge, popPlay, pressPop, revealPage } from "./motion-ui";

const KEY = "cata-cart-v3";

type PricedSize = SizeOption & { was?: number | null; promoId?: string | null };

type PerfumePayload = {
  slug: string;
  name: string;
  house: string;
  image: string;
  sizes: PricedSize[];
  lowStock?: boolean;
  /** La oferta termina hoy. */
  lastDay?: boolean;
};

/** Aplica la oferta sobre precios de lista. Idempotente: si ya venía con "was", parte de ahí. */
function applyPromo(sizes: PricedSize[], promo: Promotion | null): PricedSize[] {
  return sizes.map((s) => {
    const list = typeof s.was === "number" && s.was > s.price ? s.was : s.price;
    const eff = effectivePrice({ key: s.key, price: list }, promo);
    return { ...s, price: eff.price, was: eff.was, promoId: eff.promoId };
  });
}

/** Badge de la foto: "<b>−20 %</b> Último día" · "<b>−20 %</b> Semana de Le Beau" · "<b>−20 %</b>". */
function badgeHtml(promo: Promotion, listSizes: PricedSize[], now: number) {
  const pct = bestPct(listSizes, promo);
  const cut = pct > 0 ? `−${pct} %` : "Oferta";
  const suffix = endsToday(promo, now) ? "Último día" : promo.title.trim();
  return `<b class="font-poster">${cut}</b>${suffix ? `<span class="ml-1.5 font-app font-medium opacity-80">${suffix}</span>` : ""}`;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Reloj de la franja de oferta. El último día corre por segundos. */
function tickPromo() {
  const line = document.querySelector<HTMLElement>("[data-promo-line]");
  if (!line || line.classList.contains("hidden")) return;
  const ends = line.dataset.ends || "";
  const mode = line.dataset.mode || "";
  const out = line.querySelector<HTMLElement>("[data-promo-countdown]");
  if (!ends || !out || mode === "static") return;
  const ms = Date.parse(ends) - Date.now();
  if (ms <= 0) {
    hydrateLive();
    return;
  }
  if (mode === "clock") {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    out.textContent = `${h}:${pad2(m)}:${pad2(s)}`;
  } else {
    const stub: Promotion = {
      id: "",
      perfumeSlug: "",
      title: "",
      kind: "percent",
      value: 0,
      sizeKeys: null,
      startsAt: "",
      endsAt: ends,
      showCountdown: true,
      enabled: true,
      createdAt: "",
    };
    out.textContent = timeLeft(stub);
  }
}

function priceLine(start: PricedSize) {
  if (start.was) {
    return `${start.label} · <b class="font-semibold text-gold">${money(start.price)}</b> <s class="opacity-70">${start.was.toLocaleString("es-NI")}</s>`;
  }
  return `${start.label} · ${money(start.price)}`;
}

function readCart(): Cart {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return totals([]);
    const items = JSON.parse(raw) as CartItem[];
    return totals(Array.isArray(items) ? items : []);
  } catch {
    return totals([]);
  }
}

function writeCart(items: CartItem[]) {
  const cart = totals(items);
  localStorage.setItem(KEY, JSON.stringify(cart.items));
  paint(cart);
  return cart;
}

function addItem(base: Omit<CartItem, "id" | "qty">, qty = 1) {
  const cart = readCart();
  const id = itemId(base.slug, base.size);
  const next = [...cart.items];
  const found = next.find((i) => i.id === id);
  if (found) found.qty += qty;
  else next.push({ ...base, id, qty });
  writeCart(next);
}

function setQty(id: string, qty: number) {
  const next = readCart().items
    .map((i) => (i.id === id ? { ...i, qty } : i))
    .filter((i) => i.id !== id || qty > 0);
  writeCart(next);
}

function removeItem(id: string) {
  writeCart(readCart().items.filter((i) => i.id !== id));
}

function sheetRoot() {
  return document.querySelector<HTMLElement>("[data-sheet-root]");
}

function sheetIsOpen() {
  return Boolean(sheetPerfume) && !sheetClosing;
}

function paint(cart = readCart()) {
  document.querySelectorAll<HTMLElement>("[data-cart-badge]").forEach((el) => {
    if (cart.count > 0) {
      el.textContent = String(cart.count);
      el.classList.remove("hidden");
      popBadge(el);
    } else {
      el.classList.add("hidden");
    }
  });
  paintPlay(cart);
  document.querySelectorAll("[data-cart-count]").forEach((el) => {
    el.textContent = cart.count === 1 ? "1 producto" : `${cart.count} productos`;
  });
  document.querySelectorAll("[data-cart-total]").forEach((el) => {
    el.textContent = money(cart.total);
  });
  document.querySelectorAll("[data-cart-cta]").forEach((el) => {
    el.textContent = `Pedir por WhatsApp · ${money(cart.total)}`;
  });
  document.querySelectorAll("[data-cart-recap]").forEach((el) => {
    const names = cart.items.map((i) => `${i.name} ${i.sizeLabel}`).join(" · ");
    el.textContent = names || "";
  });

  const list = document.querySelector("[data-cart-list]");
  const filled = document.querySelector("[data-cart-filled]");
  const empty = document.querySelector("[data-cart-empty]");
  const nudge = document.querySelector("[data-cart-nudge]");
  if (list) {
    list.innerHTML = cart.items
      .map((i) => {
        const listPrice = typeof i.listPrice === "number" ? i.listPrice : i.price;
        const off = listPrice > i.price;
        const pct = off ? Math.round((1 - i.price / listPrice) * 100) : 0;
        return `<article data-cart-item class="flex gap-3 rounded-xl bg-lift p-3" style="opacity:1">
        <img src="${i.image}" alt="" class="h-16 w-12 shrink-0 rounded-md object-cover bg-night" />
        <div class="min-w-0 flex-1">
          <p class="font-poster text-lg leading-none text-cream">${i.name}</p>
          <p class="mt-1 font-app text-[13px] text-mist">${i.sizeLabel} · ${i.house}${off ? ` · <span class="text-gold">Oferta −${pct} %</span>` : ""}</p>
          <button type="button" data-remove="${i.id}" class="mt-2 rounded-md border border-hair px-2.5 py-1 font-micro text-[11px] font-semibold text-cream">Quitar</button>
        </div>
        <div class="flex flex-col items-end justify-between">
          <p class="text-right"><span class="font-poster text-base text-cream">${money(i.price * i.qty)}</span>${off ? `<s class="block font-app text-[11px] text-mist">${money(listPrice * i.qty)}</s>` : ""}</p>
          <div class="flex items-center gap-2">
            <button type="button" data-qty="-1" data-id="${i.id}" class="flex h-7 w-7 items-center justify-center rounded-full bg-night text-cream">–</button>
            <span class="w-4 text-center font-poster text-base">${i.qty}</span>
            <button type="button" data-qty="1" data-id="${i.id}" class="flex h-7 w-7 items-center justify-center rounded-full bg-amber text-night">+</button>
          </div>
        </div>
      </article>`;
      })
      .join("");
  }
  document.querySelectorAll<HTMLElement>("[data-cart-saved]").forEach((el) => {
    el.textContent = cart.saved > 0 ? `Ahorrás ${money(cart.saved)} con las ofertas` : "";
    el.classList.toggle("hidden", cart.saved <= 0);
  });
  const ship = document.querySelector<HTMLElement>("[data-cart-ship]");
  const freeFrom = readLive()?.freeShippingFrom || 0;
  const showShip = Boolean(ship) && freeFrom > 0 && cart.count > 0;
  if (ship) {
    ship.classList.toggle("hidden", !showShip);
    if (showShip) {
      const text = ship.querySelector("[data-cart-ship-text]");
      const bar = ship.querySelector<HTMLElement>("[data-cart-ship-bar]");
      const link = ship.querySelector("[data-cart-ship-link]");
      const left = freeFrom - cart.total;
      if (text) {
        text.innerHTML =
          left > 0
            ? `Te faltan <b class="font-semibold text-gold">${money(left)}</b> para envío gratis.`
            : `<b class="font-semibold text-gold">Envío gratis</b> en este pedido.`;
      }
      if (bar) bar.style.width = `${Math.min(100, Math.round((cart.total / freeFrom) * 100))}%`;
      link?.classList.toggle("hidden", left <= 0);
    }
  }
  if (filled && empty) {
    filled.classList.toggle("hidden", cart.items.length === 0);
    empty.classList.toggle("hidden", cart.items.length > 0);
  }
  if (nudge) {
    nudge.classList.toggle("hidden", showShip || !(cart.count > 0 && cart.count < 3));
  }
}

let sheetPerfume: PerfumePayload | null = null;
let sheetSize: SizeKey = "3";
let ignoreUntil = 0;
let sheetClosing = false;
let sheetLockY = 0;

function blockBgScroll(e: Event) {
  if ((e.target as HTMLElement).closest("[data-sheet-panel]")) return;
  e.preventDefault();
}

function blockBgKeys(e: KeyboardEvent) {
  if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(e.key)) {
    if ((e.target as HTMLElement).closest("input, textarea, select")) return;
    e.preventDefault();
  }
}

function lockBackground() {
  sheetLockY = window.scrollY;
  document.addEventListener("wheel", blockBgScroll, { passive: false, capture: true });
  document.addEventListener("touchmove", blockBgScroll, { passive: false, capture: true });
  document.addEventListener("keydown", blockBgKeys, true);
}

function unlockBackground() {
  document.removeEventListener("wheel", blockBgScroll, { capture: true });
  document.removeEventListener("touchmove", blockBgScroll, { capture: true });
  document.removeEventListener("keydown", blockBgKeys, true);
  window.scrollTo({ top: sheetLockY, left: 0, behavior: "instant" });
}

function firstSize(sizes: PerfumePayload["sizes"]) {
  if (!sizes.length) return undefined;
  const ml = sizes.filter((s) => s.key !== "frasco");
  const pool = ml.length ? ml : sizes;
  return [...pool].sort((a, b) => (Number(a.key) || 9999) - (Number(b.key) || 9999))[0];
}

function openSheet(p: PerfumePayload) {
  if (sheetClosing) return;
  sheetPerfume = p;
  sheetSize = firstSize(p.sizes)?.key ?? p.sizes[0].key;
  const root = sheetRoot();
  if (!root) return;
  lockBackground();
  root.classList.remove("invisible", "pointer-events-none");
  root.classList.add("pointer-events-auto");
  openSheetMotion(root);
  const img = root.querySelector<HTMLImageElement>("[data-sheet-image]");
  if (img) {
    img.src = p.image;
    img.alt = p.name;
  }
  const house = root.querySelector("[data-sheet-house]");
  if (house) house.textContent = p.house.toUpperCase();
  const name = root.querySelector("[data-sheet-name]");
  if (name) name.textContent = p.name;
  renderSheetSizes();
}

async function closeSheet() {
  if (!sheetPerfume || sheetClosing) return;
  const root = sheetRoot();
  if (!root) return;
  sheetClosing = true;
  try {
    await closeSheetMotion(root);
    root.classList.add("invisible", "pointer-events-none");
    root.classList.remove("pointer-events-auto");
  } finally {
    unlockBackground();
    sheetPerfume = null;
    sheetClosing = false;
    ignoreUntil = Date.now() + 280;
  }
}

function renderSheetSizes() {
  const root = sheetRoot();
  const box = root?.querySelector("[data-sheet-sizes]");
  if (!root || !box || !sheetPerfume) return;
  box.innerHTML = sheetPerfume.sizes
    .map((s) => {
      const on = s.key === sheetSize;
      const off = Boolean(s.was);
      return `<button type="button" data-pick-size="${s.key}" class="flex w-full items-center justify-between rounded-lg px-3.5 py-3 ${on ? (off ? "bg-gold text-goldink" : "bg-amber text-night") : "bg-night text-cream"}">
        <span class="pointer-events-none text-left">
          <span class="font-poster block text-lg">${s.label}</span>
          <span class="font-app block text-xs ${on ? "text-[#3A2A18]" : "text-mist"}">${s.hint}</span>
        </span>
        <span class="pointer-events-none text-right">
          <span class="block font-poster text-xl ${s.was && !on ? "text-gold" : ""}">${money(s.price)}</span>
          ${s.was ? `<s class="block font-app text-[11px] opacity-60">${money(s.was)}</s>` : ""}
        </span>
      </button>`;
    })
    .join("");
  const size = sheetPerfume.sizes.find((s) => s.key === sheetSize);
  const confirm = root.querySelector<HTMLElement>("[data-sheet-confirm]");
  if (confirm && size) {
    confirm.innerHTML = `Sumar ${size.label} · ${money(size.price)}${size.was ? ` <s class="ml-2 font-app text-[12px] font-medium opacity-60">${money(size.was)}</s>` : ""}`;
    const promo = Boolean(size.was);
    confirm.classList.toggle("bg-gold", promo);
    confirm.classList.toggle("text-goldink", promo);
    confirm.classList.toggle("bg-amber", !promo);
    confirm.classList.toggle("text-night", !promo);
  }
}

let playWasShown = false;

function paintPlay(cart: Cart) {
  const bar = document.querySelector<HTMLElement>("[data-play-bar]");
  const main = document.querySelector<HTMLElement>("[data-app-main]");
  if (!bar) return;
  const onCart = Boolean(document.querySelector("[data-cart-page]"));
  const show = cart.count > 0 && !onCart;
  if (show !== playWasShown) {
    if (show) {
      bar.classList.remove("hidden", "pointer-events-none");
      bar.classList.add("flex", "pointer-events-auto");
      popPlay(bar, true);
    } else {
      popPlay(bar, false);
      window.setTimeout(() => {
        if (playWasShown) return;
        bar.classList.add("hidden", "pointer-events-none");
        bar.classList.remove("flex", "pointer-events-auto");
      }, 240);
    }
    playWasShown = show;
  }
  const count = bar.querySelector("[data-play-count]");
  const total = bar.querySelector("[data-play-total]");
  const hint = bar.querySelector("[data-play-hint]");
  if (count) count.textContent = String(cart.count);
  if (total) total.textContent = money(cart.total);
  if (hint) {
    hint.textContent = cart.count === 1 ? "Suma otro →" : cart.count === 2 ? "¡Uno más! →" : "Pedir →";
  }
  if (main) {
    main.dataset.play = show ? "on" : "off";
    main.style.paddingBottom = "";
  }
}

function flashAdd(el: HTMLElement | null, qty: number) {
  if (!el) return;
  if (!el.dataset.label) el.dataset.label = el.innerHTML || "";
  el.textContent = qty > 1 ? `Llevas ${qty}` : "Sumado";
  pressPop(el);
  window.setTimeout(() => {
    el.innerHTML = el.dataset.label || "";
    delete el.dataset.label;
  }, 900);
}

let comboMood = "todos";

function applyComboFilters() {
  const cards = document.querySelectorAll<HTMLElement>("[data-combo-card]");
  if (!cards.length) return;
  const para = currentGender();
  let visible = 0;
  cards.forEach((el) => {
    const g = el.getAttribute("data-combo-gender");
    const moods = (el.getAttribute("data-combo-moods") || "").split(",");
    const genderOk = para === "ambos" || g === para || g === "ambos";
    const moodOk = comboMood === "todos" || moods.includes(comboMood);
    const show = genderOk && moodOk;
    showCard(el, show);
    if (show) visible += 1;
  });
  document.querySelectorAll("[data-combo-count]").forEach((el) => {
    el.textContent = String(visible);
  });
  document.querySelectorAll<HTMLElement>("[data-filter-combo-mood]").forEach((btn) => {
    const on = btn.getAttribute("data-filter-combo-mood") === comboMood;
    btn.classList.toggle("bg-amber", on);
    btn.classList.toggle("text-night", on);
    btn.classList.toggle("bg-lift", !on);
    btn.classList.toggle("text-mist", !on);
  });
}

function currentPerfumePage() {
  const page = document.querySelector<HTMLElement>("[data-perfume-page]");
  if (!page) return null;
  const payload = JSON.parse(page.getAttribute("data-perfume-page") || "null") as PerfumePayload | null;
  const selected = (page.getAttribute("data-selected-size") as SizeKey) || firstSize(payload?.sizes || [])?.key || "";
  return { page, payload, selected };
}


let catalogLens = "all";

function paintPerfumeCta() {
  const ctx = currentPerfumePage();
  if (!ctx?.payload) return;
  const sizes = ctx.payload.sizes;
  const size = sizes.find((s) => s.key === ctx.selected);
  ctx.page.querySelectorAll<HTMLElement>("[data-select-size]").forEach((chip) => {
    const s = sizes.find((x) => x.key === chip.getAttribute("data-select-size"));
    if (!s) return;
    const on = s.key === ctx.selected;
    const off = Boolean(s.was);
    chip.classList.toggle("bg-gold", on && off);
    chip.classList.toggle("text-goldink", on && off);
    chip.classList.toggle("bg-amber", on && !off);
    chip.classList.toggle("text-night", on && !off);
    chip.classList.toggle("bg-lift", !on);
    chip.classList.toggle("text-cream", !on);
    const price = chip.querySelector("[data-price]");
    const was = chip.querySelector("[data-was]");
    if (price) {
      price.textContent = money(s.price);
      price.classList.toggle("text-gold", off && !on);
    }
    if (was) {
      was.textContent = s.was ? money(s.was) : "";
      was.classList.toggle("hidden", !s.was);
    }
  });
  const cta = ctx.page.querySelector<HTMLElement>("[data-perfume-cta]");
  if (cta && size) {
    delete cta.dataset.label;
    cta.innerHTML = `Sumar ${size.label} · ${money(size.price)}${size.was ? ` <s class="ml-2 font-app text-[12px] font-medium opacity-60">${money(size.was)}</s>` : ""}`;
    const promo = Boolean(size.was);
    cta.classList.toggle("bg-gold", promo);
    cta.classList.toggle("text-goldink", promo);
    cta.classList.toggle("bg-amber", !promo);
    cta.classList.toggle("text-night", !promo);
  }
  const save = ctx.page.querySelector<HTMLElement>("[data-save-line]");
  if (save) {
    const parts: string[] = [];
    if (size?.was) {
      parts.push(`Te ahorras <b class="font-semibold text-gold">${money(size.was - size.price)}</b>${ctx.payload.lastDay ? ` <b class="font-semibold text-gold">solo hoy</b>` : ""}`);
    }
    if (ctx.payload.lowStock) parts.push("Quedan pocos de este");
    save.innerHTML = parts.length ? `${parts.join(" · ")}.` : "";
    save.classList.toggle("hidden", !parts.length);
  }
}

function showCard(el: HTMLElement, show: boolean) {
  el.style.display = show ? "" : "none";
  if (show) el.style.opacity = "1";
}

function applyGenderFilter(para: string) {
  const items = document.querySelectorAll<HTMLElement>("[data-gender]");
  let visible = 0;
  items.forEach((el) => {
    const g = el.getAttribute("data-gender");
    const world = el.getAttribute("data-world") || "";
    const moods = (el.getAttribute("data-moods") || "").split(",");
    const genderOk = para === "ambos" || g === para || g === "ambos";
    let lensOk = true;
    if (catalogLens.startsWith("world:")) lensOk = world === catalogLens.slice(6);
    if (catalogLens.startsWith("mood:")) lensOk = moods.includes(catalogLens.slice(5));
    const show = genderOk && lensOk;
    showCard(el, show);
    if (show) visible += 1;
  });
  document.querySelectorAll("[data-catalog-count]").forEach((el) => {
    el.textContent = String(visible);
  });
  const who =
    para === "el" ? "ellos" : para === "ella" ? "ellas" : "todos";
  const lensKey = catalogLens.startsWith("world:")
    ? catalogLens.slice(6)
    : catalogLens.startsWith("mood:")
      ? catalogLens.slice(5)
      : "";
  const lensLabel: Record<string, string> = {
    disenador: "Diseño",
    nicho: "Nicho",
    arabes: "Árabes",
    noche: "Noche",
    dulce: "Dulce",
    fresco: "Fresco",
    oficina: "Oficina",
  };
  const lensName = lensLabel[lensKey] || lensKey;
  const line =
    catalogLens === "all"
      ? para === "el"
        ? "Lo que más piden ellos"
        : para === "ella"
          ? "Lo que más piden ellas"
          : "Lo que más piden"
      : `${lensName} · ${who}`;
  document.querySelectorAll("[data-who-line]").forEach((el) => {
    el.textContent = line;
  });
  sessionStorage.setItem(PARA_KEY, para);
  syncParaLinks(para);
  document.querySelectorAll<HTMLElement>("[data-who-bar] [data-filter-para]").forEach((btn) => {
    const on = btn.getAttribute("data-filter-para") === para;
    const stacked = Boolean(btn.closest("[data-who-stacked]"));
    btn.toggleAttribute("data-on", on);
    if (stacked) {
      btn.classList.remove("bg-amber", "text-night");
      return;
    }
    btn.classList.toggle("bg-amber", on);
    btn.classList.toggle("text-night", on);
    btn.classList.toggle("text-mist", !on);
  });
  document.querySelectorAll<HTMLElement>("[data-filter-catalog]").forEach((btn) => {
    const on = (btn.getAttribute("data-filter-catalog") || "all") === catalogLens;
    btn.classList.toggle("ring-2", on);
    btn.classList.toggle("ring-amber", on);
  });
  const url = new URL(window.location.href);
  if (para === "ambos") url.searchParams.delete("para");
  else url.searchParams.set("para", para);
  history.replaceState(null, "", url.pathname + url.search);
  rememberBrowse();
  applyComboFilters();
}

const PARA_KEY = "gr-para";

function withPara(href: string, para: string) {
  const url = new URL(href, location.origin);
  if (para && para !== "ambos") url.searchParams.set("para", para);
  else url.searchParams.delete("para");
  return url.pathname + url.search;
}

function syncParaLinks(para: string) {
  document.querySelectorAll<HTMLAnchorElement>("[data-keep-para]").forEach((a) => {
    const base = a.getAttribute("data-keep-para") || a.getAttribute("href") || "/";
    a.setAttribute("href", withPara(base, para));
  });
}

function currentGender() {
  const fromUrl = new URLSearchParams(window.location.search).get("para");
  if (fromUrl) return fromUrl;
  if (location.pathname.startsWith("/catalogo")) {
    return sessionStorage.getItem(PARA_KEY) || "ambos";
  }
  return "ambos";
}

function isCatalogPath(path: string) {
  const p = path.replace(/\/$/, "") || "/";
  return p === "/catalogo" || p.startsWith("/catalogo/");
}

function applyParaToUrl(url: URL, para = currentGender()) {
  if (!isCatalogPath(url.pathname)) return;
  if (para && para !== "ambos") url.searchParams.set("para", para);
  else url.searchParams.delete("para");
}

function setCartStep(step: "summary" | "checkout") {
  const page = document.querySelector<HTMLElement>("[data-cart-page]");
  if (!page) return;
  page.setAttribute("data-cart-step", step);
  page.querySelector("[data-step-summary]")?.classList.toggle("hidden", step !== "summary");
  page.querySelector("[data-step-checkout]")?.classList.toggle("hidden", step !== "checkout");
}

document.addEventListener(
  "pointerdown",
  (e) => {
    if (!sheetIsOpen()) return;
    const t = e.target as HTMLElement;
    if (t.closest("[data-sheet-panel]")) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    closeSheet();
  },
  true,
);

document.addEventListener(
  "click",
  (e) => {
    if (Date.now() < ignoreUntil) {
      e.preventDefault();
      e.stopPropagation();
    }
  },
  true,
);

function isListPath(path: string) {
  const p = path.replace(/\/$/, "") || "/";
  return p === "/catalogo" || p.startsWith("/catalogo/") || p === "/combos";
}

function isBrowsePath(path: string) {
  const p = path.replace(/\/$/, "") || "/";
  return p === "/" || isListPath(p);
}

const BROWSE_KEY = "gr-browse";

function rememberBrowse() {
  if (!isBrowsePath(location.pathname)) return;
  sessionStorage.setItem(BROWSE_KEY, location.pathname + location.search);
}

function lastBrowse(fallback = "/catalogo") {
  return sessionStorage.getItem(BROWSE_KEY) || fallback;
}

function paintBackLinks() {
  document.querySelectorAll<HTMLAnchorElement>("a[data-back-list]").forEach((a) => {
    a.setAttribute("href", lastBrowse(a.getAttribute("href") || "/catalogo"));
  });
}

function normPath(path: string) {
  return path.replace(/\/$/, "") || "/";
}

function isDetailPath(path: string) {
  const p = normPath(path);
  if (p.startsWith("/perfume/")) return true;
  if (p.startsWith("/combos/") && p !== "/combos") return true;
  return false;
}

function scrollKey(path = location.pathname) {
  return "gr-scroll:" + normPath(path);
}

const RESTORE_KEY = "gr-restore";

function saveListScroll() {
  if (!isListPath(location.pathname)) return;
  sessionStorage.setItem(scrollKey(), String(Math.round(window.scrollY)));
  sessionStorage.setItem(RESTORE_KEY, normPath(location.pathname));
}

function forgetListScroll(path: string) {
  sessionStorage.removeItem(scrollKey(path));
}

function restoreListScroll() {
  if (!isListPath(location.pathname)) return;
  const here = normPath(location.pathname);
  const marked = sessionStorage.getItem(RESTORE_KEY);
  const raw = sessionStorage.getItem(scrollKey());
  if (marked !== here || raw == null) {
    if (marked !== here) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    return;
  }
  const y = Number(raw);
  const go = () => window.scrollTo({ top: y, left: 0, behavior: "instant" });
  go();
  requestAnimationFrame(go);
  window.setTimeout(go, 40);
  window.setTimeout(go, 200);
  window.setTimeout(() => {
    if (sessionStorage.getItem(RESTORE_KEY) === here) sessionStorage.removeItem(RESTORE_KEY);
  }, 260);
}

function onLeaveFor(destPath: string) {
  const from = normPath(location.pathname);
  const dest = normPath(destPath);
  if (from === dest) return;
  if (isDetailPath(dest)) {
    if (isListPath(from)) saveListScroll();
    return;
  }
  const marked = sessionStorage.getItem(RESTORE_KEY);
  if (marked === dest) return;
  if (marked) forgetListScroll(marked);
  if (isListPath(from)) forgetListScroll(from);
  sessionStorage.removeItem(RESTORE_KEY);
}

document.addEventListener("astro:before-preparation", (e) => {
  const ev = e as Event & { to?: URL };
  if (ev.to) {
    applyParaToUrl(ev.to);
    onLeaveFor(ev.to.pathname);
  }
});

document.addEventListener(
  "click",
  (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
    if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
    try {
      const dest = new URL(a.getAttribute("href") || "", location.origin);
      if (dest.origin !== location.origin) return;
      if (!isCatalogPath(dest.pathname)) return;
      applyParaToUrl(dest);
      a.setAttribute("href", dest.pathname + dest.search);
    } catch {
      /* ignore */
    }
  },
  true,
);

document.addEventListener("click", (e) => {
  const t = e.target as HTMLElement;
  const link = t.closest<HTMLAnchorElement>("a[href]");
  if (link?.href) {
    try {
      const dest = new URL(link.href, location.origin);
      if (dest.origin === location.origin) onLeaveFor(dest.pathname);
    } catch {
      /* ignore */
    }
  }

  const genderBtn = t.closest<HTMLElement>("[data-filter-para]");
  if (genderBtn) {
    applyGenderFilter(genderBtn.getAttribute("data-filter-para") || "ambos");
    return;
  }

  const moodBtn = t.closest<HTMLElement>("[data-filter-combo-mood]");
  if (moodBtn) {
    comboMood = moodBtn.getAttribute("data-filter-combo-mood") || "todos";
    applyComboFilters();
    return;
  }

  const catalogBtn = t.closest<HTMLElement>("[data-filter-catalog]");
  if (catalogBtn) {
    catalogLens = catalogBtn.getAttribute("data-filter-catalog") || "all";
    applyGenderFilter(currentGender());
    return;
  }

  if (t.closest("[data-go-checkout]")) {
    setCartStep("checkout");
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  if (t.closest("[data-back-summary]")) {
    setCartStep("summary");
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  if (sheetIsOpen()) {
    if (t.closest("[data-sheet-close]")) {
      closeSheet();
      return;
    }
    const pick = t.closest<HTMLElement>("[data-pick-size]");
    if (pick && sheetPerfume) {
      sheetSize = pick.getAttribute("data-pick-size") as SizeKey;
      renderSheetSizes();
      return;
    }
    if (t.closest("[data-sheet-confirm]") && sheetPerfume) {
      const size = sheetPerfume.sizes.find((s) => s.key === sheetSize);
      if (!size) return;
      const confirm = t.closest<HTMLElement>("[data-sheet-confirm]") ?? t;
      flyToCart(confirm, sheetPerfume.image);
      addItem({
        slug: sheetPerfume.slug,
        name: sheetPerfume.name,
        house: sheetPerfume.house,
        size: size.key,
        sizeLabel: size.label,
        price: size.price,
        listPrice: size.was ?? size.price,
        promoId: size.promoId ?? null,
        image: sheetPerfume.image,
      });
      closeSheet();
      flashAdd(document.querySelector("[data-open-sheet]"), readCart().items.find((i) => i.slug === sheetPerfume?.slug)?.qty ?? 1);
    }
    return;
  }

  const open = t.closest<HTMLElement>("[data-open-sheet]");
  if (open) {
    e.preventDefault();
    const raw = open.getAttribute("data-open-sheet");
    if (raw) openSheet(JSON.parse(raw) as PerfumePayload);
    return;
  }

  const combo = t.closest<HTMLElement>("[data-add-combo]");
  if (combo) {
    const raw = combo.getAttribute("data-add-combo");
    if (!raw) return;
    const items = JSON.parse(raw) as Omit<CartItem, "id" | "qty">[];
    flyToCart(combo, items[0]?.image || "");
    items.forEach((item) => addItem(item));
    flashAdd(combo, 1);
    return;
  }

  const sizeChip = t.closest<HTMLElement>("[data-select-size]");
  if (sizeChip) {
    const ctx = currentPerfumePage();
    if (!ctx) return;
    const next = sizeChip.getAttribute("data-select-size") as SizeKey;
    ctx.page.setAttribute("data-selected-size", next);
    ctx.page.querySelectorAll<HTMLElement>("[data-select-size]").forEach((chip) => {
      const on = chip.getAttribute("data-select-size") === next;
      chip.classList.toggle("bg-amber", on);
      chip.classList.toggle("text-night", on);
      chip.classList.toggle("bg-lift", !on);
      chip.classList.toggle("text-cream", !on);
    });
    paintPerfumeCta();
    return;
  }

  if (t.closest("[data-perfume-cta]")) {
    const ctx = currentPerfumePage();
    if (!ctx?.payload || ctx.page.getAttribute("data-available") === "0") return;
    const size = ctx.payload.sizes.find((s) => s.key === ctx.selected);
    if (!size) return;
    const cta = t.closest<HTMLElement>("[data-perfume-cta]") ?? t;
    flyToCart(cta, ctx.payload.image);
    addItem({
      slug: ctx.payload.slug,
      name: ctx.payload.name,
      house: ctx.payload.house,
      size: size.key,
      sizeLabel: size.label,
      price: size.price,
      listPrice: size.was ?? size.price,
      promoId: size.promoId ?? null,
      image: ctx.payload.image,
    });
    const line = readCart().items.find((i) => i.slug === ctx.payload?.slug && i.size === size.key);
    flashAdd(cta, line?.qty ?? 1);
    return;
  }

  const qtyBtn = t.closest<HTMLElement>("[data-qty]");
  if (qtyBtn) {
    const id = qtyBtn.getAttribute("data-id");
    const delta = Number(qtyBtn.getAttribute("data-qty"));
    if (!id) return;
    const item = readCart().items.find((i) => i.id === id);
    if (!item) return;
    setQty(id, item.qty + delta);
    return;
  }

  const remove = t.closest<HTMLElement>("[data-remove]");
  if (remove) {
    e.preventDefault();
    e.stopPropagation();
    const id = remove.getAttribute("data-remove");
    if (id) removeItem(id);
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && sheetIsOpen()) {
    closeSheet();
    return;
  }
  const search = document.querySelector<HTMLInputElement>("[data-search]");
  if (!search || e.key !== "Enter" || e.target !== search) return;
  const q = search.value.trim();
  const base = search.getAttribute("data-search") || "/catalogo";
  const url = new URL(base, window.location.origin);
  if (q) url.searchParams.set("q", q);
  else url.searchParams.delete("q");
  const para = currentGender();
  if (para && para !== "ambos") url.searchParams.set("para", para);
  else url.searchParams.delete("para");
  window.location.href = url.pathname + url.search;
});

document.addEventListener("submit", (e) => {
  const form = (e.target as HTMLElement).closest<HTMLFormElement>("[data-checkout-form]");
  if (!form) return;
  e.preventDefault();
  const cart = readCart();
  if (cart.items.length === 0) return;
  const data = new FormData(form);
  window.open(
    whatsappUrl(
      orderMessage(cart, {
        name: String(data.get("name") || ""),
        phone: String(data.get("phone") || ""),
        city: String(data.get("city") || "Managua"),
        address: String(data.get("address") || ""),
        pay: String(data.get("pay") || "Transferencia"),
      }, { freeShippingFrom: readLive()?.freeShippingFrom || 0 }),
    ),
    "_blank",
  );
  writeCart([]);
  setCartStep("summary");
});

function hydrateLive() {
  const live = readLive();
  const now = Date.now();
  const map = new Map((live?.perfumes || []).map((p) => [p.slug, p]));
  const promos = live?.promotions || [];

  document.querySelectorAll<HTMLElement>("[data-slug]").forEach((el) => {
    const slug = el.getAttribute("data-slug") || "";
    const p = map.get(slug);
    const promo = activePromoFor(promos, slug, now);
    const btn = el.querySelector<HTMLElement>("[data-open-sheet]");
    let payload: PerfumePayload | null = null;
    try {
      payload = JSON.parse(btn?.getAttribute("data-open-sheet") || "null") as PerfumePayload | null;
    } catch {
      payload = null;
    }
    const available = p ? p.available : !el.querySelector("[data-agotado]:not(.hidden)");
    if (p) {
      el.querySelector("[data-agotado]")?.classList.toggle("hidden", p.available);
      el.querySelector("[data-soldout]")?.classList.toggle("hidden", p.available);
      btn?.classList.toggle("hidden", !p.available);
    }
    const base: PricedSize[] = p ? p.sizes : payload?.sizes || [];
    const sizes = applyPromo(base, available ? promo : null);
    if (btn && payload) {
      payload.sizes = sizes;
      payload.lowStock = p?.lowStock === true;
      btn.setAttribute("data-open-sheet", JSON.stringify(payload));
    }
    const hasPromo = available && Boolean(promo) && sizes.some((s) => s.was);
    const badge = el.querySelector<HTMLElement>("[data-promo-badge]");
    if (badge) {
      badge.classList.toggle("hidden", !hasPromo);
      if (hasPromo && promo) badge.innerHTML = badgeHtml(promo, base, now);
    }
    el.querySelector("[data-low-badge]")?.classList.toggle("hidden", !(available && p?.lowStock));
    const start = firstSize(sizes) ?? sizes[0];
    const line = el.querySelector("[data-price-line]");
    if (line && start) line.innerHTML = priceLine(start);
    el.querySelector("[data-world]")?.classList.toggle("max-md:hidden", Boolean(start?.was));
    if (btn) {
      btn.classList.toggle("bg-gold", hasPromo);
      btn.classList.toggle("text-goldink", hasPromo);
      btn.classList.toggle("bg-amber", !hasPromo);
      btn.classList.toggle("text-night", !hasPromo);
    }
  });

  const ctx = currentPerfumePage();
  if (ctx?.payload) {
    const p = map.get(ctx.payload.slug);
    const available = p ? p.available : ctx.page.getAttribute("data-available") !== "0";
    ctx.page.setAttribute("data-available", available ? "1" : "0");
    ctx.page.querySelector("[data-buy]")?.classList.toggle("hidden", !available);
    ctx.page.querySelector("[data-soldout-box]")?.classList.toggle("hidden", available);
    ctx.page.querySelector("[data-agotado-page]")?.classList.toggle("hidden", available);
    const promo = available ? activePromoFor(promos, ctx.payload.slug, now) : null;
    const base: PricedSize[] = p ? p.sizes : ctx.payload.sizes;
    const sizes = applyPromo(base, promo);
    ctx.payload.sizes = sizes;
    ctx.payload.lowStock = available && p?.lowStock === true;
    const hasPromo = Boolean(promo) && sizes.some((s) => s.was);
    const lastDay = hasPromo && promo ? endsToday(promo, now) : false;
    ctx.payload.lastDay = lastDay;
    ctx.page.setAttribute("data-perfume-page", JSON.stringify(ctx.payload));
    const badge = ctx.page.querySelector<HTMLElement>("[data-promo-badge]");
    if (badge) {
      badge.classList.toggle("hidden", !hasPromo);
      if (hasPromo && promo) badge.innerHTML = badgeHtml(promo, base, now);
    }
    const low = ctx.page.querySelector<HTMLElement>("[data-low-badge]");
    if (low) {
      low.classList.toggle("hidden", !ctx.payload.lowStock);
      low.classList.toggle("flex", ctx.payload.lowStock === true);
    }
    const lineEl = ctx.page.querySelector<HTMLElement>("[data-promo-line]");
    if (lineEl) {
      lineEl.classList.toggle("hidden", !hasPromo);
      if (hasPromo && promo) {
        const kicker = lineEl.querySelector("[data-promo-kicker]");
        const title = lineEl.querySelector("[data-promo-title]");
        const clock = lineEl.querySelector<HTMLElement>("[data-promo-clock]");
        const clockLabel = lineEl.querySelector("[data-promo-clock-label]");
        const cd = lineEl.querySelector("[data-promo-countdown]");
        const bar = lineEl.querySelector<HTMLElement>("[data-promo-bar]");
        const pct = sizes.reduce((m, s) => Math.max(m, s.was ? Math.round((1 - s.price / s.was) * 100) : 0), 0);
        if (kicker) kicker.textContent = lastDay ? "ÚLTIMO DÍA" : "OFERTA";
        if (title) title.textContent = promo.title.trim() || `−${pct} % de descuento`;
        clock?.classList.toggle("hidden", !promo.endsAt);
        if (bar) bar.style.width = promo.endsAt ? `${Math.round((1 - progress(promo, now)) * 100)}%` : "0%";
        lineEl.dataset.ends = promo.endsAt || "";
        if (promo.showCountdown) {
          lineEl.dataset.mode = lastDay ? "clock" : "coarse";
          if (clockLabel) clockLabel.textContent = "TERMINA EN";
          tickPromo();
        } else {
          lineEl.dataset.mode = "static";
          if (clockLabel) clockLabel.textContent = "TERMINA";
          if (cd) cd.textContent = lastDay ? `hoy, ${endHour(promo)}` : untilText(promo, now).replace(/^hasta /, "");
        }
      }
    }
    paintPerfumeCta();
  }
}

function hydratePayOptions() {
  const root = document.querySelector("[data-checkout-form]");
  if (!root) return;
  try {
    const raw = localStorage.getItem("montclair-admin-v2");
    if (!raw) return;
    const payments = JSON.parse(raw)?.store?.payments as
      | { transfer?: { on?: boolean } | boolean; mobile?: { on?: boolean } | boolean; cash?: { on?: boolean } | boolean }
      | undefined;
    if (!payments) return;
    const on = (v: { on?: boolean } | boolean | undefined, fallback: boolean) => {
      if (typeof v === "boolean") return v;
      if (v && typeof v === "object") return v.on !== false;
      return fallback;
    };
    const map: Record<string, boolean> = {
      transfer: on(payments.transfer, true),
      mobile: on(payments.mobile, true),
      cash: on(payments.cash, true),
    };
    root.querySelectorAll<HTMLElement>("[data-pay-option]").forEach((el) => {
      const key = el.getAttribute("data-pay-option") || "";
      const show = map[key] !== false;
      el.classList.toggle("hidden", !show);
      const input = el.querySelector<HTMLInputElement>("input");
      if (!show && input?.checked) input.checked = false;
    });
    const checked = root.querySelector<HTMLInputElement>("[data-pay-option]:not(.hidden) input:checked");
    if (!checked) {
      const first = root.querySelector<HTMLInputElement>("[data-pay-option]:not(.hidden) input");
      if (first) first.checked = true;
    }
  } catch {
    /* sin panel: se muestran las tres */
  }
}

const onReady = () => {
  playWasShown = false;
  paint();
  paintPerfumeCta();
  setCartStep("summary");
  applyGenderFilter(currentGender());
  applyComboFilters();
  rememberBrowse();
  paintBackLinks();
  revealPage();
  restoreListScroll();
  hydratePayOptions();
  hydrateLive();
};
window.addEventListener("storage", (e) => {
  if (e.key && e.key !== "montclair-admin-v2") return;
  hydrateLive();
  paint();
});
window.setInterval(tickPromo, 1000);
window.setInterval(() => {
  if (document.querySelector("[data-promo-line]:not(.hidden)")) hydrateLive();
}, 60000);
document.addEventListener("astro:after-swap", restoreListScroll);
document.addEventListener("astro:page-load", onReady);
onReady();
