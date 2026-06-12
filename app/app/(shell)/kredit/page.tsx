"use client";

/* AjarKit — Isi Ulang Kredit (design.md §9.I.1 & §13, prd.md §8.7 & §11).
   Porting Ajarkit/app-kredit.html: paket kredit, metode Pakasir (QRIS/VA),
   ringkasan sticky, sheet QRIS + VA (mock). */

import { useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { Icon } from "@/components/ui/icon";
import { Button, Field } from "@/components/ui/controls";
import { useToast } from "@/components/ui/toast";
import { useApp } from "@/lib/store";
import { CREDIT_PACKAGES, PAYMENT_METHODS, DOC_TYPES } from "@/lib/constants";
import { rupiah } from "@/lib/format";
import {
  QrisPaySheet,
  VaPaySheet,
} from "@/app/app/pembayaran/_components/payment-sheets";

type MethodId = (typeof PAYMENT_METHODS)[number]["id"];

const METHOD_SHORT: Record<MethodId, string> = {
  qris: "QRIS",
  va: "Virtual Account",
};

const BANKS = [
  "BCA Virtual Account",
  "BRI Virtual Account",
  "Mandiri Virtual Account",
  "BNI Virtual Account",
];

const CUSTOM_RATE = 150; // Rp / kredit

/** orderId unik per percobaan bayar (idempoten di completePayment) */
const makeOrderId = () =>
  `order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function KreditPage() {
  const app = useApp();
  const toast = useToast();
  const router = useRouter();

  const [sel, setSel] = useState(1); // default: 300 kredit (Paling laris)
  const [customStr, setCustomStr] = useState("");
  const [method, setMethod] = useState<MethodId>("qris");
  const [bank, setBank] = useState(BANKS[0]);
  const [qrisOpen, setQrisOpen] = useState(false);
  const [vaOpen, setVaOpen] = useState(false);
  /* idempoten (prd.md §10): cegah klik ganda "Bayar" / settle dobel */
  const [busy, setBusy] = useState(false);
  /* satu orderId per percobaan bayar — retry memakai orderId yang sama
     sehingga completePayment (RPC simulate_payment) tetap idempoten */
  const orderIdRef = useRef("");

  const pkg = CREDIT_PACKAGES[sel];
  const isCustom = pkg.id === "custom";
  const customN = Math.max(0, Math.floor(Number(customStr) || 0));
  const creditsNum = isCustom ? customN : pkg.creditsNum;
  const total = isCustom ? customN * CUSTOM_RATE : pkg.price;
  const pkgLabel = isCustom
    ? customN > 0
      ? `${customN} kredit`
      : "Custom"
    : pkg.credits;

  /* estimasi saldo: ≈ X Modul Ajar atau Y Bank Soal */
  const estModul = Math.floor(app.credits / DOC_TYPES.modul_ajar.cost);
  const estSoal = Math.floor(app.credits / DOC_TYPES.bank_soal.cost);

  const bankShort = bank.replace(" Virtual Account", "");

  function successParams() {
    const q = new URLSearchParams({
      paket: pkgLabel,
      metode: METHOD_SHORT[method],
      total: String(total),
    });
    return q.toString();
  }

  /** sukses bayar: settle ATOMIK via store (mock & Supabase sama-sama lewat
      completePayment — kredit + transaksi sekali jalan, idempoten per orderId)
      + notifikasi. Lempar error bila gagal (penanggil yang menangani). */
  async function settle() {
    await app.completePayment({
      orderId: orderIdRef.current || makeOrderId(),
      type: "topup",
      label: `Top-up ${pkgLabel}`,
      method,
      amount: total,
      credits: creditsNum,
    });
    app.addNotification({
      type: "kredit",
      title: "Top-up berhasil 🎉",
      body: `${pkgLabel} sudah ditambahkan ke saldomu.`,
      timeLabel: "Baru saja",
    });
  }

  function pay() {
    if (busy) return; // abaikan re-entry selama proses berjalan
    if (!total) {
      toast("Tentukan jumlah kredit dulu", false);
      return;
    }
    posthog.capture("credit_purchase_initiated", {
      package_label: pkgLabel,
      credits: creditsNum,
      amount: total,
      payment_method: method,
    });
    orderIdRef.current = makeOrderId(); // orderId baru per percobaan bayar
    setBusy(true);
    void (async () => {
      /* coba pembayaran NYATA via Pakasir dulu (server /api/payments/create).
         "simulated" = mode mock / Pakasir belum dikonfigurasi → alur sheet
         simulasi yang ada. */
      let co:
        | { mode: "simulated" }
        | { mode: "gateway"; orderId: string; paymentUrl: string };
      try {
        co = await app.startCheckout({
          orderId: "", // server membuat orderId-nya sendiri
          type: "topup",
          label: `Top-up ${pkgLabel}`,
          method,
          amount: total,
          credits: creditsNum,
        });
      } catch {
        co = { mode: "simulated" };
      }
      if (co.mode === "gateway") {
        toast("Mengarahkan ke pembayaran Pakasir…");
        /* busy tetap true; pembayaran diselesaikan di halaman Pakasir →
           redirect kembali ke /app/pembayaran/pending?order=… dan kredit
           ditambahkan SERVER lewat webhook (klien tidak pernah settle). */
        window.location.href = co.paymentUrl;
        return;
      }
      // alur simulasi (perilaku lama, tidak berubah)
      if (method === "qris") setQrisOpen(true);
      else setVaOpen(true);
    })();
  }

  async function onQrisSuccess() {
    try {
      await settle();
    } catch {
      // sheet tetap terbuka — pengguna bisa coba lagi (orderId sama, idempoten)
      toast("Gagal memproses pembayaran. Coba lagi, ya.", false);
      return;
    }
    setQrisOpen(false);
    router.push(`/app/pembayaran/berhasil?${successParams()}`);
  }

  function onVaCheck() {
    // VA: TIDAK settle di sini — kredit ditambahkan SEKALI di halaman pending
    // saat "Cek status" (completePayment dgn orderId yang sama, idempoten).
    setVaOpen(false);
    const q = new URLSearchParams({
      paket: pkgLabel,
      metode: `VA ${bankShort}`,
      total: String(total),
      kredit: String(creditsNum),
      order: orderIdRef.current || makeOrderId(),
    });
    router.push(`/app/pembayaran/pending?${q.toString()}`);
  }

  return (
    <>
      <h1 className="t-h1" style={{ marginBottom: 4 }}>
        Isi Ulang Kredit
      </h1>
      <p className="muted" style={{ marginBottom: 22 }}>
        Bayar sesuai pakai. Kredit tidak hangus dan berlaku untuk semua jenis
        dokumen.
      </p>

      <div className="kredit-grid">
        <div className="stack" style={{ "--gap": "24px" } as CSSProperties}>
          <div className="card saldo">
            <span className="t-caption" style={{ opacity: 0.85 }}>
              SALDO KAMU
            </span>
            <div className="amt">
              ◈ {app.credits}{" "}
              <span style={{ fontSize: 18, fontWeight: 600, opacity: 0.85 }}>
                kredit
              </span>
            </div>
            <span className="t-small" style={{ opacity: 0.9 }}>
              ≈ {estModul} Modul Ajar atau {estSoal} Bank Soal
            </span>
          </div>

          <section>
            <h3 className="t-h3" style={{ marginBottom: 12 }}>
              Pilih paket kredit
            </h3>
            <div className="pkg-grid" role="radiogroup" aria-label="Paket kredit">
              {CREDIT_PACKAGES.map((p, i) => (
                <div
                  key={p.id}
                  className={`card pkg${i === sel ? " on" : ""}`}
                  role="radio"
                  aria-checked={i === sel}
                  tabIndex={0}
                  onClick={() => setSel(i)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSel(i);
                    }
                  }}
                >
                  {p.popular ? (
                    <span className="badge badge-pop save">Paling laris</span>
                  ) : p.save ? (
                    <span className="badge badge-selesai save">
                      {p.save.replace("Hemat ", "")}
                    </span>
                  ) : null}
                  <div className="cr">{p.credits}</div>
                  <div className="pr">{p.priceLabel}</div>
                </div>
              ))}
            </div>
            {isCustom && (
              <div style={{ marginTop: 10 }}>
                <Field
                  label="Tentukan sendiri"
                  help={
                    customN > 0
                      ? `${customN} kredit · ${rupiah(customN * CUSTOM_RATE)}`
                      : `Rp ${CUSTOM_RATE} / kredit`
                  }
                >
                  <input
                    className="input"
                    type="number"
                    min={1}
                    inputMode="numeric"
                    placeholder="mis. 500"
                    value={customStr}
                    onChange={(e) => setCustomStr(e.target.value)}
                    aria-label="Jumlah kredit custom"
                  />
                </Field>
              </div>
            )}
          </section>

          <section>
            <h3 className="t-h3" style={{ marginBottom: 4 }}>
              Metode pembayaran
            </h3>
            <p className="muted t-small" style={{ marginBottom: 12 }}>
              Diproses aman oleh <b>Pakasir</b>.
            </p>
            <div
              className="stack"
              style={{ "--gap": "10px" } as CSSProperties}
              role="radiogroup"
              aria-label="Metode pembayaran"
            >
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`pay${method === m.id ? " on" : ""}`}
                  role="radio"
                  aria-checked={method === m.id}
                  onClick={() => setMethod(m.id)}
                >
                  <span className="pic">
                    <Icon name={m.icon} />
                  </span>
                  <div className="grow">
                    <div className="strong" style={{ fontWeight: 600, fontSize: 14 }}>
                      {m.label}{" "}
                      {"rec" in m && m.rec && (
                        <span className="badge badge-ai" style={{ marginLeft: 4 }}>
                          Disarankan
                        </span>
                      )}
                    </div>
                    <div className="t-small muted">{m.desc}</div>
                  </div>
                  <span className="rd" />
                </button>
              ))}
            </div>
            {method === "va" && (
              <div style={{ marginTop: 10 }}>
                <label className="lbl" htmlFor="va-bank">
                  Pilih bank
                </label>
                <select
                  id="va-bank"
                  className="select"
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                >
                  {BANKS.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </div>
            )}
          </section>
        </div>

        {/* Panel ringkasan */}
        <aside>
          <div className="card pad" style={{ position: "sticky", top: 20 }}>
            <h4 className="t-h4" style={{ marginBottom: 14 }}>
              Ringkasan
            </h4>
            <div className="stack" style={{ "--gap": "10px" } as CSSProperties}>
              <div className="row between">
                <span className="muted t-small">Paket</span>
                <span className="strong t-small">{pkgLabel}</span>
              </div>
              <div className="row between">
                <span className="muted t-small">Metode</span>
                <span className="strong t-small">{METHOD_SHORT[method]}</span>
              </div>
              <div className="row between">
                <span className="muted t-small">Hemat</span>
                <span
                  className="t-small"
                  style={{ color: "var(--success)", fontWeight: 600 }}
                >
                  {pkg.save ? pkg.save.replace("Hemat ", "") : "—"}
                </span>
              </div>
            </div>
            <div
              className="row between"
              style={{
                borderTop: "1px solid var(--border)",
                margin: "14px 0",
                paddingTop: 14,
              }}
            >
              <span className="strong" style={{ fontWeight: 700 }}>
                Total
              </span>
              <span className="strong" style={{ fontWeight: 800, fontSize: 20 }}>
                {total ? rupiah(total) : "—"}
              </span>
            </div>
            <Button size="lg" block loading={busy} onClick={pay}>
              Bayar {total ? rupiah(total) : ""}
            </Button>
            <div
              className="row center"
              style={{ gap: 8, marginTop: 12, color: "var(--text-faint)" }}
            >
              <Icon name="lock" />
              <span className="t-small">Pembayaran aman · Pakasir</span>
            </div>
          </div>
        </aside>
      </div>

      <QrisPaySheet
        open={qrisOpen}
        onClose={() => {
          setQrisOpen(false);
          setBusy(false); // batal di sheet → tombol Bayar aktif lagi
        }}
        packageLabel={pkgLabel}
        amount={total}
        onSuccess={onQrisSuccess}
      />
      <VaPaySheet
        open={vaOpen}
        onClose={() => {
          setVaOpen(false);
          setBusy(false); // batal di sheet → tombol Bayar aktif lagi
        }}
        bank={bankShort}
        packageLabel={pkgLabel}
        amount={total}
        onCheckStatus={onVaCheck}
      />
    </>
  );
}
