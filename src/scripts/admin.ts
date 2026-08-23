import {
  COVERS,
  GENDERS,
  IMAGES,
  MOODS,
  RELATED_MAX,
  SOCIAL_PRESETS,
  STORE_PANES,
  SYMBOLS,
  WORLDS,
  enter,
  genderLabel,
  isIn,
  leave,
  loadState,
  money,
  nextMl,
  resetState,
  saveState,
  slugify,
  waDisplay,
  worldLabel,
  type Collection,
  type StoreData,
  type StorePane,
  type SymbolPlace,
} from "../lib/admin-data";

import {
  isBottle,
  moodLabel,
  normalizeSize,
  smallestSize,
  type Combo,
  type Gender,
  type Mood,
  type Perfume,
  type SizeOption,
  type World,
} from "../data/catalog";

let state = loadState();
let view = "perfumes";
let storePane: StorePane = "pagos";
const filters = { q: "", stock: "all", gender: "all", world: "all" };
let toastTimer = 0;

function $(sel: string, root: ParentNode = document) {
  return root.querySelector(sel) as HTMLElement | null;
}

function cash(n: number) {
  return money(n, state.store.symbol, state.store.symbolPlace);
}

function toast(text: string) {
  const el = $("[data-toast]");
  if (!el) return;
  el.textContent = text;
  el.classList.remove("hidden");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.add("hidden"), 2200);
}

function field(label: string, inner: string) {
  return `<label class="block cursor-pointer"><span class="font-app text-[13px] text-mist">${label}</span>${inner}</label>`;
}

function input(name: string, value: string, extra = "") {
  return `<input name="${name}" value="${value.replace(/"/g, "&quot;")}" ${extra} class="mt-1.5 h-11 w-full rounded-xl bg-night px-3 font-app text-[15px] outline-none ring-1 ring-white/10" />`;
}

function area(name: string, value: string, rows = 3) {
  return `<textarea name="${name}" rows="${rows}" class="mt-1.5 w-full rounded-xl bg-night px-3 py-3 font-app text-[15px] outline-none ring-1 ring-white/10">${value}</textarea>`;
}

function select(name: string, options: { value: string; label: string }[], current: string, tight = false) {
  return `<select name="${name}" class="${tight ? "h-10" : "mt-1.5 h-11"} w-full cursor-pointer rounded-xl bg-night px-3 font-app text-[15px] outline-none ring-1 ring-white/10">${options
    .map((o) => `<option value="${o.value}" ${o.value === current ? "selected" : ""}>${o.label}</option>`)
    .join("")}</select>`;
}

function iconClose(attrs: string, label: string) {
  return `<button type="button" ${attrs} class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-mist hover:bg-white/10 hover:text-cream" aria-label="${label}">
    <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
  </button>`;
}

function imagePicker(name: string, current: string, pool: string[]) {
  const all = current && !pool.includes(current) ? [current, ...pool] : pool;
  const src = current || pool[0];
  return `<div>
    <input type="hidden" name="${name}" value="${src}" />
    <div class="grid grid-cols-5 gap-2">
      ${all
        .map(
          (item) => `<button type="button" data-set-image="${item}" data-image-field="${name}" class="cursor-pointer overflow-hidden rounded-lg ring-2 ${item === src ? "ring-cream" : "ring-transparent hover:ring-white/25"}">
        <img src="${item}" alt="" class="h-14 w-full object-cover" />
      </button>`,
        )
        .join("")}
    </div>
  </div>`;
}

const PRODUCT_SHOTS = IMAGES.filter((src) => !src.includes("combo-"));
const COMBO_SHOTS = IMAGES.filter((src) => src.includes("combo-"));

function btnGhost(label: string, extra = "") {
  return `<button type="button" ${extra} class="inline-flex h-9 cursor-pointer items-center rounded-full px-3.5 font-micro text-[11px] font-semibold tracking-[0.08em] text-cream ring-1 ring-white/20 hover:bg-white/10">${label}</button>`;
}

function switchCtl(on: boolean, extra: string) {
  return `<button type="button" ${extra} class="flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors ${on ? "bg-cream" : "bg-white/15"}" aria-pressed="${on}">
    <span class="block h-6 w-6 rounded-full bg-night transition-transform ${on ? "translate-x-5" : "translate-x-0"}"></span>
  </button>`;
}

function storeCard(p: Perfume) {
  const start = smallestSize(p);
  return `<div>
    <p class="mb-3 font-micro text-[10px] font-semibold tracking-[0.18em] text-mist">EN LA TIENDA</p>
    <div class="overflow-hidden rounded-xl bg-night">
      <div class="relative">
        <img src="${p.image}" alt="" class="h-[180px] w-full object-cover" />
        ${p.available ? "" : `<span class="absolute left-3 top-3 rounded-full bg-[#c43b3b] px-2 py-0.5 font-micro text-[10px] font-semibold text-cream">Agotado</span>`}
      </div>
      <div class="p-4">
        <p class="font-micro text-[10px] font-semibold tracking-[0.12em] text-mist">${(p.house || "Casa").toUpperCase()}</p>
        <p class="mt-1 font-poster text-[22px] leading-tight text-cream">${p.name || "Sin nombre"}</p>
        <p class="mt-2 font-app text-[13px] text-mist">${p.available ? `${start?.label || "—"} · ${start ? cash(start.price) : "—"}` : "Hoy no hay"}</p>
        <div class="mt-4 flex h-11 items-center justify-center rounded-md bg-cream font-micro text-[12px] font-semibold text-night">${p.available ? "Sumar" : "Hoy no hay"}</div>
      </div>
    </div>
    <div class="mt-3 grid grid-cols-2 gap-2">
      ${
        p.sizes.length
          ? p.sizes
              .map(
                (s) => `<div class="rounded-lg bg-night px-2.5 py-2.5 text-center">
            <p class="font-micro text-[10px] text-mist">${s.label}</p>
            <p class="mt-0.5 font-poster text-[17px] tabular-nums text-cream">${cash(s.price)}</p>
          </div>`,
              )
              .join("")
          : `<p class="col-span-2 font-app text-xs text-mist">Sin medidas</p>`
      }
    </div>
  </div>`;
}

function sectionKicker(text: string) {
  return `<p class="font-micro text-[10px] font-semibold tracking-[0.18em] text-mist">${text}</p>`;
}

function switchField(name: string, on: boolean, title: string, hint: string) {
  return `<label class="flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-night px-4 py-3">
    <span>
      <span class="block font-app text-[15px] text-cream">${title}</span>
      <span class="mt-0.5 block font-app text-[12px] leading-relaxed text-mist">${hint}</span>
    </span>
    <span class="relative h-7 w-12 shrink-0">
      <input type="checkbox" name="${name}" ${on ? "checked" : ""} class="peer sr-only" />
      <span class="absolute inset-0 rounded-full bg-white/15 peer-checked:bg-cream"></span>
      <span class="absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-night transition-transform peer-checked:translate-x-5"></span>
    </span>
  </label>`;
}

function openModal(html: string, maxWidth = "920px", compact = false) {
  const modal = $("[data-modal]");
  const form = $("[data-modal-form]");
  const panel = $("[data-modal-panel]");
  if (!modal || !form) return;
  if (panel) {
    (panel as HTMLElement).style.maxWidth = maxWidth;
    (panel as HTMLElement).style.maxHeight = compact ? "min(calc(100dvh - 1.5rem), 90dvh)" : "calc(100dvh - 1.5rem)";
  }
  form.classList.toggle("flex-1", !compact);
  form.classList.toggle("overflow-hidden", !compact);
  form.classList.toggle("overflow-y-auto", compact);
  form.innerHTML = html;
  modal.classList.remove("hidden");
  document.body.classList.add("admin-lock");
  bindModalPreview();
  bindComboSizeSync();
}

function closeModal() {
  $("[data-modal]")?.classList.add("hidden");
  document.body.classList.remove("admin-lock");
  const form = $("[data-modal-form]");
  if (form) form.innerHTML = "";
}

let confirmWait: ((ok: boolean) => void) | null = null;

function ask(title: string, body: string, ok = "Quitar") {
  const root = $("[data-confirm]");
  const titleEl = $("[data-confirm-title]");
  const bodyEl = $("[data-confirm-body]");
  const yes = $("[data-confirm-yes]");
  if (!root || !titleEl || !bodyEl || !yes) return Promise.resolve(false);
  titleEl.textContent = title;
  bodyEl.textContent = body;
  yes.textContent = ok;
  root.classList.remove("hidden");
  return new Promise<boolean>((resolve) => {
    confirmWait = resolve;
  });
}

function endAsk(ok: boolean) {
  $("[data-confirm]")?.classList.add("hidden");
  const done = confirmWait;
  confirmWait = null;
  done?.(ok);
}

function confirmOpen() {
  return Boolean($("[data-confirm]") && !$("[data-confirm]")!.classList.contains("hidden"));
}

function sizesFromForm(form: HTMLFormElement): SizeOption[] {
  const data = new FormData(form);
  const sizes: SizeOption[] = [];
  for (let i = 0; i < 40; i++) {
    const kind = data.get(`size_kind_${i}`);
    if (kind === null) continue;
    if (String(kind) === "bottle") continue;
    const ml = Number(data.get(`size_ml_${i}`));
    if (!Number.isFinite(ml) || ml <= 0) continue;
    sizes.push(
      normalizeSize({
        key: String(ml),
        price: Number(data.get(`size_price_${i}`) || 0),
        kind: "ml",
        ml,
      }),
    );
  }
  if (data.get("has_bottle") === "on") {
    sizes.push(
      normalizeSize({
        key: "frasco",
        price: Number(data.get("bottle_price") || 0),
        hint: "Si ya lo conoces. Precio estimado.",
        kind: "bottle",
      }),
    );
  }
  const seen = new Set<string>();
  return sizes.filter((s) => {
    if (seen.has(s.key)) return false;
    seen.add(s.key);
    return true;
  });
}

function sizeRows(sizes: SizeOption[]) {
  const mls = sizes.filter((s) => !isBottle(s));
  if (!mls.length) {
    return `<p class="font-app text-[13px] text-mist">Sin decants. Sumá una medida o dejá solo el frasco.</p>`;
  }
  return mls
    .map(
      (s, i) => `<div class="grid grid-cols-[6.5rem_minmax(0,1fr)_auto] items-end gap-2">
        <div>${field("ml", input(`size_ml_${i}`, String(s.ml ?? s.key), 'type="number" min="0.5" step="0.5"'))}<input type="hidden" name="size_kind_${i}" value="ml" /></div>
        ${field(`Precio (${state.store.symbol})`, input(`size_price_${i}`, String(s.price || 0), 'type="number" min="0"'))}
        <div class="mb-0.5">${iconClose(`data-size-remove="${i}"`, "Quitar medida")}</div>
      </div>`,
    )
    .join("");
}

function bottleBlock(bottle?: SizeOption) {
  const on = Boolean(bottle);
  return `<div class="mt-6 border-t border-white/10 pt-5">
    <label class="flex cursor-pointer items-center justify-between gap-4">
      <span>
        <span class="block font-app text-[15px] text-cream">También el frasco</span>
        <span class="mt-1 block font-app text-[12px] leading-relaxed text-mist">El botón de abajo en la ficha. No es otro perfume: es el mismo, completo.</span>
      </span>
      <span class="relative h-7 w-12 shrink-0">
        <input type="checkbox" name="has_bottle" ${on ? "checked" : ""} class="peer sr-only" />
        <span class="absolute inset-0 rounded-full bg-white/15 peer-checked:bg-cream"></span>
        <span class="absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-night transition-transform peer-checked:translate-x-5"></span>
      </span>
    </label>
    <div data-bottle-fields class="mt-4 ${on ? "" : "hidden"}">
      ${field(`Precio del frasco (${state.store.symbol})`, input("bottle_price", String(bottle?.price || 0), 'type="number" min="0"'))}
    </div>
  </div>`;
}

function relatedBox(selected: string[], self?: string) {
  const chosen = selected.slice(0, RELATED_MAX);
  const used = new Set(chosen);
  const rest = state.perfumes.filter((p) => p.slug !== self && !used.has(p.slug));
  const slot = (i: number) => {
    const slug = chosen[i];
    const p = slug ? state.perfumes.find((x) => x.slug === slug) : undefined;
    if (p) {
      return `<div class="flex items-center gap-3 py-2">
        <img src="${p.image}" alt="" class="h-11 w-8 rounded-md object-cover" />
        <span class="min-w-0 flex-1">
          <span class="block truncate font-app text-[15px] text-cream">${p.name}</span>
          <span class="block font-app text-[12px] text-mist">${p.house}</span>
        </span>
        <input type="hidden" name="related" value="${p.slug}" />
        ${iconClose(`data-related-remove="${p.slug}"`, `Quitar ${p.name}`)}
      </div>`;
    }
    if (i !== chosen.length || chosen.length >= RELATED_MAX) return "";
    return `<label class="block">
      <span class="sr-only">Sumar a la ficha</span>
      <select data-related-add class="h-11 w-full cursor-pointer rounded-xl bg-night px-3 font-app text-[15px] outline-none ring-1 ring-white/10">
        <option value="">Elegir el ${i === 0 ? "primero" : "segundo"}…</option>
        ${rest.map((x) => `<option value="${x.slug}">${x.name}</option>`).join("")}
      </select>
    </label>`;
  };
  return `<div data-related-box class="divide-y divide-white/10 border-y border-white/10">${slot(0)}${slot(1)}</div>`;
}

function perfumeFromForm(form: HTMLFormElement): Perfume {
  const data = new FormData(form);
  const existing = String(data.get("slug") || "");
  const name = String(data.get("name") || "");
  const sizes = sizesFromForm(form);
  return {
    slug: existing || slugify(name),
    name,
    house: String(data.get("house") || ""),
    smell: String(data.get("smell") || ""),
    gender: String(data.get("gender") || "el") as Gender,
    world: String(data.get("world") || "disenador") as World,
    moods: data.getAll("moods").map(String) as Mood[],
    image: String(data.get("image") || IMAGES[0]),
    available: data.get("available") === "on",
    related: data.getAll("related").map(String).filter(Boolean).slice(0, RELATED_MAX),
    sizes,
  };
}

function paintLiveCard() {
  const form = $("[data-modal-form]") as HTMLFormElement | null;
  const live = form?.querySelector("[data-live-card]");
  if (!form || !live) return;
  live.innerHTML = storeCard(perfumeFromForm(form));
}

function bindModalPreview() {
  const form = $("[data-modal-form]") as HTMLFormElement | null;
  if (!form) return;
  const live = form.querySelector("[data-live-card]");
  if (live) {
    form.addEventListener("input", paintLiveCard);
    form.addEventListener("change", (e) => {
      const t = e.target as HTMLInputElement;
      if (t.name === "has_bottle") {
        form.querySelector("[data-bottle-fields]")?.classList.toggle("hidden", !t.checked);
      }
      paintLiveCard();
    });
  }
  bindCollectionPreview();
}

function collectionBanner(name: string, intro: string, cover: string) {
  return `<div class="relative h-40 overflow-hidden rounded-xl bg-night">
    <img src="${cover}" alt="" class="h-full w-full object-cover object-[center_right]" />
    <div class="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent"></div>
    <div class="absolute inset-y-0 left-0 flex w-[70%] flex-col justify-center px-5">
      <p class="font-micro text-[10px] font-semibold tracking-[0.2em] text-mist">COLECCIÓN</p>
      <p class="mt-1 font-brand text-[28px] uppercase leading-none text-cream">${name || "Sin nombre"}</p>
      <p class="mt-2 line-clamp-2 font-app text-[13px] text-cream/70">${intro || "El texto que se lee sobre la foto."}</p>
    </div>
  </div>`;
}

function bindCollectionPreview() {
  const form = $("[data-modal-form]") as HTMLFormElement | null;
  const live = form?.querySelector("[data-live-cover]");
  if (!form || !live) return;
  const paint = () => {
    const data = new FormData(form);
    live.innerHTML = collectionBanner(String(data.get("name") || ""), String(data.get("intro") || ""), String(data.get("cover") || COVERS[0]));
  };
  form.addEventListener("input", paint);
  form.addEventListener("change", paint);
}

function comboSizeOptions(slug: string) {
  const p = state.perfumes.find((x) => x.slug === slug);
  if (!p?.sizes.length) return [{ value: "5", label: "5 ml" }];
  return p.sizes.map((s) => ({ value: s.key, label: s.label }));
}

function preferredSize(slug: string) {
  const p = state.perfumes.find((x) => x.slug === slug);
  if (!p?.sizes.length) return "5";
  return (p.sizes.find((s) => s.key === "5") ?? p.sizes.find((s) => !isBottle(s)) ?? p.sizes[0]).key;
}

function comboItemsFromForm(form: HTMLFormElement): Combo["items"] {
  const items: Combo["items"] = [];
  form.querySelectorAll<HTMLSelectElement>("[name^='item_slug_']").forEach((sel) => {
    const i = sel.name.replace("item_slug_", "");
    const size = (form.querySelector(`[name="item_size_${i}"]`) as HTMLSelectElement | null)?.value || preferredSize(sel.value);
    if (sel.value) items.push({ slug: sel.value, size });
  });
  return items;
}

function comboSlot(i: number, slug: string, size: string) {
  const opts = state.perfumes.map((p) => ({ value: p.slug, label: p.name }));
  const perfume = state.perfumes.find((x) => x.slug === slug);
  const sizes = comboSizeOptions(slug);
  const sizeVal = sizes.some((x) => x.value === size) ? size : sizes[0]?.value || "5";
  return `<div class="flex items-center gap-3 py-3">
    <img data-combo-thumb="${i}" src="${perfume?.image || ""}" alt="" class="h-12 w-9 rounded-md object-cover" />
    <div class="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,1fr)_7rem]">
      ${select(`item_slug_${i}`, opts, slug, true)}
      ${select(`item_size_${i}`, sizes, sizeVal, true)}
    </div>
    ${iconClose(`data-combo-remove="${i}"`, "Quitar del pack")}
  </div>`;
}

function comboRunningTotal(form: HTMLElement) {
  let sum = 0;
  form.querySelectorAll<HTMLSelectElement>("[name^='item_slug_']").forEach((sel) => {
    const i = sel.name.replace("item_slug_", "");
    const size = (form.querySelector(`[name="item_size_${i}"]`) as HTMLSelectElement | null)?.value || "";
    const p = state.perfumes.find((x) => x.slug === sel.value);
    sum += p ? p.sizes.find((s) => s.key === size)?.price ?? 0 : 0;
    const thumb = form.querySelector<HTMLImageElement>(`[data-combo-thumb="${i}"]`);
    if (thumb && p) thumb.src = p.image;
  });
  const hint = form.querySelector("[data-combo-sum]");
  if (hint) hint.textContent = cash(sum);
}

function bindComboSizeSync() {
  const form = $("[data-modal-form]");
  if (!form?.querySelector("[data-combo-items]")) return;
  if (form.getAttribute("data-combo-bound") === "1") {
    comboRunningTotal(form);
    return;
  }
  form.setAttribute("data-combo-bound", "1");
  form.addEventListener("change", (e) => {
    const t = e.target as HTMLSelectElement;
    if (t.name?.startsWith("item_slug_")) {
      const i = t.name.replace("item_slug_", "");
      const sizeSel = form.querySelector<HTMLSelectElement>(`[name="item_size_${i}"]`);
      if (sizeSel) {
        const opts = comboSizeOptions(t.value);
        const keep = opts.some((o) => o.value === sizeSel.value) ? sizeSel.value : opts[0]?.value || "";
        sizeSel.innerHTML = opts.map((o) => `<option value="${o.value}" ${o.value === keep ? "selected" : ""}>${o.label}</option>`).join("");
      }
    }
    if (t.name?.startsWith("item_slug_") || t.name?.startsWith("item_size_")) comboRunningTotal(form);
  });
  comboRunningTotal(form);
}

function persist() {
  saveState(state);
}

function setView(next: string) {
  if (view === "store" && next !== "store") captureStore();
  view = next;
  closeModal();
  document.querySelectorAll("[data-view]").forEach((el) => {
    el.classList.toggle("hidden", el.getAttribute("data-view") !== next);
  });
  document.querySelectorAll("[data-nav]").forEach((el) => {
    const on = el.getAttribute("data-nav") === next;
    el.classList.toggle("bg-cream", on);
    el.classList.toggle("text-night", on);
    el.classList.toggle("text-mist", !on);
  });
  paint();
}

function filteredPerfumes() {
  const q = filters.q.trim().toLowerCase();
  return state.perfumes.filter((p) => {
    if (q && !`${p.name} ${p.house}`.toLowerCase().includes(q)) return false;
    if (filters.stock === "on" && !p.available) return false;
    if (filters.stock === "off" && p.available) return false;
    if (filters.gender !== "all") {
      if (filters.gender === "ambos") {
        if (p.gender !== "ambos") return false;
      } else if (p.gender !== filters.gender && p.gender !== "ambos") return false;
    }
    if (filters.world !== "all" && p.world !== filters.world) return false;
    return true;
  });
}

function paint() {
  paintPerfumes();
  paintCombos();
  paintCollections();
  paintStore();
}

function measurePills(p: Perfume) {
  if (!p.sizes.length) return `<span class="font-app text-[12px] text-mist">Sin medidas</span>`;
  return `<span class="flex flex-wrap gap-1">${p.sizes
    .map((s) => `<span class="rounded-full bg-white/[0.06] px-2 py-0.5 font-micro text-[10px] tracking-[0.06em] text-mist">${s.label}</span>`)
    .join("")}</span>`;
}

function stockSwitch(p: Perfume) {
  const on = p.available;
  return `<button type="button" data-stock="${p.slug}" class="flex h-7 w-12 cursor-pointer items-center rounded-full p-0.5 transition-colors ${on ? "bg-cream" : "bg-white/15"}" aria-pressed="${on}" aria-label="${on ? "En venta" : "Agotado"}">
    <span class="block h-6 w-6 rounded-full bg-night transition-transform ${on ? "translate-x-5" : "translate-x-0"}"></span>
  </button>`;
}

function paintPerfumes() {
  const list = $("[data-list='perfumes']");
  const count = $("[data-filter-count]");
  if (!list) return;
  const rows = filteredPerfumes();
  if (count) count.textContent = `${rows.length} de ${state.perfumes.length}`;
  if (!rows.length) {
    list.innerHTML = `<p class="rounded-2xl bg-lift px-5 py-10 text-center font-app text-sm text-mist">Nada con esos filtros.</p>`;
    return;
  }
  const cards = `<div class="grid gap-3 md:hidden">${rows
    .map((p) => {
      const start = smallestSize(p);
      return `<article class="flex gap-3 rounded-2xl bg-lift p-3">
        <button type="button" data-preview="${p.slug}" class="shrink-0 cursor-pointer">
          <img src="${p.image}" alt="" class="h-[88px] w-16 rounded-lg object-cover" />
        </button>
        <div class="min-w-0 flex-1">
          <p class="font-micro text-[10px] font-semibold tracking-[0.12em] text-mist">${p.house.toUpperCase()}</p>
          <button type="button" data-preview="${p.slug}" class="mt-0.5 block text-left font-poster text-lg leading-tight text-cream">${p.name}</button>
          <p class="mt-1 font-poster text-[15px] tabular-nums text-cream">${cash(start.price)}</p>
          <div class="mt-2">${measurePills(p)}</div>
          <div class="mt-3 flex items-center justify-between">
            ${stockSwitch(p)}
            ${btnGhost("Editar", `data-edit="perfume" data-slug="${p.slug}"`)}
          </div>
        </div>
      </article>`;
    })
    .join("")}</div>`;
  const table = `<div class="hidden overflow-hidden rounded-2xl ring-1 ring-white/10 md:block">
    <table class="w-full text-left">
      <thead>
        <tr class="border-b border-white/10 font-micro text-[10px] font-semibold tracking-[0.14em] text-mist">
          <th class="px-5 py-3 font-medium">Perfume</th>
          <th class="px-3 py-3 font-medium">Desde</th>
          <th class="px-3 py-3 font-medium">Medidas</th>
          <th class="px-3 py-3 font-medium">Stock</th>
          <th class="px-5 py-3 font-medium"></th>
        </tr>
      </thead>
      <tbody>${rows
        .map((p) => {
          const start = smallestSize(p);
          return `<tr class="border-b border-white/5 hover:bg-white/[0.03]">
            <td class="px-5 py-3">
              <button type="button" data-preview="${p.slug}" class="flex cursor-pointer items-center gap-3 text-left">
                <img src="${p.image}" alt="" class="h-14 w-11 rounded-md object-cover" />
                <span>
                  <span class="block font-micro text-[10px] font-semibold tracking-[0.12em] text-mist">${p.house.toUpperCase()}</span>
                  <span class="mt-0.5 block font-poster text-[17px] leading-tight text-cream">${p.name}</span>
                </span>
              </button>
            </td>
            <td class="px-3 py-3 font-poster text-[17px] tabular-nums text-cream">${cash(start.price)}</td>
            <td class="px-3 py-3">${measurePills(p)}</td>
            <td class="px-3 py-3">${stockSwitch(p)}</td>
            <td class="px-5 py-3 text-right">${btnGhost("Editar", `data-edit="perfume" data-slug="${p.slug}"`)}</td>
          </tr>`;
        })
        .join("")}
      </tbody>
    </table>
  </div>`;
  list.innerHTML = cards + table;
}

function comboPartsTotal(c: Combo) {
  return c.items.reduce((sum, item) => {
    const p = state.perfumes.find((x) => x.slug === item.slug);
    return sum + (p ? p.sizes.find((s) => s.key === item.size)?.price ?? 0 : 0);
  }, 0);
}

function comboTotal(c: Combo) {
  return typeof c.price === "number" && Number.isFinite(c.price) && c.price > 0 ? c.price : comboPartsTotal(c);
}

function paintCombos() {
  const list = $("[data-list='combos']");
  if (!list) return;
  const rows = state.combos.map((c) => {
    const broken = c.items.some((i) => {
      const p = state.perfumes.find((x) => x.slug === i.slug);
      return !p || p.available === false || !p.sizes.some((s) => s.key === i.size);
    });
    const names = c.items
      .map((i) => {
        const p = state.perfumes.find((x) => x.slug === i.slug);
        const size = p?.sizes.find((s) => s.key === i.size);
        return `${p?.name ?? i.slug} ${size?.label ?? i.size}`;
      })
      .join(" · ");
    return { c, broken, names };
  });
  list.innerHTML = `<div class="grid gap-3 md:hidden">${rows
    .map(
      ({ c, broken, names }) => `<article class="rounded-2xl bg-lift p-3">
      <div class="flex gap-3">
        <img src="${c.image}" alt="" class="h-16 w-[4.5rem] rounded-lg object-cover" />
        <div class="min-w-0 flex-1">
          <p class="font-poster text-lg text-cream">${c.name}</p>
          <p class="mt-1 font-poster text-[17px] text-cream">${cash(comboTotal(c))}</p>
          <p class="mt-1 font-app text-[12px] text-mist">${names}</p>
        </div>
      </div>
      <div class="mt-3 flex items-center justify-between">
        <p class="font-micro text-[11px] font-semibold ${broken ? "text-[#e05a5a]" : "text-mist"}">${broken ? "Falta un perfume" : "Listo"}</p>
        ${btnGhost("Editar", `data-edit="combo" data-slug="${c.slug}"`)}
      </div>
    </article>`,
    )
    .join("")}</div>
  <div class="hidden overflow-hidden rounded-2xl ring-1 ring-white/10 md:block">
    <table class="w-full text-left">
      <thead>
        <tr class="border-b border-white/10 bg-white/[0.03] font-micro text-[10px] font-semibold tracking-[0.14em] text-mist">
          <th class="px-4 py-3 font-medium">Combo</th>
          <th class="px-3 py-3 font-medium">Lleva</th>
          <th class="px-3 py-3 font-medium">Total</th>
          <th class="px-3 py-3 font-medium">Estado</th>
          <th class="px-4 py-3 font-medium"></th>
        </tr>
      </thead>
      <tbody>${rows
        .map(({ c, broken, names }) => {
          return `<tr class="border-b border-white/5 hover:bg-white/[0.03]">
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <img src="${c.image}" alt="" class="h-14 w-[4.5rem] rounded-md object-cover" />
                <div>
                  <p class="font-poster text-lg text-cream">${c.name}</p>
                  <p class="font-app text-xs text-mist">${genderLabel(c.gender)}</p>
                </div>
              </div>
            </td>
            <td class="max-w-sm px-3 py-3 font-app text-[13px] text-mist">${names}</td>
            <td class="px-3 py-3 font-poster text-[18px] text-cream">${cash(comboTotal(c))}</td>
            <td class="px-3 py-3 font-micro text-[11px] font-semibold ${broken ? "text-[#e05a5a]" : "text-cream"}">${broken ? "Falta un perfume" : "Listo"}</td>
            <td class="px-4 py-3 text-right">${btnGhost("Editar", `data-edit="combo" data-slug="${c.slug}"`)}</td>
          </tr>`;
        })
        .join("")}
      </tbody>
    </table>
  </div>`;
}

function paintCollections() {
  const list = $("[data-list='collections']");
  if (!list) return;
  list.innerHTML = `<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">${state.collections
    .map((c) => {
      const count =
        c.kind === "world"
          ? state.perfumes.filter((p) => p.world === c.world).length
          : state.perfumes.filter((p) => p.moods.includes(c.mood)).length;
      const cover = c.cover || `/collections/${c.slug}.jpg`;
      return `<article class="overflow-hidden rounded-2xl bg-lift">
        <button type="button" data-edit="collection" data-slug="${c.slug}" class="block w-full cursor-pointer text-left">
          <div class="relative h-36">
            <img src="${cover}" alt="" class="h-full w-full object-cover object-[center_right]" />
            <div class="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
            <div class="absolute bottom-3 left-4 right-4">
              <p class="font-micro text-[10px] font-semibold tracking-[0.18em] text-mist">${c.kind === "world" ? "MUNDO" : "MOMENTO"}</p>
              <h2 class="mt-1 font-brand text-[26px] uppercase leading-none text-cream">${c.name}</h2>
            </div>
          </div>
        </button>
        <div class="px-4 py-4">
          <p class="font-app text-[13px] leading-relaxed text-mist">${c.intro || "Sin texto sobre la foto."}</p>
          <div class="mt-4 flex items-center justify-between">
            <p class="font-app text-[12px] text-mist">${count} perfume${count === 1 ? "" : "s"}</p>
            <button type="button" data-edit="collection" data-slug="${c.slug}" class="cursor-pointer font-micro text-[11px] font-semibold tracking-[0.08em] text-cream">Editar</button>
          </div>
        </div>
      </article>`;
    })
    .join("")}</div>`;
}

function storeForm() {
  return $("[data-form='store']") as HTMLFormElement | null;
}

function readStoreForm(form: HTMLFormElement): StoreData {
  const data = new FormData(form);
  const s = state.store;
  const socials: { name: string; href: string }[] = [];
  form.querySelectorAll<HTMLInputElement>('[name^="social_name_"]').forEach((el) => {
    const i = el.name.slice("social_name_".length);
    socials.push({
      name: el.value.trim(),
      href: String(data.get(`social_href_${i}`) || "").trim(),
    });
  });
  const str = (name: string, fallback: string) => {
    const v = data.get(name);
    return v === null ? fallback : String(v);
  };
  const num = (name: string, fallback: number) => {
    const v = data.get(name);
    if (v === null || v === "") return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  const place = str("symbolPlace", s.symbolPlace) === "after" ? "after" : "before";
  return {
    ...s,
    name: str("name", s.name).trim() || s.name,
    tagline: str("tagline", s.tagline),
    whatsapp: str("whatsapp", s.whatsapp).replace(/\s+/g, ""),
    greeting: str("greeting", s.greeting),
    hours: str("hours", s.hours),
    city: str("city", s.city),
    coverage: str("coverage", s.coverage),
    shippingNote: str("shippingNote", s.shippingNote),
    cities: str("cities", s.cities.join("\n"))
      .split("\n")
      .map((c) => c.trim())
      .filter(Boolean),
    minOrder: num("minOrder", s.minOrder),
    shippingLocal: num("shippingLocal", s.shippingLocal),
    shippingUpcountry: num("shippingUpcountry", s.shippingUpcountry),
    symbol: str("symbol", s.symbol).trim() || s.symbol,
    symbolPlace: place as SymbolPlace,
    socials: socials.length ? socials : s.socials,
    payments: {
      transfer: {
        ...s.payments.transfer,
        bank: str("pay_transfer_bank", s.payments.transfer.bank),
        holder: str("pay_transfer_holder", s.payments.transfer.holder),
        account: str("pay_transfer_account", s.payments.transfer.account),
      },
      mobile: {
        ...s.payments.mobile,
        phone: str("pay_mobile_phone", s.payments.mobile.phone),
      },
      cash: {
        ...s.payments.cash,
        note: str("pay_cash_note", s.payments.cash.note),
      },
    },
  };
}

function captureStore() {
  const form = storeForm();
  if (form && view === "store") state.store = readStoreForm(form);
}

function payList(s: StoreData) {
  const items: string[] = [];
  if (s.payments.transfer.on) items.push("Transferencia");
  if (s.payments.mobile.on) items.push("Pago móvil");
  if (s.payments.cash.on) items.push("Al llegar");
  return items;
}

function symbolClass(on: boolean) {
  return on
    ? "bg-cream text-night"
    : "text-mist ring-1 ring-white/15 hover:text-cream";
}

function panePrecios(s: StoreData) {
  const p = state.perfumes[0];
  const sample = p ? smallestSize(p).price : 400;
  return `
    <div>
      <p class="font-app text-[13px] text-mist">Signo</p>
      <input name="symbol" value="${s.symbol.replace(/"/g, "&quot;")}" maxlength="8" spellcheck="false" autocomplete="off" class="mt-2 h-14 w-full rounded-xl bg-lift px-4 text-center font-poster text-[28px] outline-none ring-1 ring-white/10" />
      <div class="mt-3 flex flex-wrap justify-center gap-1.5">
        ${SYMBOLS.map(
          (sym) => `<button type="button" data-set-symbol="${sym.replace(/"/g, "&quot;")}" class="h-9 cursor-pointer rounded-md px-3 font-app text-[13px] ${symbolClass(s.symbol === sym)}">${sym}</button>`,
        ).join("")}
      </div>
    </div>
    <p class="mt-6 font-app text-[13px] text-mist">Dónde va</p>
    <div class="mt-3 grid gap-2">
      <button type="button" data-set-place="before" class="flex cursor-pointer items-center justify-between rounded-xl bg-lift px-4 py-3.5 text-left ring-1 ${s.symbolPlace === "before" ? "ring-cream" : "ring-white/10 hover:ring-white/25"}">
        <span class="font-app text-[13px] text-mist">Delante del número</span>
        <span class="font-poster text-xl tabular-nums text-cream" data-money="${sample}" data-place="before">${money(sample, s.symbol, "before")}</span>
      </button>
      <button type="button" data-set-place="after" class="flex cursor-pointer items-center justify-between rounded-xl bg-lift px-4 py-3.5 text-left ring-1 ${s.symbolPlace === "after" ? "ring-cream" : "ring-white/10 hover:ring-white/25"}">
        <span class="font-app text-[13px] text-mist">Detrás del número</span>
        <span class="font-poster text-xl tabular-nums text-cream" data-money="${sample}" data-place="after">${money(sample, s.symbol, "after")}</span>
      </button>
    </div>
    ${
      p
        ? `<div class="mt-6">
      <p class="font-app text-[13px] text-mist">Así se leería ${p.name} ahora mismo</p>
      <ul class="mt-3 divide-y divide-white/10 border-y border-white/10">
        ${p.sizes
          .map(
            (sz) => `<li class="flex items-baseline justify-between py-2.5">
          <span class="font-app text-[14px] text-mist">${sz.label}</span>
          <span class="font-poster text-[18px] tabular-nums text-cream" data-money="${sz.price}">${cash(sz.price)}</span>
        </li>`,
          )
          .join("")}
      </ul>
    </div>`
        : ""
    }
  `;
}

function panePagos(s: StoreData) {
  const row = (key: "transfer" | "mobile" | "cash", title: string, hint: string, on: boolean) => `
    <div class="flex items-center justify-between gap-4 py-3.5">
      <div>
        <p class="font-app text-[15px] text-cream">${title}</p>
        <p class="mt-0.5 font-app text-[12px] text-mist">${hint}</p>
      </div>
      ${switchCtl(on, `data-pay-toggle="${key}"`)}
    </div>`;
  return `
    <div class="divide-y divide-white/10 border-y border-white/10">
      ${row("transfer", "Transferencia", "Te pasamos los datos por chat", s.payments.transfer.on)}
      ${row("mobile", "Pago móvil", "Igual, te lo confirmamos al pedir", s.payments.mobile.on)}
      ${row("cash", "Cuando me llegue", "Si estamos en tu zona", s.payments.cash.on)}
    </div>
    ${!payList(s).length ? `<p class="mt-4 font-app text-[13px] text-[#e05a5a]">Dejá al menos una. Si no, en el carrito no hay cómo elegir.</p>` : ""}
  `;
}

function panePedidos(s: StoreData) {
  return `
    <div class="flex items-center justify-between gap-4 rounded-xl bg-lift px-4 py-3">
      <div>
        <p class="font-app text-[15px] text-cream">Tomando pedidos</p>
        <p class="mt-0.5 font-app text-[12px] text-mist">${s.takingOrders ? "La caja está abierta" : "Nadie puede armar pedido"}</p>
      </div>
      ${switchCtl(s.takingOrders, "data-taking-orders")}
    </div>
    <div class="mt-5 grid gap-4">
      ${field("WhatsApp, con código de país", input("whatsapp", s.whatsapp, 'inputmode="tel" placeholder="50500000000"'))}
      ${field("Primera línea del mensaje", area("greeting", s.greeting, 2))}
      ${field("Horario", input("hours", s.hours, 'placeholder="Lunes a sábado, 9 a 7"'))}
      ${field("Pedido mínimo. Cero si no hay.", input("minOrder", String(s.minOrder || 0), 'type="number" min="0"'))}
    </div>
    <div class="mt-6 rounded-xl bg-lift px-4 py-4">
      <p class="font-micro text-[10px] font-semibold tracking-[0.16em] text-mist">SE ABRE WHATSAPP A</p>
      <p class="mt-2 font-poster text-xl text-cream" data-wa-live>${waDisplay(s.whatsapp)}</p>
      <p class="mt-4 font-micro text-[10px] font-semibold tracking-[0.16em] text-mist">PRIMERA LÍNEA</p>
      <p class="mt-2 font-app text-[14px] leading-relaxed text-cream" data-greet-live>${s.greeting || "—"}</p>
    </div>
  `;
}

function paneEnvios(s: StoreData) {
  return `
    <div class="grid gap-4">
      ${field("Ciudad de salida", input("city", s.city))}
      <div class="grid gap-4 sm:grid-cols-2">
        ${field(`En ${s.city || "la ciudad"}`, input("shippingLocal", String(s.shippingLocal || 0), 'type="number" min="0"'))}
        ${field("Al resto del país", input("shippingUpcountry", String(s.shippingUpcountry || 0), 'type="number" min="0"'))}
      </div>
      ${field("Qué les decís del envío", area("coverage", s.coverage, 3))}
      ${field("Nota bajo el precio", input("shippingNote", s.shippingNote))}
      <div>
        <p class="font-app text-[13px] text-mist">Ciudades del checkout</p>
        <div class="mt-2 flex flex-wrap gap-2">
          ${
            s.cities.length
              ? s.cities
                  .map(
                    (c, i) => `<span class="inline-flex items-center gap-1.5 rounded-md bg-lift px-2.5 py-1.5 font-app text-[13px] text-cream">${c}<button type="button" data-remove-city="${i}" class="cursor-pointer text-mist hover:text-cream" aria-label="Quitar ${c}">×</button></span>`,
                  )
                  .join("")
              : `<span class="font-app text-[13px] text-mist">Todavía no hay ciudades.</span>`
          }
        </div>
        <div class="mt-3 flex gap-2">
          <input name="city_new" placeholder="Otra ciudad" class="h-11 min-w-0 flex-1 rounded-xl bg-night px-3 font-app text-[15px] outline-none ring-1 ring-white/10" />
          <button type="button" data-add-city class="h-11 shrink-0 cursor-pointer rounded-xl px-4 font-micro text-[12px] font-semibold text-cream ring-1 ring-white/20 hover:bg-white/10">Sumar</button>
        </div>
        <textarea name="cities" class="hidden">${s.cities.join("\n")}</textarea>
      </div>
    </div>
  `;
}

function paneMarca(s: StoreData) {
  return `
    <div class="grid gap-4">
      ${field("Nombre", input("name", s.name))}
      ${field("Línea chica", input("tagline", s.tagline, 'placeholder="DECANT / FRAGRANCE"'))}
    </div>
    <div class="mt-10 flex items-end justify-between gap-4">
      <p class="font-poster text-xl text-cream">Redes</p>
      <button type="button" data-add-social class="cursor-pointer rounded-full px-3.5 py-2 font-micro text-[11px] font-semibold tracking-[0.08em] text-cream ring-1 ring-white/20 hover:bg-white/10">Agregar</button>
    </div>
    <div class="mt-4 grid gap-4">
      ${
        s.socials.length
          ? s.socials
              .map(
                (item, i) => `<div class="grid items-end gap-3 sm:grid-cols-[10rem_minmax(0,1fr)_auto]">
            ${field("Red", input(`social_name_${i}`, item.name, `placeholder="${SOCIAL_PRESETS[i % SOCIAL_PRESETS.length]}" list="social-presets"`))}
            ${field("Link", input(`social_href_${i}`, item.href, 'placeholder="https://"'))}
            <div class="mb-0.5">${iconClose(`data-remove-social="${i}"`, "Quitar red")}</div>
          </div>`,
              )
              .join("") + `<datalist id="social-presets">${SOCIAL_PRESETS.map((n) => `<option value="${n}"></option>`).join("")}</datalist>`
          : `<p class="font-app text-sm text-mist">Todavía no hay redes.</p>`
      }
    </div>
    <div class="mt-12 border-t border-white/10 pt-6">
      <p class="font-app text-[13px] leading-relaxed text-mist">Borra lo editado en este navegador y vuelve al catálogo de prueba. No se puede deshacer.</p>
      <button type="button" data-reset class="mt-3 cursor-pointer font-micro text-[12px] font-semibold text-[#e05a5a]">Volver al catálogo de prueba</button>
    </div>
  `;
}

function paintStore() {
  const form = storeForm();
  if (!form || view !== "store") return;
  const s = state.store;
  const intro: Record<StorePane, string> = {
    pagos: "En el carrito, antes de WhatsApp. El cobro y la entrega se cierran en el chat, como ahora.",
    pedidos: "WhatsApp es la caja. Si pausás, no se arma pedido.",
    envios: "Los precios del catálogo no incluyen envío. Cero = se cotiza.",
    precios: "No convierte. Si vale 400, se lee 400 con este signo.",
    marca: "Nombre, línea chica y redes del pie.",
  };
  const pane =
    storePane === "precios"
      ? panePrecios(s)
      : storePane === "pedidos"
        ? panePedidos(s)
        : storePane === "envios"
          ? paneEnvios(s)
          : storePane === "marca"
            ? paneMarca(s)
            : panePagos(s);

  form.innerHTML = `
    <div class="mx-auto w-full max-w-[520px]">
      <nav class="flex flex-wrap justify-center gap-x-5 gap-y-1">
        ${STORE_PANES.map(([id, label]) => {
          const on = storePane === id;
          return `<button type="button" data-store-pane="${id}" class="cursor-pointer font-app text-[15px] ${on ? "text-cream" : "text-mist hover:text-cream"}">${label}</button>`;
        }).join("")}
      </nav>
      <p class="mt-3 text-center font-app text-[13px] leading-relaxed text-mist">${intro[storePane]}</p>
      <div class="mt-6">${pane}</div>
      <button type="submit" class="mt-8 flex h-12 w-full cursor-pointer items-center justify-center rounded-lg bg-cream font-micro text-[13px] font-semibold text-night hover:opacity-90">Guardar</button>
    </div>`;
}

function refreshStorePreviews() {
  const form = storeForm();
  if (!form || view !== "store") return;
  const symbol = (form.querySelector('[name="symbol"]') as HTMLInputElement | null)?.value.trim() || state.store.symbol;
  form.querySelectorAll<HTMLElement>("[data-money]").forEach((el) => {
    const n = Number(el.getAttribute("data-money") || 0);
    const place = (el.getAttribute("data-place") as SymbolPlace) || state.store.symbolPlace;
    el.textContent = money(n, symbol, place);
  });
  form.querySelectorAll("[data-set-symbol]").forEach((btn) => {
    const on = btn.getAttribute("data-set-symbol") === symbol;
    btn.classList.toggle("bg-cream", on);
    btn.classList.toggle("text-night", on);
    btn.classList.toggle("text-mist", !on);
    btn.classList.toggle("ring-1", !on);
    btn.classList.toggle("ring-white/15", !on);
  });
  const wa = form.querySelector<HTMLInputElement>('[name="whatsapp"]')?.value;
  const greet = form.querySelector<HTMLTextAreaElement>('[name="greeting"]')?.value;
  const waLive = form.querySelector("[data-wa-live]");
  if (waLive && wa !== undefined) waLive.textContent = waDisplay(wa);
  const greetLive = form.querySelector("[data-greet-live]");
  if (greetLive && greet !== undefined) greetLive.textContent = greet || "—";
  const bank = form.querySelector<HTMLSelectElement>('[name="pay_transfer_bank"]')?.value;
  const holder = form.querySelector<HTMLInputElement>('[name="pay_transfer_holder"]')?.value;
  const mobile = form.querySelector<HTMLInputElement>('[name="pay_mobile_phone"]')?.value;
  const cashNote = form.querySelector<HTMLInputElement>('[name="pay_cash_note"]')?.value;
  const bankLive = form.querySelector("[data-live-bank]");
  if (bankLive && bank !== undefined) bankLive.textContent = bank || "banco";
  const holderLive = form.querySelector("[data-live-holder]");
  if (holderLive && holder !== undefined) holderLive.textContent = holder || "titular";
  const mobileLive = form.querySelector("[data-live-mobile]");
  if (mobileLive && mobile !== undefined) mobileLive.textContent = mobile || "número";
  const cashLive = form.querySelector("[data-live-cash]");
  if (cashLive && cashNote !== undefined) cashLive.textContent = cashNote || "si estamos en tu zona";
}

function perfumeModal(p?: Perfume) {
  const moods = p?.moods ?? [];
  const sizes = p?.sizes?.length ? p.sizes : [normalizeSize({ key: "5", price: 0, kind: "ml", ml: 5 })];
  const draft: Perfume = p ?? {
    slug: "",
    name: "",
    house: "",
    smell: "",
    gender: "el",
    world: "disenador",
    moods: [],
    image: PRODUCT_SHOTS[0],
    available: true,
    related: [],
    sizes,
  };
  openModal(`
    <div class="flex shrink-0 items-start justify-between gap-4 px-6 pt-5 pb-4">
      <div>
        <p class="font-micro text-[11px] font-semibold tracking-[0.16em] text-mist">${p ? "EDITAR" : "NUEVO"}</p>
        <h2 class="mt-1 font-poster text-[28px] leading-none text-cream">${p ? p.name : "Crear perfume"}</h2>
      </div>
      <button type="button" data-modal-close class="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-mist ring-1 ring-white/20 hover:text-cream">×</button>
    </div>
    <div class="grid min-h-0 flex-1 overflow-hidden md:grid-cols-[260px_minmax(0,1fr)]">
      <aside class="min-h-0 overflow-y-auto px-6 pb-6">
        <div data-live-card>${storeCard(draft)}</div>
      </aside>
      <div class="min-h-0 overflow-y-auto border-t border-white/10 px-6 pb-6 md:border-l md:border-t-0">
        <div class="flex flex-col gap-7">
          <div>
            ${sectionKicker("EL PERFUME")}
            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              ${field("Nombre", input("name", p?.name || "", "required"))}
              ${field("Casa", input("house", p?.house || "", "required"))}
            </div>
            <div class="mt-3">${field("Cómo huele", area("smell", p?.smell || "", 2))}</div>
            <div class="mt-3">
              <p class="font-app text-[13px] text-mist">Foto</p>
              <div class="mt-2">${imagePicker("image", p?.image || PRODUCT_SHOTS[0], PRODUCT_SHOTS)}</div>
            </div>
          </div>
          <div>
            ${sectionKicker("DÓNDE ENTRA")}
            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              ${field("Para quién", select("gender", GENDERS.map((g) => ({ value: g, label: genderLabel(g) })), p?.gender || "el"))}
              ${field("Mundo", select("world", WORLDS.map((w) => ({ value: w, label: worldLabel(w) })), p?.world || "disenador"))}
            </div>
            <p class="mt-4 font-app text-[13px] text-mist">Colecciones de momento. Si no marcás Noche, no aparece ahí.</p>
            <div class="mt-2 flex flex-wrap gap-2">${MOODS.map((m) => `<label class="flex cursor-pointer items-center gap-2 rounded-full bg-night px-3 py-1.5 font-app text-sm text-cream ring-1 ring-white/10"><input type="checkbox" name="moods" value="${m}" ${moods.includes(m) ? "checked" : ""} class="accent-amber" />${moodLabel[m]}</label>`).join("")}</div>
          </div>
          <div>
            ${sectionKicker("CÓMO SE VENDE")}
            <p class="mt-2 font-app text-[12px] text-mist">Los ml de la ficha. A la izquierda ves los precios.</p>
            <div data-size-rows class="mt-3 grid gap-2">${sizeRows(sizes)}</div>
            <button type="button" data-size-add="ml" class="mt-3 cursor-pointer rounded-full px-3.5 py-2 font-micro text-[11px] font-semibold text-cream ring-1 ring-white/20 hover:bg-white/10">Otra medida</button>
            ${bottleBlock(sizes.find(isBottle))}
            <div class="mt-5">${switchField("available", p?.available !== false, "En la tienda", "Apagado = agotado. No se suma al carrito.")}</div>
          </div>
          <div>
            ${sectionKicker("SI TE GUSTA ESTE")}
            <p class="mt-2 font-app text-[12px] text-mist">La ficha muestra dos, en par.</p>
            <div class="mt-3">${relatedBox(p?.related || [], p?.slug)}</div>
          </div>
        </div>
        <input type="hidden" name="slug" value="${p?.slug || ""}" />
        <input type="hidden" name="form_kind" value="perfume" />
        <div class="mt-8 flex items-center gap-4 border-t border-white/10 pt-5">
          <button type="submit" class="flex h-11 cursor-pointer items-center rounded-lg bg-cream px-7 font-micro text-[12px] font-semibold text-night hover:opacity-90">Guardar</button>
          ${p ? `<button type="button" data-delete="perfume" class="cursor-pointer font-micro text-[12px] font-semibold text-[#e05a5a]">Quitar</button>` : ""}
        </div>
      </div>
    </div>`);
}

function comboModal(c?: Combo) {
  const fallback = state.perfumes.slice(0, 2).map((p) => ({ slug: p.slug, size: preferredSize(p.slug) }));
  const items = [...(c?.items?.length ? c.items : fallback)];
  const packPrice = typeof c?.price === "number" && c.price > 0 ? c.price : comboPartsTotal({ ...c, items, price: 0 } as Combo);
  openModal(`
    <div class="flex shrink-0 items-start justify-between gap-4 px-6 pt-5 pb-4">
      <div>
        <p class="font-micro text-[11px] font-semibold tracking-[0.16em] text-mist">${c ? "EDITAR" : "NUEVO"}</p>
        <h2 class="mt-1 font-poster text-[28px] leading-none text-cream">${c ? c.name : "Crear pack"}</h2>
      </div>
      <button type="button" data-modal-close class="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-mist ring-1 ring-white/20 hover:text-cream">×</button>
    </div>
    <div class="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
      <div class="grid gap-3 sm:grid-cols-2">
        ${field("Nombre", input("name", c?.name || "", "required"))}
        ${field("Para quién", select("gender", GENDERS.map((g) => ({ value: g, label: genderLabel(g) })), c?.gender || "el"))}
      </div>
      <div class="mt-3">${field("Qué les decís", area("blurb", c?.blurb || "", 2))}</div>
      <div class="mt-4">
        <p class="font-app text-[13px] text-mist">Foto del pack</p>
        <div class="mt-2">${imagePicker("image", c?.image || COMBO_SHOTS[0] || PRODUCT_SHOTS[0], COMBO_SHOTS.length ? COMBO_SHOTS : IMAGES)}</div>
      </div>
      <div class="mt-4 flex flex-wrap gap-2">${MOODS.map((m) => `<label class="flex cursor-pointer items-center gap-2 rounded-full bg-night px-3 py-1.5 font-app text-sm text-cream ring-1 ring-white/10"><input type="checkbox" name="moods" value="${m}" ${c?.moods.includes(m) ? "checked" : ""} class="accent-amber" />${moodLabel[m]}</label>`).join("")}</div>
      <div class="mt-8">
        ${sectionKicker("QUÉ LLEVA")}
        <p class="mt-2 font-app text-[12px] text-mist">Los que vos armes. Dos, tres o más.</p>
        <div data-combo-items class="mt-3 divide-y divide-white/10 border-y border-white/10">
          ${items.map((item, i) => comboSlot(i, item.slug, item.size)).join("")}
        </div>
        <button type="button" data-combo-add class="mt-3 cursor-pointer rounded-full px-3.5 py-2 font-micro text-[11px] font-semibold text-cream ring-1 ring-white/20 hover:bg-white/10">Otro perfume</button>
      </div>
      <div class="mt-8">
        ${field("Precio del pack", input("price", String(packPrice), 'type="number" min="0"'))}
        <p class="mt-2 font-app text-[12px] text-mist">Si los vendieras sueltos: <span data-combo-sum>${cash(packPrice)}</span>. El cliente paga lo que pongas acá, no esa suma.</p>
      </div>
      <div class="mt-8 flex flex-wrap items-center gap-4 border-t border-white/10 pt-5">
        <button type="submit" class="flex h-11 cursor-pointer items-center rounded-lg bg-cream px-7 font-micro text-[12px] font-semibold text-night hover:opacity-90">Guardar</button>
        ${c ? `<button type="button" data-delete="combo" class="cursor-pointer font-micro text-[12px] font-semibold text-[#e05a5a]">Quitar</button>` : ""}
      </div>
      <input type="hidden" name="slug" value="${c?.slug || ""}" />
      <input type="hidden" name="form_kind" value="combo" />
    </div>`);
}

function collectionModal(c?: Collection) {
  const cover = c?.cover && COVERS.includes(c.cover) ? c.cover : c?.cover || COVERS[0];
  const intro = c?.intro || "";
  const allCovers = cover && !COVERS.includes(cover) ? [cover, ...COVERS] : COVERS;
  openModal(`
    <div class="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="font-micro text-[11px] font-semibold tracking-[0.16em] text-mist">${c ? "EDITAR" : "NUEVA"}</p>
          <h2 class="mt-1 font-poster text-[26px] leading-none text-cream">${c ? c.name : "Crear colección"}</h2>
        </div>
        <button type="button" data-modal-close class="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-mist ring-1 ring-white/20 hover:text-cream">×</button>
      </div>
      <div class="mt-6" data-live-cover>${collectionBanner(c?.name || "", intro, cover)}</div>
      <div class="mt-6 flex flex-col gap-4">
        ${field("Nombre", input("name", c?.name || "", "required"))}
        ${field("Texto sobre la foto", area("intro", intro, 2))}
        <div>
          <p class="font-app text-[13px] text-mist">Portada. La misma foto ancha de la página.</p>
          <input type="hidden" name="cover" value="${cover}" />
          <div class="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
            ${allCovers
              .map(
                (src) => `<button type="button" data-set-cover="${src}" class="cursor-pointer overflow-hidden rounded-lg ring-2 ${src === cover ? "ring-cream" : "ring-transparent hover:ring-white/30"}">
              <img src="${src}" alt="" class="h-12 w-full object-cover" />
            </button>`,
              )
              .join("")}
          </div>
        </div>
        ${field("Agrupa por", select("kind", [{ value: "world", label: "Mundo — Árabes, Nicho, Diseño" }, { value: "mood", label: "Momento — Noche, Dulce, Fresco, Oficina" }], c?.kind || "mood"))}
        ${field("Mundo", select("world", WORLDS.map((w) => ({ value: w, label: worldLabel(w) })), c?.kind === "world" ? c.world : "disenador"))}
        ${field("Momento", select("mood", MOODS.map((m) => ({ value: m, label: moodLabel[m] })), c?.kind === "mood" ? c.mood : "noche"))}
        <input type="hidden" name="slug" value="${c?.slug || ""}" />
        <input type="hidden" name="form_kind" value="collection" />
      </div>
      <div class="mt-6 flex flex-col gap-2 border-t border-white/10 pt-5">
        <button type="submit" class="flex h-11 cursor-pointer items-center justify-center rounded-lg bg-cream font-micro text-[12px] font-semibold text-night hover:opacity-90">Guardar</button>
        ${c ? `<button type="button" data-delete="collection" class="h-11 cursor-pointer font-micro text-[12px] font-semibold text-[#e05a5a]">Quitar colección</button>` : ""}
      </div>
    </div>`);
}

function previewModal(p: Perfume) {
  const start = smallestSize(p);
  openModal(
    `
    <div class="relative px-6 pb-6 pt-5">
      <button type="button" data-modal-close class="absolute right-4 top-4 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-black/50 text-cream ring-1 ring-white/15 hover:bg-black/70">×</button>
      <div class="relative overflow-hidden rounded-xl bg-night">
        <img src="${p.image}" alt="" class="h-56 w-full object-cover" />
        ${p.available ? "" : `<span class="absolute left-3 top-3 rounded-full bg-[#c43b3b] px-2 py-0.5 font-micro text-[10px] font-semibold text-cream">Agotado</span>`}
      </div>
      <p class="mt-5 font-micro text-[11px] font-semibold tracking-[0.16em] text-mist">${p.house.toUpperCase()}</p>
      <h2 class="mt-1 font-poster text-[28px] leading-none text-cream">${p.name}</h2>
      <p class="mt-3 font-app text-[15px] leading-relaxed text-mist">${p.smell}</p>
      <p class="mt-3 font-app text-[13px] text-mist">${genderLabel(p.gender)} · ${worldLabel(p.world)} · ${p.moods.map((m) => moodLabel[m]).join(", ") || "sin colección de momento"}</p>
      <p class="mt-4 font-poster text-xl tabular-nums text-cream">${p.available ? `${start.label} · ${cash(start.price)}` : "Hoy no hay"}</p>
      <div class="mt-6 flex gap-3">
        <button type="button" data-edit="perfume" data-slug="${p.slug}" class="flex h-11 flex-1 cursor-pointer items-center justify-center rounded-lg bg-cream font-micro text-[12px] font-semibold text-night">Editar</button>
        <button type="button" data-stock="${p.slug}" class="flex h-11 flex-1 cursor-pointer items-center justify-center rounded-lg font-micro text-[12px] font-semibold text-cream ring-1 ring-white/20">${p.available ? "Pasar a agotado" : "Poner en venta"}</button>
      </div>
    </div>`,
    "26rem",
    true,
  );
}

function applySizeChange(kind: "ml" | "remove", index = -1) {
  const form = $("[data-modal-form]") as HTMLFormElement | null;
  const box = form?.querySelector("[data-size-rows]");
  if (!form || !box) return;
  const sizes = sizesFromForm(form);
  const mls = sizes.filter((s) => !isBottle(s));
  const bottle = sizes.find(isBottle);
  if (kind === "remove") {
    if (mls.length <= 1 && !bottle) {
      toast("Dejá al menos una medida o el frasco");
      return;
    }
    mls.splice(index, 1);
  } else {
    const used = mls.map((s) => s.ml || Number(s.key));
    const ml = nextMl(used);
    mls.push(normalizeSize({ key: String(ml), price: 0, kind: "ml", ml }));
  }
  box.innerHTML = sizeRows(bottle ? [...mls, bottle] : mls);
  paintLiveCard();
}

function toggleStock(slug: string) {
  const p = state.perfumes.find((x) => x.slug === slug);
  if (!p) return;
  p.available = !p.available;
  persist();
  toast(p.available ? `${p.name} otra vez en venta` : `${p.name} agotado`);
  paint();
  if (!$("[data-modal]")?.classList.contains("hidden")) {
    const previewing = $("[data-modal-form] [data-edit='perfume']");
    if (previewing?.getAttribute("data-slug") === slug) previewModal(p);
  }
}

function openApp(show: boolean) {
  $("[data-admin-login]")?.classList.toggle("hidden", show);
  $("[data-admin-app]")?.classList.toggle("hidden", !show);
  if (show) setView("perfumes");
}

function bind() {
  $("[data-admin-gate]")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget as HTMLFormElement).get("password") || "");
    const err = $("[data-admin-error]");
    if (!enter(password)) {
      if (err) {
        err.textContent = "Clave incorrecta";
        err.classList.remove("hidden");
      }
      return;
    }
    openApp(true);
  });

  $("[data-admin-logout]")?.addEventListener("click", () => {
    leave();
    openApp(false);
  });

  document.querySelectorAll("[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => setView(btn.getAttribute("data-nav") || "perfumes"));
  });

  document.querySelectorAll("[data-filter]").forEach((el) => {
    el.addEventListener("input", () => {
      const key = el.getAttribute("data-filter") as keyof typeof filters;
      filters[key] = (el as HTMLInputElement).value;
      paintPerfumes();
    });
    el.addEventListener("change", () => {
      const key = el.getAttribute("data-filter") as keyof typeof filters;
      filters[key] = (el as HTMLInputElement).value;
      paintPerfumes();
    });
  });

  $("[data-modal-dim]")?.addEventListener("click", () => {
    if (!confirmOpen()) closeModal();
  });
  $("[data-confirm-yes]")?.addEventListener("click", () => endAsk(true));
  $("[data-confirm-no]")?.addEventListener("click", () => endAsk(false));
  $("[data-confirm-dim]")?.addEventListener("click", () => endAsk(false));
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (confirmOpen()) {
      endAsk(false);
      return;
    }
    closeModal();
  });
  document.addEventListener("change", (e) => {
    const t = e.target as HTMLSelectElement;
    if (!t.matches("[data-related-add]") || !t.value) return;
    const form = t.closest("form");
    const box = form?.querySelector("[data-related-box]");
    if (!form || !box) return;
    const selected = [...form.querySelectorAll<HTMLInputElement>('[name="related"]')].map((el) => el.value);
    if (selected.length < RELATED_MAX) selected.push(t.value);
    const self = (form.querySelector('[name="slug"]') as HTMLInputElement | null)?.value;
    box.outerHTML = relatedBox(selected, self);
    paintLiveCard();
  });

  document.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    if (t.closest("[data-modal-close]")) closeModal();

    if (t.closest("[data-reset]")) {
      e.preventDefault();
      void (async () => {
        const ok = await ask(
          "¿Volver al catálogo de prueba?",
          "Se borra lo que editaste en este navegador. No se puede deshacer.",
          "Borrar y volver",
        );
        if (!ok) return;
        state = resetState();
        closeModal();
        toast("Catálogo restablecido");
        paint();
      })();
      return;
    }

    const neu = t.closest<HTMLElement>("[data-new]");
    if (neu) {
      const kind = neu.getAttribute("data-new");
      if (kind === "perfume") perfumeModal();
      if (kind === "combo") comboModal();
      if (kind === "collection") collectionModal();
    }

    const stock = t.closest<HTMLElement>("[data-stock]");
    if (stock) {
      e.preventDefault();
      toggleStock(stock.getAttribute("data-stock") || "");
      return;
    }

    const preview = t.closest<HTMLElement>("[data-preview]");
    if (preview) {
      const p = state.perfumes.find((x) => x.slug === preview.getAttribute("data-preview"));
      if (p) previewModal(p);
    }

    const edit = t.closest<HTMLElement>("[data-edit]");
    if (edit) {
      const kind = edit.getAttribute("data-edit");
      const slug = edit.getAttribute("data-slug") || "";
      if (kind === "perfume") perfumeModal(state.perfumes.find((p) => p.slug === slug));
      if (kind === "combo") comboModal(state.combos.find((c) => c.slug === slug));
      if (kind === "collection") collectionModal(state.collections.find((c) => c.slug === slug));
    }

    const pane = t.closest<HTMLElement>("[data-store-pane]");
    if (pane) {
      captureStore();
      storePane = (pane.getAttribute("data-store-pane") || "pagos") as StorePane;
      paintStore();
      return;
    }

    const setSym = t.closest<HTMLElement>("[data-set-symbol]");
    if (setSym) {
      const next = setSym.getAttribute("data-set-symbol") || "C$";
      captureStore();
      state.store.symbol = next;
      persist();
      paintStore();
      paintPerfumes();
      return;
    }

    const setPlace = t.closest<HTMLElement>("[data-set-place]");
    if (setPlace) {
      const next = setPlace.getAttribute("data-set-place") === "after" ? "after" : "before";
      captureStore();
      state.store.symbolPlace = next;
      persist();
      paintStore();
      paintPerfumes();
      return;
    }

    if (t.closest("[data-add-city]")) {
      const form = storeForm();
      const field = form?.querySelector<HTMLInputElement>('[name="city_new"]');
      const name = field?.value.trim() || "";
      if (!name) return;
      captureStore();
      if (!state.store.cities.includes(name)) state.store.cities = [...state.store.cities, name];
      persist();
      paintStore();
      return;
    }

    const removeCity = t.closest<HTMLElement>("[data-remove-city]");
    if (removeCity) {
      const i = Number(removeCity.getAttribute("data-remove-city"));
      captureStore();
      state.store.cities = state.store.cities.filter((_, idx) => idx !== i);
      persist();
      paintStore();
      return;
    }

    const payToggle = t.closest<HTMLElement>("[data-pay-toggle]");
    if (payToggle) {
      const key = payToggle.getAttribute("data-pay-toggle") as "transfer" | "mobile" | "cash" | null;
      if (!key || !state.store.payments[key]) return;
      captureStore();
      state.store.payments[key].on = !state.store.payments[key].on;
      persist();
      paintStore();
      return;
    }

    if (t.closest("[data-taking-orders]")) {
      captureStore();
      state.store.takingOrders = !state.store.takingOrders;
      persist();
      paintStore();
      return;
    }

    if (t.closest("[data-add-social]")) {
      captureStore();
      state.store.socials = [...state.store.socials, { name: "", href: "" }];
      persist();
      paintStore();
      return;
    }

    const removeSocial = t.closest<HTMLElement>("[data-remove-social]");
    if (removeSocial) {
      const i = Number(removeSocial.getAttribute("data-remove-social"));
      captureStore();
      state.store.socials = state.store.socials.filter((_, idx) => idx !== i);
      persist();
      paintStore();
      return;
    }

    const setCover = t.closest<HTMLElement>("[data-set-cover]");
    if (setCover) {
      const form = $("[data-modal-form]") as HTMLFormElement | null;
      const src = setCover.getAttribute("data-set-cover") || "";
      const hidden = form?.querySelector<HTMLInputElement>('[name="cover"]');
      if (hidden) hidden.value = src;
      form?.querySelectorAll("[data-set-cover]").forEach((btn) => {
        btn.classList.toggle("ring-cream", btn === setCover);
        btn.classList.toggle("ring-transparent", btn !== setCover);
      });
      const live = form?.querySelector("[data-live-cover]");
      if (form && live) {
        const data = new FormData(form);
        live.innerHTML = collectionBanner(String(data.get("name") || ""), String(data.get("intro") || ""), src);
      }
      return;
    }

    const removeRelated = t.closest<HTMLElement>("[data-related-remove]");
    if (removeRelated) {
      const form = removeRelated.closest("form");
      const box = form?.querySelector("[data-related-box]");
      const slug = removeRelated.getAttribute("data-related-remove") || "";
      if (form && box) {
        const selected = [...form.querySelectorAll<HTMLInputElement>('[name="related"]')].map((el) => el.value).filter((v) => v !== slug);
        const self = (form.querySelector('[name="slug"]') as HTMLInputElement | null)?.value;
        box.outerHTML = relatedBox(selected, self);
        paintLiveCard();
      }
      return;
    }

    const setImg = t.closest<HTMLElement>("[data-set-image]");
    if (setImg) {
      const src = setImg.getAttribute("data-set-image") || "";
      const field = setImg.getAttribute("data-image-field") || "image";
      const form = setImg.closest("form");
      const hidden = form?.querySelector<HTMLInputElement>(`[name="${field}"]`);
      if (hidden) hidden.value = src;
      form?.querySelectorAll(`[data-image-field="${field}"]`).forEach((btn) => {
        btn.classList.toggle("ring-cream", btn === setImg);
        btn.classList.toggle("ring-transparent", btn !== setImg);
      });
      paintLiveCard();
      return;
    }

    if (t.closest("[data-combo-add]")) {
      const form = $("[data-modal-form]") as HTMLFormElement | null;
      const box = form?.querySelector("[data-combo-items]");
      if (!form || !box) return;
      const items = comboItemsFromForm(form);
      const next = state.perfumes.find((p) => !items.some((i) => i.slug === p.slug)) ?? state.perfumes[0];
      if (!next) return;
      items.push({ slug: next.slug, size: preferredSize(next.slug) });
      box.innerHTML = items.map((item, i) => comboSlot(i, item.slug, item.size)).join("");
      comboRunningTotal(form);
      return;
    }

    const comboRemove = t.closest<HTMLElement>("[data-combo-remove]");
    if (comboRemove) {
      const form = $("[data-modal-form]") as HTMLFormElement | null;
      const box = form?.querySelector("[data-combo-items]");
      if (!form || !box) return;
      const items = comboItemsFromForm(form);
      if (items.length <= 1) {
        toast("Dejá al menos un perfume");
        return;
      }
      items.splice(Number(comboRemove.getAttribute("data-combo-remove")), 1);
      box.innerHTML = items.map((item, i) => comboSlot(i, item.slug, item.size)).join("");
      comboRunningTotal(form);
      return;
    }

    const addSize = t.closest<HTMLElement>("[data-size-add]");
    if (addSize) {
      e.preventDefault();
      applySizeChange("ml");
      return;
    }

    const removeSize = t.closest<HTMLElement>("[data-size-remove]");
    if (removeSize) {
      e.preventDefault();
      applySizeChange("remove", Number(removeSize.getAttribute("data-size-remove")));
      return;
    }

    const del = t.closest<HTMLElement>("[data-delete]");
    if (del) {
      e.preventDefault();
      const kind = del.getAttribute("data-delete");
      const slug = (del.closest("form")?.querySelector('[name="slug"]') as HTMLInputElement | null)?.value;
      if (!slug) return;
      if (kind === "perfume" && state.combos.some((c) => c.items.some((i) => i.slug === slug))) {
        toast("Está en un combo. Sacalo de ahí primero.");
        return;
      }
      void (async () => {
        const ok = await ask(
          kind === "combo" ? "¿Quitar este combo?" : kind === "collection" ? "¿Quitar esta colección?" : "¿Quitar este perfume?",
          "Sale de este navegador. El catálogo de prueba se puede volver a cargar.",
          "Quitar",
        );
        if (!ok) return;
        if (kind === "perfume") state.perfumes = state.perfumes.filter((p) => p.slug !== slug);
        if (kind === "combo") state.combos = state.combos.filter((c) => c.slug !== slug);
        if (kind === "collection") state.collections = state.collections.filter((c) => c.slug !== slug);
        persist();
        closeModal();
        toast("Quitado");
        paint();
      })();
    }
  });

  $("[data-modal-form]")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const kind = String(data.get("form_kind") || "");

    if (kind === "perfume" || form.querySelector("[data-size-rows]")) {
      const perfume = perfumeFromForm(form);
      if (!perfume.slug) return;
      if (!perfume.sizes.length) {
        toast("Poné al menos una medida");
        return;
      }
      const i = state.perfumes.findIndex((p) => p.slug === perfume.slug);
      if (i >= 0) state.perfumes[i] = perfume;
      else state.perfumes.push(perfume);
      persist();
      closeModal();
      toast(`${perfume.name} guardado`);
      paint();
      return;
    }

    if (kind === "combo" || form.querySelector('[name="item_slug_0"]')) {
      const name = String(data.get("name") || "");
      const existing = String(data.get("slug") || "");
      const slug = existing || slugify(name);
      const items = comboItemsFromForm(form).map((item) => ({
        slug: item.slug,
        size: item.size,
      }));
      if (!items.length) {
        toast("Poné al menos un perfume");
        return;
      }
      const price = Number(data.get("price") || 0);
      if (!price) {
        toast("Poné el precio del pack");
        return;
      }
      const combo: Combo = {
        slug,
        name,
        blurb: String(data.get("blurb") || ""),
        image: String(data.get("image") || ""),
        gender: String(data.get("gender") || "el") as Gender,
        moods: data.getAll("moods").map(String) as Mood[],
        items,
        price,
      };
      const i = state.combos.findIndex((c) => c.slug === slug);
      if (i >= 0) state.combos[i] = combo;
      else state.combos.push(combo);
      persist();
      closeModal();
      toast(`${name} guardado`);
      paint();
      return;
    }

    if (kind === "collection" || form.querySelector('[name="kind"]')) {
      const name = String(data.get("name") || "");
      const existing = String(data.get("slug") || "");
      const slug = existing || slugify(name);
      const group = String(data.get("kind") || "mood");
      const cover = String(data.get("cover") || COVERS[0]);
      const intro = String(data.get("intro") || "");
      const collection = (
        group === "world"
          ? { slug, name, href: `/catalogo/${slug}`, kind: "world" as const, world: String(data.get("world") || "disenador") as World, cover, intro }
          : { slug, name, href: `/catalogo/${slug}`, kind: "mood" as const, mood: String(data.get("mood") || "noche") as Mood, cover, intro }
      ) as Collection;
      const i = state.collections.findIndex((c) => c.slug === slug);
      if (i >= 0) state.collections[i] = collection;
      else state.collections.push(collection);
      persist();
      closeModal();
      toast(`${name} guardada`);
      paint();
    }
  });

  const storeEl = $("[data-form='store']");
  storeEl?.addEventListener("input", (e) => {
    const t = e.target as HTMLInputElement;
    if (t.name === "symbol") {
      state.store.symbol = t.value.trim() || state.store.symbol;
      persist();
      refreshStorePreviews();
      paintPerfumes();
      return;
    }
    refreshStorePreviews();
  });
  storeEl?.addEventListener("keydown", (e) => {
    const t = e.target as HTMLInputElement;
    if (t.name !== "city_new" || e.key !== "Enter") return;
    e.preventDefault();
    const name = t.value.trim();
    if (!name) return;
    captureStore();
    if (!state.store.cities.includes(name)) state.store.cities = [...state.store.cities, name];
    persist();
    paintStore();
  });
  storeEl?.addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const next = readStoreForm(form);
    next.socials = next.socials.filter((item) => item.name || item.href);
    if (next.takingOrders && !payList(next).length) {
      toast("Dejá al menos una forma de pago");
      return;
    }
    state.store = next;
    persist();
    toast("Tienda guardada");
    paint();
  });
}

function boot() {
  if (!$("[data-admin]")) return;
  bind();
  if (isIn()) openApp(true);
}

boot();
