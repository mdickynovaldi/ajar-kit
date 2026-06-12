/* AjarKit — integrasi Pakasir (server-only, prd.md §11).
   Dipakai route handlers /api/payments/*. Rahasia TIDAK pernah ke browser.

   Pakasir tidak punya API "create checkout" — URL halaman bayar hosted
   dibentuk langsung:
     https://app.pakasir.com/pay/{slug}/{amount}?order_id=…&redirect=…
   Webhook Pakasir TIDAK membawa signature, jadi keaslian transaksi WAJIB
   diverifikasi balik via GET /api/transactiondetail (butuh api_key).
   Metode yang didukung: QRIS + Virtual Account.
   Dok: https://pakasir.com */

import "server-only";

const SLUG = process.env.PAKASIR_SLUG;
const API_KEY = process.env.PAKASIR_API_KEY;
const BASE_URL = "https://app.pakasir.com";

export const PAKASIR_ENABLED = Boolean(SLUG && API_KEY);

export interface CheckoutResult {
  paymentUrl: string;
}

/** Bentuk URL halaman bayar hosted Pakasir — tanpa panggilan API.
    callbackUrl = halaman pending kita; status final via webhook. */
export function createCheckout(input: {
  invoiceNumber: string;
  amount: number;
  callbackUrl: string;
}): CheckoutResult {
  if (!PAKASIR_ENABLED) throw new Error("PAKASIR_BELUM_DIKONFIGURASI");

  const qs = new URLSearchParams({
    order_id: input.invoiceNumber,
    redirect: input.callbackUrl,
  });
  return {
    paymentUrl: `${BASE_URL}/pay/${SLUG}/${input.amount}?${qs.toString()}`,
  };
}

export interface TransactionDetail {
  amount?: number;
  order_id?: string;
  project?: string;
  status?: string;
  payment_method?: string;
  completed_at?: string;
}

/** Verifikasi keaslian transaksi langsung ke API Pakasir — WAJIB sebelum
    settle, karena webhook Pakasir tidak bertanda tangan. `amount` HARUS
    nilai dari database kita (bukan dari body webhook).
    paid = status "completed" + amount & project cocok. Gagal fetch → paid:false. */
export async function verifyTransaction(input: {
  orderId: string;
  amount: number;
}): Promise<{ paid: boolean; detail: TransactionDetail | null }> {
  if (!PAKASIR_ENABLED) return { paid: false, detail: null };

  try {
    const qs = new URLSearchParams({
      project: SLUG!,
      amount: String(input.amount),
      order_id: input.orderId,
      api_key: API_KEY!,
    });
    const res = await fetch(`${BASE_URL}/api/transactiondetail?${qs.toString()}`);
    const json = (await res.json().catch(() => null)) as {
      transaction?: TransactionDetail;
    } | null;
    const detail = json?.transaction ?? null;
    if (!res.ok || !detail) return { paid: false, detail };

    const paid =
      detail.status === "completed" &&
      Number(detail.amount) === input.amount &&
      detail.project === SLUG;
    return { paid, detail };
  } catch (e) {
    console.error("AjarKit: verifikasi transaksi Pakasir gagal", e);
    return { paid: false, detail: null };
  }
}
