-- ============================================================================
-- AjarKit — Migration 0004: seed korpus kurikulum (RAG, prd.md §9 langkah 1).
-- Idempoten: seed lama (source ini) dihapus lalu diisi ulang.
-- Konten = ringkasan acuan utk memandu AI; bukan salinan dokumen resmi.
-- TODO M1+: lengkapi korpus dari dokumen regulasi penuh + embedding pgvector.
-- ============================================================================

delete from public.curriculum_docs where source = 'seed-ajarkit-v1';

insert into public.curriculum_docs (scope, jenjang, title, source, chunk_text) values

('guru', null, 'Kerangka Modul Ajar Pembelajaran Mendalam', 'seed-ajarkit-v1',
 'Modul Ajar berbasis Pembelajaran Mendalam (Permendikdasmen 13/2025) disusun dalam 4 tahap: (1) Identifikasi — memetakan kesiapan peserta didik dan karakteristik materi; (2) Desain Pembelajaran — menetapkan capaian, tujuan pembelajaran, topik kontekstual, dan kaitan lintas disiplin; (3) Pengalaman Belajar — kegiatan awal, inti, penutup; (4) Asesmen — awal, proses, akhir. Setiap modul wajib memetakan Dimensi Profil Lulusan yang ditonjolkan.'),

('umum', null, '8 Dimensi Profil Lulusan', 'seed-ajarkit-v1',
 'Delapan Dimensi Profil Lulusan: Keimanan & Ketakwaan kepada Tuhan YME; Kewargaan; Penalaran Kritis; Kreativitas; Kolaborasi; Kemandirian; Kesehatan; Komunikasi. Pilih 2-4 dimensi yang paling relevan dengan materi untuk ditonjolkan, lalu nyatakan secara eksplisit bagaimana kegiatan pembelajaran menumbuhkan dimensi tersebut.'),

('guru', null, 'Prinsip Pengalaman Belajar Mendalam', 'seed-ajarkit-v1',
 'Pengalaman belajar dirancang dengan tiga prinsip: berkesadaran (mindful — peserta didik sadar tujuan dan proses belajarnya), bermakna (meaningful — terhubung dengan kehidupan nyata dan pengetahuan sebelumnya), dan menggembirakan (joyful — menumbuhkan rasa ingin tahu dan keterlibatan positif). Kegiatan inti sebaiknya memuat eksplorasi, kolaborasi, dan refleksi.'),

('guru', null, 'Asesmen: awal, proses, akhir & KKTP', 'seed-ajarkit-v1',
 'Asesmen mencakup: asesmen awal (diagnostik, memetakan kesiapan), asesmen proses (formatif — observasi, umpan balik, ceklis), dan asesmen akhir (sumatif — tes, produk, proyek). Ketercapaian Tujuan Pembelajaran diukur dengan KKTP (Kriteria Ketercapaian Tujuan Pembelajaran), misal rubrik 4 tingkat: belum berkembang, layak, cakap, mahir.'),

('guru', null, 'Taksonomi soal LOTS-MOTS-HOTS', 'seed-ajarkit-v1',
 'Komposisi bank soal yang sehat memuat LOTS (mengingat, memahami — C1-C2), MOTS (menerapkan, menganalisis dasar — C3), dan HOTS (menganalisis, mengevaluasi, mencipta — C4-C6). Soal HOTS menggunakan stimulus kontekstual (kasus, data, grafik) dan menuntut penalaran, bukan hafalan. Sertakan kunci jawaban dan pembahasan singkat per butir.'),

('guru', null, 'Struktur LKPD', 'seed-ajarkit-v1',
 'LKPD (Lembar Kerja Peserta Didik) memuat: identitas dan tujuan kegiatan, alat/bahan (bila perlu), langkah kerja bertahap yang jelas, pertanyaan pemantik/diskusi, ruang jawaban, dan refleksi singkat. Aktivitas dirancang agar peserta didik aktif menemukan konsep, bukan sekadar mengisi titik-titik.'),

('guru', null, 'Prota dan Promes', 'seed-ajarkit-v1',
 'Program Tahunan (Prota) mendistribusikan seluruh unit/lingkup materi ke dua semester berdasarkan minggu efektif tahun ajaran. Program Semester (Promes) merinci alokasi per minggu/bulan dalam satu semester, termasuk jadwal asesmen sumatif dan cadangan. Hitung minggu efektif dengan mengurangi libur, asesmen, dan kegiatan sekolah.'),

('guru', null, 'Alur CP → TP → ATP', 'seed-ajarkit-v1',
 'Tujuan Pembelajaran (TP) diturunkan dari Capaian Pembelajaran (CP) fase yang berlaku, memuat kompetensi dan lingkup materi. Rangkaian TP disusun menjadi Alur Tujuan Pembelajaran (ATP) yang logis dari mudah ke kompleks. Setiap TP dirumuskan operasional dan terukur (gunakan kata kerja yang dapat diamati).'),

('guru', null, 'Model pembelajaran yang disarankan', 'seed-ajarkit-v1',
 'Model yang selaras dengan Pembelajaran Mendalam: Project-Based Learning (PjBL — produk nyata, cocok lintas disiplin), Problem-Based Learning (PBL — kasus kontekstual), Inquiry/Discovery (penyelidikan terbimbing untuk konsep sains), dan Cooperative Learning (kolaborasi terstruktur). Pilih sesuai karakteristik materi dan kesiapan peserta didik; nyatakan sintaksnya di kegiatan inti.'),

('guru', 'Madrasah', 'Integrasi nilai keagamaan (Madrasah)', 'seed-ajarkit-v1',
 'Untuk Madrasah/Kemenag, integrasikan nilai keagamaan secara autentik: kaitkan materi dengan ayat/hadis atau nilai akhlak yang relevan, masukkan pembiasaan (doa pembuka/penutup, adab diskusi), dan refleksi nilai pada penutup. Integrasi bersifat memperkaya makna, bukan tempelan.'),

('dosen', null, 'Komponen RPS berbasis OBE', 'seed-ajarkit-v1',
 'RPS (Rencana Pembelajaran Semester) berbasis Outcome-Based Education memuat: identitas mata kuliah (nama, kode, SKS, semester, prodi, dosen), CPL yang dibebankan, CPMK yang diturunkan dari CPL, Sub-CPMK terukur per pekan, rencana 16 pertemuan, metode penilaian dengan bobot, dan daftar pustaka. Sesuai SN-Dikti (Permendikbudristek 53/2023).'),

('dosen', null, 'Derivasi CPL → CPMK → Sub-CPMK', 'seed-ajarkit-v1',
 'CPMK adalah penjabaran CPL pada konteks mata kuliah: spesifik, dapat diukur, dan dapat dicapai dalam satu semester. Sub-CPMK menjabarkan CPMK per tahap/pekan sebagai kemampuan akhir yang direncanakan. Setiap butir penilaian harus terpetakan ke Sub-CPMK sehingga ketercapaian CPL dapat dilacak (constructive alignment).'),

('dosen', null, 'Struktur 16 pertemuan & bobot penilaian', 'seed-ajarkit-v1',
 'Rencana semester umumnya 16 pertemuan: pekan 1-7 materi, pekan 8 UTS, pekan 9-15 materi lanjutan, pekan 16 UAS. Setiap pertemuan memuat Sub-CPMK, bahan kajian, bentuk/metode pembelajaran, pengalaman belajar, indikator, kriteria, dan bobot. Total bobot penilaian (tugas, partisipasi, UTS, UAS, proyek) harus 100%.'),

('umum', null, 'Prinsip penulisan perangkat ajar', 'seed-ajarkit-v1',
 'Gunakan Bahasa Indonesia baku yang ramah dan lugas. Tujuan ditulis terukur, kegiatan ditulis operasional langkah demi langkah, dan asesmen selaras dengan tujuan (alignment). Cantumkan alokasi waktu realistis. Hindari jargon tanpa penjelasan; perangkat harus bisa langsung dipakai guru/dosen lain.');
