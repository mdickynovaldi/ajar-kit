/* AjarKit — Maintenance (design.md §9.K, porting state "maintenance" dari Ajarkit/sistem.html) */

import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = {
  title: "Sedang pemeliharaan",
};

export default function MaintenancePage() {
  return (
    <div className="sys-wrap">
      <div className="sys-card">
        <div className="sys-ic">
          <Icon name="settings" />
        </div>
        <h1 className="t-h1" style={{ marginTop: 0 }}>
          Sedang pemeliharaan
        </h1>
        <p className="muted t-body-lg" style={{ margin: "12px 0 24px" }}>
          AjarKit sedang ditingkatkan. Kami kembali sebentar lagi — pantau
          status di media sosial kami.
        </p>
        <div className="row center" style={{ gap: 10, flexWrap: "wrap" }}>
          <Link className="btn btn-secondary lg" href="/">
            Kembali ke beranda publik
          </Link>
        </div>
      </div>
    </div>
  );
}
