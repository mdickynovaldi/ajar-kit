-- ============================================================================
-- AjarKit — Migration 0008: program referral (Ajak Teman).
-- Jalankan SETELAH 0007_free_tier.sql di Supabase Dashboard → SQL Editor → Run.
--
-- Skema (prd: kredit HANYA bertambah via fungsi SECURITY DEFINER + ledger
-- idempoten — index unik credit_ledger (user_id, reason, ref_id), lihat 0001):
--   a. Tiap user punya referral_code unik 8 huruf besar non-ambigu.
--   b. Teman daftar pakai kode → teman +25 kredit
--      (reason 'referral_signup', ref_id = uuid pengundang).
--   c. Pengundang +25 kredit SETELAH teman generate dokumen pertama
--      (reason 'referral_activation', ref_id = uuid teman → unik otomatis),
--      cap 10 aktivasi / bulan kalender per pengundang.
--   d. Pembelian PERTAMA teman lunas → pengundang +floor(10% kredit dibeli)
--      (reason 'referral_conversion', ref_id = order_id).
--
-- Catatan alias: SEMUA kolom di fungsi bawah dikualifikasi eksplisit
-- (profiles.id, credit_ledger.user_id, …) agar tidak ambigu dengan
-- variabel/parameter (hindari error 42702 — lihat catatan 0001/0007).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Kolom baru profiles + reason ledger baru
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists referral_code text unique,
  add column if not exists referred_by uuid references public.profiles (id);

-- reason referral ikut diizinkan di check constraint credit_ledger (0001)
alter table public.credit_ledger drop constraint if exists credit_ledger_reason_check;
alter table public.credit_ledger add constraint credit_ledger_reason_check
  check (reason in (
    'topup', 'generation', 'regen', 'refund', 'bonus',
    'referral_signup', 'referral_activation', 'referral_conversion'
  ));

-- Kolom baru BOLEH dibaca pemiliknya (melengkapi pola grants kolom 0005).
-- SENGAJA tidak ada grant UPDATE: 0001 sudah revoke update tabel lalu
-- grant per kolom — referral_code & referred_by TIDAK ikut di-grant, jadi
-- klien tidak bisa mengubahnya (referred_by hanya via apply_referral_code).
grant select (referral_code, referred_by) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Generator kode: 8 huruf besar non-ambigu dari md5(seed).
--    16 nibble md5 dipetakan ke alfabet 16 huruf tanpa I/L/O (mirip 0/1).
-- ---------------------------------------------------------------------------
create or replace function public.referral_code_for(p_seed text)
returns text language sql immutable as $$
  select translate(substr(md5(p_seed), 1, 8), '0123456789abcdef', 'ABCDEFGHJKMNPQRS');
$$;

-- Backfill semua baris lama (deterministik dari id; salt naik bila — sangat
-- jarang — kode hasil md5 bertabrakan dengan milik user lain).
do $$
declare
  v_row record;
  v_code text;
  v_try int;
begin
  for v_row in
    select profiles.id from public.profiles where profiles.referral_code is null
  loop
    v_try := 0;
    loop
      v_code := public.referral_code_for(
        v_row.id::text || case when v_try = 0 then '' else v_try::text end
      );
      exit when not exists (
        select 1 from public.profiles p2 where p2.referral_code = v_code
      );
      v_try := v_try + 1;
    end loop;
    update public.profiles set referral_code = v_code
    where profiles.id = v_row.id;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3. handle_new_user — SAMA PERSIS dengan 0007 (v_bonus tetap 50) KECUALI
--    tambahan: set referral_code saat profil dibuat (default via trigger).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role text := coalesce(new.raw_user_meta_data ->> 'role', 'guru');
  v_nama text := coalesce(
    new.raw_user_meta_data ->> 'nama',
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    ''
  );
  v_bonus int := 50; -- bonus kredit pendaftaran (free tier — tetap, lihat 0007)
  v_code text;
  v_try int := 0;
begin
  if v_role not in ('guru', 'dosen') then v_role := 'guru'; end if;

  -- kode referral deterministik dari id; salt naik bila bertabrakan
  loop
    v_code := public.referral_code_for(
      new.id::text || case when v_try = 0 then '' else v_try::text end
    );
    exit when not exists (
      select 1 from public.profiles where profiles.referral_code = v_code
    );
    v_try := v_try + 1;
  end loop;

  insert into public.profiles (id, nama, email, role, credits, referral_code)
  values (new.id, v_nama, coalesce(new.email, ''), v_role, v_bonus, v_code);

  insert into public.credit_ledger (user_id, delta, reason, ref_id, balance_after)
  values (new.id, v_bonus, 'bonus', 'signup-bonus', v_bonus);

  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 4. apply_referral_code: caller memakai kode pengundang → set referred_by
--    + bonus +25 ke CALLER (reason 'referral_signup', ref_id = uuid pengundang,
--    idempoten via index unik ledger). Return kode status (bukan exception)
--    agar klien mudah menampilkan pesan.
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
  v_balance int;
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

  select coalesce(sum(credit_ledger.delta), 0)::int into v_balance
  from public.credit_ledger
  where credit_ledger.user_id = v_uid;

  insert into public.credit_ledger (user_id, delta, reason, ref_id, balance_after)
  values (v_uid, 25, 'referral_signup', v_inviter::text, v_balance + 25)
  on conflict do nothing; -- idempoten via index unik (user, reason, ref)

  -- cache dari sumber kebenaran (aman bila insert di-skip karena duplikat)
  select coalesce(sum(credit_ledger.delta), 0)::int into v_balance
  from public.credit_ledger
  where credit_ledger.user_id = v_uid;
  update public.profiles set credits = v_balance
  where profiles.id = v_uid;

  return 'OK';
end $$;

-- ---------------------------------------------------------------------------
-- 5. award_referral_activation: dipanggil SEBAGAI USER yang baru generate
--    dokumen (best-effort dari /api/generate). Pengundang caller +25
--    (reason 'referral_activation', ref_id = uuid caller → idempoten otomatis:
--    satu teman hanya bisa mengaktivasi sekali). Cap 10 aktivasi / bulan
--    kalender per pengundang. Tidak pernah raise — selalu void.
-- ---------------------------------------------------------------------------
create or replace function public.award_referral_activation()
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_inviter uuid;
  v_count int;
  v_balance int;
begin
  if v_uid is null then
    return;
  end if;

  select profiles.referred_by into v_inviter
  from public.profiles
  where profiles.id = v_uid;
  if v_inviter is null then
    return;
  end if;

  -- kunci baris pengundang → serialisasi operasi kredit per user (pola 0001)
  perform 1 from public.profiles where profiles.id = v_inviter for update;

  -- cap: maksimal 10 aktivasi per bulan kalender per pengundang
  select count(*)::int into v_count
  from public.credit_ledger
  where credit_ledger.user_id = v_inviter
    and credit_ledger.reason = 'referral_activation'
    and credit_ledger.created_at >= date_trunc('month', now());
  if v_count >= 10 then
    return;
  end if;

  select coalesce(sum(credit_ledger.delta), 0)::int into v_balance
  from public.credit_ledger
  where credit_ledger.user_id = v_inviter;

  insert into public.credit_ledger (user_id, delta, reason, ref_id, balance_after)
  values (v_inviter, 25, 'referral_activation', v_uid::text, v_balance + 25)
  on conflict do nothing; -- teman yang sama tidak bisa mengaktivasi dua kali

  select coalesce(sum(credit_ledger.delta), 0)::int into v_balance
  from public.credit_ledger
  where credit_ledger.user_id = v_inviter;
  update public.profiles set credits = v_balance
  where profiles.id = v_inviter;
end $$;

-- ---------------------------------------------------------------------------
-- 6. award_referral_conversion: dipanggil SERVICE ROLE dari webhook pembayaran
--    SETELAH settle_order sukses. Bila order lunas tsb adalah pembelian lunas
--    PERTAMA buyer dan buyer punya pengundang → pengundang
--    +floor(10% kredit dibeli) (reason 'referral_conversion',
--    ref_id = p_order_id, idempoten). Tidak pernah raise — selalu void.
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

  -- kunci baris pengundang → serialisasi operasi kredit per user (pola 0002)
  perform 1 from public.profiles where profiles.id = v_inviter for update;

  select coalesce(sum(credit_ledger.delta), 0)::int into v_balance
  from public.credit_ledger
  where credit_ledger.user_id = v_inviter;

  insert into public.credit_ledger (user_id, delta, reason, ref_id, balance_after)
  values (v_inviter, v_bonus, 'referral_conversion', p_order_id, v_balance + v_bonus)
  on conflict do nothing; -- webhook bisa terkirim berkali-kali (idempoten)

  select coalesce(sum(credit_ledger.delta), 0)::int into v_balance
  from public.credit_ledger
  where credit_ledger.user_id = v_inviter;
  update public.profiles set credits = v_balance
  where profiles.id = v_inviter;
end $$;

-- ---------------------------------------------------------------------------
-- 7. referral_stats: ringkasan utk halaman "Ajak Teman".
--    { code, invited, activated, earned } milik caller.
-- ---------------------------------------------------------------------------
create or replace function public.referral_stats()
returns json
language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
  v_invited int;
  v_activated int;
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

  select count(*)::int into v_activated
  from public.credit_ledger
  where credit_ledger.user_id = v_uid
    and credit_ledger.reason = 'referral_activation';

  select coalesce(sum(credit_ledger.delta), 0)::int into v_earned
  from public.credit_ledger
  where credit_ledger.user_id = v_uid
    and credit_ledger.reason in
      ('referral_signup', 'referral_activation', 'referral_conversion');

  return json_build_object(
    'code', v_code,
    'invited', v_invited,
    'activated', v_activated,
    'earned', v_earned
  );
end $$;

-- ---------------------------------------------------------------------------
-- 8. Hak eksekusi (pola 0001/0002: grant spesifik, revoke public + anon)
-- ---------------------------------------------------------------------------
grant execute on function public.apply_referral_code(text) to authenticated;
grant execute on function public.award_referral_activation() to authenticated;
grant execute on function public.referral_stats() to authenticated;
revoke execute on function public.apply_referral_code(text) from public, anon;
revoke execute on function public.award_referral_activation() from public, anon;
revoke execute on function public.referral_stats() from public, anon;

-- award_referral_conversion HANYA service_role (server webhook) — bukan klien
revoke execute on function public.award_referral_conversion(text)
  from public, anon, authenticated;
grant execute on function public.award_referral_conversion(text) to service_role;

-- ============================================================================
-- Selesai.
-- ============================================================================
