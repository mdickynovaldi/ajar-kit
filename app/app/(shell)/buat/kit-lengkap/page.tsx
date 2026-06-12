"use client";

/* AjarKit — Kit Lengkap (design.md §9.F.6): sekali isi → paket dokumen
   saling konsisten. Centang komponen → total kredit dinamis → startJob. */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { Button, Field } from "@/components/ui/controls";
import { Sheet } from "@/components/ui/sheet";
import { useApp } from "@/lib/store";
import {
  DOC_TYPES,
  JENJANG_OPTIONS,
  mapelForJenjang,
  modeCost,
} from "@/lib/constants";
import { QualityPicker } from "../_components/wizard-shell";
import type { DocType, QualityMode } from "@/lib/types";
import { startJob } from "@/lib/generation";

/* Komponen kit + biaya dasar (mode Standar) */
const KIT_COMPONENTS: { type: DocType; base: number; optional?: boolean }[] = [
  { type: "modul_ajar", base: 50 },
  { type: "lkpd", base: 30 },
  { type: "asesmen", base: 35 },
  { type: "bank_soal", base: 40 },
  { type: "prota_promes", base: 45, optional: true },
];

const gap = (px: number) => ({ "--gap": `${px}px` }) as React.CSSProperties;

export default function KitLengkapPage() {
  const app = useApp();
  const router = useRouter();

  // identitas inti (sekali isi) — default cerdas dari profil, spt modul-ajar
  const [jenjang, setJenjang] = useState(
    () =>
      JENJANG_OPTIONS.find((j) => app.user.kelas && j.includes(app.user.kelas)) ??
      JENJANG_OPTIONS[0],
  );
  const mapelOptions = mapelForJenjang(jenjang);
  const [mapel, setMapel] = useState(
    () => app.user.mapel?.find((m) => mapelOptions.includes(m)) ?? mapelOptions[0],
  );
  const [materi, setMateri] = useState("Ekosistem & Rantai Makanan");

  /* jenjang berubah → daftar mapel ikut; mapel lama tak tersedia → reset */
  function pickJenjang(next: string) {
    setJenjang(next);
    const opts = mapelForJenjang(next);
    if (!opts.includes(mapel)) setMapel(opts[0]);
  }
  const [alokasi, setAlokasi] = useState("4 JP × 2 pertemuan");
  const [semester, setSemester] = useState("Genap");

  // komponen tercentang (default: 4 inti, Prota & Promes opsional)
  const [selected, setSelected] = useState<Record<DocType, boolean>>({
    atp: false,
    modul_ajar: true,
    lkpd: true,
    asesmen: true,
    bank_soal: true,
    prota_promes: false,
    rps: false,
  });
  const [mode, setMode] = useState<QualityMode>("standar");
  const [sheetOpen, setSheetOpen] = useState(false);

  const chosen = KIT_COMPONENTS.filter((c) => selected[c.type]);
  const total = useMemo(
    () => chosen.reduce((sum, c) => sum + modeCost(c.base, mode), 0),
    [chosen, mode],
  );
  const compNames = chosen.map((c) => DOC_TYPES[c.type].shortLabel);
  const canBuild = chosen.length > 0 && materi.trim().length > 0;

  function toggle(type: DocType) {
    setSelected((s) => ({ ...s, [type]: !s[type] }));
  }

  function build() {
    if (!canBuild) return;
    if (app.credits < total) {
      setSheetOpen(true);
      return;
    }
    const id = startJob({
      docType: "modul_ajar",
      components: compNames,
      cost: total,
      title: `Kit Lengkap — ${materi.trim()}`,
      subject: mapel,
      jenjang,
      qualityMode: mode,
    });
    router.push(`/app/generate/${id}`);
  }

  return (
    <>
      <Link
        className="t-small muted"
        href="/app/buat"
        style={{ display: "inline-flex", gap: 4, alignItems: "center", marginBottom: 8 }}
      >
        <Icon name="chevL" style={{ width: 16, height: 16 }} />
        Kembali ke Buat
      </Link>

      <div className="wiz-head">
        <span className="doc-ic kit-ic-ai" style={{ width: 44, height: 44 }}>
          <Icon name="sparkles" />
        </span>
        <div className="grow">
          <h1 className="t-h2">Kit Lengkap — sekali klik</h1>
          <p className="muted t-small">
            Modul Ajar + LKPD + Asesmen + Bank Soal, saling konsisten dari satu isian.
          </p>
        </div>
        <div className="credit">
          <span className="gem">◈</span>
          <span className="num">{app.credits}</span>
          <span className="plus">+</span>
        </div>
      </div>

      <div className="gen-grid">
        <div className="stack" style={gap(18)}>
          {/* Identitas inti — sekali isi */}
          <section className="card pad-lg stack" style={gap(14)}>
            <div>
              <h3 className="t-h3">Identitas inti</h3>
              <p className="muted t-small" style={{ marginTop: 2 }}>
                Diisi sekali — dipakai untuk semua komponen kit.
              </p>
            </div>
            <div className="form-2">
              <Field label="Jenjang & kelas">
                <select
                  className="select"
                  value={jenjang}
                  onChange={(e) => pickJenjang(e.target.value)}
                >
                  {JENJANG_OPTIONS.map((j) => (
                    <option key={j}>{j}</option>
                  ))}
                </select>
              </Field>
              <Field label="Mata pelajaran">
                <select
                  className="select"
                  value={mapel}
                  onChange={(e) => setMapel(e.target.value)}
                >
                  {mapelOptions.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field
              label="Materi / topik"
              error={materi.trim() ? undefined : "Materi wajib diisi."}
            >
              <input
                className="input"
                value={materi}
                onChange={(e) => setMateri(e.target.value)}
                placeholder="Mis. Ekosistem & Rantai Makanan"
              />
            </Field>
            <div className="form-2">
              <Field label="Alokasi waktu">
                <input
                  className="input"
                  value={alokasi}
                  onChange={(e) => setAlokasi(e.target.value)}
                  placeholder="Mis. 4 JP × 2 pertemuan"
                />
              </Field>
              <Field label="Semester">
                <select
                  className="select"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                >
                  <option>Genap</option>
                  <option>Ganjil</option>
                </select>
              </Field>
            </div>
          </section>

          {/* Pilih komponen */}
          <section className="card pad-lg stack" style={gap(12)}>
            <div>
              <h3 className="t-h3">Pilih komponen</h3>
              <p className="muted t-small" style={{ marginTop: 2 }}>
                Centang komponen yang diinginkan — total kredit mengikuti pilihanmu.
              </p>
            </div>
            {KIT_COMPONENTS.map((c) => {
              const meta = DOC_TYPES[c.type];
              const on = selected[c.type];
              return (
                <button
                  key={c.type}
                  type="button"
                  className={`kit-comp${on ? " on" : ""}`}
                  aria-pressed={on}
                  onClick={() => toggle(c.type)}
                >
                  <span className="kc-check">
                    <Icon name="check" />
                  </span>
                  <span className={`doc-ic ${meta.color}`}>
                    <Icon name={meta.icon} />
                  </span>
                  <span className="grow">
                    <strong className="strong" style={{ fontSize: 14, display: "block" }}>
                      {meta.shortLabel}
                      {c.optional && (
                        <span className="t-small faint" style={{ fontWeight: 500 }}>
                          {" "}
                          · opsional
                        </span>
                      )}
                    </strong>
                    <span className="t-small muted">{meta.desc}</span>
                  </span>
                  <span className="kc-cost">
                    <span className="kc-gem">◈</span> {modeCost(c.base, mode)}
                  </span>
                </button>
              );
            })}
          </section>

          {/* Mode kualitas (free: terkunci Hemat — lihat QualityPicker) */}
          <section className="card pad-lg">
            <QualityPicker value={mode} onChange={setMode} />
          </section>

          <div className="sticky-actions">
            <Button
              variant="ai"
              className="grow"
              iconLeft="sparkles"
              disabled={!canBuild}
              onClick={build}
            >
              Buat Kit — {total} kredit
            </Button>
          </div>
        </div>

        {/* Panel ringkasan (desktop) */}
        <aside className="hide-mobile">
          <div className="card pad panel stack" style={gap(14)}>
            <h4 className="t-h4">Ringkasan</h4>
            <div className="stack" style={gap(9)}>
              <div className="row between">
                <span className="t-small muted">Jenis</span>
                <span className="t-small strong">Kit Lengkap</span>
              </div>
              <div className="row between">
                <span className="t-small muted">Mapel</span>
                <span className="t-small strong">{mapel}</span>
              </div>
              <div className="row between">
                <span className="t-small muted">Materi</span>
                <span className="t-small strong" style={{ textAlign: "right" }}>
                  {materi.trim() || "—"}
                </span>
              </div>
              <div className="row between" style={{ alignItems: "flex-start" }}>
                <span className="t-small muted">Komponen</span>
                <span className="t-small strong" style={{ textAlign: "right" }}>
                  {compNames.length ? compNames.join(" + ") : "—"}
                </span>
              </div>
            </div>
            <div
              className="row between"
              style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}
            >
              <span className="strong" style={{ fontWeight: 600 }}>
                Estimasi biaya
              </span>
              <span className="strong" style={{ fontWeight: 700 }}>
                <span style={{ color: "var(--accent-500)" }}>◈</span> {total}
              </span>
            </div>
            <p className="t-small faint">
              Semua komponen disusun saling konsisten dari satu isian.
            </p>
          </div>
        </aside>
      </div>

      {/* Kredit tidak cukup */}
      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        <h3 className="t-h3">Kredit tidak cukup</h3>
        <p className="muted" style={{ margin: "8px 0 16px" }}>
          Butuh {total} kredit, saldomu {app.credits}.
        </p>
        <Link className="btn btn-primary block" href="/app/kredit">
          Isi ulang kredit
        </Link>
      </Sheet>
    </>
  );
}
