"use client";

/* AjarKit — Tentang (design.md §9.A.4: misi, cerita Lanius Lab, nilai, CTA daftar).
   Tidak ada ekspor HTML; memakai pola visual landing (sec-head, cards, cta-band). */

import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { SiteNav, SiteFooter } from "@/components/public/site-chrome";
import { RevealScope } from "@/components/motion";

export default function TentangPage() {
  return (
    <>
      <SiteNav />

      <RevealScope>
        {/* Hero */}
        <section
          className="container"
          style={{ padding: "48px 16px 8px", textAlign: "center" }}
        >
          <span className="eyebrow">Tentang</span>
          <h1 className="t-display" style={{ margin: "10px 0 8px" }}>
            Waktu guru untuk mengajar, bukan mengetik.
          </h1>
          <p
            className="t-body-lg muted"
            style={{ maxWidth: 560, margin: "0 auto" }}
          >
            AjarKit dibangun oleh Lanius Lab untuk mengembalikan jam-jam yang
            habis menyusun dokumen administrasi kepada hal yang paling penting:
            murid dan mahasiswa.
          </p>
        </section>

        {/* Misi */}
        <section className="section">
          <div className="container">
            <div className="sec-head">
              <span className="eyebrow">Misi kami</span>
              <h2 className="t-h1" style={{ marginTop: 8 }}>
                Perangkat ajar berkualitas, untuk semua.
              </h2>
            </div>
            <div className="card pad-lg">
              <p className="t-body-lg" style={{ color: "var(--text-strong)" }}>
                Setiap guru dan dosen berhak punya asisten yang memahami
                kurikulum. Misi kami sederhana: membuat penyusunan Modul Ajar,
                RPS, dan asesmen secepat mengisi formulir singkat — tanpa
                mengorbankan kualitas dan kesesuaian regulasi.
              </p>
            </div>
          </div>
        </section>

        {/* Cerita Lanius Lab */}
        <section className="section" style={{ background: "var(--surface)" }}>
          <div className="container">
            <div className="about-story">
              <div>
                <span className="eyebrow">Cerita singkat</span>
                <h2 className="t-h1" style={{ marginTop: 8 }}>
                  Lahir dari ruang guru.
                </h2>
                <p className="muted t-body-lg" style={{ marginTop: 12 }}>
                  Lanius Lab memulai AjarKit setelah melihat guru-guru di
                  sekitar kami menghabiskan malam demi malam menyalin format
                  RPP terbaru. Saat Permendikdasmen 13/2025 dan penguatan
                  Profil Pelajar Pancasila hadir, kebutuhan itu makin terasa.
                </p>
                <p className="muted t-body-lg" style={{ marginTop: 12 }}>
                  Kami merancang AjarKit bersama guru SD–SMA dan dosen — dari
                  struktur dokumen, istilah, sampai harga yang ramah kantong
                  pendidik Indonesia.
                </p>
              </div>
              <div className="card vis">
                <span
                  className="badge badge-disetujui"
                  style={{ width: "fit-content" }}
                >
                  <Icon name="check" />
                  Sesuai Permendikdasmen 13/2025
                </span>
                <div
                  className="card pad"
                  style={{ border: "none", background: "var(--surface-2)" }}
                >
                  <div className="row" style={{ gap: 8 }}>
                    <span className="doc-ic ic-purple">
                      <Icon name="sparkles" />
                    </span>
                    <div>
                      <div
                        className="strong"
                        style={{ fontWeight: 600, fontSize: 14 }}
                      >
                        AjarKit
                      </div>
                      <div className="t-small faint">
                        Perangkat Ajar OS · Buatan Lanius Lab
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  className="card pad"
                  style={{ border: "none", background: "var(--surface-2)" }}
                >
                  <div className="row" style={{ gap: 8 }}>
                    <Icon
                      name="users"
                      style={{ color: "var(--primary-600)", width: 18 }}
                    />
                    <span className="t-small">
                      Dipakai 1.000+ guru &amp; dosen di Indonesia
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Nilai */}
        <section className="section">
          <div className="container">
            <div className="sec-head">
              <span className="eyebrow">Nilai kami</span>
              <h2 className="t-h1" style={{ marginTop: 8 }}>
                Tiga hal yang kami pegang.
              </h2>
            </div>
            <div className="about-vals">
              <div className="card pad">
                <span className="doc-ic ic-blue">
                  <Icon name="target" />
                </span>
                <h4 className="t-h4" style={{ marginTop: 12 }}>
                  Akurat dulu, cepat kemudian
                </h4>
                <p className="muted t-small" style={{ marginTop: 6 }}>
                  Hasil AI harus sesuai kurikulum dan regulasi terbaru —
                  kecepatan tidak ada artinya tanpa ketepatan.
                </p>
              </div>
              <div className="card pad">
                <span className="doc-ic ic-green">
                  <Icon name="wallet" />
                </span>
                <h4 className="t-h4" style={{ marginTop: 12 }}>
                  Ramah kantong pendidik
                </h4>
                <p className="muted t-small" style={{ marginTop: 6 }}>
                  Mulai gratis, top-up mulai Rp 10rb, dan pembayaran QRIS tanpa
                  kartu kredit.
                </p>
              </div>
              <div className="card pad">
                <span className="doc-ic ic-teal">
                  <Icon name="eye" />
                </span>
                <h4 className="t-h4" style={{ marginTop: 12 }}>
                  Guru tetap pemegang kendali
                </h4>
                <p className="muted t-small" style={{ marginTop: 6 }}>
                  AI menyusun draf, kamu yang meninjau dan memutuskan. Dokumen
                  selalu bisa diedit sebelum dipakai.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="cta-band">
              <h2 className="t-h1" style={{ fontSize: "clamp(24px,4vw,34px)" }}>
                Ikut hemat waktu bersama kami.
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
    </>
  );
}
