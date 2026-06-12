/* AjarKit — kontrak simulasi job generasi dokumen (mock).
   Wizard memanggil startJob() lalu navigate ke /app/generate/{jobId};
   layar Generating membaca job via readJob(jobId), mensimulasikan progres,
   lalu membuat Document di store + memotong kredit saat sukses. */

import type { DocContent, DocType, QualityMode } from "./types";
import { MODUL_AJAR_CONTENT, RPS_CONTENT } from "@/data/mock";

export interface JobParams {
  docType: DocType;
  title: string;
  subject: string;
  jenjang: string;
  qualityMode: QualityMode;
  cost: number;
  /** komponen Kit Lengkap, mis. ["Modul Ajar","LKPD"] */
  components?: string[];
  /** khusus modul_ajar: jumlah pertemuan yang diminta (1-16) */
  pertemuanCount?: number;
  /** khusus modul_ajar: sertakan lampiran LKPD di dalam dokumen */
  includeLkpd?: boolean;
}

const KEY = (id: string) => `ajarkit-job-${id}`;

export function startJob(params: JobParams): string {
  const id = `j${Date.now().toString(36)}`;
  sessionStorage.setItem(KEY(id), JSON.stringify(params));
  return id;
}

export function readJob(id: string): JobParams | null {
  try {
    const raw = sessionStorage.getItem(KEY(id));
    return raw ? (JSON.parse(raw) as JobParams) : null;
  } catch {
    return null;
  }
}

export function clearJob(id: string): void {
  sessionStorage.removeItem(KEY(id));
}

/** Langkah progres bernarasi per jenis dokumen (design.md §9.E) */
export function jobSteps(docType: DocType): string[] {
  if (docType === "rps") {
    return [
      "Menganalisis CPL & CPMK…",
      "Menyusun Sub-CPMK…",
      "Merancang 16 pertemuan…",
      "Menyusun rubrik & bobot penilaian…",
      "Merapikan format…",
    ];
  }
  return [
    "Menganalisis kurikulum & capaian pembelajaran",
    "Menyusun tujuan & pemetaan 6 dimensi",
    "Merancang kegiatan & pengalaman belajar",
    "Membuat asesmen & LKPD",
    "Merapikan format dokumen",
  ];
}

/** Konten mock untuk dokumen hasil generate */
export function buildMockContent(params: JobParams): DocContent {
  if (params.docType === "rps") return RPS_CONTENT;
  if (params.docType === "atp") {
    return {
      sections: [
        {
          id: "identitas",
          title: "Identitas",
          blocks: [
            `Mata pelajaran: ${params.subject} · ${params.jenjang}`,
            "Dibuat oleh AI — periksa & sesuaikan sebelum digunakan.",
          ],
        },
        {
          id: "skenario",
          title: "Skenario Pembelajaran",
          blocks: [
            "- Pendahuluan (10'): apersepsi & pertanyaan pemantik (guru), menjawab & berdiskusi (peserta didik).",
            "- Inti (60'): eksplorasi materi berkelompok, guru memfasilitasi & memberi umpan balik.",
            "- Penutup (10'): refleksi & penguatan, peserta didik menyimpulkan pembelajaran.",
          ],
        },
      ],
      atp: [
        { tp: `1.1 Memahami konsep dasar ${params.title}`, jp: "2 JP", dimensi: "Bernalar Kritis", indikator: "Menjelaskan konsep dengan benar." },
        { tp: `1.2 Menganalisis penerapan ${params.title} di kehidupan`, jp: "4 JP", dimensi: "Bernalar Kritis, Mandiri", indikator: "Menyajikan hasil analisis tertulis." },
        { tp: "1.3 Menyusun laporan pengamatan sederhana", jp: "4 JP", dimensi: "Bergotong Royong", indikator: "Laporan kelompok terdokumentasi." },
        { tp: "1.4 Mempresentasikan hasil kerja kelompok", jp: "2 JP", dimensi: "Kreatif", indikator: "Presentasi runtut dan komunikatif." },
        { tp: "1.5 Merefleksikan proses belajar", jp: "1 JP", dimensi: "Mandiri", indikator: "Menuliskan refleksi pribadi." },
        { tp: "1.6 Mengerjakan asesmen akhir lingkup materi", jp: "2 JP", dimensi: "Bernalar Kritis", indikator: "Skor asesmen ≥ KKTP." },
      ],
    };
  }
  if (params.docType === "modul_ajar") {
    // MODUL_AJAR_CONTENT statis belum punya rincian kegiatan — lengkapi
    // dengan pertemuan mock sebanyak pertemuanCount agar template RPP &
    // editor punya tabelnya (clone per pertemuan, objek selalu segar).
    const mockTahap = () => [
      {
        tahap: "Pendahuluan",
        siswa: [
          "Menjawab salam dan berdoa bersama.",
          "Menyimak tujuan pembelajaran yang disampaikan guru.",
        ],
        guru: [
          "Membuka pembelajaran dengan salam dan berdoa.",
          "Menyampaikan tujuan pembelajaran dan kesepakatan kelas.",
        ],
        waktu: "10'",
      },
      {
        tahap: "Inti",
        siswa: [
          "Mengamati media/fenomena terkait materi.",
          "Berdiskusi kelompok dan mencatat temuan.",
          "Mempresentasikan hasil diskusi kelompok.",
        ],
        guru: [
          "Menyajikan media dan pertanyaan pemantik.",
          "Memfasilitasi serta memantau diskusi kelompok.",
          "Memberi umpan balik atas presentasi.",
        ],
        waktu: "70'",
      },
      {
        tahap: "Penutup",
        siswa: [
          "Menyimpulkan hasil pembelajaran hari ini.",
          "Merefleksikan apa yang telah dipelajari.",
        ],
        guru: [
          "Membimbing penarikan kesimpulan.",
          "Menutup pembelajaran dengan refleksi dan doa.",
        ],
        waktu: "10'",
      },
    ];
    const n = Math.max(1, params.pertemuanCount ?? 1);
    // toggle "Sertakan LKPD" → section lampiran LKPD sebelum "pustaka"
    let sections = MODUL_AJAR_CONTENT.sections;
    if (params.includeLkpd) {
      const lampiranLkpd = {
        id: "lampiran-lkpd",
        title: "Lampiran: LKPD",
        blocks: [
          "Nama: .........",
          "Kelas: .........",
          "Kelompok: .........",
          `Tujuan LKPD: peserta didik memahami ${params.title} melalui aktivitas terbimbing.`,
          "Petunjuk pengerjaan: baca setiap langkah dengan cermat, kerjakan berurutan, lalu diskusikan hasilnya bersama kelompok.",
          "Aktivitas 1 — Pengamatan:",
          "- Amati objek/fenomena terkait materi di lingkungan sekitar.",
          "- Catat hasil pengamatan pada tabel yang tersedia.",
          "Aktivitas 2 — Diskusi kelompok:",
          "- Bandingkan hasil pengamatan dengan anggota kelompok.",
          "- Susun simpulan sementara bersama kelompok.",
          "Pertanyaan diskusi: apa pola yang kalian temukan, dan bagaimana kaitannya dengan konsep yang dipelajari?",
        ],
      };
      const idx = sections.findIndex((s) => s.id === "pustaka");
      sections =
        idx >= 0
          ? [...sections.slice(0, idx), lampiranLkpd, ...sections.slice(idx)]
          : [...sections, lampiranLkpd];
    }
    return {
      ...MODUL_AJAR_CONTENT,
      sections,
      kegiatan: Array.from({ length: n }, (_, i) => ({
        pertemuan: `Pertemuan ke-${i + 1}: ${params.title}`,
        alokasi: "2 JP @45 menit",
        tahap: mockTahap(),
      })),
    };
  }
  return {
    sections: [
      {
        id: "ringkasan",
        title: "Ringkasan",
        blocks: [
          `${params.subject} · ${params.jenjang} · mode ${params.qualityMode}.`,
          "Dibuat oleh AI — periksa & sesuaikan sebelum digunakan.",
        ],
      },
      {
        id: "isi",
        title: "Isi Dokumen",
        blocks: [
          `Bagian inti ${params.title} disusun otomatis dari detail yang kamu isi.`,
          "Gunakan panel Asisten AI di editor untuk menyusun ulang bagian tertentu.",
        ],
      },
    ],
  };
}
