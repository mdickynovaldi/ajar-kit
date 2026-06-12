/* AjarKit — POST /api/payments/create (prd.md §11, kontrak "create-transaction").
   Buat order pending + URL halaman bayar hosted Pakasir (QRIS/VA).
   Status final HANYA via webhook → settle_order (kredit tidak pernah
   ditambah dari klien).

   Bila PAKASIR_SLUG/API_KEY/SERVICE_ROLE kosong → { mode: "simulated" }
   dan klien memakai alur simulasi QRIS/VA yang sudah ada (prd.md §14). */

import { NextResponse } from "next/server";
import { createCheckout, PAKASIR_ENABLED } from "@/lib/server/pakasir";
import { adminClient, getUserFromRequest } from "@/lib/server/supabase";
import { getPostHogClient } from "@/lib/posthog-server";

interface CreateBody {
  type: "topup" | "subscription";
  label: string;
  method: string;
  amount: number;
  credits: number;
}

export async function POST(req: Request) {
  const admin = adminClient();
  if (!PAKASIR_ENABLED || !admin) {
    return NextResponse.json({ mode: "simulated" as const });
  }

  const auth = await getUserFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "TIDAK_LOGIN" }, { status: 401 });
  }

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "BODY_TIDAK_VALID" }, { status: 400 });
  }
  if (
    !["topup", "subscription"].includes(body?.type) ||
    typeof body.amount !== "number" ||
    body.amount < 1000 ||
    body.amount > 100_000_000 ||
    typeof body.credits !== "number" ||
    body.credits < 0
  ) {
    return NextResponse.json({ error: "BODY_TIDAK_VALID" }, { status: 400 });
  }

  const orderId = `AJK-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const origin =
    process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;

  // 1) catat transaksi pending (service role; payload menyimpan kredit utk webhook)
  const { error: insErr } = await admin.from("transactions").insert({
    user_id: auth.user.id,
    type: body.type,
    label: body.label.slice(0, 120),
    method: ["qris", "va", "ewallet", "card"].includes(body.method)
      ? body.method
      : "qris",
    amount: body.amount,
    status: "pending",
    order_id: orderId,
    payload: { credits: body.credits },
  });
  if (insErr) {
    console.error("AjarKit: gagal insert transaksi pending", insErr);
    return NextResponse.json({ error: "TRANSAKSI_GAGAL" }, { status: 500 });
  }

  // 2) bentuk URL pembayaran hosted Pakasir
  try {
    const cb = new URLSearchParams({
      order: orderId,
      paket: body.label,
      total: String(body.amount),
      kredit: String(body.credits),
      metode: "Pakasir",
    });
    const { paymentUrl } = createCheckout({
      invoiceNumber: orderId,
      amount: body.amount,
      callbackUrl: `${origin}/app/pembayaran/pending?${cb.toString()}`,
    });
    const phog = getPostHogClient();
    phog.capture({
      distinctId: auth.user.id,
      event: "payment_checkout_created",
      properties: {
        order_id: orderId,
        type: body.type,
        label: body.label,
        method: body.method,
        amount: body.amount,
        credits: body.credits,
      },
    });
    await phog.shutdown();
    return NextResponse.json({ mode: "gateway" as const, orderId, paymentUrl });
  } catch (e) {
    console.error("AjarKit: Pakasir checkout gagal", e);
    await admin.rpc("fail_order", { p_order_id: orderId });
    return NextResponse.json({ error: "PAKASIR_GAGAL" }, { status: 502 });
  }
}
