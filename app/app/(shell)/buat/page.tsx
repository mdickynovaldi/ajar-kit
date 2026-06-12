"use client";

/* AjarKit — Hub Buat Dokumen (/app/buat).
   Porting Ajarkit/app-buat.html · design.md §9.D.2. */

import { useState } from "react";
import Link from "next/link";
import posthog from "posthog-js";
import { Icon, type IconName } from "@/components/ui/icon";
import { Segmented } from "@/components/ui/controls";
import { useApp } from "@/lib/store";
import { DOC_TYPES, KIT_LENGKAP } from "@/lib/constants";
import type { Role } from "@/lib/types";

interface TypeItem {
  label: string;
  desc: string;
  icon: IconName;
  color: string;
  cost: number;
  time: string;
  href: string;
}

const TYPES: Record<Role, TypeItem[]> = {
  guru: [
    {
      label: DOC_TYPES.modul_ajar.label,
      desc: "Berbasis Profil Pelajar Pancasila, lengkap 4 tahap & 6 dimensi.",
      icon: DOC_TYPES.modul_ajar.icon,
      color: DOC_TYPES.modul_ajar.color,
      cost: DOC_TYPES.modul_ajar.cost,
      time: "± 1 menit",
      href: DOC_TYPES.modul_ajar.href,
    },
    {
      label: DOC_TYPES.lkpd.label,
      desc: "Lembar kerja peserta didik, bisa tautkan ke Modul Ajar.",
      icon: DOC_TYPES.lkpd.icon,
      color: DOC_TYPES.lkpd.color,
      cost: DOC_TYPES.lkpd.cost,
      time: "± 40 detik",
      href: DOC_TYPES.lkpd.href,
    },
    {
      label: DOC_TYPES.asesmen.label,
      desc: "Formatif, Sumatif, atau Diagnostik + rubrik & kunci.",
      icon: DOC_TYPES.asesmen.icon,
      color: DOC_TYPES.asesmen.color,
      cost: DOC_TYPES.asesmen.cost,
      time: "± 50 detik",
      href: DOC_TYPES.asesmen.href,
    },
    {
      label: DOC_TYPES.bank_soal.label,
      desc: "Atur komposisi LOTS/MOTS/HOTS, kunci & pembahasan.",
      icon: DOC_TYPES.bank_soal.icon,
      color: DOC_TYPES.bank_soal.color,
      cost: DOC_TYPES.bank_soal.cost,
      time: "± 1 menit",
      href: DOC_TYPES.bank_soal.href,
    },
    {
      label: DOC_TYPES.prota_promes.label,
      desc: "Program Tahunan & Semester dalam tabel rapi.",
      icon: DOC_TYPES.prota_promes.icon,
      color: DOC_TYPES.prota_promes.color,
      cost: DOC_TYPES.prota_promes.cost,
      time: "± 1 menit",
      href: DOC_TYPES.prota_promes.href,
    },
  ],
  dosen: [
    {
      label: DOC_TYPES.rps.label,
      desc: "CPL → CPMK → Sub-CPMK → rencana 16 pertemuan & rubrik.",
      icon: DOC_TYPES.rps.icon,
      color: DOC_TYPES.rps.color,
      cost: DOC_TYPES.rps.cost,
      time: "± 2 menit",
      href: DOC_TYPES.rps.href,
    },
    {
      label: "Bahan Ajar",
      desc: "Materi terstruktur per pertemuan sesuai Sub-CPMK.",
      icon: "book",
      color: "ic-teal",
      cost: 50,
      time: "± 1 menit",
      href: "/app/buat/rps",
    },
    {
      label: "Bank Soal",
      desc: "Butir soal terpetakan ke CPMK, level kognitif diatur.",
      icon: "list",
      color: "ic-amber",
      cost: 40,
      time: "± 1 menit",
      href: "/app/buat/rps",
    },
    {
      label: "Rubrik Penilaian",
      desc: "Kriteria & bobot tiap komponen penilaian.",
      icon: "check",
      color: "ic-green",
      cost: 30,
      time: "± 40 detik",
      href: "/app/buat/rps",
    },
  ],
};

export default function BuatHubPage() {
  const app = useApp();
  /* Filter tampilan saja — role di store tidak diubah */
  const [view, setView] = useState<Role | null>(null);
  const active: Role = view ?? app.role;
  const isDosen = active === "dosen";

  return (
    <>
      <div className="row between" style={{ marginBottom: 6 }}>
        <h1 className="t-h1">Buat Dokumen</h1>
        <div className="hide-mobile">
          <Segmented<Role>
            options={[
              { value: "guru", label: "Guru" },
              { value: "dosen", label: "Dosen" },
            ]}
            value={active}
            onChange={setView}
          />
        </div>
      </div>
      <p className="muted" style={{ marginBottom: 20 }}>
        Pilih jenis dokumen. AI menyusun dalam ±1 menit dengan field yang sudah terisi dari profilmu.
      </p>

      {/* Kit Lengkap / Paket Mata Kuliah — paling menonjol */}
      <Link
        className="card kit-hero hover"
        href={KIT_LENGKAP.href}
        style={{ marginBottom: 22 }}
        onClick={() => posthog.capture("document_type_selected", { doc_type: "kit_lengkap", role: active })}
      >
        <span className="doc-ic">
          <Icon name="zap" />
        </span>
        <div className="grow" style={{ minWidth: 200 }}>
          <span className="badge" style={{ background: "rgba(255,255,255,.22)", color: "#fff" }}>
            <Icon name="sparkles" />
            Paling efisien
          </span>
          <h2 className="t-h3" style={{ margin: "8px 0 4px" }}>
            {isDosen ? "Paket Mata Kuliah — sekali klik" : "Kit Lengkap — sekali klik"}
          </h2>
          <p style={{ opacity: 0.92 }}>
            {isDosen
              ? "RPS + bahan ajar + bank soal + rubrik, konsisten dari satu isian."
              : "Modul Ajar + LKPD + Asesmen + Bank Soal, saling konsisten dari satu isian."}
          </p>
          <p className="t-small" style={{ opacity: 0.85, fontWeight: 600, marginTop: 6 }}>
            {isDosen ? "≈ 150 kredit" : `≈ ${KIT_LENGKAP.cost} kredit`}
          </p>
        </div>
        <span className="btn lg" style={{ background: "#fff", color: "var(--primary-700)", flex: "none" }}>
          Mulai <Icon name="arrowR" />
        </span>
      </Link>

      <h3 className="t-h3" style={{ marginBottom: 12 }}>Atau buat satu per satu</h3>
      <div className="type-grid">
        {TYPES[active].map((x) => (
          <Link
            key={x.label}
            className="card type-card hover"
            href={x.href}
            onClick={() => posthog.capture("document_type_selected", { doc_type: x.href.split("/").pop(), label: x.label, cost: x.cost, role: active })}
          >
            <span className={`doc-ic ${x.color}`}>
              <Icon name={x.icon} />
            </span>
            <h4 className="t-h4">{x.label}</h4>
            <p className="t-small muted" style={{ lineHeight: 1.5 }}>
              {x.desc}
            </p>
            <div className="meta">
              <span>
                <Icon name="sparkles" />± {x.cost} kredit
              </span>
              <span>
                <Icon name="clock" />
                {x.time}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
