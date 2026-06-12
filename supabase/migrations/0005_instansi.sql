-- ============================================================================
-- AjarKit — Migration 0005: profil instansi utk kop & tanda tangan dokumen.
-- Jalankan SETELAH 0001-0004 (additive, aman dijalankan ulang).
-- Mengisi kop surat (logo, nama, alamat) + blok ttd (pimpinan, NIP, kota)
-- pada ekspor PDF — sesuai format ATP/Modul Ajar/RPS resmi.
-- ============================================================================

alter table public.profiles
  add column if not exists instansi_induk text,      -- baris atas kop, mis. "PEMERINTAH PROVINSI JAWA TIMUR\nDINAS PENDIDIKAN"
  add column if not exists nama_instansi text,       -- mis. "SMA NEGERI 2 MALANG" / "UNIVERSITAS NEGERI MALANG"
  add column if not exists alamat_instansi text,
  add column if not exists kontak_instansi text,     -- mis. "Website: … · Email: …"
  add column if not exists logo_instansi text,       -- data-URL base64 (≤ ~300KB)
  add column if not exists kota text,                -- utk "Malang, {tanggal}" di blok ttd
  add column if not exists nip text,                 -- NIP/NIDN penyusun
  add column if not exists pimpinan_jabatan text,    -- "Kepala Sekolah" / "Ketua Program Studi"
  add column if not exists pimpinan_nama text,
  add column if not exists pimpinan_nip text;

-- kolom baru ikut boleh di-update pemiliknya (melengkapi grant kolom 0001)
grant update (
  instansi_induk, nama_instansi, alamat_instansi, kontak_instansi,
  logo_instansi, kota, nip, pimpinan_jabatan, pimpinan_nama, pimpinan_nip
) on public.profiles to authenticated;
