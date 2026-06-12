"use client";

/* AjarKit — wizard Prota & Promes (design.md §9.F.5, prd.md §8.3).
   2 langkah: Identitas → Materi & kualitas. Output berupa tabel Program
   Tahunan & Program Semester. */

import { useState } from "react";
import { Field } from "@/components/ui/controls";
import { useApp } from "@/lib/store";
import { DOC_TYPES, JENJANG_OPTIONS, mapelForJenjang, modeCost } from "@/lib/constants";
import type { JobParams } from "@/lib/generation";
import type { QualityMode } from "@/lib/types";
import {
  kelasLabel,
  QualityPicker,
  StepPanel,
  WizardShell,
} from "../_components/wizard-shell";
import { SummaryPanel } from "../_components/summary-panel";

const STEP_LABELS = ["Identitas", "Materi & kualitas"];
const TAHUN_AJARAN = ["2026/2027", "2025/2026"];

export default function BuatProtaPromesPage() {
  const { user } = useApp();
  const [step, setStep] = useState(1);

  /* Langkah 1 — Identitas */
  const [jenjang, setJenjang] = useState(
    () => JENJANG_OPTIONS.find((j) => user.kelas && j.includes(user.kelas)) ?? JENJANG_OPTIONS[0],
  );
  const mapelOptions = mapelForJenjang(jenjang);
  const [mapel, setMapel] = useState(
    () => user.mapel?.find((m) => mapelOptions.includes(m)) ?? mapelOptions[0],
  );
  const [tahun, setTahun] = useState(TAHUN_AJARAN[0]);

  /* jenjang berubah → daftar mapel ikut; mapel lama tak tersedia → reset */
  function pickJenjang(next: string) {
    setJenjang(next);
    const opts = mapelForJenjang(next);
    if (!opts.includes(mapel)) setMapel(opts[0]);
  }
  const [minggu, setMinggu] = useState(36);

  /* Langkah 2 — Materi & kualitas */
  const [daftarMateri, setDaftarMateri] = useState("");
  const [mode, setMode] = useState<QualityMode>("standar");

  const cost = modeCost(DOC_TYPES.prota_promes.cost, mode);
  const materiCount = daftarMateri
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean).length;

  const canNext =
    step === 1 ? minggu >= 10 && minggu <= 52 : daftarMateri.trim() !== "";

  function buildJob(): JobParams {
    return {
      docType: "prota_promes",
      title: `Prota & Promes ${mapel} ${tahun}`,
      subject: mapel,
      jenjang: kelasLabel(jenjang),
      qualityMode: mode,
      cost,
    };
  }

  return (
    <WizardShell
      docType="prota_promes"
      stepLabels={STEP_LABELS}
      step={step}
      onStepChange={setStep}
      canNext={canNext}
      cost={cost}
      buildJob={buildJob}
      summary={
        <SummaryPanel
          rows={[
            { label: "Jenis", value: "Prota & Promes" },
            { label: "Mapel", value: `${mapel} · ${kelasLabel(jenjang)}` },
            { label: "Tahun ajaran", value: tahun },
            { label: "Minggu efektif", value: `${minggu} minggu` },
            { label: "Materi / CP", value: materiCount > 0 ? `${materiCount} butir` : "—" },
          ]}
          cost={cost}
          note="Output berupa tabel Program Tahunan & Program Semester."
        />
      }
    >
      {/* LANGKAH 1 — Identitas */}
      <StepPanel on={step === 1}>
        <div className="card pad-lg stack" style={{ "--gap": "16px" } as React.CSSProperties}>
          <h3 className="t-h3">Identitas</h3>
          <div className="form-2">
            <Field label="Mata pelajaran">
              <select className="select" value={mapel} onChange={(e) => setMapel(e.target.value)}>
                {mapelOptions.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </Field>
            <Field label="Jenjang & kelas">
              <select className="select" value={jenjang} onChange={(e) => pickJenjang(e.target.value)}>
                {JENJANG_OPTIONS.map((j) => (
                  <option key={j}>{j}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="form-2">
            <Field label="Tahun ajaran">
              <select className="select" value={tahun} onChange={(e) => setTahun(e.target.value)}>
                {TAHUN_AJARAN.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Jumlah minggu efektif" help="Antara 10–52 minggu.">
              <input
                className="input"
                type="number"
                min={10}
                max={52}
                value={minggu}
                onChange={(e) => setMinggu(Number(e.target.value) || 0)}
              />
            </Field>
          </div>
        </div>
      </StepPanel>

      {/* LANGKAH 2 — Materi & kualitas */}
      <StepPanel on={step === 2}>
        <div className="card pad-lg stack" style={{ "--gap": "16px" } as React.CSSProperties}>
          <h3 className="t-h3">Materi & kualitas</h3>
          <Field label="Daftar materi / CP" help="Tulis satu materi atau CP per baris.">
            <textarea
              className="textarea"
              rows={6}
              value={daftarMateri}
              onChange={(e) => setDaftarMateri(e.target.value)}
              placeholder={"Mis.\nEkosistem & rantai makanan\nPerubahan wujud benda\nSistem tata surya"}
            />
          </Field>
          <div>
            <QualityPicker value={mode} onChange={setMode} />
          </div>
        </div>
      </StepPanel>
    </WizardShell>
  );
}
