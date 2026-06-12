"use client";

/* AjarKit — layar fokus Generating (porting app-generating.html, design.md §9.E Fase 2).
   Tanpa app shell. Membaca job via readJob(jobId), mensimulasikan progres bernarasi,
   lalu membuat Document + memotong kredit HANYA saat sukses. Batal/gagal = kredit utuh.
   Kit Lengkap (prd.md §8.3, design.md §9.F.6): satu Document per komponen, kredit
   dipotong sekali, lalu halaman "Paket" + "Unduh semua (ZIP)" tanpa redirect.
   Uji status gagal: tambahkan ?fail=1 pada URL — simulasi berhenti di ±60%. */

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { RevealScope } from "@/components/motion";
import { useApp } from "@/lib/store";
import { DOC_TYPES } from "@/lib/constants";
import type { DocType } from "@/lib/types";
import {
  buildMockContent,
  clearJob,
  jobSteps,
  readJob,
  type JobParams,
} from "@/lib/generation";

type Phase = "loading" | "missing" | "running" | "done" | "cancelled" | "error";

/** dokumen hasil Kit Lengkap utk halaman "Paket" */
interface KitDoc {
  id: string;
  title: string;
  type: DocType;
}

const STEP_MS = 1200; // ±1,2 dtk per langkah
const FAIL_AT = 60; // ?fail=1 → simulasi berhenti di ±60%

/* Checklist bernarasi: per-komponen untuk job Kit, jobSteps() untuk lainnya */
function stepsFor(job: JobParams): string[] {
  if (job.components && job.components.length > 0) {
    return [
      "Menganalisis kurikulum…",
      ...job.components.map((c) => `Menyusun ${c}…`),
      "Merapikan format…",
    ];
  }
  return jobSteps(job.docType);
}

/* Label komponen kit → DocType (cocokkan shortLabel/label DOC_TYPES) */
function docTypeForLabel(label: string): DocType {
  const meta = Object.values(DOC_TYPES).find(
    (m) => m.shortLabel === label || m.label === label,
  );
  return meta?.type ?? "modul_ajar";
}

export default function GeneratingPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);
  const app = useApp();
  const router = useRouter();
  const toast = useToast();

  // ref agar interval selalu membaca store & helper terbaru
  const appRef = useRef(app);
  useEffect(() => {
    appRef.current = app;
  });

  const [job, setJob] = useState<JobParams | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [pct, setPct] = useState(6);
  const [stepIdx, setStepIdx] = useState(0);
  const [kitDocs, setKitDocs] = useState<KitDoc[]>([]);
  const [runId, setRunId] = useState(0); // naik saat "Coba lagi" → effect simulasi jalan ulang

  const pctRef = useRef(6);
  const doneRef = useRef(false); // guard double-completion (React strict effects)
  const stopRef = useRef(false);
  const failRef = useRef(false); // ?fail=1 → gagal di ±60% (kredit utuh, job tetap ada)
  const timerRef = useRef<number | null>(null);

  // baca job setelah mount — sessionStorage hanya ada di klien, jadi
  // hidrasi satu kali lewat effect memang diperlukan di sini.
  useEffect(() => {
    failRef.current =
      new URLSearchParams(window.location.search).get("fail") === "1";
    const j = readJob(jobId);
    if (!j) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hidrasi sessionStorage satu kali
      setPhase("missing");
      return;
    }
    setJob(j);
    setPhase("running");
  }, [jobId]);

  // simulasi progres
  useEffect(() => {
    if (!job || doneRef.current) return;
    const steps = stepsFor(job);

    // Potong kredit + buat dokumen + notifikasi secara ATOMIK lewat store
    // (mode Supabase: RPC generate_documents — validasi saldo di server;
    //  gagal/jaringan → phase "error", kredit utuh, job tetap utk "Coba lagi").
    const finish = async () => {
      const { completeGeneration } = appRef.current;
      try {
        // Kit Lengkap — satu Document per komponen, kredit dipotong SEKALI,
        // lalu tampilkan halaman "Paket" di layar ini (tanpa redirect).
        if (job.components && job.components.length > 0) {
          const materi = job.title.replace(/^Kit Lengkap — /, "");
          const docs = await completeGeneration({
            jobRef: jobId,
            cost: job.cost,
            docs: job.components.map((comp) => {
              const type = docTypeForLabel(comp);
              const title = `${comp} — ${materi}`;
              return {
                title,
                type,
                subject: job.subject,
                jenjang: job.jenjang,
                qualityMode: job.qualityMode,
                pertemuanCount:
                  type === "modul_ajar" ? job.pertemuanCount : undefined,
                includeLkpd:
                  type === "modul_ajar" ? job.includeLkpd : undefined,
                content: buildMockContent({ ...job, docType: type, title }),
              };
            }),
            notifTitle: "Kit Lengkap selesai dibuat 🎉",
            notifBody: `${job.components.length} dokumen siap ditinjau di Dokumen Saya.`,
          });
          clearJob(jobId);
          setKitDocs(
            docs.map((d): KitDoc => ({ id: d.id, title: d.title, type: d.type })),
          );
          setPct(100);
          setStepIdx(steps.length - 1);
          setPhase("done");
          toast("Kit Lengkap selesai dibuat 🎉");
          return;
        }

        // Dokumen tunggal — buat satu Document lalu arahkan ke editor.
        const [doc] = await completeGeneration({
          jobRef: jobId,
          cost: job.cost,
          docs: [
            {
              title: job.title,
              type: job.docType,
              subject: job.subject,
              jenjang: job.jenjang,
              qualityMode: job.qualityMode,
              pertemuanCount: job.pertemuanCount,
              includeLkpd: job.includeLkpd,
              content: buildMockContent(job),
            },
          ],
          notifTitle: "Dokumen selesai dibuat 🎉",
          notifBody: `${job.title} siap ditinjau.`,
        });
        clearJob(jobId);
        setPct(100);
        setStepIdx(steps.length - 1);
        setPhase("done");
        toast("Dokumen selesai dibuat 🎉");
        window.setTimeout(() => router.replace(`/app/dokumen/${doc.id}`), 1200);
      } catch (e) {
        // KREDIT_TIDAK_CUKUP / jaringan — kredit utuh, job TIDAK dihapus
        console.error("AjarKit: generate gagal", e);
        stopRef.current = true;
        doneRef.current = false; // izinkan "Coba lagi" menjalankan ulang
        setPhase("error");
      }
    };

    const timer = window.setInterval(() => {
      if (doneRef.current || stopRef.current) return;
      const inc = (100 / steps.length) * (0.75 + Math.random() * 0.45);
      const cap = failRef.current ? FAIL_AT : 100;
      pctRef.current = Math.min(cap, pctRef.current + inc);
      setPct(pctRef.current);
      setStepIdx(
        Math.min(steps.length - 1, Math.floor((pctRef.current / 100) * steps.length)),
      );
      if (failRef.current && pctRef.current >= FAIL_AT) {
        // gagal (simulasi): kredit TIDAK dipotong, job TIDAK dihapus → bisa "Coba lagi"
        stopRef.current = true;
        window.clearInterval(timer);
        setPhase("error");
        return;
      }
      if (pctRef.current >= 100) {
        doneRef.current = true;
        window.clearInterval(timer);
        void finish();
      }
    }, STEP_MS);
    timerRef.current = timer;
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job, jobId, runId]);

  // batal langsung tanpa konfirmasi (perilaku app-generating.html)
  function cancel() {
    stopRef.current = true;
    if (timerRef.current) window.clearInterval(timerRef.current);
    clearJob(jobId); // kredit TIDAK pernah dipotong saat batal
    setPhase("cancelled");
  }

  // "Coba lagi" pada status gagal: jalankan ulang simulasi dari awal
  function retry() {
    failRef.current = false; // jalankan ulang tanpa skenario gagal
    stopRef.current = false;
    pctRef.current = 6;
    setPct(6);
    setStepIdx(0);
    setPhase("running");
    setRunId((n) => n + 1);
  }

  /* ---------- render ---------- */

  if (phase === "loading") {
    return (
      <RevealScope>
        <div className="gen-wrap">
          <div className="gen-card">
            <span className="spinner" aria-label="Memuat" />
          </div>
        </div>
      </RevealScope>
    );
  }

  if (phase === "missing" || !job) {
    return (
      <RevealScope>
        <div className="gen-wrap">
          <div className="gen-card">
            <div className="orb off">
              <Icon name="alert" />
            </div>
            <h1 className="t-h2">Pekerjaan tidak ditemukan</h1>
            <p className="muted" style={{ marginTop: 6 }}>
              Tautan generate ini sudah tidak berlaku. Mulai pembuatan dokumen baru
              dari halaman Buat.
            </p>
            <div style={{ marginTop: 26 }}>
              <Link className="btn btn-primary" href="/app/buat">
                Ke halaman Buat
              </Link>
            </div>
          </div>
        </div>
      </RevealScope>
    );
  }

  const steps = stepsFor(job);
  const isKit = !!job.components?.length;
  const label = isKit ? "Kit Lengkap" : DOC_TYPES[job.docType].shortLabel;
  const retryHref = isKit ? "/app/buat/kit-lengkap" : DOC_TYPES[job.docType].href;
  const stopped = phase === "cancelled" || phase === "error";
  const kitDone = phase === "done" && kitDocs.length > 0;

  const title =
    phase === "done"
      ? "Selesai 🎉"
      : phase === "cancelled"
        ? "Dibatalkan"
        : phase === "error"
          ? "Gagal membuat dokumen."
          : `Sedang membuat ${label}…`;
  const sub =
    phase === "done"
      ? kitDone
        ? "Paket dokumen berhasil dibuat — buka tiap dokumen di bawah."
        : "Dokumen berhasil dibuat. Mengarahkan ke editor…"
      : stopped
        ? "Kredit kamu tidak terpotong."
        : "Biasanya selesai dalam ±1 menit. Kamu boleh menunggu di sini.";

  return (
    <RevealScope>
      <div className="gen-wrap">
        <div className="gen-card">
          <div className={`orb${stopped ? " off" : ""}`}>
            <Icon name="sparkles" />
          </div>
          {phase === "error" && <span className="badge badge-ai">Gagal</span>}
          <h1 className="t-h2">{title}</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            {sub}
          </p>

          {/* Progres + checklist tetap terlihat (beku) saat batal/gagal;
              disembunyikan hanya pada hasil "Paket" Kit Lengkap. */}
          {!kitDone && (
            <>
              <div className="progress" style={{ marginTop: 22 }}>
                <span style={{ width: `${pct}%` }} />
              </div>
              <div className="row between" style={{ marginTop: 8 }}>
                <span className="t-small faint">{Math.round(pct)}%</span>
                <span className="t-small faint">Jangan tutup halaman</span>
              </div>

              <div className="gsteps">
                {steps.map((s, i) => {
                  const done = phase === "done" || i < stepIdx;
                  const active = phase !== "done" && i === stepIdx;
                  return (
                    <div
                      key={s}
                      className={`gstep${done ? " done" : ""}${active ? " active" : ""}`}
                    >
                      <span className="gi">
                        <Icon name="check" />
                      </span>
                      <span className="grow">{s}</span>
                      <span>
                        {phase === "running" && active && <span className="spinner" />}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Hasil "Paket" Kit Lengkap: tautan ke tiap dokumen (design.md §9.F.6) */}
          {kitDone && (
            <div className="kit-pack">
              {kitDocs.map((d) => {
                const meta = DOC_TYPES[d.type];
                return (
                  <Link key={d.id} className="kit-doc" href={`/app/dokumen/${d.id}`}>
                    <span className={`doc-ic ${meta.color}`}>
                      <Icon name={meta.icon} />
                    </span>
                    <span className="grow t-small strong">{d.title}</span>
                    <Icon name="chevR" className="kd-chev" />
                  </Link>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: 26 }}>
            {phase === "running" && (
              <button className="btn btn-secondary" onClick={cancel}>
                Batalkan
              </button>
            )}
            {phase === "cancelled" && (
              <div className="row center" style={{ gap: 10 }}>
                <Link className="btn btn-secondary" href="/app">
                  Ke Beranda
                </Link>
                <Link className="btn btn-primary" href={retryHref}>
                  <Icon name="refresh" />
                  Coba lagi
                </Link>
              </div>
            )}
            {phase === "error" && (
              <div className="row center" style={{ gap: 10 }}>
                <Link className="btn btn-secondary" href="/app">
                  Ke Beranda
                </Link>
                <button className="btn btn-primary" onClick={retry}>
                  <Icon name="refresh" />
                  Coba lagi
                </button>
              </div>
            )}
            {kitDone && (
              <div className="row center" style={{ gap: 10 }}>
                <Link className="btn btn-secondary" href="/app/dokumen">
                  Ke Dokumen Saya
                </Link>
                <button
                  className="btn btn-primary"
                  onClick={() => toast("Menyiapkan ZIP… (simulasi)")}
                >
                  <Icon name="download" />
                  Unduh semua (ZIP)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </RevealScope>
  );
}
