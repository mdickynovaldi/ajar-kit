/* AjarKit — POST /api/payments/webhook (prd.md §11, kontrak "payment-webhook").
   Notifikasi HTTP dari Pakasir. Webhook Pakasir TIDAK membawa signature —
   keaslian dibuktikan dengan memanggil balik GET /api/transactiondetail
   memakai api_key rahasia + amount DARI DATABASE (bukan dari body webhook,
   yang bisa dipalsukan siapa pun). Aturan keras:
   1) verifikasi via transactiondetail SEBELUM settle,
   2) settle idempoten via SQL settle_order (abaikan duplikat),
   3) kredit/paket HANYA ditambah di sini — tidak pernah dari klien.

   Daftarkan URL ini di dashboard Pakasir → Edit Proyek → Webhook URL:
     {APP_URL}/api/payments/webhook  */

import { NextResponse } from "next/server";
import { verifyTransaction } from "@/lib/server/pakasir";
import { adminClient } from "@/lib/server/supabase";
import { getPostHogClient } from "@/lib/posthog-server";

/** warn migration 0008 belum jalan: sekali saja per proses (pola register_export di export/pdf) */
let warnedReferralConversionMissing = false;

export async function POST(req: Request) {
  let body: { order_id?: string; status?: string; amount?: number };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "BODY_TIDAK_VALID" }, { status: 400 });
  }

  const orderId = body.order_id;
  if (!orderId) {
    return NextResponse.json({ error: "ORDER_TIDAK_ADA" }, { status: 400 });
  }

  const admin = adminClient();
  if (!admin) {
    return NextResponse.json({ error: "SERVER_BELUM_DIKONFIGURASI" }, { status: 500 });
  }

  // Ambil transaksi kita sendiri — amount untuk verifikasi DIAMBIL DARI DB,
  // bukan dari body webhook.
  const { data: trx, error: trxErr } = await admin
    .from("transactions")
    .select("amount, status")
    .eq("order_id", orderId)
    .single();
  if (trxErr || !trx) {
    return NextResponse.json({ error: "TRANSAKSI_TIDAK_DITEMUKAN" }, { status: 404 });
  }

  if (body.status !== "completed") {
    // Pakasir tidak mengirim status gagal/expired — selain "completed"
    // tidak ada aksi (pembatalan ditangani di alur klien yang sudah ada).
    return NextResponse.json({ ok: true });
  }

  const { paid } = await verifyTransaction({
    orderId,
    amount: Number(trx.amount),
  });
  if (!paid) {
    // Tidak terbukti lunas di Pakasir → JANGAN settle.
    return NextResponse.json({ error: "VERIFIKASI_GAGAL" }, { status: 401 });
  }

  const { error, data: settled } = await admin.rpc("settle_order", { p_order_id: orderId });
  if (error) {
    console.error("AjarKit webhook: settle gagal", error);
    // 500 → Pakasir akan mengirim ulang notifikasi (retry)
    return NextResponse.json({ error: "SETTLE_GAGAL" }, { status: 500 });
  }
  // Bonus referral: pembelian lunas PERTAMA teman → pengundang +10% kredit
  // (migration 0008, idempoten via order_id). Best-effort — JANGAN gagalkan
  // respons webhook hanya karena bonus referral gagal (settle sudah sukses).
  try {
    const { error: refErr } = await admin.rpc("award_referral_conversion", {
      p_order_id: orderId,
    });
    if (refErr) {
      const e = refErr as { code?: string; message?: string };
      if (
        e.code === "PGRST202" ||
        (e.message ?? "").includes("award_referral_conversion")
      ) {
        if (!warnedReferralConversionMissing) {
          warnedReferralConversionMissing = true;
          console.warn(
            "AjarKit: fungsi award_referral_conversion belum ada — jalankan migration 0008 (bonus referral tidak diberikan).",
          );
        }
      } else {
        console.error("AjarKit: award_referral_conversion gagal", refErr);
      }
    }
  } catch (e) {
    console.error("AjarKit: award_referral_conversion gagal", e);
  }

  const row = settled as { user_id?: string; amount?: number; type?: string } | null;
  const phog = getPostHogClient();
  phog.capture({
    distinctId: row?.user_id ?? orderId,
    event: "payment_webhook_settled",
    properties: {
      order_id: orderId,
      amount: row?.amount,
      type: row?.type,
    },
  });
  await phog.shutdown();

  return NextResponse.json({ ok: true });
}
