"use client";

/* AjarKit — 500 (design.md §9.K, porting state "500" dari Ajarkit/sistem.html).
   Error boundary App Router: tombol "Coba lagi" merender ulang segmen. */

import { useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Catat error ke konsol (mock — tanpa layanan pelaporan)
    console.error(error);
  }, [error]);

  return (
    <div className="sys-wrap">
      <div className="sys-card">
        <div className="sys-code">500</div>
        <h1 className="t-h1" style={{ marginTop: 8 }}>
          Ada yang salah di sisi kami
        </h1>
        <p className="muted t-body-lg" style={{ margin: "12px 0 24px" }}>
          Tim kami sudah diberi tahu. Coba beberapa saat lagi, ya.
        </p>
        <div className="row center" style={{ gap: 10, flexWrap: "wrap" }}>
          <button className="btn btn-primary lg" onClick={() => reset()}>
            <Icon name="refresh" />
            Coba lagi
          </button>
          <Link className="btn btn-secondary lg" href="/app">
            Ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
