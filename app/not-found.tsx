/* AjarKit — 404 (design.md §9.K, porting state "404" dari Ajarkit/sistem.html) */

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="sys-wrap">
      <div className="sys-card">
        <div className="sys-code">404</div>
        <h1 className="t-h1" style={{ marginTop: 8 }}>
          Halaman tidak ditemukan
        </h1>
        <p className="muted t-body-lg" style={{ margin: "12px 0 24px" }}>
          Tautan mungkin salah atau halaman sudah dipindahkan.
        </p>
        <div className="row center" style={{ gap: 10, flexWrap: "wrap" }}>
          <Link className="btn btn-primary lg" href="/app">
            Ke Beranda
          </Link>
          <Link className="btn btn-secondary lg" href="/">
            Ke halaman utama
          </Link>
        </div>
      </div>
    </div>
  );
}
