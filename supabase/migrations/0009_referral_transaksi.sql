-- ============================================================================
-- AjarKit — Migration 0009: revisi referral — reward pindah ke transaksi.
-- Jalankan SETELAH 0008_referral.sql di Supabase Dashboard → SQL Editor → Run.
--
-- REVISI skema referral (menggantikan perilaku 0008): reward HANYA diberikan
-- setelah teman yang diundang melakukan PEMBELIAN pertama (lunas) — daftar
-- memakai kode TIDAK memberi kredit apa pun.
--   a. apply_referral_code: validasi sama persis 0008, tapi TANPA bonus +25 —
--      hanya mencatat referred_by. Bonus pindah ke pembelian pertama (d).
--   b. award_referral_activation DIHAPUS (beserta grant-nya, ikut terhapus
--      bersama fungsinya) — tidak ada lagi reward generate dokumen.
--   c. reason ledger baru 'referral_conversion_bonus' (bonus utk PEMBELI);
--      SEMUA reason lama 0008 dipertahankan agar baris historis tetap valid.
--   d. award_referral_conversion: pembelian lunas PERTAMA teman →
--      pengundang +floor(10% kredit) (reason 'referral_conversion') DAN
--      pembeli +floor(10% kredit) (reason 'referral_conversion_bonus'),
--      keduanya idempoten via index unik ledger (ref_id = order_id).
--   e. referral_stats: field activated → converted (jumlah teman konversi).
--
-- Catatan alias: SEMUA kolom di fungsi bawah dikualifikasi eksplisit
-- (profiles.id, credit_ledger.user_id, …) agar tidak ambigu dengan
-- variabel/parameter (hindari error 42702 — lihat catatan 0001/0007/0008).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Check constraint reason: tambah 'referral_conversion_bonus'.
--    Reason lama (0001+0008) TETAP diizinkan — baris historis tetap valid.
-- ---------------------------------------------------------------------------
alter table public.credit_ledger drop constraint if exists credit_ledger_reason_check;
alter table public.credit_ledger add constraint credit_ledger_reason_check
  check (reason in (
    'topup', 'generation', 'regen', 'refund', 'bonus',
    'referral_signup', 'referral_activation', 'referral_conversion',
    'referral_conversion_bonus'
  ));

-- ---------------------------------------------------------------------------
-- 2. apply_referral_code: validasi sama persis 0008
--    (TIDAK_LOGIN / KODE_TIDAK_DITEMUKAN / KODE_SENDIRI / SUDAH_TERPAKAI /
--    KEDALUWARSA), tapi TANPA insert ledger +25 — hanya set referred_by.
--    Bonus pindah ke pembelian pertama teman (award_referral_conversion).
-- ---------------------------------------------------------------------------
create or replace function public.apply_referral_code(p_code text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
  v_inviter uuid;
  v_referred_by uuid;
  v_created timestamptz;
begin
  if v_uid is null then
    return 'TIDAK_LOGIN';
  end if;

  v_code := upper(trim(coalesce(p_code, '')));
  if v_code = '' then
    return 'KODE_TIDAK_DITEMUKAN';
  end if;

  -- kunci baris caller → serialisasi (klik ganda tidak dobel)
  select profiles.referred_by, profiles.created_at
    into v_referred_by, v_created
  from public.profiles
  where profiles.id = v_uid
  for update;
  if not found then
    return 'TIDAK_LOGIN';
  end if;

  select profiles.id into v_inviter
  from public.profiles
  where profiles.referral_code = v_code;

  if v_inviter is null then
    return 'KODE_TIDAK_DITEMUKAN';
  end if;
  if v_inviter = v_uid then
    return 'KODE_SENDIRI';
  end if;
  if v_referred_by is not null then
    return 'SUDAH_TERPAKAI';
  end if;
  if v_created < now() - interval '7 days' then
    return 'KEDALUWARSA'; -- hanya akun baru (≤ 7 hari) yang boleh memakai kode
  end if;

  update public.profiles set referred_by = v_inviter
  where profiles.id = v_uid;

  -- 0009: TIDAK ada kredit di sini — bonus kedua pihak diberikan saat teman
  -- melakukan pembelian lunas PERTAMA (award_referral_conversion).
  return 'OK';
end $$;

-- ---------------------------------------------------------------------------
-- 3. Hapus award_referral_activation — tidak ada lagi reward generate dokumen.
--    (DROP FUNCTION otomatis mencabut semua grant/revoke yang menempel.)
-- ---------------------------------------------------------------------------
drop function if exists public.award_referral_activation();

-- ---------------------------------------------------------------------------
-- 4. award_referral_conversion: dipanggil SERVICE ROLE dari webhook pembayaran
--    SETELAH settle_order sukses. Bila order lunas tsb adalah pembelian lunas
--    PERTAMA buyer dan buyer punya pengundang → DUA bonus idempoten:
--      (a) pengundang +floor(10% kredit) ('referral_conversion'), dan
--      (b) pembeli    +floor(10% kredit) ('referral_conversion_bonus'),
--    keduanya ref_id = p_order_id (index unik ledger → webhook boleh replay).
--    Cache profiles.credits KEDUA user dihitung ulang dari SUM(ledger).
--    Tidak pernah raise utk kondisi tidak memenuhi syarat — selalu void.
-- ---------------------------------------------------------------------------
create or replace function public.award_referral_conversion(p_order_id text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_buyer uuid;
  v_created timestamptz;
  v_credits int;
  v_inviter uuid;
  v_bonus int;
  v_balance int;
begin
  select transactions.user_id, transactions.created_at,
         coalesce((transactions.payload ->> 'credits')::int, 0)
    into v_buyer, v_created, v_credits
  from public.transactions
  where transactions.order_id = p_order_id
    and transactions.status = 'lunas';
  if not found then
    return; -- order tidak ada / belum lunas
  end if;

  select profiles.referred_by into v_inviter
  from public.profiles
  where profiles.id = v_buyer;
  if v_inviter is null then
    return;
  end if;

  -- hanya pembelian lunas PERTAMA buyer: tidak boleh ada transaksi lunas
  -- lain yang lebih awal
  if exists (
    select 1 from public.transactions t
    where t.user_id = v_buyer
      and t.status = 'lunas'
      and t.order_id <> p_order_id
      and t.created_at < v_created
  ) then
    return;
  end if;

  v_bonus := floor(v_credits * 0.10)::int;
  if v_bonus <= 0 then
    return;
  end if;

  -- kunci KEDUA baris profil dgn urutan deterministik (by id) → serialisasi
  -- operasi kredit per user (pola 0001/0002) tanpa risiko deadlock
  perform 1 from public.profiles
  where profiles.id in (v_inviter, v_buyer)
  order by profiles.id
  for update;

  -- (a) bonus pengundang
  select coalesce(sum(credit_ledger.delta), 0)::int into v_balance
  from public.credit_ledger
  where credit_ledger.user_id = v_inviter;

  insert into public.credit_ledger (user_id, delta, reason, ref_id, balance_after)
  values (v_inviter, v_bonus, 'referral_conversion', p_order_id, v_balance + v_bonus)
  on conflict do nothing; -- webhook bisa terkirim berkali-kali (idempoten)

  -- (b) bonus pembeli (teman yang diundang)
  select coalesce(sum(credit_ledger.delta), 0)::int into v_balance
  from public.credit_ledger
  where credit_ledger.user_id = v_buyer;

  insert into public.credit_ledger (user_id, delta, reason, ref_id, balance_after)
  values (v_buyer, v_bonus, 'referral_conversion_bonus', p_order_id, v_balance + v_bonus)
  on conflict do nothing; -- idempoten via index unik (user, reason, ref)

  -- cache kedua user dari sumber kebenaran (aman bila insert di-skip)
  select coalesce(sum(credit_ledger.delta), 0)::int into v_balance
  from public.credit_ledger
  where credit_ledger.user_id = v_inviter;
  update public.profiles set credits = v_balance
  where profiles.id = v_inviter;

  select coalesce(sum(credit_ledger.delta), 0)::int into v_balance
  from public.credit_ledger
  where credit_ledger.user_id = v_buyer;
  update public.profiles set credits = v_balance
  where profiles.id = v_buyer;
end $$;

-- ---------------------------------------------------------------------------
-- 5. referral_stats: ringkasan utk halaman "Ajak Teman".
--    { code, invited, converted, earned } milik caller — converted = jumlah
--    teman yang sudah bertransaksi (baris 'referral_conversion' caller);
--    earned tetap menjumlah reason lama agar riwayat 0008 ikut terhitung.
-- ---------------------------------------------------------------------------
create or replace function public.referral_stats()
returns json
language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
  v_invited int;
  v_converted int;
  v_earned int;
begin
  if v_uid is null then
    return null;
  end if;

  select profiles.referral_code into v_code
  from public.profiles
  where profiles.id = v_uid;

  select count(*)::int into v_invited
  from public.profiles
  where profiles.referred_by = v_uid;

  select count(*)::int into v_converted
  from public.credit_ledger
  where credit_ledger.user_id = v_uid
    and credit_ledger.reason = 'referral_conversion';

  select coalesce(sum(credit_ledger.delta), 0)::int into v_earned
  from public.credit_ledger
  where credit_ledger.user_id = v_uid
    and credit_ledger.reason in
      ('referral_signup', 'referral_activation', 'referral_conversion',
       'referral_conversion_bonus');

  return json_build_object(
    'code', v_code,
    'invited', v_invited,
    'converted', v_converted,
    'earned', v_earned
  );
end $$;

-- ---------------------------------------------------------------------------
-- 6. Hak eksekusi — CREATE OR REPLACE mempertahankan grant lama (0008),
--    tapi ditegaskan ulang di sini agar migrasi ini mandiri & eksplisit.
-- ---------------------------------------------------------------------------
grant execute on function public.apply_referral_code(text) to authenticated;
grant execute on function public.referral_stats() to authenticated;
revoke execute on function public.apply_referral_code(text) from public, anon;
revoke execute on function public.referral_stats() from public, anon;

-- award_referral_conversion HANYA service_role (server webhook) — bukan klien
revoke execute on function public.award_referral_conversion(text)
  from public, anon, authenticated;
grant execute on function public.award_referral_conversion(text) to service_role;

-- ============================================================================
-- Selesai.
-- ============================================================================
