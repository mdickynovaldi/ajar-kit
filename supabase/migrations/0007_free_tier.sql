-- ============================================================================
-- AjarKit — Migration 0007: pengetatan paket FREE (free tier)
-- Jalankan SELURUH file ini di Supabase Dashboard → SQL Editor → Run.
--
--   1. Bonus kredit pendaftaran dikurangi: 320 → 50 (free tier dikurangi).
--   2. Tabel export_log + RPC register_export: paket free hanya boleh
--      1x ekspor PDF dokumen — ditegakkan DI SERVER (security definer),
--      klien tidak punya akses langsung ke export_log.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. handle_new_user — SAMA PERSIS dengan 0001 KECUALI v_bonus 320 → 50
--    (free tier dikurangi). Trigger on_auth_user_created sudah ada (0001).
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
  v_bonus int := 50; -- bonus kredit pendaftaran (free tier dikurangi dari 320)
begin
  if v_role not in ('guru', 'dosen') then v_role := 'guru'; end if;

  insert into public.profiles (id, nama, email, role, credits)
  values (new.id, v_nama, coalesce(new.email, ''), v_role, v_bonus);

  insert into public.credit_ledger (user_id, delta, reason, ref_id, balance_after)
  values (new.id, v_bonus, 'bonus', 'signup-bonus', v_bonus);

  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 2. export_log — catatan ekspor per user. RLS aktif TANPA policy klien:
--    baca/tulis HANYA lewat fungsi security definer di bawah.
-- ---------------------------------------------------------------------------
create table if not exists public.export_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  created_at timestamptz default now()
);
create index if not exists export_log_user_idx on public.export_log (user_id, created_at desc);

alter table public.export_log enable row level security;
revoke insert, update, delete, select on public.export_log from authenticated, anon;

-- ---------------------------------------------------------------------------
-- register_export: catat ekspor & tegakkan jatah paket free (1x seumur akun).
--   plan <> 'free' → selalu catat + true.
--   plan  = 'free' → sudah pernah ekspor (>= 1 baris) → false; selain itu
--                    catat + true.
-- Catatan alias: profiles.id & profiles.plan SELALU dikualifikasi eksplisit
-- agar tidak ambigu dengan variabel/kolom lain (hindari error 42702 — lihat
-- catatan serupa di generate_documents pada 0001).
-- ---------------------------------------------------------------------------
create or replace function public.register_export(p_kind text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_plan text;
  v_count int;
begin
  if v_uid is null then
    return false;
  end if;

  select profiles.plan into v_plan
  from public.profiles
  where profiles.id = v_uid;

  if coalesce(v_plan, 'free') <> 'free' then
    insert into public.export_log (user_id, kind) values (v_uid, p_kind);
    return true;
  end if;

  select count(*)::int into v_count
  from public.export_log
  where export_log.user_id = v_uid;

  if v_count >= 1 then
    return false;
  end if;

  insert into public.export_log (user_id, kind) values (v_uid, p_kind);
  return true;
end $$;

-- hak eksekusi RPC (pola 0001: grant authenticated, revoke public + anon)
grant execute on function public.register_export(text) to authenticated;
revoke execute on function public.register_export(text) from public, anon;

-- ============================================================================
-- Selesai.
-- ============================================================================
