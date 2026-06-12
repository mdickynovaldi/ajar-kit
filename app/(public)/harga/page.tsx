"use client";

/* AjarKit — Harga (porting Ajarkit/harga.html) */

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { SiteNav, SiteFooter } from "@/components/public/site-chrome";
import { RevealScope } from "@/components/motion";

const YES = (
  <Icon name="check" style={{ width: 18, height: 18, color: "var(--success)" }} />
);
const NO = <span className="cmp-no">—</span>;

type Cell = string | boolean;
const ROWS: [string, Cell, Cell, Cell, Cell][] = [
  ["Dokumen / bulan", "5", "sesuai kredit", "Besar", "Tak terbatas"],
  ["Semua jenis dokumen", false, true, true, true],
  ["Kit Lengkap sekali klik", false, true, true, true],
  ["Mode kualitas tinggi", false, false, true, true],
  ["Tanpa watermark", false, true, true, true],
  ["Kolaborasi & approval", false, false, false, true],
  ["Bank dokumen sekolah", false, false, false, true],
  ["Dashboard admin", false, false, false, true],
];

const FAQ: [string, string][] = [
  [
    "Apakah kredit bisa hangus?",
    "Tidak. Kredit yang kamu beli tidak memiliki masa kedaluwarsa dan bisa dipakai kapan saja untuk semua jenis dokumen.",
  ],
  [
    "Bagaimana cara pembayaran untuk guru tanpa kartu kredit?",
    "Kami mengutamakan QRIS — cukup scan dari GoPay, DANA, OVO, atau ShopeePay. Tersedia juga Virtual Account semua bank. Pro juga bisa dibayar per 30 hari via QRIS.",
  ],
  [
    "Apakah hasil dokumen sesuai regulasi terbaru?",
    "Ya. AjarKit mengikuti format Profil Pelajar Pancasila dan 6 dimensinya sesuai Permendikdasmen 13/2025.",
  ],
  [
    "Bisakah pindah paket kapan saja?",
    "Bisa. Upgrade atau downgrade kapan saja; sisa kredit tetap aman.",
  ],
];

function cell(c: Cell) {
  if (typeof c === "string") return c;
  return c ? YES : NO;
}

export default function HargaPage() {
  const [cycle, setCycle] = useState<"bln" | "thn">("bln");

  return (
    <>
      <SiteNav />

      <RevealScope>
        <section
          className="container"
          style={{ padding: "48px 16px 0", textAlign: "center" }}
        >
          <span className="eyebrow">Harga</span>
          <h1 className="t-display" style={{ margin: "10px 0 8px" }}>
            Harga yang ramah guru.
          </h1>
          <p
            className="t-body-lg muted"
            style={{ maxWidth: 540, margin: "0 auto 22px" }}
          >
            Mulai gratis. Bayar sesuai pakai dengan kredit, atau berlangganan
            Pro untuk kuota besar.
          </p>
          <div
            className="segmented price-toggle"
            style={{ marginBottom: 8 }}
            role="tablist"
          >
            <button
              type="button"
              role="tab"
              aria-selected={cycle === "bln"}
              className={cycle === "bln" ? "on" : ""}
              onClick={() => setCycle("bln")}
            >
              Bulanan
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={cycle === "thn"}
              className={cycle === "thn" ? "on" : ""}
              onClick={() => setCycle("thn")}
            >
              Tahunan<span className="save-tag">Hemat 20%</span>
            </button>
          </div>
        </section>

        <section className="container" style={{ padding: "24px 16px" }}>
          <div className="price-grid">
            <div className="card plan">
              <h3 className="t-h3">Gratis</h3>
              <div className="amt">Rp 0</div>
              <p className="t-small muted">Untuk mulai mencoba.</p>
              <ul>
                <li>
                  <Icon name="check" />5 dokumen / bulan
                </li>
                <li>
                  <Icon name="check" />
                  Mode hemat
                </li>
                <li>
                  <Icon name="check" />
                  Ekspor terbatas (watermark)
                </li>
              </ul>
              <Link className="btn btn-secondary block" href="/daftar">
                Mulai gratis
              </Link>
            </div>
            <div className="card plan">
              <h3 className="t-h3">Kredit / Top-up</h3>
              <div className="amt">mulai Rp 10rb</div>
              <p className="t-small muted">Bayar sesuai pakai.</p>
              <ul>
                <li>
                  <Icon name="check" />
                  Kredit tidak hangus
                </li>
                <li>
                  <Icon name="check" />
                  Semua format ekspor
                </li>
                <li>
                  <Icon name="check" />
                  Semua jenis dokumen
                </li>
              </ul>
              <Link className="btn btn-secondary block" href="/app/kredit">
                Beli kredit
              </Link>
            </div>
            <div className="card plan pop">
              <span
                className="badge badge-pop"
                style={{ position: "absolute", top: 16, right: 16 }}
              >
                Populer
              </span>
              <h3 className="t-h3">Pro</h3>
              <div className="amt">
                {cycle === "thn" ? "Rp 39rb" : "Rp 49rb"}
                <span className="t-small muted" style={{ fontWeight: 500 }}>
                  /bln
                </span>
              </div>
              <p className="t-small muted">Untuk guru aktif.</p>
              <ul>
                <li>
                  <Icon name="check" />
                  Kuota besar
                </li>
                <li>
                  <Icon name="check" />
                  Semua dokumen &amp; Kit Lengkap
                </li>
                <li>
                  <Icon name="check" />
                  Mode kualitas tinggi
                </li>
                <li>
                  <Icon name="check" />
                  Tanpa watermark
                </li>
              </ul>
              <Link className="btn btn-primary block" href="/daftar">
                Langganan Pro
              </Link>
            </div>
            <div className="card plan">
              <h3 className="t-h3">Sekolah / Kampus</h3>
              <div className="amt">
                mulai Rp 1,5jt
                <span className="t-small muted" style={{ fontWeight: 500 }}>
                  /bln
                </span>
              </div>
              <p className="t-small muted">Untuk institusi.</p>
              <ul>
                <li>
                  <Icon name="check" />
                  Multi-akun &amp; kursi
                </li>
                <li>
                  <Icon name="check" />
                  Kolaborasi &amp; approval
                </li>
                <li>
                  <Icon name="check" />
                  Bank dokumen
                </li>
                <li>
                  <Icon name="check" />
                  Dashboard admin
                </li>
              </ul>
              <Link className="btn btn-secondary block" href="/daftar">
                Ajukan demo
              </Link>
            </div>
          </div>

          <h2 className="t-h2" style={{ margin: "48px 0 4px" }}>
            Perbandingan fitur
          </h2>
          <div className="cmp-wrap" style={{ marginTop: 20 }}>
            <table className="table cmp cmp-harga">
              <thead>
                <tr>
                  <th>Fitur</th>
                  <th>Gratis</th>
                  <th>Kredit</th>
                  <th>Pro</th>
                  <th>Sekolah</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map(([feat, ...cells]) => (
                  <tr key={feat}>
                    <td className="strong" style={{ fontWeight: 600 }}>
                      {feat}
                    </td>
                    {cells.map((c, i) => (
                      <td key={i}>{cell(c)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="t-h2" style={{ margin: "48px 0 12px" }}>
            Pertanyaan umum
          </h2>
          <div className="card faq" style={{ overflow: "hidden" }}>
            {FAQ.map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <Icon name="chevDown" />
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>

          <div className="banner info" style={{ marginTop: 24 }}>
            <Icon name="lock" />
            <div>
              <strong className="strong">Pembayaran aman via Pakasir</strong>
              <p className="t-small muted">
                QRIS dan Virtual Account (CIMB, BNI, Permata, BRI, Maybank,
                dll.). Kredit diutamakan via QRIS.
              </p>
            </div>
          </div>
        </section>

        <SiteFooter />
      </RevealScope>
    </>
  );
}
