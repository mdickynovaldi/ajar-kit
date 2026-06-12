"use client";

/* AjarKit — motion engine (porting revealScan + countUp dari ajarkit.js).
   Bungkus konten halaman dengan <RevealScope> agar blok-blok level atas
   muncul bertahap saat di-scroll dan angka .num (≥20) menghitung naik. */

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const REVEAL_SEL = [
  "main.app-main > *",
  ".hero-grid > *",
  ".sec-head",
  ".feat-grid > *",
  ".seg-grid > *",
  ".steps3 > *",
  ".price-peek > *",
  ".quotes > *",
  ".cta-band",
  ".logos",
].join(",");

const SKIP = new Set(["SCRIPT", "STYLE", "LINK"]);

// id unik per pemasangan effect — agar remount (StrictMode/navigasi) meng-observe
// ulang elemen yang observer lamanya sudah di-disconnect tapi belum sempat reveal
let scanInstance = 0;

function countUp(scope: Element, reduceMotion: boolean) {
  if (reduceMotion) return;
  scope.querySelectorAll<HTMLElement>(".num").forEach((n) => {
    if (n.dataset.akcount) return;
    const raw = n.textContent?.trim() ?? "";
    if (!/^\d+$/.test(raw)) return;
    const end = parseInt(raw, 10);
    if (end < 20) return;
    n.dataset.akcount = "1";
    const dur = 720;
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      n.textContent = Math.round(end * e).toString();
      if (k < 1) requestAnimationFrame(tick);
      else n.textContent = raw;
    };
    requestAnimationFrame(tick);
  });
}

export function RevealScope({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const reduceMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          // elemen sangat tinggi (mis. kanvas editor) tak akan pernah mencapai
          // rasio 8% — cukup tersentuh viewport langsung tampil
          const tall =
            en.boundingClientRect.height > window.innerHeight * 0.6;
          if (en.intersectionRatio < 0.08 && !tall) return;
          en.target.classList.add("in");
          countUp(en.target, reduceMotion);
          observer.unobserve(en.target);
        });
      },
      { threshold: [0, 0.08], rootMargin: "0px 0px -6% 0px" },
    );

    const instance = String(++scanInstance);
    const parentCount = new Map<Node, number>();
    const scan = () => {
      root.querySelectorAll<HTMLElement>(REVEAL_SEL).forEach((el) => {
        if (SKIP.has(el.tagName)) return;
        if (el.classList.contains("in")) return; // sudah tampil
        if (el.dataset.akrev === instance) return; // sudah di-observe run ini
        el.dataset.akrev = instance;
        const p = el.parentNode as Node;
        const i = parentCount.get(p) || 0;
        parentCount.set(p, i + 1);
        if (!el.style.transitionDelay)
          el.style.transitionDelay = Math.min(i, 7) * 55 + "ms";
        el.classList.add("reveal");
        observer.observe(el);
      });
    };

    scan();
    // tangkap konten yang dirender setelah hidrasi/perubahan state
    const raf = requestAnimationFrame(scan);
    const mo = new MutationObserver(() => scan());
    mo.observe(root, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
      observer.disconnect();
    };
  }, [pathname]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
