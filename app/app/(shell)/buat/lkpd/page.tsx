"use client";

/* AjarKit — wizard LKPD (design.md §9.F.2, prd.md §8.3).
   2 langkah: Detail LKPD → Opsi & kualitas. Bisa mengambil materi dari
   Modul Ajar yang sudah ada di dokumen. */

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
  Stepper,
  WizardShell,
} from "../_components/wizard-shell";
import { SummaryPanel } from "../_components/summary-panel";

const STEP_LABELS = ["Detail LKPD", "Opsi & kualitas"];
const JENIS_KEGIATAN = ["Pengamatan", "Eksperimen", "Diskusi kelompok", "Proyek mini"];
const KESULITAN = ["Mudah", "Sedang", "Sulit"];

export default function BuatLkpdPage() {
  const app = useApp();
  const { user } = app;
  const [step, setStep] = useState(1);

  const modulDocs = app.documents.filter((d) => d.type === "modul_ajar");

  /* Langkah 1 — Detail LKPD */
  const [sumber, setSumber] = useState("");
  const [materi, setMateri] = useState("");
  const [tujuan, setTujuan] = useState("");
  const [kegiatan, setKegiatan] = useState(JENIS_KEGIATAN[0]);
  const [kesulitan, setKesulitan] = useState("Sedang");
  const [jumlah, setJumlah] = useState(3);

  /* Langkah 2 — Opsi & kualitas */
  const [mode, setMode] = useState<QualityMode>("standar");

  const sumberDoc = modulDocs.find((d) => d.id === sumber);
  const cost = modeCost(DOC_TYPES.lkpd.cost, mode);
  const canNext = step === 1 ? materi.trim() !== "" && tujuan.trim() !== "" : true;

  function pickSumber(id: string) {
    setSumber(id);
    const doc = modulDocs.find((d) => d.id === id);
    if (doc) {
      const topik = doc.title.split("—")[1]?.trim() ?? doc.title;
      setMateri(topik);
    }
  }

  function buildJob(): JobParams {
    // opsi mapel mengikuti jenjang guru pada profil (mapelForJenjang)
    const mapelOptions = mapelForJenjang(user.jenjang);
    return {
      docType: "lkpd",
      title: `LKPD ${materi.trim()}`,
      subject: sumberDoc?.subject ?? user.mapel?.find((m) => mapelOptions.includes(m)) ?? mapelOptions[0],
      jenjang: sumberDoc?.jenjang ?? kelasLabel(user.kelas ?? JENJANG_OPTIONS[0]),
      qualityMode: mode,
      cost,
    };
  }

  return (
    <WizardShell
      docType="lkpd"
      stepLabels={STEP_LABELS}
      step={step}
      onStepChange={setStep}
      canNext={canNext}
      cost={cost}
      buildJob={buildJob}
      summary={
        <SummaryPanel
          rows={[
            { label: "Jenis", value: "LKPD" },
            { label: "Materi", value: materi.trim() || "—" },
            { label: "Kegiatan", value: `${kegiatan} · ${kesulitan}` },
            { label: "Aktivitas", value: `${jumlah} aktivitas` },
            { label: "Sumber", value: sumberDoc ? sumberDoc.title : "Buat baru" },
          ]}
          cost={cost}
        />
      }
    >
      {/* LANGKAH 1 — Detail LKPD */}
      <StepPanel on={step === 1}>
        <div className="card pad-lg stack" style={{ "--gap": "16px" } as React.CSSProperties}>
          <h3 className="t-h3">Detail LKPD</h3>
          <Field
            label="Ambil dari Modul Ajar"
            help="Opsional — materi terisi otomatis dari modul yang dipilih."
          >
            <select className="select" value={sumber} onChange={(e) => pickSumber(e.target.value)}>
              <option value="">Tidak — buat baru</option>
              {modulDocs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Materi / topik">
            <input
              className="input"
              value={materi}
              onChange={(e) => setMateri(e.target.value)}
              placeholder="Mis. Ekosistem & Rantai Makanan"
            />
          </Field>
          <Field label="Tujuan pembelajaran">
            <textarea
              className="textarea"
              value={tujuan}
              onChange={(e) => setTujuan(e.target.value)}
              placeholder="Mis. peserta didik dapat menjelaskan rantai makanan…"
            />
          </Field>
          <div className="form-2">
            <Field label="Jenis kegiatan">
              <select className="select" value={kegiatan} onChange={(e) => setKegiatan(e.target.value)}>
                {JENIS_KEGIATAN.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </Field>
            <Field label="Tingkat kesulitan">
              <select className="select" value={kesulitan} onChange={(e) => setKesulitan(e.target.value)}>
                {KESULITAN.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Jumlah aktivitas">
            <Stepper value={jumlah} onChange={setJumlah} min={1} max={10} label="Jumlah aktivitas" />
          </Field>
        </div>
      </StepPanel>

      {/* LANGKAH 2 — Opsi & kualitas */}
      <StepPanel on={step === 2}>
        <div className="card pad-lg stack" style={{ "--gap": "8px" } as React.CSSProperties}>
          <h3 className="t-h3">Opsi & kualitas</h3>
          <QualityPicker value={mode} onChange={setMode} />
        </div>
      </StepPanel>
    </WizardShell>
  );
}
