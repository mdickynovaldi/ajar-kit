"use client";

/* AjarKit — Bantuan/FAQ (design.md §9.A.5: search FAQ, kategori, akordeon, kontak). */

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/controls";
import { SiteNav, SiteFooter } from "@/components/public/site-chrome";
import { RevealScope } from "@/components/motion";

const KATEGORI = [
  "Akun",
  "Membuat dokumen",
  "Kredit & Pembayaran",
  "Kolaborasi",
  "Kurikulum",
] as const;
type Kategori = (typeof KATEGORI)[number];

const FAQS: { q: string; a: string; cat: Kategori }[] = [
  {
    q: "Bagaimana cara membuat akun AjarKit?",
    a: "Klik \"Coba Gratis\", daftar dengan email atau akun Google, lalu pilih peranmu (guru atau dosen). Setelah verifikasi email, kamu langsung bisa membuat dokumen pertama.",
    cat: "Akun",
  },
  {
    q: "Saya lupa kata sandi, apa yang harus dilakukan?",
    a: "Buka halaman Masuk lalu klik \"Lupa sandi?\". Kami akan mengirim tautan reset ke emailmu. Tautan berlaku 30 menit.",
    cat: "Akun",
  },
  {
    q: "Bisakah mengganti peran dari guru ke dosen?",
    a: "Bisa. Buka Pengaturan → Profil lalu ubah peran. Jenis dokumen yang tersedia akan menyesuaikan otomatis (mis. RPS untuk dosen).",
    cat: "Akun",
  },
  {
    q: "Bagaimana cara membuat Modul Ajar pertama saya?",
    a: "Dari Beranda, pilih \"Buat Dokumen\" → \"Modul Ajar\". Isi jenjang, mapel, dan materi — sebagian sudah terisi dari profilmu — lalu klik \"Buat dengan AI\". Dokumen jadi sekitar 1 menit.",
    cat: "Membuat dokumen",
  },
  {
    q: "Apa itu Kit Lengkap?",
    a: "Kit Lengkap membuat beberapa dokumen sekaligus dari satu isian: Modul Ajar, LKPD, Asesmen, dan Bank Soal yang saling konsisten. Lebih hemat kredit dibanding membuat satu per satu.",
    cat: "Membuat dokumen",
  },
  {
    q: "Bisakah hasil dokumen diedit setelah dibuat?",
    a: "Tentu. Semua hasil AI terbuka di editor — kamu bisa mengubah teks per bagian, menambah konten, lalu mengunduh DOCX/PDF. Ingat: dokumen dibuat oleh AI, periksa & sesuaikan sebelum digunakan.",
    cat: "Membuat dokumen",
  },
  {
    q: "Apakah kredit bisa hangus?",
    a: "Tidak. Kredit yang kamu beli tidak memiliki masa kedaluwarsa dan bisa dipakai kapan saja untuk semua jenis dokumen.",
    cat: "Kredit & Pembayaran",
  },
  {
    q: "Metode pembayaran apa saja yang didukung?",
    a: "Pembayaran aman via Pakasir: QRIS (GoPay, DANA, OVO, ShopeePay) dan Virtual Account (CIMB, BNI, Permata, BRI, Maybank, dll.). Kredit diutamakan via QRIS.",
    cat: "Kredit & Pembayaran",
  },
  {
    q: "Kenapa kredit saya tidak terpotong saat generate gagal?",
    a: "Memang begitu desainnya — kredit hanya dipotong saat dokumen berhasil dibuat. Jika proses gagal, saldo kreditmu tetap utuh dan kamu bisa mencoba lagi.",
    cat: "Kredit & Pembayaran",
  },
  {
    q: "Bagaimana cara mengundang rekan guru ke Ruang Sekolah?",
    a: "Buka Ruang → Anggota lalu klik \"Undang\". Masukkan email rekanmu dan pilih peran (anggota/reviewer/admin). Fitur ini tersedia di paket Sekolah/Kampus.",
    cat: "Kolaborasi",
  },
  {
    q: "Bagaimana alur review & approval dokumen di sekolah?",
    a: "Ajukan dokumen dari editor → reviewer menerima notifikasi → reviewer menyetujui atau meminta revisi → dokumen yang disetujui masuk ke bank dokumen sekolah.",
    cat: "Kolaborasi",
  },
  {
    q: "Apakah hasil AjarKit sesuai Permendikdasmen 13/2025?",
    a: "Ya. Output mengikuti format Profil Pelajar Pancasila, 4 tahap penyusunan, dan 6 dimensinya. Untuk dosen, RPS disusun runtut berbasis OBE dari CPL sampai rencana 16 pertemuan.",
    cat: "Kurikulum",
  },
];

export default function BantuanPage() {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<Kategori | null>(null);

  const q = query.trim().toLowerCase();
  const filtered = FAQS.filter(
    (f) =>
      (!cat || f.cat === cat) &&
      (!q || f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)),
  );

  return (
    <>
      <SiteNav />

      <RevealScope>
        <section className="container help-hero">
          <span className="eyebrow">Bantuan</span>
          <h1 className="t-display" style={{ margin: "10px 0 8px" }}>
            Ada yang bisa kami bantu?
          </h1>
          <p
            className="t-body-lg muted"
            style={{ maxWidth: 540, margin: "0 auto" }}
          >
            Cari jawaban cepat, atau hubungi tim kami lewat WhatsApp dan email.
          </p>
          <div className="help-search input-icon">
            <Icon name="search" />
            <input
              className="input"
              type="search"
              placeholder="Cari pertanyaan… mis. kredit, RPS, watermark"
              aria-label="Cari pertanyaan"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="help-cats">
            <button
              type="button"
              className={`chip${cat === null ? " on" : ""}`}
              aria-pressed={cat === null}
              onClick={() => setCat(null)}
            >
              Semua
            </button>
            {KATEGORI.map((k) => (
              <button
                key={k}
                type="button"
                className={`chip${cat === k ? " on" : ""}`}
                aria-pressed={cat === k}
                onClick={() => setCat(cat === k ? null : k)}
              >
                {k}
              </button>
            ))}
          </div>
        </section>

        <section className="container" style={{ padding: "24px 16px 8px" }}>
          {filtered.length > 0 ? (
            <div className="card faq" style={{ overflow: "hidden" }}>
              {filtered.map((f) => (
                <details key={f.q}>
                  <summary>
                    {f.q}
                    <Icon name="chevDown" />
                  </summary>
                  <p>
                    <span
                      className="phase-tag"
                      style={{ marginBottom: 8, marginRight: 8 }}
                    >
                      {f.cat}
                    </span>
                    <br />
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          ) : (
            <div className="card">
              <EmptyState
                icon="search"
                title="Tidak ditemukan."
                desc="Coba kata kunci lain."
              >
                <button
                  type="button"
                  className="btn btn-secondary sm"
                  onClick={() => {
                    setQuery("");
                    setCat(null);
                  }}
                >
                  <Icon name="refresh" />
                  Reset pencarian
                </button>
              </EmptyState>
            </div>
          )}

          {/* Kontak */}
          <div className="help-contact">
            <div className="card pad-lg">
              <span className="doc-ic ic-green">
                <Icon name="wifi" />
              </span>
              <h3 className="t-h3" style={{ marginTop: 12 }}>
                Chat WhatsApp
              </h3>
              <p className="muted t-small" style={{ marginTop: 6 }}>
                Balasan cepat di jam kerja (Senin–Jumat, 09.00–17.00 WIB).
              </p>
              <button
                type="button"
                className="btn btn-primary"
                style={{ marginTop: 14 }}
                onClick={() => toast("Membuka WhatsApp…")}
              >
                <Icon name="share" />
                Hubungi via WhatsApp
              </button>
            </div>
            <div className="card pad-lg">
              <span className="doc-ic ic-blue">
                <Icon name="mail" />
              </span>
              <h3 className="t-h3" style={{ marginTop: 12 }}>
                Email support
              </h3>
              <p className="muted t-small" style={{ marginTop: 6 }}>
                Kirim pertanyaanmu ke halo@ajarkit.id — kami balas maksimal 1
                hari kerja.
              </p>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginTop: 14 }}
                onClick={() => toast("Membuka email…")}
              >
                <Icon name="mail" />
                Kirim email
              </button>
            </div>
          </div>
        </section>

        <SiteFooter />
      </RevealScope>
    </>
  );
}
