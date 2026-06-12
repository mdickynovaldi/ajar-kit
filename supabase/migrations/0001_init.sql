-- ============================================================================
-- AjarKit — Skema Supabase (prd.md §5, §10)
-- Jalankan SELURUH file ini di Supabase Dashboard → SQL Editor → Run.
-- Aman dijalankan pada project baru. Semua tabel ber-RLS.
--
-- Prinsip keamanan (prd.md §0.5–0.6, §12):
--   • Saldo kredit = SUM(credit_ledger.delta). profiles.credits hanya cache.
--   • Mutasi kredit/transaksi HANYA lewat fungsi SECURITY DEFINER di bawah
--     (klien tidak punya hak INSERT/UPDATE ke credit_ledger/transactions).
--   • Operasi kredit idempoten via ref_id/order_id unik.
-- ============================================================================

create extension if not exists pgcrypto;
create extension if not exists vector; -- pgvector utk RAG (curriculum_docs)

-- ============================================================================
-- 1. TABEL
-- ============================================================================

-- ---------- profiles (1:1 dengan auth.users) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nama text not null default '',
  email text not null default '',
  role text not null default 'guru' check (role in ('guru', 'dosen')),
  avatar_url text,
  -- konteks guru
  jenjang text,
  kelas text,
  mapel text[] not null default '{}',
  sekolah text,
  -- konteks dosen
  pt text,
  prodi text,
  mata_kuliah text[] not null default '{}',
  bio text,
  -- kredit: CACHE saja — sumber kebenaran credit_ledger (prd.md §10)
  credits int not null default 0,
  plan text not null default 'free' check (plan in ('free', 'pro', 'school')),
  workspace_id uuid,
  onboarding_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- documents ----------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  workspace_id uuid,
  type text not null check (
    type in ('modul_ajar', 'lkpd', 'asesmen', 'bank_soal', 'prota_promes', 'rps')
  ),
  title text not null,
  status text not null default 'draft' check (
    status in ('draft', 'selesai', 'menunggu_review', 'disetujui', 'revisi')
  ),
  subject text not null default '',
  jenjang text not null default '',
  quality_mode text not null default 'standar' check (
    quality_mode in ('hemat', 'standar', 'tinggi')
  ),
  content jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists documents_owner_idx on public.documents (owner_id, updated_at desc);
create index if not exists documents_workspace_idx on public.documents (workspace_id);

-- ---------- generation_jobs ----------
create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  document_id uuid references public.documents (id) on delete set null,
  job_ref text not null,
  doc_type text not null,
  quality_mode text not null default 'standar',
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'error')),
  steps jsonb,
  tokens_in int,
  tokens_out int,
  cost_idr numeric,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists generation_jobs_user_idx on public.generation_jobs (user_id, created_at desc);

-- ---------- credit_ledger (SUMBER KEBENARAN saldo) ----------
create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  delta int not null,
  reason text not null check (reason in ('topup', 'generation', 'regen', 'refund', 'bonus')),
  ref_id text,
  balance_after int not null,
  created_at timestamptz not null default now()
);
create index if not exists credit_ledger_user_idx on public.credit_ledger (user_id, created_at desc);
-- idempotensi operasi kredit (prd.md §10): satu ref per user per jenis
create unique index if not exists credit_ledger_ref_unique
  on public.credit_ledger (user_id, reason, ref_id) where ref_id is not null;

-- ---------- transactions (Doku) ----------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('topup', 'subscription')),
  label text not null default '',
  method text not null check (method in ('qris', 'va', 'ewallet', 'card')),
  amount numeric not null,
  status text not null default 'pending' check (status in ('pending', 'lunas', 'gagal')),
  order_id text not null unique,
  doku_ref text,
  payload jsonb,
  created_at timestamptz not null default now()
);
create index if not exists transactions_user_idx on public.transactions (user_id, created_at desc);

-- ---------- subscriptions ----------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  workspace_id uuid,
  plan text not null,
  status text not null default 'aktif' check (status in ('aktif', 'akan_berakhir', 'dibatalkan')),
  period_end date,
  method text,
  created_at timestamptz not null default now()
);

-- ---------- workspaces + memberships (Ruang Sekolah/Prodi, M3) ----------
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  logo_url text,
  owner_id uuid not null references public.profiles (id),
  plan text not null default 'school',
  seats int not null default 10,
  approval_required boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'anggota' check (role in ('admin', 'anggota')),
  status text not null default 'aktif' check (status in ('aktif', 'diundang', 'nonaktif')),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

-- ---------- reviews ----------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  reviewer_id uuid references public.profiles (id),
  status text not null default 'menunggu' check (status in ('menunggu', 'disetujui', 'revisi')),
  comments jsonb,
  created_at timestamptz not null default now()
);

-- ---------- curriculum_docs (RAG, M1+) ----------
create table if not exists public.curriculum_docs (
  id uuid primary key default gen_random_uuid(),
  scope text not null default 'umum',
  jenjang text,
  title text not null,
  source text,
  chunk_text text not null,
  embedding vector(768) -- sesuaikan dimensi model embedding
);

-- ---------- notifications ----------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null default 'info',
  payload jsonb not null default '{}', -- { "title": "...", "body": "..." }
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- ============================================================================
-- 2. TRIGGER
-- ============================================================================

-- updated_at otomatis
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists set_updated_at_profiles on public.profiles;
create trigger set_updated_at_profiles before update on public.profiles
  for each row execute function public.tg_set_updated_at();

drop trigger if exists set_updated_at_documents on public.documents;
create trigger set_updated_at_documents before update on public.documents
  for each row execute function public.tg_set_updated_at();

-- Profil otomatis saat user mendaftar + bonus kredit awal (ledger 'bonus').
-- nama & role dikirim frontend via auth.signUp({ options: { data: { nama, role } } }).
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
  v_bonus int := 320; -- bonus kredit pendaftaran -- TODO: konfirmasi nilai produksi
begin
  if v_role not in ('guru', 'dosen') then v_role := 'guru'; end if;

  insert into public.profiles (id, nama, email, role, credits)
  values (new.id, v_nama, coalesce(new.email, ''), v_role, v_bonus);

  insert into public.credit_ledger (user_id, delta, reason, ref_id, balance_after)
  values (new.id, v_bonus, 'bonus', 'signup-bonus', v_bonus);

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Pembuat workspace otomatis jadi anggota admin (tanpa ini, RLS memberships
-- buntu: butuh admin utk menulis baris admin pertama)
create or replace function public.handle_new_workspace()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.memberships (workspace_id, user_id, role, status)
  values (new.id, new.owner_id, 'admin', 'aktif')
  on conflict (workspace_id, user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_workspace_created on public.workspaces;
create trigger on_workspace_created
  after insert on public.workspaces
  for each row execute function public.handle_new_workspace();

-- Kepemilikan dokumen tidak boleh dipindah lewat UPDATE
create or replace function public.tg_documents_protect()
returns trigger language plpgsql as $$
begin
  if new.owner_id <> old.owner_id then
    raise exception 'OWNER_TIDAK_BOLEH_DIUBAH';
  end if;
  return new;
end $$;

drop trigger if exists documents_protect on public.documents;
create trigger documents_protect
  before update on public.documents
  for each row execute function public.tg_documents_protect();

-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================

alter table public.profiles        enable row level security;
alter table public.documents       enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.credit_ledger   enable row level security;
alter table public.transactions    enable row level security;
alter table public.subscriptions   enable row level security;
alter table public.workspaces      enable row level security;
alter table public.memberships     enable row level security;
alter table public.reviews         enable row level security;
alter table public.curriculum_docs enable row level security;
alter table public.notifications   enable row level security;

-- helper: apakah auth.uid() anggota workspace?
create or replace function public.is_workspace_member(p_workspace uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships
    where workspace_id = p_workspace and user_id = auth.uid() and status = 'aktif'
  );
$$;

create or replace function public.is_workspace_admin(p_workspace uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships
    where workspace_id = p_workspace and user_id = auth.uid()
      and role = 'admin' and status = 'aktif'
  );
$$;

-- ---------- profiles ----------
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Kolom sensitif TIDAK boleh di-update klien (credits = cache server-only).
revoke update on public.profiles from authenticated, anon;
grant update (
  nama, avatar_url, role, jenjang, kelas, mapel, sekolah,
  pt, prodi, mata_kuliah, bio, onboarding_done, workspace_id,
  plan -- TODO produksi: pindahkan ke webhook pembayaran (jangan dari klien)
) on public.profiles to authenticated;

-- ---------- documents: pemilik penuh; anggota ruang boleh baca ----------
drop policy if exists documents_select on public.documents;
create policy documents_select on public.documents
  for select using (
    owner_id = auth.uid()
    or (workspace_id is not null and public.is_workspace_member(workspace_id))
  );

drop policy if exists documents_insert_own on public.documents;
create policy documents_insert_own on public.documents
  for insert with check (
    owner_id = auth.uid()
    -- tidak boleh menempelkan dokumen ke workspace yang bukan miliknya
    and (workspace_id is null or public.is_workspace_member(workspace_id))
  );

drop policy if exists documents_update on public.documents;
create policy documents_update on public.documents
  for update using (
    owner_id = auth.uid()
    or (workspace_id is not null and public.is_workspace_admin(workspace_id))
  )
  with check (
    workspace_id is null or public.is_workspace_member(workspace_id)
    or public.is_workspace_admin(workspace_id)
  );

drop policy if exists documents_delete_own on public.documents;
create policy documents_delete_own on public.documents
  for delete using (owner_id = auth.uid());

-- ---------- generation_jobs / credit_ledger / transactions:
-- klien hanya BACA milik sendiri; tulis hanya via fungsi security definer ----------
drop policy if exists generation_jobs_select_own on public.generation_jobs;
create policy generation_jobs_select_own on public.generation_jobs
  for select using (user_id = auth.uid());
revoke insert, update, delete on public.generation_jobs from authenticated, anon;

drop policy if exists credit_ledger_select_own on public.credit_ledger;
create policy credit_ledger_select_own on public.credit_ledger
  for select using (user_id = auth.uid());
revoke insert, update, delete on public.credit_ledger from authenticated, anon;

drop policy if exists transactions_select_own on public.transactions;
create policy transactions_select_own on public.transactions
  for select using (user_id = auth.uid());
revoke insert, update, delete on public.transactions from authenticated, anon;

drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own on public.subscriptions
  for select using (user_id = auth.uid());
revoke insert, update, delete on public.subscriptions from authenticated, anon;

-- ---------- workspaces / memberships / reviews (Ruang, M3) ----------
drop policy if exists workspaces_select_member on public.workspaces;
create policy workspaces_select_member on public.workspaces
  for select using (owner_id = auth.uid() or public.is_workspace_member(id));

drop policy if exists workspaces_insert_own on public.workspaces;
create policy workspaces_insert_own on public.workspaces
  for insert with check (owner_id = auth.uid());

drop policy if exists workspaces_update_admin on public.workspaces;
create policy workspaces_update_admin on public.workspaces
  for update using (owner_id = auth.uid() or public.is_workspace_admin(id));

drop policy if exists memberships_select_member on public.memberships;
create policy memberships_select_member on public.memberships
  for select using (user_id = auth.uid() or public.is_workspace_member(workspace_id));

drop policy if exists memberships_admin_write on public.memberships;
create policy memberships_admin_write on public.memberships
  for all using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

drop policy if exists reviews_select_member on public.reviews;
create policy reviews_select_member on public.reviews
  for select using (public.is_workspace_member(workspace_id));

drop policy if exists reviews_insert_member on public.reviews;
create policy reviews_insert_member on public.reviews
  for insert with check (public.is_workspace_member(workspace_id));

drop policy if exists reviews_update_admin on public.reviews;
create policy reviews_update_admin on public.reviews
  for update using (public.is_workspace_admin(workspace_id));

-- ---------- curriculum_docs: baca utk semua user login (RAG) ----------
drop policy if exists curriculum_select_authed on public.curriculum_docs;
create policy curriculum_select_authed on public.curriculum_docs
  for select using (auth.uid() is not null);
revoke insert, update, delete on public.curriculum_docs from authenticated, anon;

-- ---------- notifications: penuh milik sendiri ----------
drop policy if exists notifications_own on public.notifications;
create policy notifications_own on public.notifications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- 4. FUNGSI RPC (dipanggil frontend via supabase.rpc)
--    Semua SECURITY DEFINER: validasi saldo & idempotensi terjadi DI SERVER.
--    Catatan arsitektur: pada produksi penuh (prd.md §9/§11) fungsi2 ini
--    dipanggil dari Edge Functions (generate, payment-webhook). Kontrak
--    datanya sudah sama sehingga migrasinya tinggal memindah pemanggil.
-- ============================================================================

-- Saldo nyata dari ledger
create or replace function public.credit_balance()
returns int language sql stable security definer set search_path = public as $$
  select coalesce(sum(delta), 0)::int from public.credit_ledger
  where user_id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- generate_documents: potong kredit SEKALI + buat 1..N dokumen secara ATOMIK.
-- p_docs: JSON array [{title, type, subject, jenjang, quality_mode, content}]
-- Idempoten via p_job_ref (panggilan ulang dgn ref sama tidak memotong lagi).
-- Error 'KREDIT_TIDAK_CUKUP' bila saldo < p_cost (kredit utuh).
-- ---------------------------------------------------------------------------
create or replace function public.generate_documents(
  p_job_ref text,
  p_cost int,
  p_docs jsonb
) returns table (id uuid, title text, type text)
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_balance int;
  v_doc jsonb;
  v_doc_id uuid;
  v_first_doc uuid;
begin
  if v_uid is null then
    raise exception 'TIDAK_LOGIN';
  end if;
  if p_cost < 0 or p_job_ref is null or jsonb_array_length(p_docs) = 0 then
    raise exception 'PARAMETER_TIDAK_VALID';
  end if;

  -- kunci baris profil → serialisasi operasi kredit per user
  -- (profiles.id wajib dikualifikasi: "id" juga nama kolom OUT fungsi ini)
  perform 1 from public.profiles where profiles.id = v_uid for update;

  -- idempoten: job ini sudah pernah diproses → kembalikan dokumen yang ada
  if exists (
    select 1 from public.credit_ledger
    where user_id = v_uid and reason = 'generation' and ref_id = p_job_ref
  ) then
    return query
      select d.id, d.title, d.type from public.documents d
      join public.generation_jobs j on j.document_id = d.id
      where j.user_id = v_uid and j.job_ref = p_job_ref;
    return;
  end if;

  select coalesce(sum(delta), 0)::int into v_balance
  from public.credit_ledger where user_id = v_uid;

  if v_balance < p_cost then
    raise exception 'KREDIT_TIDAK_CUKUP';
  end if;

  for v_doc in select * from jsonb_array_elements(p_docs) loop
    insert into public.documents
      (owner_id, type, title, status, subject, jenjang, quality_mode, content)
    values (
      v_uid,
      v_doc ->> 'type',
      coalesce(v_doc ->> 'title', 'Dokumen'),
      'selesai',
      coalesce(v_doc ->> 'subject', ''),
      coalesce(v_doc ->> 'jenjang', ''),
      coalesce(v_doc ->> 'quality_mode', 'standar'),
      v_doc -> 'content'
    )
    returning documents.id into v_doc_id;

    if v_first_doc is null then v_first_doc := v_doc_id; end if;

    insert into public.generation_jobs
      (user_id, document_id, job_ref, doc_type, quality_mode, status)
    values (
      v_uid, v_doc_id, p_job_ref,
      v_doc ->> 'type', coalesce(v_doc ->> 'quality_mode', 'standar'), 'done'
    );
  end loop;

  -- potong kredit hanya saat sukses (prd.md §8.3 ✓), catat ke ledger + cache
  if p_cost > 0 then
    insert into public.credit_ledger (user_id, delta, reason, ref_id, balance_after)
    values (v_uid, -p_cost, 'generation', p_job_ref, v_balance - p_cost);
  end if;
  update public.profiles set credits = v_balance - p_cost
  where profiles.id = v_uid;

  return query
    select d.id, d.title, d.type from public.documents d
    join public.generation_jobs j on j.document_id = d.id
    where j.user_id = v_uid and j.job_ref = p_job_ref;
end $$;

-- ---------------------------------------------------------------------------
-- spend_credits: potong kredit generik (mis. regenerasi per-bagian editor).
-- Idempoten via p_ref. Error 'KREDIT_TIDAK_CUKUP' bila saldo kurang.
-- ---------------------------------------------------------------------------
create or replace function public.spend_credits(
  p_amount int,
  p_ref text
) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_balance int;
begin
  if v_uid is null then raise exception 'TIDAK_LOGIN'; end if;
  if p_amount <= 0 then raise exception 'PARAMETER_TIDAK_VALID'; end if;

  perform 1 from public.profiles where profiles.id = v_uid for update;

  -- reason 'regen' (bukan 'generation') agar namespace idempotensi terpisah
  -- dari job ref generate_documents
  if p_ref is not null and exists (
    select 1 from public.credit_ledger
    where user_id = v_uid and reason = 'regen' and ref_id = p_ref
  ) then
    return (select coalesce(sum(delta), 0)::int from public.credit_ledger where user_id = v_uid);
  end if;

  select coalesce(sum(delta), 0)::int into v_balance
  from public.credit_ledger where user_id = v_uid;

  if v_balance < p_amount then raise exception 'KREDIT_TIDAK_CUKUP'; end if;

  insert into public.credit_ledger (user_id, delta, reason, ref_id, balance_after)
  values (v_uid, -p_amount, 'regen', p_ref, v_balance - p_amount);
  update public.profiles set credits = v_balance - p_amount
  where profiles.id = v_uid;

  return v_balance - p_amount;
end $$;

-- ---------------------------------------------------------------------------
-- simulate_payment: SIMULASI pembayaran lunas (fase mock — prd.md §14).
-- TODO PRODUKSI: hapus fungsi ini; ganti dgn Edge Function `create-transaction`
--   + `payment-webhook` Doku terverifikasi (prd.md §11). JANGAN pernah
--   menambah kredit langsung dari klien di produksi.
-- type 'topup'  : tambah p_credits ke ledger.
-- type 'subscription': set plan='pro' + baris subscriptions 30 hari.
-- Idempoten via p_order_id (unique).
-- ---------------------------------------------------------------------------
create or replace function public.simulate_payment(
  p_order_id text,
  p_type text,          -- 'topup' | 'subscription'
  p_label text,
  p_method text,        -- 'qris' | 'va' | 'ewallet' | 'card'
  p_amount numeric,
  p_credits int default 0
) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_balance int;
begin
  if v_uid is null then raise exception 'TIDAK_LOGIN'; end if;
  if p_type not in ('topup', 'subscription') then raise exception 'PARAMETER_TIDAK_VALID'; end if;

  perform 1 from public.profiles where profiles.id = v_uid for update;

  -- idempoten: order sudah diproses → kembalikan saldo sekarang
  if exists (select 1 from public.transactions where order_id = p_order_id) then
    return (select coalesce(sum(delta), 0)::int from public.credit_ledger where user_id = v_uid);
  end if;

  insert into public.transactions (user_id, type, label, method, amount, status, order_id)
  values (v_uid, p_type, p_label, p_method, p_amount, 'lunas', p_order_id);

  select coalesce(sum(delta), 0)::int into v_balance
  from public.credit_ledger where user_id = v_uid;

  if p_type = 'topup' and p_credits > 0 then
    v_balance := v_balance + p_credits;
    insert into public.credit_ledger (user_id, delta, reason, ref_id, balance_after)
    values (v_uid, p_credits, 'topup', p_order_id, v_balance);
    update public.profiles set credits = v_balance
    where profiles.id = v_uid;
  end if;

  if p_type = 'subscription' then
    update public.profiles set plan = 'pro'
    where profiles.id = v_uid;
    insert into public.subscriptions (user_id, plan, status, period_end, method)
    values (v_uid, 'pro', 'aktif', (now() + interval '30 days')::date, p_method);
  end if;

  return v_balance;
end $$;

-- hak eksekusi RPC
grant execute on function public.credit_balance() to authenticated;
grant execute on function public.generate_documents(text, int, jsonb) to authenticated;
grant execute on function public.spend_credits(int, text) to authenticated;
grant execute on function public.simulate_payment(text, text, text, text, numeric, int) to authenticated;
-- revoke dari PUBLIC (default Postgres memberi EXECUTE ke public) + anon
revoke execute on function public.credit_balance() from public, anon;
revoke execute on function public.generate_documents(text, int, jsonb) from public, anon;
revoke execute on function public.spend_credits(int, text) from public, anon;
revoke execute on function public.simulate_payment(text, text, text, text, numeric, int) from public, anon;

-- ============================================================================
-- Selesai. Setelah run:
--   1. Authentication → Providers → aktifkan Email (dan Google bila perlu).
--   2. (Opsional, demo lebih mulus) Authentication → Settings →
--      matikan "Confirm email" agar daftar langsung bisa masuk.
--   3. Salin Project URL + anon key ke .env.local (lihat .env.example).
-- ============================================================================
