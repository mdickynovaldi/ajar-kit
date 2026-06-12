"use client";

/* AjarKit — Callback pembayaran: gagal (design.md §9.I.4, prd.md §11).
   Porting state "gagal" dari Ajarkit/app-pembayaran.html. */

import { useEffect } from "react";
import Link from "next/link";
import posthog from "posthog-js";
import { Icon } from "@/components/ui/icon";
import { RevealScope } from "@/components/motion";

export default function PembayaranGagalPage() {
  useEffect(() => {
    posthog.capture("payment_failed");
  }, []);
  return (
    <RevealScope>
      <div className="pay-wrap">
        <div
          className="pay-card card pad-lg"
          style={{ boxShadow: "var(--sh-md)", padding: "32px 26px" }}
        >
          <div className="pay-ic fail">
            <Icon name="x" />
          </div>
          <h1 className="t-h2">Pembayaran gagal</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            Pembayaran dibatalkan atau kedaluwarsa. Saldo kamu tidak terpotong.
          </p>

          <div
            className="stack"
            style={{ "--gap": "10px", marginTop: 22 } as React.CSSProperties}
          >
            <Link className="btn btn-primary block lg" href="/app/kredit">
              <Icon name="refresh" />
              Coba lagi
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
    </RevealScope>
  );
}
