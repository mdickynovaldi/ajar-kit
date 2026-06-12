"use client";

/* AjarKit — wizard RPS (OBE) untuk dosen, porting app-rps.html (design.md §9.F.7).
   5 langkah: Identitas MK → CPL → CPMK & Sub-CPMK → Rencana 16 Pertemuan →
   Penilaian & Referensi → startJob(docType:'rps'). */

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { Banner, Button, Field } from "@/components/ui/controls";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { useApp } from "@/lib/store";
import type { QualityMode } from "@/lib/types";
import { startJob } from "@/lib/generation";
import { QualityPicker } from "../_components/wizard-shell";

const LABELS = [
  "Identitas Mata Kuliah",
  "CPL",
  "CPMK & Sub-CPMK",
  "Rencana 16 Pertemuan",
  "Penilaian & Referensi",
];
const TOTAL_STEPS = 5;

/* Pratinjau 5 minggu pertama (porting konstanta WEEKS dari app-rps.html) */
const WEEKS: string[][] = [
  ["1", "—", "Kontrak kuliah & pengantar basis data", "Ceramah, diskusi", "Memahami ruang lingkup", "3%"],
  ["2", "1.1", "Model data & ERD: entitas, atribut", "Studi kasus", "Mengidentifikasi entitas", "5%"],
  ["3", "1.2", "Relasi, kardinalitas, ERD lengkap", "PjBL kelompok", "Menyusun ERD kasus", "7%"],
  ["4", "2.1", "Normalisasi 1NF–3NF", "Latihan terbimbing", "Menormalisasi tabel", "5%"],
  ["5", "2.2", "BCNF & anomali data", "Problem-based", "Mendeteksi anomali", "5%"],
];

const DEFAULT_CPL = `CPL-3 (P3): Mampu merancang basis data relasional sesuai kebutuhan sistem informasi.
CPL-5 (KK2): Mampu mengimplementasikan query SQL untuk manipulasi & analisis data.
CPL-8 (S9): Menunjukkan sikap bertanggung jawab atas pekerjaan secara mandiri.`;

const DEFAULT_PUSTAKA = `1. Elmasri, R. & Navathe, S. (2017). Fundamentals of Database Systems, 7th ed.
2. Connolly, T. & Begg, C. (2015). Database Systems, 6th ed.`;

interface CpmkRow {
  id: number;
  text: string;
  sub: string;
}

const DEFAULT_CPMK: CpmkRow[] = [
  { id: 1, text: "Merancang model data konseptual (ERD) dari kasus nyata.", sub: "Sub: 1.1 Identifikasi entitas · 1.2 Relasi & kardinalitas" },
  { id: 2, text: "Menerapkan normalisasi hingga BCNF.", sub: "Sub: 2.1 1NF–3NF · 2.2 BCNF & anomali" },
  { id: 3, text: "Menyusun query SQL kompleks (join, subquery, agregasi).", sub: "Sub: 3.1 DML & join · 3.2 Subquery & view" },
];

/* Biaya per mode sesuai segmented app-rps.html (data-c 50/80/110) */
const MODE_COSTS: Record<QualityMode, number> = { hemat: 50, standar: 80, tinggi: 110 };

const gap = (px: number) => ({ "--gap": `${px}px` }) as React.CSSProperties;

export default function RpsPage() {
  const app = useApp();
  const router = useRouter();
  const toast = useToast();

  const [step, setStep] = useState(1);

  // Step 1 — identitas MK
  const [namaMK, setNamaMK] = useState("Basis Data");
  const [kodeMK, setKodeMK] = useState("TIF2034");
  const [sks, setSks] = useState("3");
  const [semester, setSemester] = useState("4");
  const [prodi, setProdi] = useState("S1 Teknik Informatika");
  const [dosen, setDosen] = useState("Dr. Dewi Pratiwi, M.Kom.");

  // Step 2 — CPL
  const [cpl, setCpl] = useState(DEFAULT_CPL);

  // Step 3 — CPMK (tambah/hapus baris; teks diedit langsung via contentEditable)
  const [cpmk, setCpmk] = useState<CpmkRow[]>(DEFAULT_CPMK);
  const nextCpmkId = useRef(DEFAULT_CPMK.length + 1);

  // Step 5 — penilaian & referensi
  const [tugas, setTugas] = useState("30");
  const [uts, setUts] = useState("30");
  const [uas, setUas] = useState("40");
  const [pustaka, setPustaka] = useState(DEFAULT_PUSTAKA);
  const [mode, setMode] = useState<QualityMode>("standar");

  const [sheetOpen, setSheetOpen] = useState(false);

  const cost = MODE_COSTS[mode];
  const bobotSum = (parseInt(tugas, 10) || 0) + (parseInt(uts, 10) || 0) + (parseInt(uas, 10) || 0);
  const step1Ok = namaMK.trim().length > 0 && kodeMK.trim().length > 0;

  function go(d: number) {
    setStep((s) => Math.min(TOTAL_STEPS, Math.max(1, s + d)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function addCpmk() {
    setCpmk((rows) => [
      ...rows,
      { id: nextCpmkId.current++, text: "Tulis capaian pembelajaran mata kuliah…", sub: "Sub: lengkapi sub-CPMK" },
    ]);
    toast("Baris CPMK ditambahkan");
  }

  function removeCpmk(id: number) {
    setCpmk((rows) => rows.filter((r) => r.id !== id));
  }

  function build() {
    if (app.credits < cost) {
      setSheetOpen(true);
      return;
    }
    const id = startJob({
      docType: "rps",
      title: `RPS ${namaMK.trim()}`,
      subject: namaMK.trim(),
      jenjang: `Semester ${semester}`,
      qualityMode: mode,
      cost,
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
        <span className="doc-ic ic-blue" style={{ width: 44, height: 44 }}>
          <Icon name="layers" />
        </span>
        <div className="grow">
          <h1 className="t-h2">RPS — Rencana Pembelajaran Semester (OBE)</h1>
          <p className="muted t-small">
            Langkah {step} dari {TOTAL_STEPS} · {LABELS[step - 1]}
          </p>
        </div>
        <div className="credit">
          <span className="gem">◈</span>
          <span className="num">{app.credits}</span>
          <span className="plus">+</span>
        </div>
      </div>

      <div className="steps" style={{ marginBottom: 22, flexWrap: "wrap", gap: 6 }}>
        {LABELS.map((label, i) => (
          <span key={label} style={{ display: "contents" }}>
            <div className={`s${i + 1 === step ? " on" : ""}${i + 1 < step ? " done" : ""}`}>
              <span className="dot-s">{i + 1}</span>
            </div>
            {i < TOTAL_STEPS - 1 && <div className="line" />}
          </span>
        ))}
      </div>

      {/* STEP 1 — identitas MK */}
      <section className={`step-panel${step === 1 ? " on" : ""}`}>
        <div className="card pad-lg stack" style={gap(14)}>
          <h3 className="t-h3">Identitas Mata Kuliah</h3>
          <div className="form-2">
            <Field label="Nama mata kuliah" error={namaMK.trim() ? undefined : "Nama mata kuliah wajib diisi."}>
              <input className="input" value={namaMK} onChange={(e) => setNamaMK(e.target.value)} placeholder="Mis. Basis Data" />
            </Field>
            <Field label="Kode MK" error={kodeMK.trim() ? undefined : "Kode MK wajib diisi."}>
              <input className="input" value={kodeMK} onChange={(e) => setKodeMK(e.target.value)} placeholder="Mis. TIF2034" />
            </Field>
          </div>
          <div className="form-2">
            <Field label="SKS">
              <input className="input" value={sks} onChange={(e) => setSks(e.target.value)} placeholder="3" />
            </Field>
            <Field label="Semester">
              <select className="select" value={semester} onChange={(e) => setSemester(e.target.value)}>
                <option>4</option>
                <option>3</option>
                <option>5</option>
              </select>
            </Field>
          </div>
          <div className="form-2">
            <Field label="Program studi">
              <input className="input" value={prodi} onChange={(e) => setProdi(e.target.value)} placeholder="S1 Teknik Informatika" />
            </Field>
            <Field label="Dosen pengampu">
              <input className="input" value={dosen} onChange={(e) => setDosen(e.target.value)} placeholder="Nama dosen" />
            </Field>
          </div>
        </div>
      </section>

      {/* STEP 2 — CPL */}
      <section className={`step-panel${step === 2 ? " on" : ""}`}>
        <div className="card pad-lg stack" style={gap(14)}>
          <div>
            <h3 className="t-h3">Capaian Pembelajaran Lulusan (CPL)</h3>
            <p className="muted t-small">Tempel daftar CPL prodi atau gunakan contoh berikut.</p>
          </div>
          <Field>
            <textarea
              className="textarea"
              style={{ minHeight: 140 }}
              aria-label="Daftar CPL"
              value={cpl}
              onChange={(e) => setCpl(e.target.value)}
            />
          </Field>
        </div>
      </section>

      {/* STEP 3 — CPMK */}
      <section className={`step-panel${step === 3 ? " on" : ""}`}>
        <div className="card pad-lg stack" style={gap(12)}>
          <div className="row between">
            <div>
              <h3 className="t-h3">CPMK &amp; Sub-CPMK</h3>
              <p className="muted t-small">Usulan AI dari CPL — bisa diedit/tambah.</p>
            </div>
            <span className="badge badge-ai">
              <Icon name="sparkles" />
              Diusulkan AI
            </span>
          </div>
          {cpmk.map((row, i) => (
            <div className="cpmk-row" key={row.id}>
              <span className="tag">CPMK-{i + 1}</span>
              <div className="grow">
                <div
                  contentEditable
                  suppressContentEditableWarning
                  className="strong"
                  style={{ fontWeight: 600 }}
                  role="textbox"
                  aria-label={`Teks CPMK-${i + 1}`}
                >
                  {row.text}
                </div>
                <p className="t-small muted" style={{ marginTop: 4 }}>
                  {row.sub}
                </p>
              </div>
              <button
                type="button"
                className="iconbtn cpmk-del"
                aria-label={`Hapus CPMK-${i + 1}`}
                onClick={() => removeCpmk(row.id)}
              >
                <Icon name="x" style={{ width: 16, height: 16 }} />
              </button>
            </div>
          ))}
          <Button variant="secondary" iconLeft="plus" onClick={addCpmk}>
            Tambah CPMK
          </Button>
        </div>
      </section>

      {/* STEP 4 — 16 pertemuan */}
      <section className={`step-panel${step === 4 ? " on" : ""}`}>
        <div className="card pad-lg stack" style={gap(12)}>
          <div className="row between">
            <div>
              <h3 className="t-h3">Rencana 16 Pertemuan</h3>
              <p className="muted t-small">Tabel disusun AI — klik sel untuk mengedit.</p>
            </div>
            <span className="badge badge-ai">
              <Icon name="sparkles" />
              Pratinjau
            </span>
          </div>
          <div className="table-wrap">
            <table className="table rps-table">
              <thead>
                <tr>
                  <th>Mg</th>
                  <th>Sub-CPMK</th>
                  <th>Materi</th>
                  <th>Metode</th>
                  <th>Indikator</th>
                  <th className="num">Bobot</th>
                </tr>
              </thead>
              <tbody>
                {WEEKS.map((w) => (
                  <tr key={w[0]}>
                    {w.map((cell, i) => (
                      <td
                        key={i}
                        className={i === 5 ? "num" : undefined}
                        contentEditable={i > 0 && i < 5 ? true : undefined}
                        suppressContentEditableWarning
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="t-small faint">
            Menampilkan 5 dari 16 minggu sebagai pratinjau. Sisanya akan disusun lengkap saat dibuat.
          </p>
        </div>
      </section>

      {/* STEP 5 — penilaian */}
      <section className={`step-panel${step === 5 ? " on" : ""}`}>
        <div className="card pad-lg stack" style={gap(14)}>
          <h3 className="t-h3">Penilaian &amp; Referensi</h3>
          <div>
            <span className="lbl">Komponen bobot penilaian</span>
            <div className="stack" style={gap(8)}>
              {(
                [
                  ["Tugas & Kuis", tugas, setTugas],
                  ["UTS", uts, setUts],
                  ["UAS", uas, setUas],
                ] as const
              ).map(([label, value, setValue]) => (
                <div className="row between" key={label}>
                  <span className="t-body">{label}</span>
                  <div className="row" style={{ gap: 6 }}>
                    <input
                      className="input"
                      value={value}
                      onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ""))}
                      inputMode="numeric"
                      aria-label={`Bobot ${label} (%)`}
                      style={{ width: 64, textAlign: "center" }}
                    />
                    <span className="muted">%</span>
                  </div>
                </div>
              ))}
            </div>
            {bobotSum !== 100 && (
              <Banner variant="warn" style={{ marginTop: 10 }}>
                <p className="t-small">
                  Total bobot penilaian saat ini {bobotSum}% — pastikan jumlahnya 100%.
                </p>
              </Banner>
            )}
          </div>
          <Field label="Daftar pustaka">
            <textarea className="textarea" value={pustaka} onChange={(e) => setPustaka(e.target.value)} />
          </Field>
          {/* Mode kualitas (free: terkunci Hemat — lihat QualityPicker) */}
          <QualityPicker value={mode} onChange={setMode} />
        </div>
      </section>

      <div className="sticky-actions">
        <Button
          variant="secondary"
          iconLeft="chevL"
          onClick={() => go(-1)}
          style={{ visibility: step === 1 ? "hidden" : "visible" }}
        >
          Kembali
        </Button>
        {step < TOTAL_STEPS ? (
          <Button
            variant="primary"
            className="grow"
            iconRight="chevR"
            disabled={step === 1 && !step1Ok}
            onClick={() => go(1)}
          >
            Lanjut
          </Button>
        ) : (
          <Button variant="ai" className="grow" iconLeft="sparkles" onClick={build}>
            Buat dengan AI — {cost} kredit
          </Button>
        )}
      </div>

      {/* Kredit tidak cukup */}
      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        <h3 className="t-h3">Kredit tidak cukup</h3>
        <p className="muted" style={{ margin: "8px 0 16px" }}>
          Butuh {cost} kredit, saldomu {app.credits}.
        </p>
        <Link className="btn btn-primary block" href="/app/kredit">
          Isi ulang kredit
        </Link>
      </Sheet>
    </>
  );
}
