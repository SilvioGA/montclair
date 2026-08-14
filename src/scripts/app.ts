import { itemId, totals, type Cart, type CartItem } from "../lib/cart";
import type { SizeKey } from "../data/catalog";
import { orderMessage, whatsappUrl } from "../lib/whatsapp";
import { money } from "../lib/money";
import { closeSheetMotion, flyToCart, openSheetMotion, popBadge, popPlay, pressPop, revealPage } from "./motion-ui";

const KEY = "cata-cart-v3";

type PerfumePayload = {
  slug: string;
  name: string;
  house: string;
  image: string;
  sizes: { key: SizeKey; label: string; price: number; hint: string }[];
};

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
      .map(
        (i) => `<article data-cart-item class="flex gap-3 rounded-xl bg-lift p-3" style="opacity:1">
        <img src="${i.image}" alt="" class="h-16 w-12 shrink-0 rounded-md object-cover bg-night" />
        <div class="min-w-0 flex-1">
          <p class="font-poster text-lg leading-none text-cream">${i.name}</p>
          <p class="mt-1 font-app text-[13px] text-mist">${i.sizeLabel} · ${i.house}</p>
          <button type="button" data-remove="${i.id}" class="mt-2 rounded-md border border-hair px-2.5 py-1 font-micro text-[11px] font-semibold text-cream">Quitar</button>
        </div>
        <div class="flex flex-col items-end justify-between">
          <p class="font-poster text-base text-cream">${money(i.price * i.qty)}</p>
          <div class="flex items-center gap-2">
            <button type="button" data-qty="-1" data-id="${i.id}" class="flex h-7 w-7 items-center justify-center rounded-full bg-night text-cream">–</button>
            <span class="w-4 text-center font-poster text-base">${i.qty}</span>
            <button type="button" data-qty="1" data-id="${i.id}" class="flex h-7 w-7 items-center justify-center rounded-full bg-amber text-night">+</button>
          </div>
        </div>
      </article>`,
      )
      .join("");
  }
  if (filled && empty) {
    filled.classList.toggle("hidden", cart.items.length === 0);
    empty.classList.toggle("hidden", cart.items.length > 0);
  }
  if (nudge) {
    nudge.classList.toggle("hidden", !(cart.count > 0 && cart.count < 3));
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

function openSheet(p: PerfumePayload) {
  if (sheetClosing) return;
  sheetPerfume = p;
  sheetSize = p.sizes.find((s) => s.key === "3")?.key ?? p.sizes[0].key;
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
      return `<button type="button" data-pick-size="${s.key}" class="flex w-full items-center justify-between rounded-lg px-3.5 py-3 ${on ? "bg-amber text-night" : "bg-night text-cream"}">
        <span class="pointer-events-none text-left">
          <span class="font-poster block text-lg">${s.label}</span>
          <span class="font-app block text-xs ${on ? "text-[#3A2A18]" : "text-mist"}">${s.hint}</span>
        </span>
        <span class="pointer-events-none font-poster text-xl">${money(s.price)}</span>
      </button>`;
    })
    .join("");
  const size = sheetPerfume.sizes.find((s) => s.key === sheetSize);
  const confirm = root.querySelector("[data-sheet-confirm]");
  if (confirm && size) confirm.textContent = `Sumar ${size.label} · ${money(size.price)}`;
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
  if (!el.dataset.label) el.dataset.label = el.textContent || "";
  el.textContent = qty > 1 ? `Llevas ${qty}` : "Sumado";
  pressPop(el);
  window.setTimeout(() => {
    el.textContent = el.dataset.label || "";
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
  const selected = (page.getAttribute("data-selected-size") as SizeKey) || "3";
  return { page, payload, selected };
}

function paintPerfumeCta() {
  const ctx = currentPerfumePage();
  if (!ctx?.payload) return;
  const size = ctx.payload.sizes.find((s) => s.key === ctx.selected);
  const cta = ctx.page.querySelector("[data-perfume-cta]");
  if (cta && size) cta.textContent = `Sumar ${size.label} · ${money(size.price)}`;
}

let catalogLens = "all";

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
    if (!ctx?.payload) return;
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
      }),
    ),
    "_blank",
  );
});

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
};
document.addEventListener("astro:after-swap", restoreListScroll);
document.addEventListener("astro:page-load", onReady);
onReady();
