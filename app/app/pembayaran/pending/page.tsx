"use client";

/* AjarKit — Callback pembayaran: pending (design.md §9.I.4, prd.md §11).
   Porting state "pending" dari Ajarkit/app-pembayaran.html: instruksi +
   status auto-refresh (mock) + "Cek status" → berhasil.
   Mode Supabase+Pakasir: status NYATA di-poll dari tabel transactions tiap
   4 dtk (webhook yang settle di server; klien tidak pernah menambah kredit). */

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { RevealScope } from "@/components/motion";
import { useToast } from "@/components/ui/toast";
import { useApp } from "@/lib/store";
import { getSupabase } from "@/lib/supabase/client";
import { rupiah } from "@/lib/format";

function PendingContent() {
  const sp = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const app = useApp();

  const paket = sp.get("paket") || "300 kredit";
  const metode = sp.get("metode") || "Virtual Account";
  const total = Number(sp.get("total")) || 39000;
  const kredit = Number(sp.get("kredit")) || 0;
  const order = sp.get("order");

  /* order NYATA dari Pakasir: dibuat server (/api/payments/create) dgn prefiks
     "AJK-" — order simulasi dari klien berprefiks "order-". Di mode ini
     status final HANYA dari webhook → klien cukup poll tabel transactions. */
  const isGateway =
    app.mode === "supabase" && !!order && order.startsWith("AJK-");

  const [checking, setChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState(0);
  const settledRef = useRef(false);
  /* orderId dibuat di halaman Kredit dan dibawa via query — settle di sini
     SATU kali via completePayment (idempoten per orderId; mode Supabase =
     RPC simulate_payment). Fallback dibuat malas (di handler, bukan saat
     render) bila param hilang. */
  const fallbackOrderRef = useRef<string | null>(null);
  const getOrderId = () => {
    const fromUrl = sp.get("order");
    if (fromUrl) return fromUrl;
    if (!fallbackOrderRef.current) {
      fallbackOrderRef.current = `order-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
    }
    return fallbackOrderRef.current;
  };

  /* status auto-refresh palsu: "terakhir dicek X dtk lalu" */
  useEffect(() => {
    const t = setInterval(() => {
      setLastCheck((s) => (s >= 5 ? 0 : s + 1));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  /* ---- mode Supabase+Pakasir: poll status transaksi NYATA tiap 4 dtk ---- */
  const { refreshFromServer, addNotification } = app; // callback stabil per mode
  const doneRef = useRef(false); // cegah penanganan ganda (interval vs manual)

  const pollOnce = useCallback(async (): Promise<
    "lunas" | "gagal" | "pending" | null
  > => {
    if (!isGateway || !order || doneRef.current) return null;
    const sb = getSupabase();
    if (!sb) return null;
    const { data, error } = await sb
      .from("transactions")
      .select("status")
      .eq("order_id", order)
      .single();
    if (error || !data || doneRef.current) return null;
    const status = data.status as string;
    if (status === "lunas") {
      doneRef.current = true;
      await refreshFromServer(); // tarik saldo/transaksi/plan hasil webhook
      addNotification(
        kredit > 0
          ? {
              type: "kredit",
              title: "Top-up berhasil 🎉",
              body: `${paket} sudah ditambahkan ke saldomu.`,
              timeLabel: "Baru saja",
            }
          : {
              type: "langganan",
              title: "Pembayaran berhasil 🎉",
              body: `Pembayaran ${paket} sudah dikonfirmasi.`,
              timeLabel: "Baru saja",
            },
      );
      const q = new URLSearchParams({ paket, metode, total: String(total) });
      router.replace(`/app/pembayaran/berhasil?${q.toString()}`);
      return "lunas";
    }
    if (status === "gagal") {
      doneRef.current = true;
      router.replace("/app/pembayaran/gagal");
      return "gagal";
    }
    return "pending";
  }, [
    isGateway,
    order,
    kredit,
    paket,
    metode,
    total,
    refreshFromServer,
    addNotification,
    router,
  ]);

  useEffect(() => {
    if (!isGateway) return;
    void pollOnce(); // cek segera saat halaman dibuka (redirect dari Pakasir)
    const t = setInterval(() => void pollOnce(), 4000);
    return () => clearInterval(t); // bersihkan interval saat unmount
  }, [isGateway, pollOnce]);

  function cekStatus() {
    if (checking) return;
    setChecking(true);
    toast("Mengecek status…");
    if (isGateway) {
      /* mode Pakasir: status final HANYA dari webhook server — TIDAK pernah
         settle di klien; tombol ini cukup memicu poll segera. */
      void (async () => {
        const status = await pollOnce();
        if (status === "pending")
          toast("Pembayaran belum diterima. Coba lagi sebentar, ya.", false);
        setChecking(false);
      })();
      return;
    }
    setTimeout(() => {
      void (async () => {
        if (!settledRef.current && kredit > 0) {
          /* pembayaran VA terkonfirmasi → settle ATOMIK via store
             (mock & Supabase sama; idempoten per orderId dari halaman Kredit) */
          try {
            await app.completePayment({
              orderId: getOrderId(),
              type: "topup",
              label: `Top-up ${paket}`,
              method: "va",
              amount: total,
              credits: kredit,
            });
          } catch {
            toast("Gagal memproses pembayaran. Coba lagi, ya.", false);
            setChecking(false); // tetap di halaman ini — bisa cek ulang
            return;
          }
          settledRef.current = true;
          app.addNotification({
            type: "kredit",
            title: "Top-up berhasil 🎉",
            body: `${paket} sudah ditambahkan ke saldomu.`,
            timeLabel: "Baru saja",
          });
        }
        const q = new URLSearchParams({
          paket,
          metode,
          total: String(total),
        });
        router.push(`/app/pembayaran/berhasil?${q.toString()}`);
      })();
    }, 1500);
  }

  return (
    <div className="pay-wrap">
      <div
        className="pay-card card pad-lg"
        style={{ boxShadow: "var(--sh-md)", padding: "32px 26px" }}
      >
        <div className="pay-ic pend">
          <Icon name="clock" />
        </div>
        <h1 className="t-h2">Menunggu pembayaran</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          {isGateway
            ? "Selesaikan pembayaranmu di halaman Pakasir. Status dicek otomatis setiap beberapa detik."
            : "Selesaikan pembayaran Virtual Account-mu. Status diperbarui otomatis."}
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
          <button
            className="btn btn-primary block lg"
            onClick={cekStatus}
            disabled={checking}
          >
            <Icon name="refresh" />
            {checking ? "Mengecek status…" : "Cek status"}
          </button>
          {app.mode === "mock" && (
            <button
              className="btn btn-ghost block"
              disabled={checking}
              onClick={() => router.push("/app/pembayaran/gagal")}
            >
              Simulasikan gagal
            </button>
          )}
          <Link className="btn btn-secondary block" href="/app/kredit">
            Lihat instruksi bayar
          </Link>
        </div>

        <p
          className="t-small faint"
          style={{
            marginTop: 14,
            display: "flex",
            gap: 6,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <span className="spinner" style={{ width: 13, height: 13 }} />
          {lastCheck === 0
            ? "Memeriksa status…"
            : `Terakhir dicek ${lastCheck} dtk lalu`}
        </p>
        <p
          className="t-small faint"
          style={{
            marginTop: 10,
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

export default function PembayaranPendingPage() {
  return (
    <RevealScope>
      <Suspense fallback={<div className="pay-wrap" />}>
        <PendingContent />
      </Suspense>
    </RevealScope>
  );
}
