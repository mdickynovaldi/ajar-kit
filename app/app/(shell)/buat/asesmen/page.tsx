"use client";

/* AjarKit — wizard Asesmen (design.md §9.F.3, prd.md §8.3).
   2 langkah: Detail asesmen → Opsi & kualitas. Jenis Formatif/Sumatif/
   Diagnostik, bentuk soal, rubrik & kunci, tautan Modul Ajar opsional. */

import { useState } from "react";
import { Field, Segmented, Switch } from "@/components/ui/controls";
import { useApp } from "@/lib/store";
import { DOC_TYPES, JENJANG_OPTIONS, mapelForJenjang, modeCost } from "@/lib/constants";
import type { JobParams } from "@/lib/generation";
import type { QualityMode } from "@/lib/types";
import {
  kelasLabel,
  OptRow,
  QualityPicker,
  StepPanel,
  Stepper,
  WizardShell,
} from "../_components/wizard-shell";
import { SummaryPanel } from "../_components/summary-panel";

const STEP_LABELS = ["Detail asesmen", "Opsi & kualitas"];
const JENIS_ASESMEN = ["Formatif", "Sumatif", "Diagnostik"] as const;
type JenisAsesmen = (typeof JENIS_ASESMEN)[number];
const BENTUK = ["Pilihan ganda", "Uraian", "Observasi", "Proyek"];

export default function BuatAsesmenPage() {
  const app = useApp();
  const { user } = app;
  const [step, setStep] = useState(1);

  const modulDocs = app.documents.filter((d) => d.type === "modul_ajar");

  /* Langkah 1 — Detail asesmen */
  const [jenis, setJenis] = useState<JenisAsesmen>("Formatif");
  const [bentuk, setBentuk] = useState(BENTUK[0]);
  const [materi, setMateri] = useState("");
  const [jumlah, setJumlah] = useState(10);
  const [sumber, setSumber] = useState("");

  /* Langkah 2 — Opsi & kualitas */
  const [rubrik, setRubrik] = useState(true);
  const [kunci, setKunci] = useState(true);
  const [mode, setMode] = useState<QualityMode>("standar");

  const sumberDoc = modulDocs.find((d) => d.id === sumber);
  const cost = modeCost(DOC_TYPES.asesmen.cost, mode);
  const canNext = step === 1 ? materi.trim() !== "" : true;

  const kelengkapan =
    [rubrik ? "Rubrik" : null, kunci ? "Kunci" : null].filter(Boolean).join(" + ") || "—";

  function buildJob(): JobParams {
    // opsi mapel mengikuti jenjang guru pada profil (mapelForJenjang)
    const mapelOptions = mapelForJenjang(user.jenjang);
    return {
      docType: "asesmen",
      title: `Asesmen ${jenis} — ${materi.trim()}`,
      subject:
        sumberDoc?.subject ?? user.mapel?.find((m) => mapelOptions.includes(m)) ?? mapelOptions[0],
      jenjang: sumberDoc?.jenjang ?? kelasLabel(user.kelas ?? JENJANG_OPTIONS[0]),
      qualityMode: mode,
      cost,
    };
  }

  return (
    <WizardShell
      docType="asesmen"
      stepLabels={STEP_LABELS}
      step={step}
      onStepChange={setStep}
      canNext={canNext}
      cost={cost}
      buildJob={buildJob}
      summary={
        <SummaryPanel
          rows={[
            { label: "Jenis", value: `Asesmen ${jenis}` },
            { label: "Bentuk", value: bentuk },
            { label: "Materi", value: materi.trim() || "—" },
            { label: "Jumlah butir", value: `${jumlah} butir` },
            { label: "Kelengkapan", value: kelengkapan },
          ]}
          cost={cost}
        />
      }
    >
      {/* LANGKAH 1 — Detail asesmen */}
      <StepPanel on={step === 1}>
        <div className="card pad-lg stack" style={{ "--gap": "16px" } as React.CSSProperties}>
          <h3 className="t-h3">Detail asesmen</h3>
          <div>
            <span className="lbl">Jenis asesmen</span>
            <Segmented
              full
              options={JENIS_ASESMEN.map((j) => ({ value: j, label: j }))}
              value={jenis}
              onChange={setJenis}
            />
          </div>
          <div className="form-2">
            <Field label="Bentuk">
              <select className="select" value={bentuk} onChange={(e) => setBentuk(e.target.value)}>
                {BENTUK.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </Field>
            <Field label="Jumlah butir">
              <Stepper value={jumlah} onChange={setJumlah} min={1} max={50} label="Jumlah butir" />
            </Field>
          </div>
          <Field label="Materi / topik">
            <input
              className="input"
              value={materi}
              onChange={(e) => setMateri(e.target.value)}
              placeholder="Mis. Teks deskripsi"
            />
          </Field>
          <Field
            label="Tautkan ke Modul Ajar"
            help="Opsional — asesmen mengikuti tujuan modul yang dipilih."
          >
            <select className="select" value={sumber} onChange={(e) => setSumber(e.target.value)}>
              <option value="">Tidak — buat baru</option>
              {modulDocs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </StepPanel>

      {/* LANGKAH 2 — Opsi & kualitas */}
      <StepPanel on={step === 2}>
        <div className="card pad-lg stack" style={{ "--gap": "8px" } as React.CSSProperties}>
          <h3 className="t-h3">Opsi & kualitas</h3>
          <OptRow title="Sertakan rubrik" desc="Rubrik penilaian per indikator.">
            <Switch on={rubrik} onChange={setRubrik} label="Sertakan rubrik" />
          </OptRow>
          <OptRow title="Sertakan kunci" desc="Kunci jawaban untuk tiap butir.">
            <Switch on={kunci} onChange={setKunci} label="Sertakan kunci" />
          </OptRow>
          <QualityPicker value={mode} onChange={setMode} />
        </div>
      </StepPanel>
    </WizardShell>
  );
}
