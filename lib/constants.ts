/* AjarKit — konstanta produk (microcopy mengikuti design.md / prd.md) */

import type { DocStatus, DocType, QualityMode, CreditPackage } from "./types";
import type { IconName } from "@/components/ui/icon";

export const APP_NAME = "AjarKit";

/** Profil Pelajar Pancasila (6 dimensi) */
export const DIMENSI_PROFIL = [
  "Beriman, Bertakwa kepada Tuhan YME, dan Berakhlak Mulia",
  "Berkebinekaan Global",
  "Bergotong Royong",
  "Mandiri",
  "Bernalar Kritis",
  "Kreatif",
] as const;

export interface DocTypeMeta {
  type: DocType;
  label: string;
  shortLabel: string;
  desc: string;
  icon: IconName;
  color: "ic-blue" | "ic-teal" | "ic-green" | "ic-amber" | "ic-purple";
  /** biaya kredit mode standar */
  cost: number;
  href: string;
  audience: "guru" | "dosen";
}

export const DOC_TYPES: Record<DocType, DocTypeMeta> = {
  atp: {
    type: "atp",
    label: "ATP / SAP",
    shortLabel: "ATP / SAP",
    desc: "Alur tujuan + skenario",
    icon: "target",
    color: "ic-teal",
    cost: 40,
    href: "/app/buat/atp",
    audience: "guru",
  },
  modul_ajar: {
    type: "modul_ajar",
    label: "Modul Ajar / RPP",
    shortLabel: "Modul Ajar",
    desc: "Profil Pelajar Pancasila",
    icon: "book",
    color: "ic-blue",
    cost: 50,
    href: "/app/buat/modul-ajar",
    audience: "guru",
  },
  lkpd: {
    type: "lkpd",
    label: "LKPD",
    shortLabel: "LKPD",
    desc: "Lembar kerja peserta didik",
    icon: "clipboard",
    color: "ic-teal",
    cost: 30,
    href: "/app/buat/lkpd",
    audience: "guru",
  },
  asesmen: {
    type: "asesmen",
    label: "Asesmen",
    shortLabel: "Asesmen",
    desc: "Formatif / Sumatif",
    icon: "check",
    color: "ic-green",
    cost: 35,
    href: "/app/buat/asesmen",
    audience: "guru",
  },
  bank_soal: {
    type: "bank_soal",
    label: "Bank Soal",
    shortLabel: "Bank Soal",
    desc: "Termasuk HOTS",
    icon: "list",
    color: "ic-amber",
    cost: 40,
    href: "/app/buat/bank-soal",
    audience: "guru",
  },
  prota_promes: {
    type: "prota_promes",
    label: "Prota & Promes",
    shortLabel: "Prota & Promes",
    desc: "Program tahunan/semester",
    icon: "calendar",
    color: "ic-purple",
    cost: 45,
    href: "/app/buat/prota-promes",
    audience: "guru",
  },
  rps: {
    type: "rps",
    label: "RPS (OBE)",
    shortLabel: "RPS",
    desc: "CPL → 16 pertemuan",
    icon: "layers",
    color: "ic-blue",
    cost: 80,
    href: "/app/buat/rps",
    audience: "dosen",
  },
};

export const KIT_LENGKAP = {
  label: "Kit Lengkap",
  desc: "Modul + LKPD + Asesmen + Bank Soal sekali isi.",
  cost: 120,
  href: "/app/buat/kit-lengkap",
};

export const STATUS_META: Record<
  DocStatus,
  { label: string; badge: string }
> = {
  draft: { label: "Draft", badge: "badge-draft" },
  selesai: { label: "Selesai", badge: "badge-selesai" },
  menunggu_review: { label: "Menunggu Review", badge: "badge-review" },
  disetujui: { label: "Disetujui", badge: "badge-disetujui" },
  revisi: { label: "Perlu Revisi", badge: "badge-revisi" },
};

export const QUALITY_MODES: Record<
  QualityMode,
  { label: string; help: string; multiplier: number }
> = {
  hemat: {
    label: "Hemat",
    help: "Hemat — cepat, untuk draft awal.",
    multiplier: 0.6,
  },
  standar: {
    label: "Standar",
    help: "Standar — seimbang antara kecepatan & kedalaman.",
    multiplier: 1,
  },
  tinggi: {
    label: "Kualitas Tinggi",
    help: "Kualitas Tinggi — paling mendalam, butuh sedikit lebih lama.",
    multiplier: 1.6,
  },
};

export function modeCost(base: number, mode: QualityMode): number {
  return Math.round(base * QUALITY_MODES[mode].multiplier / 5) * 5;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: "p100", credits: "100 kredit", creditsNum: 100, price: 15000, priceLabel: "Rp 15.000" },
  { id: "p300", credits: "300 kredit", creditsNum: 300, price: 39000, priceLabel: "Rp 39.000", save: "Hemat 13%", popular: true },
  { id: "p750", credits: "750 kredit", creditsNum: 750, price: 89000, priceLabel: "Rp 89.000", save: "Hemat 21%" },
  { id: "custom", credits: "Custom", creditsNum: 0, price: 0, priceLabel: "Tentukan sendiri" },
];

export const PAYMENT_METHODS = [
  { id: "qris", icon: "qris" as IconName, label: "QRIS", desc: "GoPay, DANA, OVO, ShopeePay — disarankan", rec: true },
  { id: "va", icon: "bank" as IconName, label: "Virtual Account", desc: "CIMB, BNI, Permata, BRI, Maybank, dll." },
] as const;

export const JENJANG_OPTIONS = [
  "SMP — Kelas 7",
  "SMP — Kelas 8",
  "SMP — Kelas 9",
  "SMA — Kelas 10",
  "SMA — Kelas 11",
  "SMA — Kelas 12",
];

/** Mata pelajaran jenjang SMP (Kurikulum Merdeka) */
export const MAPEL_SMP = [
  "Matematika",
  "Ilmu Pengetahuan Alam (IPA)",
  "Ilmu Pengetahuan Sosial (IPS)",
  "Bahasa Indonesia",
  "Bahasa Inggris",
  "Pendidikan Pancasila dan Kewarganegaraan (PPKn)",
];

/** Mata pelajaran jenjang SMA (Kurikulum Merdeka) */
export const MAPEL_SMA = [
  "Pendidikan Agama dan Budi Pekerti",
  "Pendidikan Pancasila dan Kewarganegaraan (PPKn)",
  "Bahasa Indonesia",
  "Matematika",
  "Bahasa Inggris",
  "IPA (Fisika, Kimia, Biologi — terintegrasi kelas 10)",
  "Fisika",
  "Kimia",
  "Biologi",
  "IPS (Sosiologi, Ekonomi, Sejarah, Geografi — terintegrasi kelas 10)",
  "Sosiologi",
  "Ekonomi",
  "Sejarah",
  "Geografi",
  "Seni Budaya",
  "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)",
  "Informatika",
];

/** Daftar mapel sesuai jenjang terpilih — semua form harus memakai ini. */
export function mapelForJenjang(jenjang?: string): string[] {
  return jenjang?.includes("SMP") ? MAPEL_SMP : MAPEL_SMA;
}

/** @deprecated kompatibilitas — pakai mapelForJenjang(jenjang) di form */
export const MAPEL_OPTIONS = MAPEL_SMA;

export const MODEL_PEMBELAJARAN = [
  "Project-Based Learning (PjBL)",
  "Problem-Based Learning (PBL)",
  "Inquiry Learning",
  "Discovery Learning",
  "Cooperative Learning",
];

/** Kuota dokumen/bulan paket gratis */
export const FREE_QUOTA = 5;
export const FREE_QUOTA_USED = 3;
