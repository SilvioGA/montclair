import { animate, stagger } from "motion";
import { playAddSound } from "../lib/sound";

const ease = [0.32, 0.72, 0, 1] as const;

function reduce() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function revealPage() {
  const intro = document.querySelectorAll(
    "[data-reveal], [data-app-main] > div > header, [data-app-main] h1, [data-who-bar]",
  );
  const cards = document.querySelectorAll("[data-stagger] > *, [data-combo-card]");
  if (reduce()) {
    [...intro, ...cards].forEach((el) => {
      (el as HTMLElement).style.opacity = "1";
    });
    return;
  }
  if (intro.length) {
    animate(
      intro,
      { opacity: [0, 1], transform: ["translateY(14px)", "translateY(0px)"] },
      { duration: 0.45, delay: stagger(0.05), ease },
    );
  }
  if (cards.length) {
    animate(
      cards,
      { opacity: [0, 1], transform: ["translateY(18px)", "translateY(0px)"] },
      { duration: 0.42, delay: stagger(0.035, { startDelay: 0.08 }), ease },
    );
  }
}

export function openSheetMotion(root: HTMLElement) {
  const dim = root.querySelector<HTMLElement>("[data-sheet-dim]");
  const panel = root.querySelector<HTMLElement>("[data-sheet-panel]");
  if (!dim || !panel) return;
  dim.style.opacity = "0";
  panel.style.transform = "translateY(110%)";
  if (reduce()) {
    dim.style.opacity = "1";
    panel.style.transform = "translateY(0)";
    return;
  }
  animate(dim, { opacity: [0, 1] }, { duration: 0.28, ease });
  animate(panel, { transform: ["translateY(110%)", "translateY(0)"] }, { duration: 0.42, ease });
}

export async function closeSheetMotion(root: HTMLElement) {
  const dim = root.querySelector<HTMLElement>("[data-sheet-dim]");
  const panel = root.querySelector<HTMLElement>("[data-sheet-panel]");
  if (!dim || !panel) return;
  if (reduce()) {
    dim.style.opacity = "0";
    panel.style.transform = "translateY(110%)";
    return;
  }
  await Promise.all([
    animate(dim, { opacity: [1, 0] }, { duration: 0.2, ease }),
    animate(panel, { transform: ["translateY(0)", "translateY(110%)"] }, { duration: 0.3, ease }),
  ]);
  dim.style.opacity = "0";
  panel.style.transform = "translateY(110%)";
}

export function popPlay(bar: HTMLElement, show: boolean) {
  if (reduce()) return;
  if (show) {
    animate(bar, { opacity: [0, 1], transform: ["translateY(12px)", "translateY(0px)"] }, { duration: 0.38, ease });
  } else {
    animate(bar, { opacity: [1, 0], transform: ["translateY(0px)", "translateY(10px)"] }, { duration: 0.24, ease });
  }
}

export function popBadge(el: HTMLElement) {
  if (reduce()) return;
  animate(el, { transform: ["scale(1)", "scale(1.25)", "scale(1)"] }, { duration: 0.35, ease });
}

export function pressPop(el: HTMLElement) {
  if (reduce()) return;
  animate(el, { transform: ["scale(1)", "scale(0.97)", "scale(1)"] }, { duration: 0.28, ease });
}

function flyOrigin(from: HTMLElement) {
  const hero = from.closest("[data-perfume-page]")?.querySelector("img");
  if (hero) return hero;
  const sheet = document.querySelector<HTMLElement>("[data-sheet-root]:not(.invisible) [data-sheet-image]");
  if (sheet) return sheet;
  const near = from.closest("article, [data-combo-card], li")?.querySelector("img");
  return near ?? from;
}

export function flyToCart(from: HTMLElement, image: string) {
  playAddSound();
  if (reduce() || !image) return;
  const target = [...document.querySelectorAll<HTMLElement>("[data-cart-target]")].find(
    (el) => el.offsetParent !== null,
  );
  if (!target) return;

  const origin = flyOrigin(from);
  const a = origin.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const size = Math.round(Math.min(76, Math.max(48, Math.min(a.width, a.height) * 0.34)));

  const ghost = document.createElement("img");
  ghost.src = image;
  ghost.alt = "";
  ghost.setAttribute("aria-hidden", "true");
  ghost.style.cssText = [
    "position:fixed",
    `left:${a.left + a.width / 2 - size / 2}px`,
    `top:${a.top + a.height / 2 - size / 2}px`,
    `width:${size}px`,
    `height:${size}px`,
    "object-fit:cover",
    "border-radius:12px",
    "z-index:60",
    "pointer-events:none",
    "box-shadow:0 10px 28px #00000073",
    "will-change:transform,opacity",
  ].join(";");
  document.body.appendChild(ghost);

  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);

  const run = animate(
    ghost,
    {
      transform: [
        "translate(0px, 0px) scale(1)",
        `translate(${dx * 0.52}px, ${Math.min(dy * 0.38, dy) - 52}px) scale(0.68)`,
        `translate(${dx}px, ${dy}px) scale(0.16)`,
      ],
      opacity: [1, 1, 0],
    },
    { duration: 0.64, ease },
  );

  void run.finished.then(() => ghost.remove()).catch(() => ghost.remove());
}
