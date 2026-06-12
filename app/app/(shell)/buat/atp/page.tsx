"use client";

/* AjarKit — wizard ATP / SAP (khusus guru, pola design.md §9.E).
   2 langkah: Identitas → Opsi & kualitas. Menghasilkan dokumen ATP
   (alur tujuan pembelajaran) + skenario pembelajaran ala SAP. */

import { useState } from "react";
import { Field, Switch } from "@/components/ui/controls";
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

const STEP_LABELS = ["Identitas", "Opsi & kualitas"];

export default function BuatAtpPage() {
  const { user } = useApp();
  const [step, setStep] = useState(1);

  /* Langkah 1 — Identitas (default cerdas dari profil) */
  const [jenjang, setJenjang] = useState(
    () => JENJANG_OPTIONS.find((j) => user.kelas && j.includes(user.kelas)) ?? JENJANG_OPTIONS[0],
  );
  const mapelOptions = mapelForJenjang(jenjang);
  const [mapel, setMapel] = useState(
    () => user.mapel?.find((m) => mapelOptions.includes(m)) ?? mapelOptions[0],
  );
  const [materi, setMateri] = useState("");

  /* jenjang berubah → daftar mapel ikut; mapel lama tak tersedia → reset */
  function pickJenjang(next: string) {
    setJenjang(next);
    const opts = mapelForJenjang(next);
    if (!opts.includes(mapel)) setMapel(opts[0]);
  }
  const [tahun, setTahun] = useState("2026/2027");
  const [jumlahTp, setJumlahTp] = useState(10);

  /* Langkah 2 — Opsi & kualitas */
  const [skenario, setSkenario] = useState(true);
  const [catatanCp, setCatatanCp] = useState("");
  const [mode, setMode] = useState<QualityMode>("standar");

  const cost = modeCost(DOC_TYPES.atp.cost, mode);
  const canNext = step === 1 ? materi.trim() !== "" : true;

  function buildJob(): JobParams {
    return {
      docType: "atp",
      title: `ATP ${mapel} — ${materi.trim()}`,
      subject: mapel,
      jenjang: kelasLabel(jenjang),
      qualityMode: mode,
      cost,
    };
  }

  return (
    <WizardShell
      docType="atp"
      stepLabels={STEP_LABELS}
      step={step}
      onStepChange={setStep}
      canNext={canNext}
      cost={cost}
      buildJob={buildJob}
      summary={
        <SummaryPanel
          rows={[
            { label: "Jenis", value: "ATP / SAP" },
            { label: "Mapel", value: `${mapel} · ${kelasLabel(jenjang)}` },
            { label: "Materi", value: materi.trim() || "—" },
            { label: "Tahun pelajaran", value: tahun.trim() || "—" },
            { label: "Tujuan pembelajaran", value: `${jumlahTp} butir TP` },
            { label: "Skenario", value: skenario ? "Disertakan" : "Tanpa skenario" },
          ]}
          cost={cost}
          note="Output: tabel alur tujuan pembelajaran + skenario pembelajaran ala SAP."
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
          <Field label="Materi / lingkup">
            <input
              className="input"
              value={materi}
              onChange={(e) => setMateri(e.target.value)}
              placeholder="Mis. Ekosistem & Keanekaragaman Hayati"
            />
          </Field>
          <Field label="Tahun pelajaran">
            <input
              className="input"
              value={tahun}
              onChange={(e) => setTahun(e.target.value)}
              placeholder="Mis. 2026/2027"
            />
          </Field>
          <Field label="Jumlah tujuan pembelajaran (TP)">
            <Stepper
              value={jumlahTp}
              onChange={setJumlahTp}
              min={6}
              max={14}
              label="Jumlah tujuan pembelajaran"
            />
          </Field>
        </div>
      </StepPanel>

      {/* LANGKAH 2 — Opsi & kualitas */}
      <StepPanel on={step === 2}>
        <div className="card pad-lg stack" style={{ "--gap": "8px" } as React.CSSProperties}>
          <h3 className="t-h3">Opsi & kualitas</h3>
          <OptRow
            title="Sertakan skenario pembelajaran (ala SAP)"
            desc="Kegiatan pendahuluan/inti/penutup dengan alokasi menit."
          >
            <Switch
              on={skenario}
              onChange={setSkenario}
              label="Sertakan skenario pembelajaran (ala SAP)"
            />
          </OptRow>
          <Field label="Catatan CP / elemen (opsional)">
            <textarea
              className="textarea"
              value={catatanCp}
              onChange={(e) => setCatatanCp(e.target.value)}
              placeholder="Mis. fokus elemen keterampilan proses, CP fase D…"
            />
          </Field>
          <QualityPicker value={mode} onChange={setMode} />
        </div>
      </StepPanel>
    </WizardShell>
  );
}
