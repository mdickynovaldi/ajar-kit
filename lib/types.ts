/* AjarKit — tipe data bersama (mock-first, lihat prd.md §14 & design.md §14) */

export type Role = "guru" | "dosen";
export type Plan = "free" | "pro" | "school";

export type DocType =
  | "atp"
  | "modul_ajar"
  | "lkpd"
  | "asesmen"
  | "bank_soal"
  | "prota_promes"
  | "rps";

export type DocStatus =
  | "draft"
  | "selesai"
  | "menunggu_review"
  | "disetujui"
  | "revisi";

export type QualityMode = "hemat" | "standar" | "tinggi";

export interface User {
  id: string;
  nama: string;
  email: string;
  role: Role;
  /** inisial avatar, mis. "BS" */
  initials: string;
  jenjang?: string;
  kelas?: string;
  mapel?: string[];
  sekolah?: string;
  pt?: string;
  prodi?: string;
  mataKuliah?: string[];
  plan: Plan;
  /* ----- profil instansi (kop & ttd dokumen — migration 0005) ----- */
  /** baris atas kop, mis. "PEMERINTAH PROVINSI JAWA TIMUR\nDINAS PENDIDIKAN" */
  instansiInduk?: string;
  namaInstansi?: string;
  alamatInstansi?: string;
  /** mis. "Website: … · Email: …" */
  kontakInstansi?: string;
  /** logo instansi sebagai data-URL base64 */
  logoInstansi?: string;
  /** kota utk blok ttd ("Malang, {tanggal}") */
  kota?: string;
  /** NIP/NIDN penyusun */
  nip?: string;
  pimpinanJabatan?: string;
  pimpinanNama?: string;
  pimpinanNip?: string;
}

export interface DocSection {
  id: string;
  title: string;
  /** paragraf / butir teks yang bisa diedit */
  blocks: string[];
}

/** baris tabel ATP/SAP (jenis dokumen "atp", khusus guru) */
export interface AtpRow {
  /** butir tujuan pembelajaran, mis. "3.1 Menganalisis …" */
  tp: string;
  jp: string;
  /** Dimensi Profil Pelajar Pancasila yang ditonjolkan */
  dimensi: string;
  indikator: string;
}

/** satu tahap kegiatan pembelajaran (Pendahuluan/Inti/Penutup) — khusus modul_ajar/RPP guru */
export interface KegiatanTahap {
  tahap: string;
  /** butir kegiatan peserta didik (paralel dengan `guru`) */
  siswa: string[];
  /** butir kegiatan/bantuan guru (paralel dengan `siswa`) */
  guru: string[];
  /** alokasi menit, mis. "10'" */
  waktu: string;
}

/** rincian kegiatan satu pertemuan — khusus modul_ajar/RPP guru */
export interface KegiatanPertemuan {
  /** mis. "Pertemuan ke-1: Menganalisis struktur organ" */
  pertemuan: string;
  /** mis. "2 JP @45 menit" */
  alokasi: string;
  tahap: KegiatanTahap[];
}

export interface RpsPertemuan {
  minggu: number;
  subCpmk: string;
  materi: string;
  metode: string;
  indikator: string;
  bobot: string;
  /* ----- kolom matriks RPS resmi universitas (format UM) — opsional ----- */
  /** kode CPMK induk, mis. "CPMK1" */
  kodeCpmk?: string;
  /** butir kriteria & indikator penilaian (dirender sebagai •) */
  kriteria?: string[];
  /** pengalaman belajar offline, mis. "Kuliah: Diskusi …" */
  offline?: string;
  /** pengalaman belajar sinkronus */
  sinkron?: string;
  /** pengalaman belajar asinkronus, mis. "Tugas Mandiri: …" */
  asinkron?: string;
  /** media belajar, mis. "LMS/SIPEJAR" */
  media?: string;
  /** nomor sumber rujukan, mis. "1-3" */
  sumber?: string;
}

export interface DocContent {
  sections: DocSection[];
  /** khusus RPS / Prota-Promes: baris tabel */
  pertemuan?: RpsPertemuan[];
  /** khusus ATP/SAP: tabel alur tujuan pembelajaran */
  atp?: AtpRow[];
  /** khusus modul_ajar/RPP guru: rincian kegiatan per pertemuan */
  kegiatan?: KegiatanPertemuan[];
}

export interface Document {
  id: string;
  title: string;
  type: DocType;
  status: DocStatus;
  subject: string;
  jenjang: string;
  /** label waktu relatif utk tampilan, mis. "2 jam lalu" */
  updatedLabel: string;
  updatedAt: string; // ISO, untuk sort
  ownerId: string;
  ownerName: string;
  workspaceId?: string;
  qualityMode: QualityMode;
  content: DocContent | null;
}

export interface Transaction {
  id: string;
  type: "topup" | "subscription";
  label: string;
  method: "qris" | "va" | "ewallet" | "card";
  amount: number;
  status: "lunas" | "pending" | "gagal";
  date: string; // tampilan, mis. "10 Jun 2026"
}

export interface AppNotification {
  id: string;
  type: "dokumen" | "review" | "kredit" | "langganan" | "info";
  title: string;
  body: string;
  timeLabel: string;
  read: boolean;
}

export interface Member {
  id: string;
  /** uuid profil (mode Supabase; utk notifikasi antar anggota) */
  userId?: string;
  nama: string;
  initials: string;
  email: string;
  role: "admin" | "anggota";
  mapel: string;
  status: "aktif" | "diundang" | "nonaktif";
  dokumen: number;
  /** pemakaian kredit, mis. "180 kredit" (desain app-ruang-anggota) */
  pemakaian: string;
}

export interface ReviewItem {
  id: string;
  documentId: string;
  /** uuid pemilik dokumen (mode Supabase; utk notifikasi keputusan) */
  ownerId?: string;
  title: string;
  docType: DocType;
  pembuat: string;
  initials: string;
  tanggal: string;
  status: "menunggu" | "disetujui" | "revisi";
  catatan?: string;
}

export interface Workspace {
  id: string;
  nama: string;
  plan: string;
  seats: number;
  seatsUsed: number;
  members: Member[];
  reviews: ReviewItem[];
}

/** Ringkasan ruang milik user aktif (store.workspace, dual-mode) */
export interface WorkspaceSummary {
  id: string;
  nama: string;
  plan: string;
  seats: number;
  approvalRequired: boolean;
  myRole: "admin" | "anggota";
  myStatus: "aktif" | "diundang";
}

export interface CreditPackage {
  id: string;
  credits: string;
  creditsNum: number;
  price: number;
  priceLabel: string;
  save?: string;
  popular?: boolean;
}
