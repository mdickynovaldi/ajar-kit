"use client";

/* AjarKit — banner offline (design.md §9.K, porting Ajarkit/sistem.html).
   Mendengarkan event online/offline; tampil sebagai bar tetap di bawah.
   Render pertama selalu null (aman hidrasi). */

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";

export function OfflineBanner() {
  const toast = useToast();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="offline-banner" role="status" aria-live="polite">
      <Icon name="wifi" />
      <span className="grow">
        Kamu sedang offline. Sebagian fitur mungkin tak tersedia.
      </span>
      <button
        className="btn sm"
        style={{ background: "rgba(255,255,255,.18)", color: "#fff" }}
        onClick={() => toast("Mencoba menyambung…")}
      >
        Coba lagi
      </button>
    </div>
  );
}
