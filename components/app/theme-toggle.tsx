"use client";

/* AjarKit — tombol ganti tema terang/gelap (ikon sinkron dgn [data-theme]) */

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { useApp } from "@/lib/store";

export function ThemeToggle() {
  const { toggleTheme } = useApp();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const el = document.documentElement;
    const sync = () => setDark(el.getAttribute("data-theme") === "dark");
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);

  return (
    <button className="iconbtn" onClick={toggleTheme} aria-label="Ganti tema">
      <Icon name={dark ? "sun" : "moon"} />
    </button>
  );
}
