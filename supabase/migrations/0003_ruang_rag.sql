-- ============================================================================
-- AjarKit — Migration 0003: Ruang Sekolah/Prodi nyata (M3) + pencarian RAG (M1)
-- Jalankan SETELAH 0001 & 0002 (additive, aman dijalankan ulang).
--
-- Isi:
--   A. Visibilitas profil antar anggota ruang (utk daftar anggota).
--   B. Fungsi undangan anggota + terima undangan + notifikasi antar anggota.
--   C. Pencarian konteks kurikulum (full-text) utk /api/generate.
--      (Kolom vector tetap ada utk upgrade embedding nanti.)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- A. Profil sesama anggota ruang boleh dibaca (nama/email utk tabel anggota)
-- ---------------------------------------------------------------------------
create or replace function public.shares_workspace_with(p_profile uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.memberships saya
    join public.memberships dia
      on dia.workspace_id = saya.workspace_id
    where saya.user_id = auth.uid()
      and saya.status = 'aktif'          -- undangan belum diterima ≠ akses
      and dia.user_id = p_profile
      and dia.status <> 'nonaktif'
  );
$$;

drop policy if exists profiles_select_co_member on public.profiles;
create policy profiles_select_co_member on public.profiles
  for select using (public.shares_workspace_with(id));

-- Anggota boleh menerima undangannya sendiri (diundang → aktif)
drop policy if exists memberships_self_accept on public.memberships;
create policy memberships_self_accept on public.memberships
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid() and status = 'aktif');

-- PENTING (anti eskalasi hak): WITH CHECK tidak bisa membaca baris LAMA,
-- jadi tanpa guard ini anggota bisa menaikkan role/memindah workspace_id
-- pada barisnya sendiri. Non-admin hanya boleh mengubah STATUS.
create or replace function public.tg_membership_guard()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- pakai OLD.workspace_id agar repoint workspace tidak bisa melewati cek
  if not public.is_workspace_admin(old.workspace_id) then
    if new.role <> old.role
       or new.workspace_id <> old.workspace_id
       or new.user_id <> old.user_id then
      raise exception 'PERUBAHAN_TIDAK_DIIZINKAN';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists memberships_guard on public.memberships;
create trigger memberships_guard before update on public.memberships
  for each row execute function public.tg_membership_guard();

-- Undangan harus bisa MELIHAT ruangnya untuk bisa menerimanya:
-- perluas policy select workspaces (0001) agar mencakup status 'diundang'.
drop policy if exists workspaces_select_member on public.workspaces;
create policy workspaces_select_member on public.workspaces
  for select using (
    owner_id = auth.uid()
    or public.is_workspace_member(id)
    or exists (
      select 1 from public.memberships m
      where m.workspace_id = workspaces.id
        and m.user_id = auth.uid()
        and m.status <> 'nonaktif'
    )
  );

-- ---------------------------------------------------------------------------
-- B. Undang anggota via email (admin) + notifikasi antar anggota ruang
-- ---------------------------------------------------------------------------
create or replace function public.invite_member(
  p_workspace uuid,
  p_email text,
  p_role text default 'anggota'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_target uuid;
  v_membership uuid;
begin
  if v_uid is null then raise exception 'TIDAK_LOGIN'; end if;
  if not public.is_workspace_admin(p_workspace) then
    raise exception 'BUKAN_ADMIN';
  end if;
  if p_role not in ('admin', 'anggota') then p_role := 'anggota'; end if;

  select profiles.id into v_target from public.profiles
  where lower(profiles.email) = lower(trim(p_email));
  if v_target is null then
    raise exception 'EMAIL_BELUM_TERDAFTAR';
  end if;

  insert into public.memberships (workspace_id, user_id, role, status)
  values (p_workspace, v_target, p_role, 'diundang')
  on conflict (workspace_id, user_id)
    do update set status = case
      when memberships.status = 'nonaktif' then 'diundang'
      else memberships.status end
  returning memberships.id into v_membership;

  -- notifikasi hanya bila benar-benar berstatus diundang
  -- (mengundang ulang anggota yang sudah aktif tidak mengirim apa-apa)
  insert into public.notifications (user_id, type, payload)
  select v_target, 'review',
    jsonb_build_object(
      'title', 'Undangan ruang 🏫',
      'body', 'Kamu diundang bergabung ke ruang "' || w.nama || '". Buka menu Ruang untuk menerima.'
    )
  from public.workspaces w
  where w.id = p_workspace
    and exists (
      select 1 from public.memberships mm
      where mm.id = v_membership and mm.status = 'diundang'
    );

  return v_membership;
end $$;

-- Kirim notifikasi ke sesama anggota ruang (utk alur review/approval).
-- Guard: hanya boleh ke diri sendiri atau ke user yang satu ruang.
create or replace function public.notify_member(
  p_user uuid,
  p_type text,
  p_title text,
  p_body text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'TIDAK_LOGIN'; end if;
  if p_user <> auth.uid() and not public.shares_workspace_with(p_user) then
    raise exception 'BUKAN_ANGGOTA_RUANG';
  end if;
  insert into public.notifications (user_id, type, payload)
  values (
    p_user,
    case when p_type in ('dokumen','review','kredit','langganan','info') then p_type else 'info' end,
    jsonb_build_object('title', left(p_title, 120), 'body', left(p_body, 300))
  );
end $$;

grant execute on function public.invite_member(uuid, text, text) to authenticated;
grant execute on function public.notify_member(uuid, text, text, text) to authenticated;
revoke execute on function public.invite_member(uuid, text, text) from public, anon;
revoke execute on function public.notify_member(uuid, text, text, text) from public, anon;

-- ---------------------------------------------------------------------------
-- C. Pencarian konteks kurikulum (full-text 'simple' — tanpa embedding dulu).
--    /api/generate memanggil match_curriculum() lalu menyuntikkan hasilnya
--    ke prompt (prd.md §9 langkah 1-2). TODO M1+: ganti/duetkan dgn pgvector
--    saat pipeline embedding tersedia (kolom embedding sudah ada).
-- ---------------------------------------------------------------------------
alter table public.curriculum_docs
  add column if not exists tsv tsvector
  generated always as (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(chunk_text, ''))
  ) stored;

create index if not exists curriculum_docs_tsv_idx
  on public.curriculum_docs using gin (tsv);

create or replace function public.match_curriculum(
  p_query text,
  p_scope text default null, -- 'guru' | 'dosen' | null (null = semua)
  p_k int default 4
) returns table (title text, chunk_text text)
language plpgsql stable security definer set search_path = public as $$
declare
  v_q tsquery := plainto_tsquery('simple', coalesce(p_query, ''));
begin
  if auth.uid() is null then raise exception 'TIDAK_LOGIN'; end if;
  p_k := least(greatest(p_k, 1), 8);

  return query
  select c.title, c.chunk_text
  from public.curriculum_docs c
  where (p_scope is null or c.scope = p_scope or c.scope = 'umum')
    and (v_q = ''::tsquery or c.tsv @@ v_q)
  order by
    case when v_q = ''::tsquery then 0 else ts_rank(c.tsv, v_q) end desc,
    c.title
  limit p_k;
end $$;

grant execute on function public.match_curriculum(text, text, int) to authenticated;
revoke execute on function public.match_curriculum(text, text, int) from public, anon;
