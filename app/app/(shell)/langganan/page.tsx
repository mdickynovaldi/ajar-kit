"use client";

/* AjarKit — Langganan / Paket (design.md §9.I.2 & §13, prd.md §8.7 & §11).
   Tanpa HTML rujukan — memakai pola desain harga.html + sheet pembayaran
   bersama. Status Pro dipersist via store (app.plan); detail siklus
   (label + tanggal perpanjangan) disimpan lokal sebagai pelengkap. */

import { useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import posthog from "posthog-js";
import { Icon } from "@/components/ui/icon";
import { Progress, Segmented } from "@/components/ui/controls";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { useApp } from "@/lib/store";
import { FREE_QUOTA, FREE_QUOTA_USED } from "@/lib/constants";
import { rupiah } from "@/lib/format";
import { QrisPaySheet } from "@/app/app/pembayaran/_components/payment-sheets";

type Cycle = "bln" | "thn";
type ProPlan = { label: string; amount: number; renewLabel: string; toast: string };

const PRO_BENEFITS = [
  "Kuota besar (fair use)",
  "Semua dokumen & Kit Lengkap",
  "Mode kualitas tinggi",
  "Tanpa watermark",
];

const SEAT_PRICE = 150_000; // Rp / kursi / bln
const SEAT_MIN = 10;
const SEAT_MAX = 200;

/** orderId unik per percobaan bayar (idempoten di completePayment) */
const makeOrderId = () =>
  `order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function LanggananPage() {
  const app = useApp();
  const toast = useToast();

  const [cycle, setCycle] = useState<Cycle>("bln");
  const [seats, setSeats] = useState(SEAT_MIN);

  /* status langganan: sumber kebenaran = store (dipersist).
     Detail siklus pembelian terakhir hanya pelengkap tampilan. */
  const isPro = app.plan === "pro";
  const [proDetail, setProDetail] = useState<{
    label: string;
    renewLabel: string;
  } | null>(null);
  const proLabel = proDetail?.label ?? "Pro";
  const renewLabel = proDetail?.renewLabel ?? "10 Juli 2026";

  const [paying, setPaying] = useState<ProPlan | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  /* cegah klik ganda saat sesi checkout Pakasir sedang dibuat */
  const [busy, setBusy] = useState(false);
  /* satu orderId per percobaan bayar — retry memakai orderId yang sama
     sehingga completePayment (RPC simulate_payment) tetap idempoten */
  const orderIdRef = useRef("");

  function startPay(plan: ProPlan) {
    if (busy) return;
    posthog.capture("subscription_initiated", {
      plan_label: plan.label,
      amount: plan.amount,
      billing_cycle: cycle,
    });
    orderIdRef.current = makeOrderId();
    setBusy(true);
    void (async () => {
      /* coba pembayaran NYATA via Pakasir dulu (server /api/payments/create).
         "simulated" = mode mock / Pakasir belum dikonfigurasi → sheet QRIS
         simulasi yang ada. */
      let co:
        | { mode: "simulated" }
        | { mode: "gateway"; orderId: string; paymentUrl: string };
      try {
        co = await app.startCheckout({
          orderId: "", // server membuat orderId-nya sendiri
          type: "subscription",
          label: `Langganan ${plan.label}`,
          method: "qris",
          amount: plan.amount,
          credits: 0,
        });
      } catch {
        co = { mode: "simulated" };
      }
      if (co.mode === "gateway") {
        toast("Mengarahkan ke pembayaran Pakasir…");
        /* busy tetap true; pembayaran diselesaikan di halaman Pakasir →
           redirect kembali ke /app/pembayaran/pending?order=… dan plan
           diaktifkan SERVER lewat webhook (klien tidak pernah settle). */
        window.location.href = co.paymentUrl;
        return;
      }
      // alur simulasi (perilaku lama, tidak berubah)
      setBusy(false);
      setPaying(plan);
    })();
  }

  const proMonthly: ProPlan = {
    label: "Pro Bulanan",
    amount: 49_000,
    renewLabel: "10 Juli 2026",
    toast: "Pro aktif 30 hari 🎉",
  };
  const proYearly: ProPlan = {
    label: "Pro Tahunan",
    amount: 468_000,
    renewLabel: "10 Juni 2027",
    toast: "Pro aktif 1 tahun 🎉",
  };
  const pro30: ProPlan = {
    label: "Pro 30 hari",
    amount: 49_000,
    renewLabel: "10 Juli 2026",
    toast: "Pro aktif 30 hari 🎉",
  };

  async function onPaid() {
    if (!paying) return;
    try {
      /* settle ATOMIK via store: transaksi + plan='pro' di kedua mode
         (Supabase = RPC simulate_payment, idempoten per orderId) */
      await app.completePayment({
        orderId: orderIdRef.current || makeOrderId(),
        type: "subscription",
        label: `Langganan ${paying.label}`,
        method: "qris",
        amount: paying.amount,
        credits: 0,
      });
    } catch {
      // sheet tetap terbuka — pengguna bisa coba lagi (orderId sama, idempoten)
      toast("Gagal memproses pembayaran. Coba lagi, ya.", false);
      return;
    }
    app.addNotification({
      type: "langganan",
      title: "Langganan Pro aktif 🎉",
      body: `${paying.label} aktif. Perpanjangan berikutnya: ${paying.renewLabel}.`,
      timeLabel: "Baru saja",
    });
    setProDetail({ label: paying.label, renewLabel: paying.renewLabel });
    toast(paying.toast);
    setPaying(null);
  }

  function confirmCancel() {
    // TODO M1+: downgrade sisi server (webhook/cron pembayaran) — untuk saat
    // ini hanya update plan di profil (mock: lokal; Supabase: kolom profiles).
    app.setPlan("free");
    setCancelOpen(false);
    toast(`Langganan dibatalkan. Pro tetap aktif sampai ${renewLabel}.`);
  }

  const seatTotal = seats * SEAT_PRICE;

  return (
    <>
      <h1 className="t-h1" style={{ marginBottom: 4 }}>
        Langganan
      </h1>
      <p className="muted" style={{ marginBottom: 22 }}>
        Upgrade ke Pro untuk kuota besar, atau kelola paket sekolah/kampus.
      </p>

      <div className="stack" style={{ "--gap": "16px" } as CSSProperties}>
        {/* Paket aktif */}
        <div className="card pad">
          <div className="row between wrap" style={{ gap: 12 }}>
            <div className="grow">
              <span className="t-caption muted">PAKET AKTIF</span>
              <h3 className="t-h3" style={{ margin: "4px 0 2px" }}>
                {isPro ? proLabel : "Gratis"}
              </h3>
              {isPro ? (
                <p className="t-small muted">
                  Perpanjangan berikutnya: {renewLabel} · dibayar via QRIS.
                </p>
              ) : (
                <p className="t-small muted">
                  Kuota {FREE_QUOTA} dokumen / bulan · mode hemat · ekspor dengan
                  watermark.
                </p>
              )}
            </div>
            <span className="badge badge-selesai">Aktif</span>
          </div>
          {!isPro && (
            <div style={{ marginTop: 14, maxWidth: 360 }}>
              <Progress value={(FREE_QUOTA_USED / FREE_QUOTA) * 100} />
              <p className="t-small muted" style={{ marginTop: 6 }}>
                {FREE_QUOTA_USED} dari {FREE_QUOTA} dokumen terpakai bulan ini.
              </p>
            </div>
          )}
          {isPro && (
            <div style={{ marginTop: 14 }}>
              <button
                className="btn btn-secondary sm"
                onClick={() => setCancelOpen(true)}
              >
                Kelola / Batalkan langganan
              </button>
            </div>
          )}
        </div>

        <div className="sub-grid">
          {/* Pro */}
          <div className="card pad-lg sub-plan">
            <span
              className="badge badge-pop"
              style={{ position: "absolute", top: 16, right: 16 }}
            >
              Populer
            </span>
            <h3 className="t-h3">Pro</h3>
            <p className="t-small muted">Untuk guru &amp; dosen aktif.</p>
            <div style={{ margin: "12px 0 4px" }}>
              <Segmented<Cycle>
                options={[
                  { value: "bln", label: "Bulanan" },
                  { value: "thn", label: "Tahunan" },
                ]}
                value={cycle}
                onChange={setCycle}
              />
            </div>
            <div className="amt">
              {cycle === "thn" ? "Rp 39rb" : "Rp 49rb"}
              <span className="t-small muted" style={{ fontWeight: 500 }}>
                {" "}
                /bln
              </span>
            </div>
            <p className="t-small muted">
              {cycle === "thn"
                ? `Ditagih ${rupiah(proYearly.amount)} / tahun — hemat 20%.`
                : "Perpanjang otomatis tiap bulan."}
            </p>
            <ul>
              {PRO_BENEFITS.map((b) => (
                <li key={b}>
                  <Icon name="check" />
                  {b}
                </li>
              ))}
            </ul>
            <button
              className="btn btn-primary block lg"
              disabled={busy}
              onClick={() => startPay(cycle === "thn" ? proYearly : proMonthly)}
            >
              {busy ? "Menyiapkan pembayaran…" : "Langganan Pro"}
            </button>
            <div
              style={{
                borderTop: "1px solid var(--border)",
                marginTop: 16,
                paddingTop: 14,
              }}
            >
              <p className="t-small muted" style={{ marginBottom: 8 }}>
                Tanpa kartu? Bayar per 30 hari via QRIS, perpanjang manual —
                kami ingatkan sebelum habis.
              </p>
              <button
                className="btn btn-secondary block"
                disabled={busy}
                onClick={() => startPay(pro30)}
              >
                <Icon name="qris" />
                Pro 30 hari (bayar via QRIS)
              </button>
            </div>
          </div>

          {/* Sekolah / Kampus */}
          <div className="card pad-lg sub-plan">
            <h3 className="t-h3">Sekolah / Kampus</h3>
            <p className="t-small muted">
              Multi-akun &amp; kursi, kolaborasi &amp; approval, bank dokumen,
              dashboard admin.
            </p>
            <div className="field" style={{ margin: "14px 0 0" }}>
              <label>Jumlah kursi</label>
              <div className="row" style={{ gap: 12 }}>
                <div className="seat-step">
                  <button
                    type="button"
                    aria-label="Kurangi kursi"
                    disabled={seats <= SEAT_MIN}
                    onClick={() => setSeats((s) => Math.max(SEAT_MIN, s - 5))}
                  >
                    −
                  </button>
                  <span className="val" aria-live="polite">
                    {seats}
                  </span>
                  <button
                    type="button"
                    aria-label="Tambah kursi"
                    disabled={seats >= SEAT_MAX}
                    onClick={() => setSeats((s) => Math.min(SEAT_MAX, s + 5))}
                  >
                    +
                  </button>
                </div>
                <span className="t-small muted">min. {SEAT_MIN} kursi</span>
              </div>
            </div>
            <div className="amt">
              {rupiah(seatTotal)}
              <span className="t-small muted" style={{ fontWeight: 500 }}>
                {" "}
                /bln
              </span>
            </div>
            <p className="t-small muted">
              {rupiah(SEAT_PRICE)} per kursi per bulan.
            </p>
            <ul>
              <li>
                <Icon name="check" />
                Multi-akun &amp; kursi
              </li>
              <li>
                <Icon name="check" />
                Kolaborasi &amp; approval
              </li>
              <li>
                <Icon name="check" />
                Bank dokumen
              </li>
              <li>
                <Icon name="check" />
                Dashboard admin
              </li>
            </ul>
            <button
              className="btn btn-secondary block lg"
              onClick={() =>
                toast("Permintaan demo terkirim! Tim kami akan menghubungi kamu.")
              }
            >
              Ajukan demo
            </button>
          </div>
        </div>

        <p className="t-small faint" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="lock" style={{ width: 15, height: 15 }} />
          Pembayaran aman · Pakasir ·{" "}
          <Link href="/app/tagihan" style={{ color: "var(--primary-600)", fontWeight: 600 }}>
            Lihat riwayat tagihan
          </Link>
        </p>
      </div>

      {/* Sheet pembayaran QRIS (komponen bersama) */}
      <QrisPaySheet
        open={!!paying}
        onClose={() => setPaying(null)}
        packageLabel={paying?.label ?? ""}
        amount={paying?.amount ?? 0}
        onSuccess={onPaid}
      />

      {/* Sheet konfirmasi batal */}
      <Sheet open={cancelOpen} onClose={() => setCancelOpen(false)}>
        <h3 className="t-h3" style={{ marginBottom: 8 }}>
          Batalkan langganan?
        </h3>
        <p className="muted t-body" style={{ marginBottom: 16 }}>
          Pro tetap aktif sampai {renewLabel}. Setelah itu akunmu kembali
          ke paket Gratis — dokumenmu tetap aman.
        </p>
        <div className="stack" style={{ "--gap": "8px" } as CSSProperties}>
          <button className="btn btn-destructive block" onClick={confirmCancel}>
            Batalkan langganan
          </button>
          <button
            className="btn btn-secondary block"
            onClick={() => setCancelOpen(false)}
          >
            Tetap berlangganan
          </button>
        </div>
      </Sheet>
    </>
  );
}
