"use client";

/* AjarKit — pendaftaran service worker (prd.md §12).
   Hanya aktif di production agar tidak mengganggu HMR saat development.
   Tidak merender apa pun. */

import { useEffect } from "react";

export function SwRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* gagal mendaftar tidak boleh mengganggu aplikasi */
      });
    }
  }, []);

  return null;
}
