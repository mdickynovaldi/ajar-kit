import type { MetadataRoute } from "next";

/* AjarKit — Web App Manifest (prd.md §12, design.md §14).
   Membuat aplikasi dapat dipasang (installable) sebagai PWA. */

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AjarKit — Asisten Perangkat Ajar",
    short_name: "AjarKit",
    description:
      "Asisten perangkat ajar untuk guru Indonesia: susun RPP, modul ajar, kisi-kisi, dan soal dengan bantuan AI.",
    start_url: "/app",
    display: "standalone",
    background_color: "#F7F8FB",
    theme_color: "#2B59E0",
    lang: "id",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
