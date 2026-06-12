"use client";

/* AjarKit — Fitur (porting Ajarkit/fitur.html) */

import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { SiteNav, SiteFooter } from "@/components/public/site-chrome";
import { RevealScope } from "@/components/motion";

const YES = (
  <Icon name="check" style={{ width: 18, height: 18, color: "var(--success)" }} />
);
const NO = <span className="cmp-no">—</span>;

const ROWS: [string, boolean, boolean][] = [
  ["Modul Ajar / RPP", true, false],
  ["LKPD", true, false],
  ["Asesmen (Formatif/Sumatif)", true, true],
  ["Bank Soal (termasuk HOTS)", true, true],
  ["Prota & Promes", true, false],
  ["RPS berbasis OBE", false, true],
  ["Rubrik penilaian", true, true],
];

const BENEFITS: {
  icon: Parameters<typeof Icon>[0]["name"];
  color: string;
  title: string;
  desc: string;
}[] = [
  {
    icon: "zap",
    color: "ic-purple",
    title: "Kit Lengkap sekali klik",
    desc: "Modul, LKPD, Asesmen & Bank Soal konsisten dari satu kali isi.",
  },
  {
    icon: "target",
    color: "ic-blue",
    title: "Akurat sesuai regulasi",
    desc: "Profil Pelajar Pancasila (6 dimensi), Permendikdasmen 13/2025.",
  },
  {
    icon: "download",
    color: "ic-green",
    title: "Ekspor DOCX & PDF",
    desc: "Hasil rapi, siap diunggah ke sistem sekolah atau langsung dicetak.",
  },
  {
    icon: "users",
    color: "ic-teal",
    title: "Kolaborasi tim sekolah",
    desc: "Bank dokumen, ajukan untuk ditinjau, setujui atau minta revisi.",
  },
  {
    icon: "list",
    color: "ic-amber",
    title: "Bank Soal HOTS",
    desc: "Atur komposisi LOTS/MOTS/HOTS lengkap dengan kunci & pembahasan.",
  },
  {
    icon: "sparkles",
    color: "ic-blue",
    title: "Editor + Asisten AI",
    desc: "Edit langsung dan susun ulang tiap bagian dengan bantuan AI.",
  },
];

export default function FiturPage() {
  return (
    <>
      <SiteNav />

      <RevealScope>
        <section
          className="container"
          style={{ padding: "48px 16px 8px", textAlign: "center" }}
        >
          <span className="eyebrow">Fitur</span>
          <h1 className="t-display" style={{ margin: "10px 0 8px" }}>
            Semua perangkat ajar, satu alur.
          </h1>
          <p
            className="t-body-lg muted"
            style={{ maxWidth: 560, margin: "0 auto" }}
          >
            Dari Modul Ajar sampai RPS OBE — dibuat cepat, akurat, dan siap
            kolaborasi.
          </p>
          <div
            className="row center wrap"
            style={{ gap: 8, marginTop: 18 }}
          >
            <span className="badge badge-ai">
              <Icon name="check" /> Permendikdasmen 13/2025
            </span>
            <span className="chip">⚡ ±1 menit / dokumen</span>
            <span className="chip">Ekspor DOCX &amp; PDF</span>
            <span className="chip">Kit Lengkap sekali klik</span>
          </div>
          <div
            className="row center wrap"
            style={{ gap: 10, marginTop: 22 }}
          >
            <Link className="btn btn-primary lg" href="/daftar">
              Coba Gratis — tanpa kartu kredit
            </Link>
            <Link className="btn btn-secondary lg" href="/harga">
              Lihat harga
            </Link>
          </div>
        </section>

        {/* Keunggulan — ringkas & scannable: apa yang kamu dapat */}
        <section className="container" style={{ padding: "20px 16px 0" }}>
          <div
            className="sec-head"
            style={{ textAlign: "center", margin: "12px auto 24px" }}
          >
            <span className="eyebrow">Keunggulan</span>
            <h2 className="t-h1" style={{ marginTop: 8 }}>
              Semua yang pendidik butuhkan
            </h2>
          </div>
          <div className="feat-grid six">
            {BENEFITS.map((b) => (
              <div className="card pad" key={b.title}>
                <span className={`doc-ic ${b.color}`}>
                  <Icon name={b.icon} />
                </span>
                <h4 className="t-h4" style={{ marginTop: 12 }}>
                  {b.title}
                </h4>
                <p className="muted t-small" style={{ marginTop: 6 }}>
                  {b.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className="container">
          {/* Pilar 1 */}
          <div className="pillar">
            <div>
              <span
                className="doc-ic ic-purple"
                style={{ width: 46, height: 46 }}
              >
                <Icon name="zap" />
              </span>
              <h2
                className="t-h1"
                style={{ margin: "14px 0 8px", fontSize: 26 }}
              >
                Kit Lengkap sekali klik
              </h2>
              <p className="muted t-body-lg">
                Satu isian identitas → Modul Ajar, LKPD, Asesmen, dan Bank Soal
                yang saling konsisten. Hemat berkali lipat dibanding membuat
                satu per satu.
              </p>
            </div>
            <div className="card vis">
              <div className="chip-row">
                <span className="chip on">Modul Ajar</span>
                <span className="chip on">LKPD</span>
                <span className="chip on">Asesmen</span>
                <span className="chip on">Bank Soal</span>
              </div>
              <button
                className="btn btn-ai block"
                style={{ pointerEvents: "none" }}
                tabIndex={-1}
              >
                <Icon name="sparkles" />
                Buat paket — 120 kredit
              </button>
              <div
                className="card pad"
                style={{ background: "var(--surface-2)", border: "none" }}
              >
                <div className="row" style={{ gap: 8 }}>
                  <Icon
                    name="checkCircle"
                    style={{ color: "var(--success)", width: 18 }}
                  />
                  <span className="t-small">4 dokumen, 1 menit, konsisten</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pilar 2 */}
          <div className="pillar rev">
            <div>
              <span
                className="doc-ic ic-blue"
                style={{ width: 46, height: 46 }}
              >
                <Icon name="target" />
              </span>
              <h2
                className="t-h1"
                style={{ margin: "14px 0 8px", fontSize: 26 }}
              >
                Akurat sesuai kurikulum
              </h2>
              <p className="muted t-body-lg">
                Output mengikuti format Profil Pelajar Pancasila, 4 tahap
                penyusunan, dan 6 dimensinya — sesuai Permendikdasmen
                13/2025. Untuk dosen, RPS tersusun runtut berbasis OBE.
              </p>
            </div>
            <div className="card vis">
              <span
                className="badge badge-disetujui"
                style={{ width: "fit-content" }}
              >
                <Icon name="check" />
                Permendikdasmen 13/2025
              </span>
              <div
                className="card pad"
                style={{ border: "none", background: "var(--surface-2)" }}
              >
                <span className="phase-tag">Tahap 1 · Identifikasi</span>
                <div
                  style={{
                    height: 8,
                    background: "var(--border)",
                    borderRadius: 5,
                    marginTop: 8,
                    width: "80%",
                  }}
                />
                <div
                  style={{
                    height: 8,
                    background: "var(--border)",
                    borderRadius: 5,
                    marginTop: 6,
                    width: "60%",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Pilar 3 */}
          <div className="pillar">
            <div>
              <span
                className="doc-ic ic-teal"
                style={{ width: 46, height: 46 }}
              >
                <Icon name="users" />
              </span>
              <h2
                className="t-h1"
                style={{ margin: "14px 0 8px", fontSize: 26 }}
              >
                Kolaborasi tim sekolah
              </h2>
              <p className="muted t-body-lg">
                Ruang Sekolah/Prodi untuk standarisasi mutu: undang anggota,
                ajukan dokumen untuk ditinjau, setujui atau minta revisi, lalu
                simpan ke bank dokumen sekolah.
              </p>
            </div>
            <div className="card vis">
              <div className="row" style={{ gap: 6 }}>
                <span className="avatar sm">RW</span>
                <span className="avatar sm">AS</span>
                <span className="avatar sm">SN</span>
                <span className="chip">+9</span>
              </div>
              <div
                className="card pad"
                style={{ border: "none", background: "var(--surface-2)" }}
              >
                <div className="row between">
                  <span className="t-small strong" style={{ fontWeight: 600 }}>
                    Modul Ajar IPAS
                  </span>
                  <span className="badge badge-review">Menunggu Review</span>
                </div>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <button
                  className="btn btn-secondary sm"
                  style={{ pointerEvents: "none" }}
                  tabIndex={-1}
                >
                  Minta revisi
                </button>
                <button
                  className="btn btn-primary sm"
                  style={{ pointerEvents: "none" }}
                  tabIndex={-1}
                >
                  <Icon name="check" />
                  Setujui
                </button>
              </div>
            </div>
          </div>

          {/* Tabel apa yang bisa dibuat */}
          <section style={{ padding: "44px 0" }}>
            <h2 className="t-h2" style={{ marginBottom: 14 }}>
              Apa yang bisa kamu buat
            </h2>
            <div className="cmp-wrap">
              <table className="table cmp">
                <thead>
                  <tr>
                    <th>Dokumen</th>
                    <th>Guru</th>
                    <th>Dosen</th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map(([doc, guru, dosen]) => (
                    <tr key={doc}>
                      <td className="strong" style={{ fontWeight: 600 }}>
                        {doc}
                      </td>
                      <td className="cmp-c">{guru ? YES : NO}</td>
                      <td className="cmp-c">{dosen ? YES : NO}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div
            className="card"
            style={{
              background: "var(--ai-gradient)",
              color: "#fff",
              border: "none",
              padding: "40px 24px",
              textAlign: "center",
              marginBottom: 48,
            }}
          >
            <h2 className="t-h1" style={{ color: "#fff", fontSize: 28 }}>
              Coba semua fitur, gratis.
            </h2>
            <Link
              className="btn lg"
              href="/daftar"
              style={{
                background: "#fff",
                color: "var(--primary-700)",
                marginTop: 18,
              }}
            >
              Mulai sekarang
            </Link>
          </div>
        </div>

        <SiteFooter />
      </RevealScope>
    </>
  );
}
