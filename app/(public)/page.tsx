"use client";

/* AjarKit — Landing (porting Ajarkit/landing.html) */

import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { SiteNav, SiteFooter } from "@/components/public/site-chrome";
import { RevealScope } from "@/components/motion";

function scrollToCara(e: React.MouseEvent<HTMLAnchorElement>) {
  const t = document.getElementById("cara");
  if (t) {
    e.preventDefault();
    window.scrollTo({ top: t.offsetTop - 72, behavior: "smooth" });
  }
}

export default function LandingPage() {
  return (
    <>
      <SiteNav transparentAtTop />

      <RevealScope>
        {/* Hero */}
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <span className="badge badge-ai" style={{ height: 26 }}>
                <Icon name="check" /> Sesuai Permendikdasmen 13/2025
              </span>
              <h1
                className="t-display"
                style={{
                  fontSize: "clamp(32px,6vw,52px)",
                  marginTop: 16,
                  lineHeight: 1.08,
                }}
              >
                Buat Modul Ajar, RPS, &amp; soal dalam hitungan menit.
              </h1>
              <p
                className="t-body-lg muted"
                style={{ marginTop: 16, maxWidth: 520 }}
              >
                Asisten AI perangkat ajar untuk guru &amp; dosen — sesuai
                Kurikulum &amp; Profil Pelajar Pancasila terbaru. Isi detail
                singkat, AI yang menyusun.
              </p>
              <div className="row wrap" style={{ marginTop: 26 }}>
                <Link className="btn btn-primary lg" href="/daftar">
                  Coba Gratis — tanpa kartu kredit
                </Link>
                <a
                  className="btn btn-secondary lg"
                  href="#cara"
                  onClick={scrollToCara}
                >
                  Lihat cara kerja
                </a>
              </div>
              <div className="logos" style={{ marginTop: 30 }}>
                <span className="t-small faint">Dipakai 1.000+ guru:</span>
                <span className="lg">SDN Merdeka</span>
                <span className="lg">SMPN 4</span>
                <span className="lg">MAN 2</span>
                <span className="lg">Univ. Nusantara</span>
              </div>
            </div>
            <div className="card mock">
              <div className="bar">
                <i></i>
                <i></i>
                <i></i>
              </div>
              <div className="mock-body">
                <div className="row between">
                  <div className="mock-row" style={{ width: "42%" }} />
                  <span className="badge badge-ai">
                    <Icon name="sparkles" />
                    AI
                  </span>
                </div>
                <div className="mock-card">
                  <div className="row between">
                    <div
                      className="mock-row"
                      style={{ width: "55%", height: 11 }}
                    />
                    <span className="badge badge-selesai">Selesai</span>
                  </div>
                  <div className="mock-row" style={{ width: "90%" }} />
                  <div className="mock-row" style={{ width: "78%" }} />
                </div>
                <div
                  className="grid"
                  style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}
                >
                  <div className="mock-card">
                    <span className="doc-ic ic-blue">
                      <Icon name="book" />
                    </span>
                    <div className="mock-row" style={{ width: "70%" }} />
                  </div>
                  <div className="mock-card">
                    <span className="doc-ic ic-teal">
                      <Icon name="clipboard" />
                    </span>
                    <div className="mock-row" style={{ width: "60%" }} />
                  </div>
                </div>
                <button
                  className="btn btn-ai block"
                  style={{ pointerEvents: "none" }}
                  tabIndex={-1}
                >
                  <Icon name="sparkles" />
                  Buat dengan AI — 50 kredit
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Segmen ganda */}
        <section className="section">
          <div className="container">
            <div className="sec-head">
              <span className="eyebrow">Untuk siapa</span>
              <h2 className="t-h1" style={{ marginTop: 8 }}>
                Satu alat, dua dunia perencanaan.
              </h2>
            </div>
            <div className="seg-grid">
              <div className="card seg-card hover">
                <span
                  className="doc-ic ic-blue"
                  style={{ width: 46, height: 46 }}
                >
                  <Icon name="book" />
                </span>
                <h3 className="t-h3">Untuk Guru</h3>
                <p className="muted t-body">
                  Modul Ajar/RPP berbasis Profil Pelajar Pancasila, lengkap
                  dengan turunannya.
                </p>
                <ul>
                  <li>
                    <Icon name="check" />
                    Modul Ajar / RPP &amp; LKPD
                  </li>
                  <li>
                    <Icon name="check" />
                    Asesmen Formatif &amp; Sumatif
                  </li>
                  <li>
                    <Icon name="check" />
                    Bank Soal termasuk HOTS
                  </li>
                  <li>
                    <Icon name="check" />
                    Prota &amp; Promes
                  </li>
                </ul>
                <Link
                  className="btn btn-secondary"
                  href="/daftar"
                  style={{ marginTop: "auto" }}
                >
                  Pelajari untuk Guru <Icon name="arrowR" />
                </Link>
              </div>
              <div className="card seg-card hover">
                <span
                  className="doc-ic ic-teal"
                  style={{ width: 46, height: 46 }}
                >
                  <Icon name="layers" />
                </span>
                <h3 className="t-h3">Untuk Dosen</h3>
                <p className="muted t-body">
                  RPS berbasis OBE yang runtut dari capaian sampai rencana 16
                  pertemuan.
                </p>
                <ul>
                  <li>
                    <Icon name="check" />
                    CPL → CPMK → Sub-CPMK
                  </li>
                  <li>
                    <Icon name="check" />
                    Rencana 16 pertemuan otomatis
                  </li>
                  <li>
                    <Icon name="check" />
                    Rubrik &amp; bobot penilaian
                  </li>
                  <li>
                    <Icon name="check" />
                    Daftar pustaka terstruktur
                  </li>
                </ul>
                <Link
                  className="btn btn-secondary"
                  href="/daftar"
                  style={{ marginTop: "auto" }}
                >
                  Pelajari untuk Dosen <Icon name="arrowR" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Fitur unggulan */}
        <section className="section" style={{ background: "var(--surface)" }}>
          <div className="container">
            <div className="sec-head">
              <span className="eyebrow">Keunggulan</span>
              <h2 className="t-h1" style={{ marginTop: 8 }}>
                Dibuat untuk hasil cepat &amp; tepat.
              </h2>
            </div>
            <div className="feat-grid four">
              <div className="card pad">
                <span className="doc-ic ic-purple">
                  <Icon name="zap" />
                </span>
                <h4 className="t-h4" style={{ marginTop: 12 }}>
                  Kit Lengkap sekali klik
                </h4>
                <p className="muted t-small" style={{ marginTop: 6 }}>
                  Satu isian → Modul, LKPD, Asesmen, Bank Soal yang saling
                  konsisten.
                </p>
              </div>
              <div className="card pad">
                <span className="doc-ic ic-blue">
                  <Icon name="target" />
                </span>
                <h4 className="t-h4" style={{ marginTop: 12 }}>
                  Akurat sesuai regulasi
                </h4>
                <p className="muted t-small" style={{ marginTop: 6 }}>
                  Mengikuti format Profil Pelajar Pancasila &amp; 6 dimensinya.
                </p>
              </div>
              <div className="card pad">
                <span className="doc-ic ic-green">
                  <Icon name="download" />
                </span>
                <h4 className="t-h4" style={{ marginTop: 12 }}>
                  Ekspor DOCX &amp; PDF
                </h4>
                <p className="muted t-small" style={{ marginTop: 6 }}>
                  Hasil rapi, siap unggah ke sistem sekolah atau dicetak.
                </p>
              </div>
              <div className="card pad">
                <span className="doc-ic ic-teal">
                  <Icon name="users" />
                </span>
                <h4 className="t-h4" style={{ marginTop: 12 }}>
                  Kolaborasi tim sekolah
                </h4>
                <p className="muted t-small" style={{ marginTop: 6 }}>
                  Bank dokumen, review, &amp; approval untuk standarisasi mutu.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Cara kerja */}
        <section className="section" id="cara">
          <div className="container">
            <div className="sec-head">
              <span className="eyebrow">Cara kerja</span>
              <h2 className="t-h1" style={{ marginTop: 8 }}>
                Tiga langkah, dokumen jadi.
              </h2>
            </div>
            <div className="steps3">
              <div className="card step3">
                <div className="num3">1</div>
                <h4 className="t-h4">Isi detail singkat</h4>
                <p className="muted t-small" style={{ marginTop: 6 }}>
                  Jenjang, mapel, materi — sebagian sudah terisi otomatis dari
                  profilmu.
                </p>
              </div>
              <div className="card step3">
                <div className="num3">2</div>
                <h4 className="t-h4">AI menyusun</h4>
                <p className="muted t-small" style={{ marginTop: 6 }}>
                  Asisten menyusun struktur lengkap sesuai format terbaru, ±1
                  menit.
                </p>
              </div>
              <div className="card step3">
                <div className="num3">3</div>
                <h4 className="t-h4">Tinjau &amp; unduh</h4>
                <p className="muted t-small" style={{ marginTop: 6 }}>
                  Edit seperlunya, lalu unduh DOCX/PDF atau ajukan untuk
                  ditinjau.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Cuplikan harga */}
        <section className="section" style={{ background: "var(--surface)" }}>
          <div className="container">
            <div className="sec-head">
              <span className="eyebrow">Harga</span>
              <h2 className="t-h1" style={{ marginTop: 8 }}>
                Mulai gratis, bayar saat butuh.
              </h2>
            </div>
            <div className="price-peek">
              <div className="card pp">
                <h4 className="t-h4">Gratis</h4>
                <div className="amt">Rp 0</div>
                <p className="muted t-small">
                  5 dokumen/bulan, mode hemat, ada watermark.
                </p>
                <Link
                  className="btn btn-secondary"
                  href="/daftar"
                  style={{ marginTop: 8 }}
                >
                  Mulai gratis
                </Link>
              </div>
              <div className="card pp pop">
                <div className="row between">
                  <h4 className="t-h4">Pro</h4>
                  <span className="badge badge-pop">Populer</span>
                </div>
                <div className="amt">
                  Rp 49rb
                  <span className="t-small muted" style={{ fontWeight: 500 }}>
                    /bln
                  </span>
                </div>
                <p className="muted t-small">
                  Kuota besar, kualitas tinggi, tanpa watermark.
                </p>
                <Link
                  className="btn btn-primary"
                  href="/harga"
                  style={{ marginTop: 8 }}
                >
                  Langganan Pro
                </Link>
              </div>
              <div className="card pp">
                <h4 className="t-h4">Sekolah</h4>
                <div className="amt">
                  Rp 1,5jt
                  <span className="t-small muted" style={{ fontWeight: 500 }}>
                    /bln
                  </span>
                </div>
                <p className="muted t-small">
                  Multi-akun, approval, bank dokumen, admin.
                </p>
                <Link
                  className="btn btn-secondary"
                  href="/harga"
                  style={{ marginTop: 8 }}
                >
                  Ajukan demo
                </Link>
              </div>
            </div>
            <div className="center" style={{ display: "flex", marginTop: 22 }}>
              <Link className="btn btn-ghost" href="/harga">
                Lihat semua harga <Icon name="arrowR" />
              </Link>
            </div>
          </div>
        </section>

        {/* Testimoni */}
        <section className="section">
          <div className="container">
            <div className="sec-head">
              <span className="eyebrow">Kata mereka</span>
              <h2 className="t-h1" style={{ marginTop: 8 }}>
                Hemat berjam-jam tiap minggu.
              </h2>
            </div>
            <div className="quotes">
              <div className="card pad-lg">
                <p
                  className="t-body-lg"
                  style={{ color: "var(--text-strong)" }}
                >
                  “Biasanya semalaman bikin RPP. Sekarang 5 menit, tinggal saya
                  rapikan.”
                </p>
                <div className="row" style={{ marginTop: 16 }}>
                  <span className="avatar">RW</span>
                  <div>
                    <div
                      className="strong"
                      style={{ fontWeight: 600, fontSize: 14 }}
                    >
                      Rina W.
                    </div>
                    <div className="t-small faint">Guru SD · Bandung</div>
                  </div>
                </div>
              </div>
              <div className="card pad-lg">
                <p
                  className="t-body-lg"
                  style={{ color: "var(--text-strong)" }}
                >
                  “Bank soal HOTS-nya membantu banget buat asesmen sumatif.”
                </p>
                <div className="row" style={{ marginTop: 16 }}>
                  <span className="avatar">AS</span>
                  <div>
                    <div
                      className="strong"
                      style={{ fontWeight: 600, fontSize: 14 }}
                    >
                      Adi S.
                    </div>
                    <div className="t-small faint">Guru SMA · Surabaya</div>
                  </div>
                </div>
              </div>
              <div className="card pad-lg">
                <p
                  className="t-body-lg"
                  style={{ color: "var(--text-strong)" }}
                >
                  “RPS OBE dari CPL ke 16 pertemuan tersusun rapi. Sangat
                  menolong.”
                </p>
                <div className="row" style={{ marginTop: 16 }}>
                  <span className="avatar">DP</span>
                  <div>
                    <div
                      className="strong"
                      style={{ fontWeight: 600, fontSize: 14 }}
                    >
                      Dr. Dewi P.
                    </div>
                    <div className="t-small faint">Dosen · Yogyakarta</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA penutup */}
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="cta-band">
              <h2 className="t-h1" style={{ fontSize: "clamp(24px,4vw,34px)" }}>
                Hemat waktumu mulai hari ini.
              </h2>
              <p
                style={{
                  marginTop: 10,
                  opacity: 0.92,
                  maxWidth: 480,
                  marginInline: "auto",
                }}
              >
                Coba gratis tanpa kartu kredit. Buat dokumen pertamamu dalam
                semenit.
              </p>
              <Link
                className="btn lg"
                href="/daftar"
                style={{
                  background: "#fff",
                  color: "var(--primary-700)",
                  marginTop: 22,
                }}
              >
                Coba Gratis
              </Link>
            </div>
          </div>
        </section>

        <SiteFooter />
      </RevealScope>

      <Link className="btn btn-primary block lg sticky-cta" href="/daftar">
        Coba Gratis
      </Link>
    </>
  );
}
