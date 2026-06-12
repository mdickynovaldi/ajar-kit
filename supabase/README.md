# AjarKit — Setup Backend Supabase

Aplikasi berjalan **dual-mode**:

| Kondisi | Mode | Perilaku |
|---|---|---|
| `.env.local` kosong / belum ada | **Mock** | Semua data lokal di browser (fase frontend) |
| `NEXT_PUBLIC_SUPABASE_URL` + `ANON_KEY` terisi | **Supabase** | Auth & data nyata (Postgres + RLS) |

## Langkah setup (±5 menit)

1. **Buat project** di [supabase.com](https://supabase.com) (region Singapore disarankan).
2. **Jalankan SQL** — buka *SQL Editor* → tempel & **Run** berurutan:
   1. [`migrations/0001_init.sql`](migrations/0001_init.sql) — semua tabel
      (prd.md §5), RLS, trigger profil + bonus kredit, fungsi RPC kredit.
   2. [`migrations/0002_payments.sql`](migrations/0002_payments.sql) —
      `settle_order`/`fail_order` utk webhook Doku (hanya service-role).
   3. [`migrations/0003_ruang_rag.sql`](migrations/0003_ruang_rag.sql) —
      Ruang Sekolah/Prodi nyata (undangan, review, guard anti-eskalasi)
      + pencarian konteks kurikulum (RAG full-text).
   4. [`migrations/0004_seed_curriculum.sql`](migrations/0004_seed_curriculum.sql)
      — korpus acuan kurikulum (14 entri) utk konteks AI.
   5. [`migrations/0005_instansi.sql`](migrations/0005_instansi.sql) —
      profil instansi (logo/kop/NIP/pimpinan) utk kop surat & blok tanda
      tangan pada ekspor PDF. Isi datanya di Pengaturan → Profil.
3. **Aktifkan provider auth** — *Authentication → Sign In / Up*:
   - Email: aktif (default).
   - (Opsional, demo lebih mulus) matikan **Confirm email** agar pendaftaran
     langsung bisa masuk tanpa klik tautan email.
   - (Opsional) Google OAuth bila ingin tombol "Lanjut dengan Google" nyata.
4. **Isi env** —
   ```bash
   cp .env.example .env.local
   ```
   Isi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` dari
   *Project Settings → API*. Lalu restart dev server (`bun run dev`).
5. **Uji backend** —
   ```bash
   bun run scripts/backend-smoke-test.mjs
   ```
   Menguji signup → bonus kredit → generate (atomik + idempoten) → saldo
   kurang ditolak → top-up → RLS anti-curang. Semua harus ✓.

## Arsitektur keamanan kredit (prd.md §0.6, §10)

- **Sumber kebenaran saldo** = `SUM(credit_ledger.delta)`; `profiles.credits`
  hanya cache yang di-update fungsi server.
- Klien **tidak punya** hak tulis ke `credit_ledger`, `transactions`,
  `generation_jobs` — semua mutasi lewat fungsi `SECURITY DEFINER`:
  - `generate_documents(job_ref, cost, docs)` — validasi saldo, buat 1..N
    dokumen + potong kredit **atomik & idempoten** (ref unik).
  - `spend_credits(amount, ref)` — potongan kecil (regenerasi per-bagian).
  - `simulate_payment(order_id, ...)` — **fase mock**: tandai lunas + tambah
    kredit / aktifkan Pro, idempoten via `order_id`.
- Kolom `profiles.credits` di-`REVOKE` dari update klien (column-level grant).

## Mengaktifkan AI nyata (OpenRouter) — opsional

1. Buat API key di [openrouter.ai/keys](https://openrouter.ai/keys), isi
   `OPENROUTER_API_KEY` di `.env.local`, restart dev server.
2. Selesai — generator otomatis memakai AI nyata via `POST /api/generate`
   (server-side; routing model Hemat/Standar/Tinggi per prd.md §9, fallback
   model otomatis, validasi JSON, lalu potong kredit atomik via RPC).
   Tanpa key → kembali ke konten contoh (simulasi).

## Mengaktifkan pembayaran nyata (DOKU) — opsional

1. Daftar [dashboard.doku.com](https://dashboard.doku.com) (mode sandbox),
   ambil **Client ID** + **Secret Key** → isi `DOKU_CLIENT_ID`,
   `DOKU_SECRET_KEY` di `.env.local` (base URL sandbox sudah default).
   Isi juga `SUPABASE_SERVICE_ROLE_KEY` (dipakai webhook utk settle).
2. Daftarkan **Notification URL** di DOKU Dashboard → Settings:
   `{APP_URL}/api/payments/webhook`. Untuk uji lokal, expose dgn tunnel
   (mis. `ngrok http 3000`) dan pakai URL tunnel sbg APP_URL.
3. Alur: Bayar → redirect halaman DOKU Checkout (QRIS/VA/e-wallet/kartu) →
   kembali ke `/app/pembayaran/pending` → webhook memverifikasi signature →
   `settle_order` menambah kredit/paket (idempoten) → halaman pending
   mendeteksi lunas via polling → Berhasil.
   Tanpa key → alur simulasi QRIS/VA seperti biasa.

## Status pemetaan ke arsitektur PRD (§9, §11)

| Kontrak PRD | Status |
|---|---|
| `generate` (AI via OpenRouter, server-side) | ✅ `POST /api/generate` (Next route handler) |
| `create-transaction` (Doku) | ✅ `POST /api/payments/create` → DOKU Checkout |
| `payment-webhook` (verifikasi signature, idempoten) | ✅ `POST /api/payments/webhook` → `settle_order` |
| `export-doc` | ✅ DOCX (`POST /api/export/docx`, lib `docx`) + **PDF custom berbranding** (`POST /api/export/pdf`, `@react-pdf/renderer`): dokumen ajar (RPS dgn tabel 16 pertemuan) & struk/invoice |
| Konteks RAG `curriculum_docs` | ✅ full-text `match_curriculum` + seed 14 entri → disuntik ke prompt `/api/generate`. Tambah korpus sendiri: taruh `.md` di `supabase/curriculum/` lalu `bun run scripts/ingest-curriculum.mjs`. ⏳ upgrade pgvector saat pipeline embedding tersedia |
| Ruang/anggota/review nyata (M3) | ✅ buat ruang, undang via email, terima undangan, review Setujui/Revisi + notifikasi — RLS + guard anti-eskalasi |
| Hapus akun & data (prd.md §12) | ✅ `POST /api/account/delete` (service-role, cascade) |
| Pro recurring kartu (tokenization) | ⏳ TODO P3 |

Catatan: PRD menyebut Supabase Edge Functions; di proyek Next.js ini perannya
diisi **Route Handlers** (`app/api/**`) — sama-sama server-side, rahasia tidak
pernah ke browser, dan logika DB tetap di fungsi SQL yang sama.
