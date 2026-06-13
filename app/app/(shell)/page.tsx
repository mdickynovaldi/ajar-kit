"use client";

/* AjarKit — Beranda / Dashboard (/app).
   Porting Ajarkit/app-beranda.html · design.md §9.D.1 · prd.md §8.2. */

import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icon";
import { EmptyState, Skeleton, StatusBadge } from "@/components/ui/controls";
import { useApp } from "@/lib/store";
import {
  DOC_TYPES,
  KIT_LENGKAP,
  STATUS_META,
} from "@/lib/constants";
import { tanggalPanjang } from "@/lib/format";
import type { DocType } from "@/lib/types";

/* Nama depan untuk sapaan — gelar (mis. "Dr.") ikut nama berikutnya */
function firstName(nama: string): string {
  const parts = nama.split(" ").filter(Boolean);
  if (parts.length === 0) return nama;
  if (parts[0].endsWith(".") && parts.length > 1) return `${parts[0]} ${parts[1]}`;
  return parts[0];
}

interface QuickAction {
  label: string;
  desc: string;
  icon: IconName;
  color: string;
  cost: number;
  href: string;
}

const GURU_QA: QuickAction[] = (
  ["modul_ajar", "lkpd", "asesmen", "bank_soal", "prota_promes"] as DocType[]
).map((t) => {
  const m = DOC_TYPES[t];
  return { label: m.label, desc: m.desc, icon: m.icon, color: m.color, cost: m.cost, href: m.href };
});

const DOSEN_QA: QuickAction[] = [
  { label: "RPS (OBE)", desc: "CPL → 16 pertemuan", icon: "layers", color: "ic-blue", cost: 80, href: "/app/buat/rps" },
  { label: "Bahan Ajar", desc: "Materi per pertemuan", icon: "book", color: "ic-teal", cost: 50, href: "/app/buat/rps" },
  { label: "Bank Soal", desc: "Sesuai CPMK", icon: "list", color: "ic-amber", cost: 40, href: "/app/buat/rps" },
  { label: "Rubrik", desc: "Penilaian terstruktur", icon: "check", color: "ic-green", cost: 30, href: "/app/buat/rps" },
];

function HomeSkeleton() {
  return (
    <>
      <div className="greet-grid" style={{ marginBottom: 22 }}>
        <div>
          <Skeleton width={230} height={30} />
          <Skeleton width={290} height={14} style={{ marginTop: 10 }} />
        </div>
      </div>
      <section style={{ marginBottom: 26 }}>
        <Skeleton width={110} height={20} style={{ marginBottom: 12 }} />
        <div className="qa-grid">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="card qa" aria-hidden="true">
              <Skeleton width={40} height={40} style={{ borderRadius: 10 }} />
              <Skeleton width="70%" height={16} />
              <Skeleton width="50%" height={12} />
            </div>
          ))}
        </div>
      </section>
      <section>
        <Skeleton width={150} height={20} style={{ marginBottom: 8 }} />
        <div className="card pad">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="recent-row" aria-hidden="true">
              <Skeleton width={40} height={40} style={{ borderRadius: 10, flex: "none" }} />
              <div className="grow">
                <Skeleton width="60%" height={14} />
                <Skeleton width="40%" height={11} style={{ marginTop: 6 }} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

export default function BerandaPage() {
  const app = useApp();

  if (!app.hydrated) return <HomeSkeleton />;

  const isDosen = app.role === "dosen";
  const qaItems = isDosen ? DOSEN_QA : GURU_QA;

  const recent = app.documents
    .filter((d) => (isDosen ? d.type === "rps" : d.type !== "rps"))
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 4);

  return (
    <>
      {/* Sapaan + indikator kredit (desktop) */}
      <div className="greet-grid" style={{ marginBottom: 22 }}>
        <div>
          <h1 className="t-h1">Halo, {firstName(app.user.nama)} 👋</h1>
          <p className="muted">{tanggalPanjang()} · Semester Genap 2025/2026</p>
        </div>
        <div className="row hide-mobile" style={{ gap: 10 }}>
          <div className="card pad" style={{ padding: "12px 16px" }}>
            <div className="t-caption muted">KREDIT</div>
            <div className="strong" style={{ fontWeight: 700, fontSize: 20 }}>
              <span style={{ color: "var(--accent-500)" }}>◈</span>{" "}
              <span className="num">{app.credits}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Aksi cepat */}
      <section style={{ marginBottom: 26 }}>
        <div className="row between" style={{ marginBottom: 12 }}>
          <h2 className="t-h3">Aksi cepat</h2>
          <span className="badge badge-draft">{isDosen ? "Mode Dosen" : "Mode Guru"}</span>
        </div>
        <div className="qa-grid">
          <Link className="card qa kit hover" href={KIT_LENGKAP.href}>
            <div className="row between">
              <span className="doc-ic">
                <Icon name="zap" />
              </span>
              <span className="badge" style={{ background: "rgba(255,255,255,.22)", color: "#fff" }}>
                <Icon name="sparkles" />
                AI
              </span>
            </div>
            <h4 className="t-h4">{isDosen ? "Paket Mata Kuliah" : "Kit Lengkap"}</h4>
            <p className="t-small" style={{ opacity: 0.92 }}>
              {isDosen
                ? "RPS + bahan ajar + bank soal sekaligus."
                : "Modul + LKPD + Asesmen + Bank Soal sekali isi."}
            </p>
            <span className="cost">{isDosen ? "≈ 150 kredit" : `≈ ${KIT_LENGKAP.cost} kredit`} · sekali klik</span>
          </Link>
          {qaItems.map((q) => (
            <Link key={q.label} className="card qa hover" href={q.href}>
              <span className={`doc-ic ${q.color}`}>
                <Icon name={q.icon} />
              </span>
              <h4 className="t-h4">{q.label}</h4>
              <p className="t-small muted">{q.desc}</p>
              <span className="cost">≈ {q.cost} kredit</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Lanjutkan dokumen */}
      <section>
        <div className="row between" style={{ marginBottom: 8 }}>
          <h2 className="t-h3">Lanjutkan dokumen</h2>
          <Link
            className="t-small"
            style={{ color: "var(--primary-600)", fontWeight: 600 }}
            href="/app/dokumen"
          >
            Lihat semua
          </Link>
        </div>
        <div className="card pad">
          {recent.length === 0 ? (
            <EmptyState icon="files" title="Belum ada dokumen. Yuk buat yang pertama!">
              <Link className="btn btn-primary" href="/app/buat">
                <Icon name="plus" />
                Buat Dokumen
              </Link>
            </EmptyState>
          ) : (
            recent.map((d) => {
              const meta = DOC_TYPES[d.type];
              const status = STATUS_META[d.status];
              return (
                <Link key={d.id} className="recent-row" href={`/app/dokumen/${d.id}`}>
                  <span className={`doc-ic ${meta.color}`} style={{ flex: "none" }}>
                    <Icon name={meta.icon} />
                  </span>
                  <div className="grow">
                    <div className="strong" style={{ fontWeight: 600, fontSize: 14 }}>
                      {d.title}
                    </div>
                    <div className="t-small muted">
                      {meta.shortLabel} · {d.subject} · {d.jenjang}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flex: "none" }}>
                    <StatusBadge badge={status.badge}>{status.label}</StatusBadge>
                    <div className="t-small faint" style={{ marginTop: 4 }}>
                      {d.updatedLabel}
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </section>
    </>
  );
}
