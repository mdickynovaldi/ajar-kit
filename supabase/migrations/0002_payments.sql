-- ============================================================================
-- AjarKit — Migration 0002: settlement pembayaran Doku (webhook)
-- Jalankan SETELAH 0001_init.sql (aman dijalankan kapan saja, additive).
--
-- Alur produksi (prd.md §11):
--   /api/payments/create  → insert transactions (pending) + panggil Doku
--   Doku webhook → /api/payments/webhook → verifikasi signature →
--   settle_order(order_id)  ← fungsi ini (idempoten)
--
-- settle_order HANYA boleh dipanggil service_role (server) — bukan klien.
-- ============================================================================

create or replace function public.settle_order(p_order_id text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_trx record;
  v_credits int;
  v_balance int;
begin
  select * into v_trx from public.transactions
  where order_id = p_order_id
  for update;

  if not found then
    raise exception 'ORDER_TIDAK_DITEMUKAN';
  end if;

  -- idempoten: webhook Doku bisa terkirim berkali-kali
  if v_trx.status = 'lunas' then
    return;
  end if;

  -- kunci baris profil → serialisasi operasi kredit per user
  perform 1 from public.profiles where profiles.id = v_trx.user_id for update;

  update public.transactions set status = 'lunas' where order_id = p_order_id;

  v_credits := coalesce((v_trx.payload ->> 'credits')::int, 0);

  if v_trx.type = 'topup' and v_credits > 0 then
    select coalesce(sum(delta), 0)::int into v_balance
    from public.credit_ledger where user_id = v_trx.user_id;

    insert into public.credit_ledger (user_id, delta, reason, ref_id, balance_after)
    values (v_trx.user_id, v_credits, 'topup', p_order_id, v_balance + v_credits)
    on conflict do nothing; -- idempoten via index unik (user, reason, ref)

    update public.profiles set credits = v_balance + v_credits
    where profiles.id = v_trx.user_id;
  end if;

  if v_trx.type = 'subscription' then
    update public.profiles set plan = 'pro'
    where profiles.id = v_trx.user_id;
    insert into public.subscriptions (user_id, plan, status, period_end, method)
    values (v_trx.user_id, 'pro', 'aktif', (now() + interval '30 days')::date, v_trx.method);
  end if;
end $$;

-- tandai gagal/kedaluwarsa (dipanggil server saat notifikasi FAILED/EXPIRED)
create or replace function public.fail_order(p_order_id text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.transactions set status = 'gagal'
  where order_id = p_order_id and status = 'pending';
end $$;

-- hanya service_role (server) — klien tidak boleh men-settle pembayaran
revoke execute on function public.settle_order(text) from public, anon, authenticated;
revoke execute on function public.fail_order(text) from public, anon, authenticated;
grant execute on function public.settle_order(text) to service_role;
grant execute on function public.fail_order(text) to service_role;
