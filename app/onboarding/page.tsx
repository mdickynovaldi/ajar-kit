"use client";

/* AjarKit — /onboarding (porting onboarding.html, design.md §9.C.1).
   Wizard full-screen 4 langkah; konten mengikuti peran dari store. */

import { useEffect, useState } from "react";
import Link from "next/link";
import posthog from "posthog-js";
import { Button, Chip } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { MAPEL_SMP, mapelForJenjang } from "@/lib/constants";
import { useApp } from "@/lib/store";
import type { User } from "@/lib/types";
import { RevealScope } from "@/components/motion";

const TOTAL = 4;

interface ObConfig {
  label: string;
  q1: string;
  q1b: string;
  q2: string;
  jenjang: string[];
  kelas: string[];
  mapel: string[];
  tujuan: string[];
  ahaTitle: string;
  ahaSub: string;
  ahaHref: string;
  titles: string[];
}

/* Guru: kelas mengikuti jenjang terpilih (SMP 7-9, SMA 10-12) */
const KELAS_GURU: Record<string, string[]> = {
  SMP: ["Kelas 7", "Kelas 8", "Kelas 9"],
  SMA: ["Kelas 10", "Kelas 11", "Kelas 12"],
};

const CFG_GURU: ObConfig = {
  label: "Persiapan Guru",
  q1: "Jenjang",
  q1b: "Kelas",
  q2: "Mata pelajaran yang diampu",
  jenjang: ["SMP", "SMA"],
  kelas: [...KELAS_GURU.SMP, ...KELAS_GURU.SMA],
  // guru: chips mapel sebenarnya mengikuti jenjang via mapelForJenjang()
  mapel: MAPEL_SMP,
  tujuan: ["Hemat waktu bikin RPP", "Bank soal berkualitas", "Asesmen lebih variatif", "Kolaborasi sekolah"],
  ahaTitle: "Buat Modul Ajar pertamamu sekarang",
  ahaSub: "Kami sudah mengisi jenjang & mapel dari jawabanmu. Tinggal klik buat.",
  ahaHref: "/app/buat/modul-ajar",
  titles: [
    "Halo 👋 Ceritakan sedikit tentang kelasmu",
    "Mata pelajaran yang kamu ampu",
    "Sekolah & tujuanmu",
    "Mari buat dokumen pertamamu",
  ],
};

const CFG_DOSEN: ObConfig = {
  label: "Persiapan Dosen",
  q1: "Perguruan tinggi",
  q1b: "Jenjang program",
  q2: "Mata kuliah yang diampu",
  jenjang: ["Universitas", "Institut", "Politeknik", "Sekolah Tinggi"],
  kelas: ["D3", "D4", "S1", "S2", "Profesi"],
  mapel: [
    "Algoritma & Pemrograman", "Basis Data", "Kalkulus", "Statistika", "Manajemen",
    "Akuntansi", "Hukum Perdata", "Biologi Sel", "Fisika Dasar", "Kewirausahaan",
  ],
  tujuan: ["Susun RPS OBE", "Standarisasi prodi", "Hemat waktu", "Akreditasi"],
  ahaTitle: "Buat RPS pertamamu sekarang",
  ahaSub: "Kami sudah mengisi prodi & mata kuliah dari jawabanmu.",
  ahaHref: "/app/buat/rps",
  titles: [
    "Halo 👋 Tentang program studimu",
    "Mata kuliah yang kamu ampu",
    "Acuan & institusi",
    "Mari buat dokumen pertamamu",
  ],
};

const SUBS = [
  "Biar generator langsung relevan.",
  "Pilih yang sesuai — bisa lebih dari satu.",
  "Sedikit lagi, hampir selesai.",
  "Field sudah terisi dari jawabanmu.",
];

export default function OnboardingPage() {
  const app = useApp();
  const isDosen = app.role === "dosen";
  const cfg = isDosen ? CFG_DOSEN : CFG_GURU;

  const [step, setStep] = useState(1);
  const [jenjang, setJenjang] = useState<string>(
    () => (app.role === "dosen" ? CFG_DOSEN : CFG_GURU).jenjang[0],
  );
  const [kelas, setKelas] = useState<string[]>([]);
  const [mapel, setMapel] = useState<string[]>([]);
  const [mapelQuery, setMapelQuery] = useState("");
  const [sekolah, setSekolah] = useState("");
  const [tujuan, setTujuan] = useState<string>("");

  // peran berubah (live) → reset pilihan sesuai opsi peran tsb
  // (pola "adjust state during render", tanpa effect)
  const [prevRole, setPrevRole] = useState(app.role);
  if (app.role !== prevRole) {
    setPrevRole(app.role);
    const c = app.role === "dosen" ? CFG_DOSEN : CFG_GURU;
    setJenjang(c.jenjang[0]);
    setKelas([]);
    setMapel([]);
    setMapelQuery("");
    setTujuan("");
  }

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  const toggle = (list: string[], v: string) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  /* Guru: ganti jenjang → opsi kelas & mapel ikut berubah; buang pilihan
     yang tak ada lagi di daftar baru. Jalur dosen tidak berubah. */
  const pickJenjang = (j: string) => {
    setJenjang(j);
    if (!isDosen) {
      const kelasOpts = KELAS_GURU[j] ?? [];
      const mapelOpts = mapelForJenjang(j);
      setKelas((l) => l.filter((k) => kelasOpts.includes(k)));
      setMapel((l) => l.filter((m) => mapelOpts.includes(m)));
    }
  };

  const kelasShown = isDosen ? cfg.kelas : (KELAS_GURU[jenjang] ?? KELAS_GURU.SMP);
  const mapelAll = isDosen ? cfg.mapel : mapelForJenjang(jenjang);

  const go = (d: number) => setStep((s) => Math.min(TOTAL, Math.max(1, s + d)));

  const finish = () => {
    // simpan jawaban wizard ke profil (merge di atas mock, hanya yang terisi)
    if (isDosen) {
      const patch: Partial<User> = {};
      if (sekolah.trim()) patch.pt = sekolah.trim();
      if (kelas.length) patch.prodi = kelas.join(", ");
      if (mapel.length) patch.mataKuliah = mapel;
      if (Object.keys(patch).length) app.updateProfile(patch);
    } else {
      const patch: Partial<User> = { jenjang };
      if (kelas.length) patch.kelas = kelas.join(", ");
      if (mapel.length) patch.mapel = mapel;
      if (sekolah.trim()) patch.sekolah = sekolah.trim();
      app.updateProfile(patch);
    }
    posthog.capture("onboarding_completed", {
      role: app.role,
      step_reached: step,
      skipped: step < TOTAL,
    });
    app.setOnboardingDone(true);
  };

  const q = mapelQuery.trim().toLowerCase();
  const mapelShown = mapelAll.filter((m) => m.toLowerCase().includes(q));

  return (
    <RevealScope>
      <div className="ob">
        <header className="ob-top">
          <Link className="brand grow" href="/app" style={{ fontSize: 17 }}>
            <span className="mark">
              <Icon name="logo" />
            </span>
            AjarKit
          </Link>
          <div className="ob-pbar" style={{ maxWidth: 160 }} aria-hidden="true">
            <span style={{ width: `${(step / TOTAL) * 100}%` }} />
          </div>
          <Link className="t-small muted" href="/app" onClick={finish}>
            Lewati
          </Link>
        </header>

        <div className="ob-body">
          <div className="ob-card">
            <span className="eyebrow">{cfg.label}</span>
            <h1 className="t-h1" style={{ margin: "8px 0 4px" }}>
              {cfg.titles[step - 1]}
            </h1>
            <p className="muted">{SUBS[step - 1]}</p>

            <div style={{ marginTop: 24 }}>
              {/* STEP 1 */}
              <section className={`step-panel${step === 1 ? " on" : ""}`}>
                <div className="card pad-lg stack" style={{ "--gap": "18px" } as React.CSSProperties}>
                  <div>
                    <span className="lbl">{cfg.q1}</span>
                    <div className="ob-chips">
                      {cfg.jenjang.map((j) => (
                        <Chip key={j} on={jenjang === j} onToggle={() => pickJenjang(j)}>
                          {j}
                        </Chip>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="lbl">{cfg.q1b}</span>
                    <div className="ob-chips">
                      {kelasShown.map((k) => (
                        <Chip key={k} on={kelas.includes(k)} onToggle={() => setKelas((l) => toggle(l, k))}>
                          {k}
                        </Chip>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* STEP 2 */}
              <section className={`step-panel${step === 2 ? " on" : ""}`}>
                <div className="card pad-lg stack" style={{ "--gap": "14px" } as React.CSSProperties}>
                  <div className="field">
                    <label htmlFor="mapelSearch">{cfg.q2}</label>
                    <div className="input-icon">
                      <Icon name="search" />
                      <input
                        className="input"
                        id="mapelSearch"
                        placeholder="Cari mata pelajaran…"
                        value={mapelQuery}
                        onChange={(e) => setMapelQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="ob-chips">
                    {mapelShown.map((m) => (
                      <Chip key={m} on={mapel.includes(m)} onToggle={() => setMapel((l) => toggle(l, m))}>
                        {m}
                      </Chip>
                    ))}
                  </div>
                  <p className="help">Pilih satu atau lebih. Bisa diubah kapan saja.</p>
                </div>
              </section>

              {/* STEP 3 */}
              <section className={`step-panel${step === 3 ? " on" : ""}`}>
                <div className="card pad-lg stack" style={{ "--gap": "14px" } as React.CSSProperties}>
                  <div className="field">
                    <label htmlFor="sekolah">Nama sekolah / kampus (opsional)</label>
                    <input
                      className="input"
                      id="sekolah"
                      placeholder="Mis. SDN Merdeka 01"
                      value={sekolah}
                      onChange={(e) => setSekolah(e.target.value)}
                    />
                  </div>
                  <div>
                    <span className="lbl">Tujuan utamamu</span>
                    <div className="ob-chips">
                      {cfg.tujuan.map((t) => (
                        <Chip key={t} on={tujuan === t} onToggle={() => setTujuan((cur) => (cur === t ? "" : t))}>
                          {t}
                        </Chip>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* STEP 4 — aha */}
              <section className={`step-panel${step === 4 ? " on" : ""}`}>
                <div className="ob-aha">
                  <span className="badge" style={{ background: "rgba(255,255,255,.2)", color: "#fff" }}>
                    <Icon name="sparkles" />
                    Siap!
                  </span>
                  <h3 className="t-h3" style={{ margin: "12px 0 6px" }}>
                    {cfg.ahaTitle}
                  </h3>
                  <p style={{ opacity: 0.92 }}>{cfg.ahaSub}</p>
                  <Link
                    className="btn lg"
                    href={cfg.ahaHref}
                    onClick={finish}
                    style={{ background: "#fff", color: "var(--primary-700)", marginTop: 16 }}
                  >
                    Buat sekarang — gratis
                  </Link>
                </div>
                <p className="t-small muted" style={{ textAlign: "center", marginTop: 14 }}>
                  atau{" "}
                  <Link
                    href="/app"
                    onClick={finish}
                    style={{ color: "var(--primary-600)", fontWeight: 600 }}
                  >
                    lewati ke Beranda
                  </Link>
                </p>
              </section>
            </div>
          </div>
        </div>

        <footer className="ob-foot">
          <div className="container">
            <Button
              type="button"
              variant="secondary"
              iconLeft="chevL"
              onClick={() => go(-1)}
              style={{ visibility: step === 1 ? "hidden" : "visible" }}
            >
              Kembali
            </Button>
            {step < TOTAL && (
              <Button type="button" className="grow" iconRight="chevR" onClick={() => go(1)}>
                Lanjut
              </Button>
            )}
          </div>
        </footer>
      </div>
    </RevealScope>
  );
}
