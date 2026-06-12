"use client";

/* AjarKit — Riwayat Tagihan (design.md §9.I.3, prd.md §8.7).
   Tabel transaksi (desktop) / daftar kartu (mobile) dari store, filter
   status, "Unduh struk" = .docx nyata via /api/export/docx (transformasi
   murni — identik di mode mock maupun Supabase). */

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icon";
import { Chip, EmptyState, Skeleton, StatusBadge } from "@/components/ui/controls";
import { useToast } from "@/components/ui/toast";
import { useApp } from "@/lib/store";
import { rupiah } from "@/lib/format";
import type { Transaction } from "@/lib/types";

type TrxStatus = Transaction["status"] | "";
type Periode = "" | "jun-2026" | "mei-2026";

const STATUS_OPTIONS: { value: TrxStatus; label: string }[] = [
  { value: "", label: "Semua" },
  { value: "lunas", label: "Lunas" },
  { value: "pending", label: "Pending" },
  { value: "gagal", label: "Gagal" },
];

/* filter periode: cocokkan akhiran string tanggal transaksi (mis. "2 Jun 2026") */
const PERIODE_OPTIONS: { value: Periode; label: string; match: string }[] = [
  { value: "", label: "Semua periode", match: "" },
  { value: "jun-2026", label: "Juni 2026", match: "Jun 2026" },
  { value: "mei-2026", label: "Mei 2026", match: "Mei 2026" },
];

const TRX_STATUS_META: Record<
  Transaction["status"],
  { label: string; badge: string }
> = {
  lunas: { label: "Lunas", badge: "badge-selesai" },
  pending: { label: "Pending", badge: "badge-review" },
  gagal: { label: "Gagal", badge: "badge-revisi" },
};

const METHOD_LABEL: Record<Transaction["method"], string> = {
  qris: "QRIS",
  va: "Virtual Account",
  ewallet: "E-wallet",
  card: "Kartu",
};

const TYPE_LABEL: Record<Transaction["type"], string> = {
  topup: "Top-up",
  subscription: "Langganan",
};

const TYPE_ICON: Record<Transaction["type"], IconName> = {
  topup: "wallet",
  subscription: "refresh",
};

export default function TagihanPage() {
  const app = useApp();
  const toast = useToast();
  const [status, setStatus] = useState<TrxStatus>("");
  const [periode, setPeriode] = useState<Periode>("");

  const filtered = useMemo(() => {
    const match =
      PERIODE_OPTIONS.find((p) => p.value === periode)?.match ?? "";
    return app.transactions.filter(
      (t) =>
        (!status || t.status === status) &&
        (!match || t.date.endsWith(match)),
    );
  }, [app.transactions, status, periode]);

  /* Struk PDF berbranding → POST /api/export/pdf → unduh "struk-{id}.pdf". */
  async function unduhStruk(t: Transaction) {
    toast("Mengunduh struk…");
    try {
      const res = await fetch("/api/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "invoice",
          data: {
            orderId: t.id,
            tanggal: t.date,
            jenis: `${t.label} (${TYPE_LABEL[t.type]})`,
            metode: METHOD_LABEL[t.method],
            status: TRX_STATUS_META[t.status].label,
            nominalLabel: rupiah(t.amount),
            pelanggan: app.user.nama,
            email: app.user.email,
          },
        }),
      });
      if (!res.ok) throw new Error("EXPORT_GAGAL");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `struk-${t.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast("Gagal mengunduh struk. Coba lagi, ya.", false);
    }
  }

  return (
    <>
      <div
        className="row between"
        style={{ marginBottom: 16, flexWrap: "wrap", gap: 12 }}
      >
        <div>
          <h1 className="t-h1">Riwayat Tagihan</h1>
          {app.hydrated ? (
            <p className="muted t-small">{filtered.length} transaksi</p>
          ) : (
            <Skeleton height={13} width={90} style={{ marginTop: 6 }} />
          )}
        </div>
        <Link className="btn btn-secondary" href="/app/kredit">
          <Icon name="plus" />
          Isi ulang kredit
        </Link>
      </div>

      <div className="row wrap" style={{ gap: 8, marginBottom: 16 }}>
        {STATUS_OPTIONS.map((s) => (
          <Chip
            key={s.value || "semua"}
            on={status === s.value}
            onToggle={() => setStatus(s.value)}
          >
            {s.label}
          </Chip>
        ))}
        <select
          className="select"
          style={{ width: "auto", marginLeft: "auto" }}
          aria-label="Filter periode"
          value={periode}
          onChange={(e) => setPeriode(e.target.value as Periode)}
        >
          {PERIODE_OPTIONS.map((p) => (
            <option key={p.value || "semua-periode"} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {!app.hydrated ? (
        <div className="card pad" aria-hidden="true">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="row" style={{ padding: "10px 0" }}>
              <Skeleton height={40} width={40} />
              <div className="grow">
                <Skeleton height={14} width="50%" />
                <Skeleton height={12} width="30%" style={{ marginTop: 6 }} />
              </div>
              <Skeleton height={22} width={70} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="wallet"
          title="Belum ada transaksi"
          desc={
            status || periode
              ? "Tidak ada transaksi dengan filter ini. Coba filter lain."
              : "Transaksi top-up dan langganan kamu akan tampil di sini."
          }
        >
          {!status && !periode && (
            <Link className="btn btn-primary" href="/app/kredit">
              Isi ulang kredit
            </Link>
          )}
        </EmptyState>
      ) : (
        <>
          {/* Desktop: tabel */}
          <div className="card hide-mobile" style={{ overflow: "hidden" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Jenis</th>
                  <th>Metode</th>
                  <th className="num">Nominal</th>
                  <th>Status</th>
                  <th aria-label="Aksi" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const st = TRX_STATUS_META[t.status];
                  return (
                    <tr key={t.id}>
                      <td style={{ whiteSpace: "nowrap" }}>{t.date}</td>
                      <td>
                        <span className="strong" style={{ fontWeight: 600 }}>
                          {t.label}
                        </span>
                        <span className="t-small muted" style={{ display: "block" }}>
                          {TYPE_LABEL[t.type]}
                        </span>
                      </td>
                      <td>{METHOD_LABEL[t.method]}</td>
                      <td className="num" style={{ fontWeight: 600 }}>
                        {rupiah(t.amount)}
                      </td>
                      <td>
                        <StatusBadge badge={st.badge}>{st.label}</StatusBadge>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {t.status === "lunas" ? (
                          <button
                            className="btn btn-ghost sm"
                            onClick={() => void unduhStruk(t)}
                          >
                            <Icon name="download" />
                            Unduh struk
                          </button>
                        ) : (
                          <span className="faint">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile: daftar kartu */}
          <div className="trx-cards hide-desktop">
            {filtered.map((t) => {
              const st = TRX_STATUS_META[t.status];
              return (
                <div key={t.id} className="card pad trx-card">
                  <span className="tic">
                    <Icon name={TYPE_ICON[t.type]} />
                  </span>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="strong" style={{ fontWeight: 600, fontSize: 14 }}>
                      {t.label}
                    </div>
                    <div className="t-small muted">
                      {t.date} · {METHOD_LABEL[t.method]}
                    </div>
                    <div className="row" style={{ gap: 8, marginTop: 8 }}>
                      <StatusBadge badge={st.badge}>{st.label}</StatusBadge>
                      {t.status === "lunas" && (
                        <button
                          className="btn btn-ghost sm"
                          onClick={() => void unduhStruk(t)}
                        >
                          <Icon name="download" />
                          Struk
                        </button>
                      )}
                    </div>
                  </div>
                  <span className="strong num" style={{ fontWeight: 700, flex: "none" }}>
                    {rupiah(t.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
