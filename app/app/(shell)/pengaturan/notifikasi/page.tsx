"use client";

/* AjarKit — Pengaturan / Notifikasi (design.md §9.J, prd.md §8.8).
   Porting pane "Notifikasi" dari Ajarkit/app-pengaturan.html:
   toggle email & in-app per jenis kabar. Default mengikuti desain. */

import { useState } from "react";
import { Button, Switch } from "@/components/ui/controls";
import { useToast } from "@/components/ui/toast";
import { SettingsShell } from "../_components/settings-nav";

interface PrefRow {
  id: string;
  title: string;
  desc: string;
  email: boolean;
  inApp: boolean;
}

const DEFAULT_PREFS: PrefRow[] = [
  {
    id: "dokumen",
    title: "Dokumen selesai dibuat",
    desc: "Saat AI selesai menyusun dokumen",
    email: true,
    inApp: true,
  },
  {
    id: "review",
    title: "Hasil review",
    desc: "Disetujui atau diminta revisi",
    email: true,
    inApp: true,
  },
  {
    id: "langganan",
    title: "Pengingat langganan",
    desc: "Sebelum kredit/paket habis",
    email: true,
    inApp: false,
  },
  {
    id: "promo",
    title: "Promo & info produk",
    desc: "Fitur baru & penawaran",
    email: false,
    inApp: false,
  },
];

export default function PengaturanNotifikasiPage() {
  const toast = useToast();
  const [prefs, setPrefs] = useState<PrefRow[]>(DEFAULT_PREFS);

  function setPref(id: string, key: "email" | "inApp", on: boolean) {
    setPrefs((list) =>
      list.map((p) => (p.id === id ? { ...p, [key]: on } : p)),
    );
  }

  return (
    <SettingsShell>
      <section
        className="card pad-lg stack"
        style={{ "--gap": "4px" } as React.CSSProperties}
      >
        <h3 className="t-h3" style={{ marginBottom: 10 }}>
          Notifikasi
        </h3>

        {prefs.map((p) => (
          <div className="opt-row" key={p.id}>
            <div>
              <strong className="strong" style={{ fontSize: 14 }}>
                {p.title}
              </strong>
              <p className="t-small muted">{p.desc}</p>
            </div>
            <div className="row">
              <span className="t-small faint">Email</span>
              <Switch
                on={p.email}
                onChange={(on) => setPref(p.id, "email", on)}
                label={`Email — ${p.title}`}
              />
              <span className="t-small faint">In-app</span>
              <Switch
                on={p.inApp}
                onChange={(on) => setPref(p.id, "inApp", on)}
                label={`In-app — ${p.title}`}
              />
            </div>
          </div>
        ))}

        <div style={{ paddingTop: 12 }}>
          <Button onClick={() => toast("Preferensi notifikasi disimpan")}>
            Simpan
          </Button>
        </div>
      </section>
    </SettingsShell>
  );
}
