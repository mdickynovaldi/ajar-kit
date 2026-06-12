/* AjarKit — data mock (prd.md §14 / design.md §15). Semua data di file ini MOCK. */

import type {
  AppNotification,
  DocContent,
  Document,
  Transaction,
  User,
  Workspace,
} from "@/lib/types";

export const MOCK_USERS: Record<"guru" | "dosen", User> = {
  guru: {
    id: "u-guru-1",
    nama: "Budi Santoso",
    email: "budi.santoso@guru.sd.id",
    role: "guru",
    initials: "BS",
    jenjang: "SD",
    kelas: "Kelas 5 (Fase C)",
    mapel: ["IPAS", "Matematika"],
    sekolah: "SDN Merdeka 01",
    plan: "free",
  },
  dosen: {
    id: "u-dosen-1",
    nama: "Dr. Dewi Anggraini",
    email: "dewi.anggraini@kampus.ac.id",
    role: "dosen",
    initials: "DA",
    pt: "Universitas Nusantara",
    prodi: "Teknik Informatika",
    mataKuliah: ["Algoritma & Pemrograman", "Basis Data"],
    plan: "free",
  },
};

export const INITIAL_CREDITS = 320;

export const MODUL_AJAR_CONTENT: DocContent = {
  sections: [
    {
      id: "identitas",
      title: "Identitas",
      blocks: [
        "Mata pelajaran: IPAS · Jenjang: SD — Kelas 5 (Fase C) · Semester: Genap",
        "Materi: Ekosistem & Rantai Makanan · Alokasi waktu: 4 JP × 2 pertemuan",
      ],
    },
    {
      id: "dimensi",
      title: "Dimensi Profil Lulusan",
      blocks: [
        "- Penalaran kritis — menganalisis hubungan antar komponen ekosistem.",
        "- Kolaborasi — bekerja dalam kelompok menyusun jaring-jaring makanan.",
        "- Kreativitas — merancang poster rantai makanan dari lingkungan sekitar.",
      ],
    },
    {
      id: "identifikasi",
      title: "Identifikasi",
      blocks: [
        "Kesiapan peserta didik: sebagian besar sudah mengenal konsep makhluk hidup dan lingkungannya dari Fase B; beberapa masih perlu penguatan kosakata ilmiah.",
        "Karakteristik materi: kontekstual dan dekat dengan keseharian; cocok untuk pengamatan langsung di lingkungan sekolah.",
      ],
    },
    {
      id: "desain",
      title: "Desain Pembelajaran",
      blocks: [
        "Capaian: peserta didik menganalisis hubungan antar komponen ekosistem serta peran produsen, konsumen, dan pengurai.",
        "- Tujuan 1: menjelaskan komponen biotik dan abiotik dalam ekosistem melalui pengamatan.",
        "- Tujuan 2: menyusun rantai makanan sederhana dari ekosistem di sekitar sekolah.",
        "Topik kontekstual: ekosistem kebun sekolah dan sawah di sekitar tempat tinggal.",
      ],
    },
    {
      id: "pengalaman",
      title: "Pengalaman Belajar",
      blocks: [
        "Prinsip: berkesadaran, bermakna, menggembirakan.",
        "- Kegiatan awal: tanya jawab tentang hewan dan tumbuhan yang ditemui peserta didik saat berangkat sekolah.",
        "- Kegiatan inti: pengamatan ekosistem kebun sekolah, diskusi kelompok menyusun jaring-jaring makanan, presentasi hasil.",
        "- Kegiatan penutup: refleksi 3-2-1 (3 hal baru, 2 hal menarik, 1 pertanyaan).",
      ],
    },
    {
      id: "asesmen",
      title: "Asesmen",
      blocks: [
        "Awal: pertanyaan pemantik lisan untuk memetakan pemahaman awal.",
        "Proses: observasi keterlibatan diskusi dengan lembar ceklis.",
        "Akhir: tes tertulis singkat (5 soal) + rubrik penilaian poster rantai makanan.",
      ],
    },
  ],
};

export const RPS_CONTENT: DocContent = {
  sections: [
    {
      id: "identitas-mk",
      title: "Identitas Mata Kuliah",
      blocks: [
        "Mata Kuliah: Algoritma & Pemrograman",
        "Kode: IF-1201",
        "Rumpun MK: Informatika Inti",
        "Bobot (sks): 3 sks (2T, 1P)",
        "Semester: 2",
        "Tgl Penyusunan: 5 Januari 2026",
        "Dosen Pengampu: Dr. Dewi Anggraini, M.Kom",
        "Matakuliah Prasyarat: -",
      ],
    },
    {
      id: "pengesahan",
      title: "Pengesahan",
      blocks: [
        "Ketua KBK: .........",
        "Kaprodi: .........",
        "Ketua GKM: .........",
      ],
    },
    {
      id: "cpl",
      title: "Standar CPL yang Dibebankan pada Mata Kuliah",
      blocks: [
        "SCPL2: Mampu menerapkan pemikiran logis, kritis, dan sistematis dalam pengembangan perangkat lunak.",
        "SCPL5: Mampu merancang solusi komputasi untuk masalah nyata secara bertanggung jawab.",
      ],
    },
    {
      id: "cpmk",
      title: "Capaian Pembelajaran Mata Kuliah (CPMK)",
      blocks: [
        "CPMK1: Mahasiswa mampu menyusun algoritma terstruktur untuk masalah komputasi dasar.",
        "CPMK2: Mahasiswa mampu mengimplementasikan struktur data dasar dalam program.",
        "CPMK3: Mahasiswa mampu menganalisis efisiensi algoritma sederhana.",
      ],
    },
    {
      id: "subcpmk",
      title: "Kemampuan Akhir Tiap Tahapan Belajar (Sub-CPMK)",
      blocks: [
        "1.1: Mampu menyusun flowchart dan pseudocode masalah sederhana.",
        "1.2: Mampu menerapkan struktur kontrol percabangan dan perulangan.",
        "1.3: Mampu memecah masalah menjadi fungsi dan prosedur.",
        "2.1: Mampu mengolah data dengan array dan string.",
        "2.2: Mampu menerapkan struct/record pada kasus nyata.",
        "3.1: Mampu menerapkan algoritma pencarian dan pengurutan.",
        "3.2: Mampu membandingkan kompleksitas algoritma dasar.",
      ],
    },
    {
      id: "deskripsi",
      title: "Deskripsi Isi MK",
      blocks: [
        "Mata kuliah ini membekali mahasiswa kemampuan berpikir komputasional melalui penyusunan algoritma terstruktur, implementasi struktur data dasar, serta analisis efisiensi algoritma; pengalaman belajar mencakup kuliah, praktikum terbimbing, dan proyek mini studi kasus.",
      ],
    },
    {
      id: "pustaka",
      title: "Sumber Rujukan",
      blocks: [
        "- Cormen, T. H., Leiserson, C. E., Rivest, R. L., & Stein, C. (2022). Introduction to Algorithms (4th ed.). MIT Press.",
        "- Munir, R. (2016). Algoritma dan Pemrograman dalam Bahasa Pascal, C, dan C++ (Edisi 6). Informatika.",
        "- Sedgewick, R., & Wayne, K. (2011). Algorithms (4th ed.). Addison-Wesley.",
        "- Kadir, A. (2019). Logika Pemrograman Menggunakan C++. Elex Media Komputindo.",
      ],
    },
  ],
  pertemuan: Array.from({ length: 16 }, (_, i) => {
    const ujian = i === 7 || i === 15;
    return {
      minggu: i + 1,
      kodeCpmk: i < 7 ? "CPMK1" : i < 12 ? "CPMK2" : "CPMK3",
      subCpmk: ujian
        ? "-"
        : i < 7
          ? `1.${Math.floor(i / 3) + 1}`
          : i < 12
            ? `2.${(i % 2) + 1}`
            : `3.${(i % 2) + 1}`,
      materi: [
        "Pengantar algoritma & flowchart",
        "Tipe data, variabel, ekspresi",
        "Struktur kontrol: percabangan",
        "Struktur kontrol: perulangan",
        "Fungsi & prosedur",
        "Rekursi dasar",
        "Array satu dimensi",
        "UTS",
        "Array multidimensi",
        "String & pemrosesan teks",
        "Struct / record",
        "Pencarian (searching)",
        "Pengurutan (sorting)",
        "Kompleksitas algoritma dasar",
        "Proyek mini: studi kasus",
        "UAS",
      ][i],
      metode: ujian ? "Ujian tertulis" : "Ceramah interaktif + praktikum",
      indikator: ujian ? "Skor ujian" : "Ketepatan logika & hasil praktikum",
      bobot: i === 7 ? "19%" : i === 15 ? "25%" : "4%",
      kriteria: ujian
        ? [
            "Ketepatan jawaban soal ujian",
            "Mampu menyelesaikan soal sesuai prosedur",
          ]
        : [
            "Ketepatan logika penyelesaian masalah",
            "Kelengkapan hasil praktikum",
            "Mampu mengimplementasikan konsep dalam program",
          ],
      offline: ujian
        ? `${i === 7 ? "UTS" : "UAS"}: ujian tertulis di kelas`
        : "Kuliah: Diskusi konsep dan praktikum terbimbing",
      sinkron: "-",
      asinkron: ujian
        ? "-"
        : "Tugas Mandiri: latihan soal melalui LMS; Tugas Terstruktur: laporan praktikum",
      media: "LMS/SIPEJAR",
      sumber: "1-2",
    };
  }),
};

export const MOCK_DOCUMENTS: Document[] = [
  {
    id: "doc-1",
    title: "Modul Ajar IPAS — Ekosistem & Rantai Makanan",
    type: "modul_ajar",
    status: "selesai",
    subject: "IPAS",
    jenjang: "Kelas 5",
    updatedLabel: "2 jam lalu",
    updatedAt: "2026-06-10T08:00:00+07:00",
    ownerId: "u-guru-1",
    ownerName: "Budi Santoso",
    workspaceId: "ws-1",
    qualityMode: "standar",
    content: MODUL_AJAR_CONTENT,
  },
  {
    id: "doc-2",
    title: "Bank Soal Matematika Bab 3",
    type: "bank_soal",
    status: "draft",
    subject: "Matematika",
    jenjang: "Kelas 8",
    updatedLabel: "Kemarin",
    updatedAt: "2026-06-09T14:00:00+07:00",
    ownerId: "u-guru-1",
    ownerName: "Budi Santoso",
    qualityMode: "hemat",
    content: {
      sections: [
        {
          id: "soal",
          title: "Soal Pilihan Ganda",
          blocks: [
            "1. (HOTS) Sebuah toko memberi diskon 20% lalu pajak 10%. Jika harga awal Rp 250.000, berapa harga akhirnya?",
            "2. Bentuk sederhana dari 3x + 2(x − 4) adalah …",
            "3. (HOTS) Pola bilangan 2, 6, 12, 20, … Suku ke-10 adalah …",
          ],
        },
        {
          id: "kunci",
          title: "Kunci & Pembahasan",
          blocks: ["1. Rp 220.000 — diskon dulu (200.000), lalu pajak 10%.", "2. 5x − 8.", "3. 110 — pola n(n+1)."],
        },
      ],
    },
  },
  {
    id: "doc-3",
    title: "Asesmen Sumatif Bahasa Indonesia",
    type: "asesmen",
    status: "menunggu_review",
    subject: "B. Indonesia",
    jenjang: "Kelas 7",
    updatedLabel: "2 hari lalu",
    updatedAt: "2026-06-08T10:00:00+07:00",
    ownerId: "u-guru-1",
    ownerName: "Budi Santoso",
    workspaceId: "ws-1",
    qualityMode: "standar",
    content: {
      sections: [
        {
          id: "kisi",
          title: "Kisi-kisi",
          blocks: [
            "Materi: teks deskripsi · Bentuk: pilihan ganda (10) + uraian (3).",
            "Indikator: menentukan ide pokok, menganalisis struktur teks, menulis paragraf deskriptif.",
          ],
        },
        {
          id: "rubrik",
          title: "Rubrik Uraian",
          blocks: ["Skor 4: struktur lengkap, diksi tepat. Skor 2: struktur sebagian. Skor 1: belum sesuai."],
        },
      ],
    },
  },
  {
    id: "doc-4",
    title: "LKPD Sistem Pencernaan",
    type: "lkpd",
    status: "disetujui",
    subject: "IPA",
    jenjang: "Kelas 8",
    updatedLabel: "3 hari lalu",
    updatedAt: "2026-06-07T09:00:00+07:00",
    ownerId: "u-guru-1",
    ownerName: "Budi Santoso",
    workspaceId: "ws-1",
    qualityMode: "standar",
    content: {
      sections: [
        {
          id: "aktivitas",
          title: "Aktivitas 1 — Mengurutkan Organ",
          blocks: [
            "Petunjuk: urutkan kartu organ pencernaan sesuai jalur makanan, lalu tempel pada kolom yang tersedia.",
            "Pertanyaan: apa yang terjadi jika usus halus tidak menyerap nutrisi dengan baik?",
          ],
        },
      ],
    },
  },
  {
    id: "doc-5",
    title: "Prota & Promes IPAS 2026/2027",
    type: "prota_promes",
    status: "selesai",
    subject: "IPAS",
    jenjang: "Kelas 5",
    updatedLabel: "5 hari lalu",
    updatedAt: "2026-06-05T09:00:00+07:00",
    ownerId: "u-guru-1",
    ownerName: "Budi Santoso",
    qualityMode: "standar",
    content: {
      sections: [
        {
          id: "prota",
          title: "Program Tahunan",
          blocks: [
            "Semester ganjil: 5 unit materi · 18 minggu efektif.",
            "Semester genap: 4 unit materi · 16 minggu efektif.",
          ],
        },
      ],
    },
  },
  {
    id: "doc-6",
    title: "Modul Ajar Matematika — Pecahan",
    type: "modul_ajar",
    status: "revisi",
    subject: "Matematika",
    jenjang: "Kelas 5",
    updatedLabel: "1 minggu lalu",
    updatedAt: "2026-06-03T09:00:00+07:00",
    ownerId: "u-guru-1",
    ownerName: "Budi Santoso",
    workspaceId: "ws-1",
    qualityMode: "hemat",
    content: {
      sections: [
        {
          id: "catatan",
          title: "Catatan Reviewer",
          blocks: ["Tujuan pembelajaran perlu diturunkan dari CP terbaru; tambahkan asesmen awal."],
        },
      ],
    },
  },
  {
    id: "doc-7",
    title: "RPS Algoritma & Pemrograman",
    type: "rps",
    status: "selesai",
    subject: "Algoritma & Pemrograman",
    jenjang: "Semester 2",
    updatedLabel: "Kemarin",
    updatedAt: "2026-06-09T11:00:00+07:00",
    ownerId: "u-dosen-1",
    ownerName: "Dr. Dewi Anggraini",
    qualityMode: "standar",
    content: RPS_CONTENT,
  },
  {
    id: "doc-8",
    title: "RPS Basis Data",
    type: "rps",
    status: "draft",
    subject: "Basis Data",
    jenjang: "Semester 3",
    updatedLabel: "4 hari lalu",
    updatedAt: "2026-06-06T11:00:00+07:00",
    ownerId: "u-dosen-1",
    ownerName: "Dr. Dewi Anggraini",
    qualityMode: "standar",
    content: null,
  },
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "trx-1",
    type: "topup",
    label: "Top-up 300 kredit",
    method: "qris",
    amount: 39000,
    status: "lunas",
    date: "2 Jun 2026",
  },
  {
    id: "trx-2",
    type: "topup",
    label: "Top-up 100 kredit",
    method: "va",
    amount: 15000,
    status: "lunas",
    date: "18 Mei 2026",
  },
  {
    id: "trx-3",
    type: "subscription",
    label: "Pro 30 hari",
    method: "qris",
    amount: 49000,
    status: "gagal",
    date: "2 Mei 2026",
  },
];

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: "n-1",
    type: "dokumen",
    title: "Dokumen selesai dibuat 🎉",
    body: "Modul Ajar IPAS — Ekosistem & Rantai Makanan siap ditinjau.",
    timeLabel: "2 jam lalu",
    read: false,
  },
  {
    id: "n-2",
    type: "review",
    title: "LKPD kamu disetujui",
    body: "Ibu Siti menyetujui “LKPD Sistem Pencernaan”. Dokumen masuk Bank Dokumen sekolah.",
    timeLabel: "3 hari lalu",
    read: false,
  },
  {
    id: "n-3",
    type: "review",
    title: "Perlu revisi",
    body: "“Modul Ajar Matematika — Pecahan” diminta revisi. Lihat catatan reviewer.",
    timeLabel: "1 minggu lalu",
    read: true,
  },
  {
    id: "n-4",
    type: "kredit",
    title: "Kredit kamu menipis",
    body: "Sisa kuota gratis bulan ini 2 dokumen. Isi ulang agar tetap lancar.",
    timeLabel: "1 minggu lalu",
    read: true,
  },
];

export const MOCK_WORKSPACE: Workspace = {
  id: "ws-1",
  nama: "SDN Merdeka 01",
  plan: "Sekolah",
  seats: 10,
  seatsUsed: 4,
  members: [
    {
      id: "m-1",
      nama: "Siti Rahayu",
      initials: "SR",
      email: "siti.rahayu@sdnmerdeka01.sch.id",
      role: "admin",
      mapel: "Kepala Sekolah",
      status: "aktif",
      dokumen: 3,
      pemakaian: "95 kredit",
    },
    {
      id: "m-2",
      nama: "Budi Santoso",
      initials: "BS",
      email: "budi.santoso@guru.sd.id",
      role: "anggota",
      mapel: "IPAS · Kelas 5",
      status: "aktif",
      dokumen: 12,
      pemakaian: "240 kredit",
    },
    {
      id: "m-3",
      nama: "Rina Wulandari",
      initials: "RW",
      email: "rina.w@sdnmerdeka01.sch.id",
      role: "anggota",
      mapel: "B. Indonesia · Kelas 4",
      status: "aktif",
      dokumen: 7,
      pemakaian: "180 kredit",
    },
    {
      id: "m-4",
      nama: "Adi Saputra",
      initials: "AS",
      email: "adi.saputra@gmail.com",
      role: "anggota",
      mapel: "Matematika · Kelas 6",
      status: "diundang",
      dokumen: 0,
      pemakaian: "—",
    },
  ],
  reviews: [
    {
      id: "rv-1",
      documentId: "doc-3",
      title: "Asesmen Sumatif Bahasa Indonesia",
      docType: "asesmen",
      pembuat: "Budi Santoso",
      initials: "BS",
      tanggal: "8 Jun 2026",
      status: "menunggu",
    },
    {
      id: "rv-2",
      documentId: "doc-1",
      title: "Modul Ajar IPAS — Ekosistem & Rantai Makanan",
      docType: "modul_ajar",
      pembuat: "Budi Santoso",
      initials: "BS",
      tanggal: "10 Jun 2026",
      status: "menunggu",
    },
    {
      id: "rv-3",
      documentId: "doc-4",
      title: "LKPD Sistem Pencernaan",
      docType: "lkpd",
      pembuat: "Budi Santoso",
      initials: "BS",
      tanggal: "7 Jun 2026",
      status: "disetujui",
    },
    {
      id: "rv-4",
      documentId: "doc-6",
      title: "Modul Ajar Matematika — Pecahan",
      docType: "modul_ajar",
      pembuat: "Budi Santoso",
      initials: "BS",
      tanggal: "3 Jun 2026",
      status: "revisi",
      catatan: "Turunkan tujuan dari CP terbaru, tambahkan asesmen awal.",
    },
  ],
};
