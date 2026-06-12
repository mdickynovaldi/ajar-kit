"use client";

/* AjarKit — komponen pembayaran bersama (Kredit & Langganan).
   Porting sheet QRIS/VA + fungsi qr() dekoratif dari Ajarkit/app-kredit.html. */

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { rupiah, countdownLabel } from "@/lib/format";

export const VA_NUMBER = "8810 8123 4567 890";

/* ---------- QR dekoratif (porting fungsi qr() dari app-kredit.html) ---------- */
const QR_N = 21;
const QR_SEED = [3, 7, 11, 2, 19, 5, 13, 17, 9, 4, 14, 6, 16, 8, 12, 10, 18, 1, 15, 20];

function qrCells(): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];
  for (let y = 0; y < QR_N; y++) {
    for (let x = 0; x < QR_N; x++) {
      const on =
        (x * y + x + y + QR_SEED[(x + y) % QR_SEED.length]) % 3 === 0 ||
        (x < 7 && y < 7) ||
        (x > 13 && y < 7) ||
        (x < 7 && y > 13);
      if (on) cells.push({ x, y });
    }
  }
  return cells;
}

const QR_CELLS = qrCells();

export function QrDecorative() {
  return (
    <svg viewBox="0 0 21 21" fill="#0F172A" aria-hidden="true">
      {QR_CELLS.map((c) => (
        <rect key={`${c.x}-${c.y}`} x={c.x} y={c.y} width={1} height={1} />
      ))}
      <rect x={1} y={1} width={5} height={5} fill="none" stroke="#0F172A" strokeWidth={1} />
      <rect x={2.5} y={2.5} width={2} height={2} />
      <rect x={15} y={1} width={5} height={5} fill="none" stroke="#0F172A" strokeWidth={1} />
      <rect x={16.5} y={2.5} width={2} height={2} />
      <rect x={1} y={15} width={5} height={5} fill="none" stroke="#0F172A" strokeWidth={1} />
      <rect x={2.5} y={16.5} width={2} height={2} />
    </svg>
  );
}

/* ---------- Sheet QRIS ---------- */
const QRIS_SECONDS = 299; // 04:59

export function QrisPaySheet({
  open,
  onClose,
  packageLabel,
  amount,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  /** mis. "300 kredit" atau "Pro 30 hari" */
  packageLabel: string;
  amount: number;
  /** dipanggil saat "Simulasikan berhasil" */
  onSuccess: () => void;
}) {
  const toast = useToast();
  const [secs, setSecs] = useState(QRIS_SECONDS);
  // reset hitung mundur saat sheet dibuka (pola "adjust state during render")
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setSecs(QRIS_SECONDS);
  }

  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => {
      setSecs((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [open]);

  const expired = secs <= 0;

  return (
    <Sheet open={open} onClose={onClose}>
      <div style={{ textAlign: "center" }}>
        <span className="badge badge-ai">
          <Icon name="qris" />
          QRIS
        </span>
        <h3 className="t-h3" style={{ margin: "10px 0 2px" }}>
          Scan untuk membayar
        </h3>
        <p className="muted t-small">
          {packageLabel} · <b>{rupiah(amount)}</b>
        </p>
        <div className={`qr${expired ? " expired" : ""}`} style={{ marginTop: 14 }}>
          <QrDecorative />
        </div>
        {expired ? (
          <>
            <p className="t-small" style={{ marginTop: 12, color: "var(--error)", fontWeight: 600 }}>
              QR sudah kedaluwarsa.
            </p>
            <div className="row" style={{ gap: 8, marginTop: 16 }}>
              <button
                className="btn btn-primary grow"
                onClick={() => setSecs(QRIS_SECONDS)}
              >
                <Icon name="refresh" />
                Buat ulang
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="t-small muted" style={{ marginTop: 12 }}>
              Berlaku{" "}
              <b style={{ color: "var(--error)" }}>{countdownLabel(secs)}</b>
            </p>
            <div className="row" style={{ gap: 8, marginTop: 16 }}>
              <button
                className="btn btn-secondary grow"
                onClick={() => toast("QR diunduh")}
              >
                <Icon name="download" />
                Unduh QR
              </button>
              <button className="btn btn-primary grow" onClick={onSuccess}>
                Simulasikan berhasil
              </button>
            </div>
            <p
              className="t-small faint"
              style={{
                marginTop: 12,
                display: "flex",
                gap: 6,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <span className="spinner" style={{ width: 13, height: 13 }} />
              Menunggu pembayaran…
            </p>
          </>
        )}
      </div>
    </Sheet>
  );
}

/* ---------- Sheet Virtual Account ---------- */
export function VaPaySheet({
  open,
  onClose,
  bank,
  packageLabel,
  amount,
  onCheckStatus,
}: {
  open: boolean;
  onClose: () => void;
  /** mis. "BCA" */
  bank: string;
  packageLabel: string;
  amount: number;
  /** dipanggil saat "Saya sudah bayar · Cek status" */
  onCheckStatus: () => void;
}) {
  const toast = useToast();

  function copyVa() {
    try {
      void navigator.clipboard?.writeText(VA_NUMBER);
    } catch {
      /* clipboard tidak tersedia — tetap beri umpan balik */
    }
    toast("Nomor VA disalin");
  }

  return (
    <Sheet open={open} onClose={onClose}>
      <h3 className="t-h3" style={{ marginBottom: 4 }}>
        Virtual Account {bank}
      </h3>
      <p className="muted t-small" style={{ marginBottom: 14 }}>
        {packageLabel} · {rupiah(amount)}
      </p>
      <div
        className="card pad"
        style={{ background: "var(--surface-2)", border: "none", marginBottom: 14 }}
      >
        <div className="t-caption muted">NOMOR VIRTUAL ACCOUNT</div>
        <div className="row between" style={{ marginTop: 4 }}>
          <span
            className="strong num"
            style={{ fontWeight: 700, fontSize: 20, letterSpacing: ".04em" }}
          >
            {VA_NUMBER}
          </span>
          <button className="btn btn-secondary sm" onClick={copyVa}>
            <Icon name="copy" />
            Salin
          </button>
        </div>
      </div>
      <p className="lbl">Cara bayar</p>
      <ol
        className="t-small muted"
        style={{ paddingLeft: 18, display: "grid", gap: 5, margin: "6px 0 16px" }}
      >
        <li>Buka m-banking, pilih Transfer → Virtual Account.</li>
        <li>Masukkan nomor VA di atas.</li>
        <li>Pastikan nominal &amp; nama sesuai, lalu konfirmasi.</li>
      </ol>
      <button className="btn btn-primary block" onClick={onCheckStatus}>
        Saya sudah bayar · Cek status
      </button>
    </Sheet>
  );
}
