-- ============================================================================
-- AjarKit — Migration 0010: perbaikan FK referral (jalankan SETELAH 0009)
--
-- Temuan uji E2E: profiles.referred_by dibuat tanpa aturan ON DELETE,
-- sehingga akun yang PERNAH MENGUNDANG orang lain tidak bisa dihapus
-- (FK NO ACTION memblokir) — merusak fitur "Hapus akun" (PRD §8.7).
-- Solusi: ON DELETE SET NULL — bila pengundang menghapus akunnya, teman
-- yang diundang tetap utuh, hanya kehilangan tautan referralnya.
-- Riwayat kredit di credit_ledger tidak tersentuh.
-- ============================================================================

alter table public.profiles
  drop constraint if exists profiles_referred_by_fkey;

alter table public.profiles
  add constraint profiles_referred_by_fkey
  foreign key (referred_by) references public.profiles (id)
  on delete set null;
