"use client";

/* AjarKit — wizard Bank Soal (design.md §9.F.4, prd.md §8.3).
   2 langkah: Identitas soal → Komposisi & kualitas. Komposisi kognitif
   LOTS/MOTS/HOTS tiga arah (total selalu 100%). */

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

const STEP_LABELS = ["Identitas soal", "Komposisi & kualitas"];
const BENTUK_SOAL = ["Pilihan ganda", "Uraian", "Campuran (PG + uraian)"];

type CompKey = "lots" | "mots" | "hots";
type Komposisi = Record<CompKey, number>;

const COMP_META: { key: CompKey; label: string; desc: string; cls: string }[] = [
  { key: "lots", label: "LOTS", desc: "mengingat & memahami", cls: "bs-lots" },
  { key: "mots", label: "MOTS", desc: "menerapkan & menganalisis", cls: "bs-mots" },
  { key: "hots", label: "HOTS", desc: "mengevaluasi & mencipta", cls: "bs-hots" },
];

export default function BuatBankSoalPage() {
  const { user } = useApp();
  const [step, setStep] = useState(1);

  /* Langkah 1 — Identitas soal */
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
  const [jumlah, setJumlah] = useState(20);
  const [bentuk, setBentuk] = useState(BENTUK_SOAL[0]);

  /* Langkah 2 — Komposisi & kualitas */
  const [komposisi, setKomposisi] = useState<Komposisi>({ lots: 40, mots: 40, hots: 20 });
  const [kunci, setKunci] = useState(true);
  const [mode, setMode] = useState<QualityMode>("standar");

  const cost = modeCost(DOC_TYPES.bank_soal.cost, mode);
  const canNext = step === 1 ? materi.trim() !== "" : true;

  /** geser satu kategori; dua lainnya menyesuaikan proporsional agar total 100 */
  function setComp(key: CompKey, val: number) {
    setKomposisi((c) => {
      const others = (["lots", "mots", "hots"] as CompKey[]).filter((k) => k !== key);
      const rest = 100 - val;
      const sum = c[others[0]] + c[others[1]];
      const a = sum === 0 ? Math.round(rest / 2) : Math.round((c[others[0]] / sum) * rest);
      const b = rest - a;
      return { ...c, [key]: val, [others[0]]: a, [others[1]]: b };
    });
  }

  function buildJob(): JobParams {
    return {
      docType: "bank_soal",
      title: `Bank Soal ${mapel} — ${materi.trim()}`,
      subject: mapel,
      jenjang: kelasLabel(jenjang),
      qualityMode: mode,
      cost,
    };
  }

  return (
    <WizardShell
      docType="bank_soal"
      stepLabels={STEP_LABELS}
      step={step}
      onStepChange={setStep}
      canNext={canNext}
      cost={cost}
      buildJob={buildJob}
      summary={
        <SummaryPanel
          rows={[
            { label: "Jenis", value: "Bank Soal" },
            { label: "Mapel", value: `${mapel} · ${kelasLabel(jenjang)}` },
            { label: "Materi", value: materi.trim() || "—" },
            { label: "Jumlah", value: `${jumlah} soal · ${bentuk}` },
            {
              label: "Komposisi",
              value: `${komposisi.lots}/${komposisi.mots}/${komposisi.hots}`,
            },
          ]}
          cost={cost}
        />
      }
    >
      {/* LANGKAH 1 — Identitas soal */}
      <StepPanel on={step === 1}>
        <div className="card pad-lg stack" style={{ "--gap": "16px" } as React.CSSProperties}>
          <h3 className="t-h3">Identitas soal</h3>
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
          <Field label="Materi / topik">
            <input
              className="input"
              value={materi}
              onChange={(e) => setMateri(e.target.value)}
              placeholder="Mis. Persamaan linear satu variabel"
            />
          </Field>
          <div className="form-2">
            <Field label="Jumlah soal">
              <Stepper value={jumlah} onChange={setJumlah} min={5} max={50} step={5} label="Jumlah soal" />
            </Field>
            <Field label="Bentuk soal">
              <select className="select" value={bentuk} onChange={(e) => setBentuk(e.target.value)}>
                {BENTUK_SOAL.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      </StepPanel>

      {/* LANGKAH 2 — Komposisi & kualitas */}
      <StepPanel on={step === 2}>
        <div className="card pad-lg stack" style={{ "--gap": "16px" } as React.CSSProperties}>
          <div>
            <h3 className="t-h3">Komposisi tingkat kognitif</h3>
            <p className="muted t-small" style={{ marginTop: 2 }}>
              Geser untuk mengatur porsi LOTS / MOTS / HOTS — total selalu 100%.
            </p>
          </div>

          <div className="bs-bar" aria-hidden="true">
            {COMP_META.map((m) => (
              <span key={m.key} className={m.cls} style={{ width: `${komposisi[m.key]}%` }} />
            ))}
          </div>

          <div className="stack" style={{ "--gap": "12px" } as React.CSSProperties}>
            {COMP_META.map((m) => (
              <div key={m.key}>
                <div className="row between">
                  <span
                    className="t-small strong"
                    style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                  >
                    {m.key === "hots" ? (
                      <span className="badge badge-hots">HOTS</span>
                    ) : (
                      m.label
                    )}
                    <span className="muted" style={{ fontWeight: 400 }}>
                      {m.desc}
                    </span>
                  </span>
                  <span className="t-small strong num">{komposisi[m.key]}%</span>
                </div>
                <input
                  type="range"
                  className="bs-range"
                  min={0}
                  max={100}
                  step={5}
                  value={komposisi[m.key]}
                  onChange={(e) => setComp(m.key, Number(e.target.value))}
                  aria-label={`Persentase ${m.label}`}
                />
              </div>
            ))}
          </div>

          <div>
            <OptRow title="Sertakan kunci & pembahasan" desc="Kunci jawaban + langkah penyelesaian.">
              <Switch on={kunci} onChange={setKunci} label="Sertakan kunci & pembahasan" />
            </OptRow>
            <QualityPicker value={mode} onChange={setMode} />
          </div>
        </div>
      </StepPanel>
    </WizardShell>
  );
}
