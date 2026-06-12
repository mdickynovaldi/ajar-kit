"use client";

/* AjarKit — kerangka wizard generator guru (pola design.md §9.E, porting
   Ajarkit/app-modul-ajar.html). Menyediakan: back link, wiz-head dengan
   pill kredit live, indikator langkah, grid form + panel ringkasan,
   sticky actions, sheet "Kredit tidak cukup", dan submit → startJob. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { Icon } from "@/components/ui/icon";
import { Button, Segmented, Steps } from "@/components/ui/controls";
import { Sheet } from "@/components/ui/sheet";
import { useApp } from "@/lib/store";
import { DOC_TYPES, QUALITY_MODES } from "@/lib/constants";
import { startJob, type JobParams } from "@/lib/generation";
import type { DocType, QualityMode } from "@/lib/types";

/** "SD — Kelas 5 (Fase C)" → "Kelas 5" (format jenjang dokumen mock) */
export function kelasLabel(jenjang: string): string {
  return jenjang.match(/Kelas \d+/)?.[0] ?? jenjang;
}

export function WizardShell({
  docType,
  title,
  stepLabels,
  step,
  onStepChange,
  canNext = true,
  cost,
  buildJob,
  summary,
  children,
}: {
  docType: DocType;
  /** judul header; default mengikuti label DOC_TYPES */
  title?: string;
  stepLabels: string[];
  step: number;
  onStepChange: (next: number) => void;
  /** validasi langkah aktif; false → Lanjut/Buat disabled */
  canNext?: boolean;
  cost: number;
  buildJob: () => JobParams;
  summary: React.ReactNode;
  children: React.ReactNode;
}) {
  const app = useApp();
  const router = useRouter();
  const [shortOpen, setShortOpen] = useState(false);
  const [building, setBuilding] = useState(false);
  const meta = DOC_TYPES[docType];
  const total = stepLabels.length;

  function go(d: number) {
    onStepChange(Math.min(total, Math.max(1, step + d)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function build() {
    if (cost > app.credits) {
      setShortOpen(true);
      return;
    }
    setBuilding(true);
    const job = buildJob();
    posthog.capture("document_generation_started", {
      doc_type: docType,
      cost,
      quality_mode: job.qualityMode,
      is_kit: !!job.components?.length,
    });
    const id = startJob(job);
    router.push(`/app/generate/${id}`);
  }

  return (
    <>
      <Link
        href="/app/buat"
        className="t-small muted"
        style={{ display: "inline-flex", gap: 4, alignItems: "center", marginBottom: 8 }}
      >
        <Icon name="chevL" style={{ width: 14, height: 14 }} />
        Kembali ke Buat
      </Link>

      <div className="wiz-head">
        <span className={`doc-ic ${meta.color}`} style={{ width: 44, height: 44 }}>
          <Icon name={meta.icon} />
        </span>
        <div className="grow">
          <h1 className="t-h2">{title ?? meta.label}</h1>
          <p className="muted t-small">
            Langkah {step} dari {total} · {stepLabels[step - 1]}
          </p>
        </div>
        <Link href="/app/kredit" className="credit" aria-label={`Saldo ${app.credits} kredit — isi ulang`}>
          <span className="gem">◈</span>
          <span className="num">{app.credits}</span>
          <span className="plus">+</span>
        </Link>
      </div>

      <div style={{ marginBottom: 22 }}>
        <Steps total={total} current={step} />
      </div>

      <div className="gen-grid">
        <div>
          {children}

          <div className="sticky-actions">
            <Button
              variant="secondary"
              iconLeft="chevL"
              style={{ visibility: step === 1 ? "hidden" : "visible" }}
              onClick={() => go(-1)}
            >
              Kembali
            </Button>
            {step < total ? (
              <Button className="grow" iconRight="chevR" disabled={!canNext} onClick={() => go(1)}>
                Lanjut
              </Button>
            ) : (
              <Button
                variant="ai"
                className="grow"
                iconLeft="sparkles"
                disabled={!canNext || building}
                onClick={build}
              >
                Buat — {cost} kredit
              </Button>
            )}
          </div>
        </div>

        <aside className="hide-mobile">{summary}</aside>
      </div>

      <Sheet open={shortOpen} onClose={() => setShortOpen(false)}>
        <h3 className="t-h3">Kredit tidak cukup</h3>
        <p className="muted" style={{ margin: "8px 0 16px" }}>
          Butuh {cost} kredit, saldomu {app.credits}.
        </p>
        <Link href="/app/kredit" className="btn btn-primary block">
          Isi ulang kredit
        </Link>
      </Sheet>
    </>
  );
}

/* ---------- Panel langkah (step-panel.on dari design) ---------- */
export function StepPanel({ on, children }: { on: boolean; children: React.ReactNode }) {
  return <section className={`step-panel${on ? " on" : ""}`}>{children}</section>;
}

/* ---------- Baris opsi (switch / select kecil) ---------- */
export function OptRow({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="opt-row">
      <div>
        <strong className="strong" style={{ fontSize: 14 }}>
          {title}
        </strong>
        <p className="t-small muted">{desc}</p>
      </div>
      {children}
    </div>
  );
}

/* ---------- Mode kualitas (segmented Hemat/Standar/Kualitas Tinggi) ----------
   Paket free: hanya Hemat — Standar/Tinggi disabled berlabel "Pro" (server
   /api/generate tetap MEMAKSA hemat apa pun yang terkirim). */
export function QualityPicker({
  value,
  onChange,
}: {
  value: QualityMode;
  onChange: (m: QualityMode) => void;
}) {
  const app = useApp();
  const free = app.user.plan === "free";

  // free + nilai tersimpan bukan hemat (mis. default "standar") → kunci ke hemat
  useEffect(() => {
    if (free && value !== "hemat") onChange("hemat");
  }, [free, value, onChange]);

  return (
    <div style={{ paddingTop: 14 }}>
      <span className="lbl">Mode kualitas</span>
      <Segmented
        full
        options={(Object.keys(QUALITY_MODES) as QualityMode[]).map((m) => ({
          value: m,
          label: QUALITY_MODES[m].label,
          disabled: free && m !== "hemat",
          hint: free && m !== "hemat" ? "Pro" : undefined,
        }))}
        value={value}
        onChange={onChange}
      />
      <p className="help">
        {free ? "Versi gratis memakai mode Hemat." : QUALITY_MODES[value].help}
      </p>
    </div>
  );
}

/* ---------- Stepper angka (jumlah aktivitas / butir / soal) ---------- */
export function Stepper({
  value,
  onChange,
  min = 1,
  max = 50,
  step = 1,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
}) {
  return (
    <div className="gen-stepper" role="group" aria-label={label}>
      <button
        type="button"
        className="iconbtn"
        aria-label="Kurangi"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - step))}
      >
        −
      </button>
      <span className="val num" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className="iconbtn"
        aria-label="Tambah"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + step))}
      >
        <Icon name="plus" />
      </button>
    </div>
  );
}
