-- ============================================================================
-- AjarKit — Migration 0006: jenis dokumen baru "atp" (ATP/SAP khusus guru).
-- Jalankan SETELAH 0001-0005 (additive, aman dijalankan ulang).
-- ============================================================================

alter table public.documents drop constraint if exists documents_type_check;
alter table public.documents add constraint documents_type_check
  check (type in ('atp', 'modul_ajar', 'lkpd', 'asesmen', 'bank_soal', 'prota_promes', 'rps'));
