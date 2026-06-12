"use client";

/* AjarKit — wizard Modul Ajar / RPP (porting Ajarkit/app-modul-ajar.html,
   design.md §9.F.1, prd.md §8.3). 3 langkah: Identitas → Profil Pelajar
   Pancasila → Opsi & kualitas. */

import { useState } from "react";
import { Chip, Field, Switch } from "@/components/ui/controls";
import { useApp } from "@/lib/store";
import {
  DIMENSI_PROFIL,
  DOC_TYPES,
  JENJANG_OPTIONS,
  MODEL_PEMBELAJARAN,
  mapelForJenjang,
  modeCost,
} from "@/lib/constants";
import type { JobParams } from "@/lib/generation";
import type { QualityMode } from "@/lib/types";
import {
  kelasLabel,
  OptRow,
  QualityPicker,
  StepPanel,
  WizardShell,
} from "../_components/wizard-shell";
import { SummaryPanel } from "../_components/summary-panel";

const STEP_LABELS = ["Identitas", "Profil Pelajar Pancasila", "Opsi & kualitas"];
const MAX_PERTEMUAN = 16;
const GAYA_BAHASA = ["Formal", "Ramah", "Ringkas"];

export default function BuatModulAjarPage() {
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
  const [materi, setMateri] = useState("Ekosistem & Rantai Makanan");
  const [alokasi, setAlokasi] = useState("4 JP × 2 pertemuan");
  /* jumlah pertemuan dibaca otomatis dari teks alokasi waktu
     ("4 JP × 2 pertemuan" → 2); tanpa kata "pertemuan" → 1; maks 16 */
  const pertemuan = (() => {
    const m = alokasi.match(/(\d+)\s*(?:x|×)?\s*pertemuan/i);
    return Math.min(MAX_PERTEMUAN, Math.max(1, Number(m?.[1]) || 1));
  })();
  const [semester, setSemester] = useState("Genap");

  /* jenjang berubah → daftar mapel ikut; mapel lama tak tersedia → reset */
  function pickJenjang(next: string) {
    setJenjang(next);
    const opts = mapelForJenjang(next);
    if (!opts.includes(mapel)) setMapel(opts[0]);
  }

  /* Langkah 2 — Profil Pelajar Pancasila */
  const [dims, setDims] = useState<string[]>([...DIMENSI_PROFIL.slice(0, 3)]);
  const [model, setModel] = useState(MODEL_PEMBELAJARAN[0]);
  const [karakteristik, setKarakteristik] = useState("");

  /* Langkah 3 — Opsi & kualitas */
  /* default NONAKTIF: biaya default (mode hemat = 30) harus muat di bonus
     50 kredit user free — LKPD/asesmen jadi pilihan sadar biaya */
  const [lkpd, setLkpd] = useState(false);
  const [asesmen, setAsesmen] = useState(false);
  const [agama, setAgama] = useState(false);
  const [gaya, setGaya] = useState("Formal");
  const [mode, setMode] = useState<QualityMode>("standar");

  const cost =
    modeCost(DOC_TYPES.modul_ajar.cost, mode) + (lkpd ? 15 : 0) + (asesmen ? 20 : 0);
  const comps = ["Modul Ajar", ...(lkpd ? ["LKPD"] : []), ...(asesmen ? ["Asesmen"] : [])].join(
    " + ",
  );

  const canNext =
    step === 1
      ? materi.trim() !== "" && alokasi.trim() !== ""
      : step === 2
        ? dims.length > 0
        : true;

  function toggleDim(d: string) {
    setDims((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  }

  function buildJob(): JobParams {
    return {
      docType: "modul_ajar",
      title: `Modul Ajar ${mapel} — ${materi.trim()}`,
      subject: mapel,
      jenjang: kelasLabel(jenjang),
      qualityMode: mode,
      cost,
      pertemuanCount: pertemuan,
      includeLkpd: lkpd,
    };
  }

  return (
    <WizardShell
      docType="modul_ajar"
      stepLabels={STEP_LABELS}
      step={step}
      onStepChange={setStep}
      canNext={canNext}
      cost={cost}
      buildJob={buildJob}
      summary={
        <SummaryPanel
          rows={[
            { label: "Jenis", value: "Modul Ajar" },
            { label: "Mapel", value: `${mapel} · ${kelasLabel(jenjang)}` },
            { label: "Materi", value: materi.trim() || "—" },
            { label: "Pertemuan", value: `${pertemuan} pertemuan` },
            { label: "Komponen", value: comps },
          ]}
          cost={cost}
          note="Output mengikuti 4 tahap: Identifikasi, Desain, Pengalaman Belajar, Asesmen."
        />
      }
    >
      {/* LANGKAH 1 — Identitas */}
      <StepPanel on={step === 1}>
        <div className="card pad-lg stack" style={{ "--gap": "16px" } as React.CSSProperties}>
          <h3 className="t-h3">Identitas</h3>
          <div className="form-2">
            <Field label="Jenjang & kelas">
              <select className="select" value={jenjang} onChange={(e) => pickJenjang(e.target.value)}>
                {JENJANG_OPTIONS.map((j) => (
                  <option key={j}>{j}</option>
                ))}
              </select>
            </Field>
            <Field label="Mata pelajaran">
              <select className="select" value={mapel} onChange={(e) => setMapel(e.target.value)}>
                {mapelOptions.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Materi / topik">
            <input
              className="input"
              value={materi}
              onChange={(e) => setMateri(e.target.value)}
              placeholder="Mis. Ekosistem & Rantai Makanan"
            />
          </Field>
          <div className="form-2">
            <Field
              label="Alokasi waktu"
              help={`Jumlah pertemuan dibaca otomatis dari sini (terbaca: ${pertemuan} pertemuan, maks ${MAX_PERTEMUAN}).`}
            >
              <input
                className="input"
                value={alokasi}
                onChange={(e) => setAlokasi(e.target.value)}
                placeholder="Mis. 4 JP × 2 pertemuan"
              />
            </Field>
            <Field label="Semester">
              <select className="select" value={semester} onChange={(e) => setSemester(e.target.value)}>
                <option>Genap</option>
                <option>Ganjil</option>
              </select>
            </Field>
          </div>
        </div>
      </StepPanel>

      {/* LANGKAH 2 — Profil Pelajar Pancasila */}
      <StepPanel on={step === 2}>
        <div className="card pad-lg stack" style={{ "--gap": "16px" } as React.CSSProperties}>
          <div>
            <h3 className="t-h3">Profil Pelajar Pancasila</h3>
            <p className="muted t-small" style={{ marginTop: 2 }}>
              Pilih dimensi Profil Pelajar Pancasila yang ditonjolkan.
            </p>
          </div>
          <div className="dim-grid">
            {DIMENSI_PROFIL.map((d) => (
              <Chip key={d} on={dims.includes(d)} onToggle={() => toggleDim(d)}>
                {d}
              </Chip>
            ))}
          </div>
          <Field label="Pendekatan / model pembelajaran">
            <select className="select" value={model} onChange={(e) => setModel(e.target.value)}>
              {MODEL_PEMBELAJARAN.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </Field>
          <Field label="Karakteristik peserta didik (opsional)">
            <textarea
              className="textarea"
              value={karakteristik}
              onChange={(e) => setKarakteristik(e.target.value)}
              placeholder="Mis. mayoritas visual, antusias kerja kelompok…"
            />
          </Field>
        </div>
      </StepPanel>

      {/* LANGKAH 3 — Opsi & kualitas */}
      <StepPanel on={step === 3}>
        <div className="card pad-lg stack" style={{ "--gap": "8px" } as React.CSSProperties}>
          <h3 className="t-h3">Opsi & kualitas</h3>
          <OptRow title="Sertakan LKPD" desc="Lembar kerja peserta didik otomatis.">
            <Switch on={lkpd} onChange={setLkpd} label="Sertakan LKPD" />
          </OptRow>
          <OptRow title="Sertakan asesmen" desc="Formatif & sumatif singkat.">
            <Switch on={asesmen} onChange={setAsesmen} label="Sertakan asesmen" />
          </OptRow>
          <OptRow title="Integrasi nilai keagamaan" desc="Untuk Madrasah/Kemenag.">
            <Switch on={agama} onChange={setAgama} label="Integrasi nilai keagamaan" />
          </OptRow>
          <OptRow title="Gaya bahasa" desc="Nada penulisan dokumen.">
            <select
              className="select"
              style={{ width: "auto", minWidth: 130 }}
              value={gaya}
              onChange={(e) => setGaya(e.target.value)}
              aria-label="Gaya bahasa"
            >
              {GAYA_BAHASA.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </OptRow>
          <QualityPicker value={mode} onChange={setMode} />
        </div>
      </StepPanel>
    </WizardShell>
  );
}
