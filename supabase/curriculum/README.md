# Korpus Kurikulum untuk RAG

Di sinilah kamu **menaruh dokumen acuan kurikulum** yang dipakai AI sebagai
konteks saat membuat dokumen (RAG — prd.md §9 langkah 1).

## Cara pakai (3 langkah)

1. **Taruh file** `.md` atau `.txt` di folder ini. Satu file = satu topik
   acuan (mis. `modul-ajar-sd.md`, `rps-obe.md`, `bank-soal-hots.md`).
   Konversi PDF/Word ke teks/markdown dulu (mis. salin-tempel isinya).

2. **Beri frontmatter** di atas tiap file (opsional tapi disarankan):
   ```
   ---
   scope: guru        # guru | dosen | umum  (umum = dipakai keduanya)
   jenjang: SD        # opsional: SD | SMP | SMA | SMK | Madrasah | dst
   title: Judul Acuan
   ---
   ```
   `scope` menentukan kapan potongan ini dipakai: dokumen guru menarik
   konteks `scope=guru` + `umum`; RPS dosen menarik `scope=dosen` + `umum`.

3. **Jalankan ingest** (butuh `SUPABASE_SERVICE_ROLE_KEY` di `.env.local`):
   ```bash
   bun run scripts/ingest-curriculum.mjs
   ```
   Skrip memecah tiap file menjadi potongan per-section, lalu menyimpannya ke
   tabel `curriculum_docs`. **Idempoten**: menjalankan ulang akan mengganti
   potongan dari file yang sama (berdasarkan nama file), jadi aman dipanggil
   berkali-kali setelah mengedit.

## Cara kerjanya

- Setiap potongan disimpan dengan pencarian full-text (`tsvector`).
- Saat membuat dokumen, `/api/generate` memanggil `match_curriculum(query, scope)`
  untuk mengambil 4 potongan paling relevan, lalu menyuntikkannya ke prompt AI
  sehingga hasil mengikuti istilah & struktur acuanmu.
- Korpus bawaan (14 entri ringkas Pembelajaran Mendalam, OBE, HOTS, dll.) sudah
  ada via `migrations/0004_seed_curriculum.sql`. File yang kamu tambahkan di sini
  **melengkapi** korpus itu — tidak menimpanya.

## Tips kualitas

- Pisahkan per `##` heading agar tiap potongan fokus pada satu konsep.
- Tulis acuan, bukan contoh dokumen jadi — AI butuh "aturan main", bukan
  salinan untuk ditiru mentah-mentah.
- Untuk korpus besar/banyak file, pertimbangkan upgrade ke pencarian semantik
  (pgvector + embedding) — kolom `embedding vector(768)` sudah disiapkan.
