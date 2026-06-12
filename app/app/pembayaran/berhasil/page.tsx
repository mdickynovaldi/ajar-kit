"use client";

/* AjarKit — Callback pembayaran: berhasil (design.md §9.I.4, prd.md §11).
   Porting state "berhasil" dari Ajarkit/app-pembayaran.html. */

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { Icon } from "@/components/ui/icon";
import { RevealScope } from "@/components/motion";
import { useApp } from "@/lib/store";
import { rupiah } from "@/lib/format";

function BerhasilContent() {
  const sp = useSearchParams();
  const app = useApp();

  const paket = sp.get("paket") || "300 kredit";
  const metode = sp.get("metode") || "QRIS";
  const total = Number(sp.get("total")) || 39000;
  const isPro = paket.startsWith("Pro");

  useEffect(() => {
    posthog.capture("payment_succeeded", {
      package_label: paket,
      payment_method: metode,
      amount: total,
      is_subscription: isPro,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="pay-wrap">
      <div
        className="pay-card card pad-lg"
        style={{ boxShadow: "var(--sh-md)", padding: "32px 26px" }}
      >
        <div className="pay-ic ok">
          <Icon name="checkCircle" />
        </div>
        <h1 className="t-h2">Pembayaran berhasil!</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          {isPro
            ? `${paket} sudah aktif di akunmu. Selamat berkarya!`
            : `Kredit sudah ditambahkan ke saldomu. Saldo baru: ◈ ${app.credits}.`}
        </p>

        <div
          className="card pad"
          style={{
            background: "var(--surface-2)",
            border: "none",
            textAlign: "left",
            margin: "22px 0",
          }}
        >
          <div className="summary-line">
            <span className="muted">Paket</span>
            <span className="strong">{paket}</span>
          </div>
          <div className="summary-line">
            <span className="muted">Metode</span>
            <span className="strong">{metode}</span>
          </div>
          <div className="summary-line" style={{ border: "none" }}>
            <span className="muted">Total</span>
            <span className="strong" style={{ fontWeight: 700 }}>
              {rupiah(total)}
            </span>
          </div>
        </div>

        <div className="stack" style={{ "--gap": "10px" } as React.CSSProperties}>
          <Link className="btn btn-primary block lg" href="/app/buat">
            <Icon name="sparkles" />
            Mulai membuat
          </Link>
          <Link className="btn btn-secondary block" href="/app">
            Kembali ke Beranda
          </Link>
        </div>
        <p
          className="t-small faint"
          style={{
            marginTop: 16,
            display: "flex",
            gap: 6,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Icon name="lock" />
          Pembayaran diproses aman oleh Pakasir
        </p>
      </div>
    </div>
  );
}

export default function PembayaranBerhasilPage() {
  return (
    <RevealScope>
      <Suspense fallback={<div className="pay-wrap" />}>
        <BerhasilContent />
      </Suspense>
    </RevealScope>
  );
}
