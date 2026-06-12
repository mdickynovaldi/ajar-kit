"use client";

/* AjarKit — Ajak Teman (/app/referral, migration 0008 + revisi 0009).
   Kartu hero gradien dgn kode referral + salin kode/tautan, 3 stat card
   (teman terdaftar / bertransaksi / kredit didapat) dari getReferralInfo, dan
   kartu "Cara kerja" 3 langkah. Bonus HANYA saat pembelian pertama teman:
   keduanya dapat +10% kredit. Gaya mengikuti halaman kredit (card/btn). */

import { useEffect, useState, type CSSProperties } from "react";
import { Icon } from "@/components/ui/icon";
import { Button, Skeleton } from "@/components/ui/controls";
import { useToast } from "@/components/ui/toast";
import { useApp, type ReferralInfo } from "@/lib/store";

const SHARE_BASE = "https://ajarkit.com/daftar?ref=";

const STEPS: { title: string; desc: string }[] = [
  {
    title: "Bagikan kode atau tautanmu",
    desc: "Teman daftar memakai kodemu — gratis, tanpa syarat.",
  },
  {
    title: "Teman melakukan pembelian kredit pertama",
    desc: "Teman langsung dapat bonus +10% kredit dari pembeliannya.",
  },
  {
    title: "Kamu otomatis dapat 10% kredit",
    desc: "Bonus 10% dari pembelian pertamanya masuk ke saldomu.",
  },
];

function ReferralSkeleton() {
  return (
    <div className="stack" style={{ "--gap": "24px" } as CSSProperties}>
      <div className="card saldo" aria-hidden="true">
        <Skeleton width={120} height={12} style={{ opacity: 0.4 }} />
        <Skeleton width={220} height={38} style={{ margin: "10px 0", opacity: 0.4 }} />
        <Skeleton width={260} height={36} style={{ opacity: 0.4 }} />
      </div>
      <div className="pkg-grid">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="card pkg" aria-hidden="true">
            <Skeleton width="60%" height={22} />
            <Skeleton width="80%" height={12} style={{ marginTop: 8 }} />
          </div>
        ))}
      </div>
      <div className="card pad" aria-hidden="true">
        <Skeleton width={120} height={18} style={{ marginBottom: 12 }} />
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} width="90%" height={14} style={{ marginTop: 10 }} />
        ))}
      </div>
    </div>
  );
}

export default function ReferralPage() {
  const { getReferralInfo, hydrated, authStatus } = useApp();
  const toast = useToast();
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hydrated || authStatus !== "signedIn") return;
    let cancelled = false;
    void getReferralInfo().then((r) => {
      if (cancelled) return;
      setInfo(r);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [getReferralInfo, hydrated, authStatus]);

  async function salin(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast(label);
    } catch {
      toast("Gagal menyalin — salin manual, ya.", false);
    }
  }

  const stats: { label: string; value: number | string }[] = [
    { label: "Teman terdaftar", value: info?.invited ?? 0 },
    { label: "Teman bertransaksi", value: info?.converted ?? 0 },
    { label: "Kredit didapat", value: `+${info?.earned ?? 0}` },
  ];

  return (
    <>
      <h1 className="t-h1" style={{ marginBottom: 4 }}>
        Ajak Teman
      </h1>
      <p className="muted" style={{ marginBottom: 22 }}>
        Ajak temanmu — saat temanmu melakukan pembelian pertama, kalian berdua
        dapat bonus kredit.
      </p>

      {!hydrated || loading ? (
        <ReferralSkeleton />
      ) : (
        <div className="stack" style={{ "--gap": "24px" } as CSSProperties}>
          {/* Hero gradien: kode besar + salin kode/tautan */}
          <div className="card saldo">
            <span className="t-caption" style={{ opacity: 0.85 }}>
              KODE REFERRAL KAMU
            </span>
            <div className="amt" style={{ letterSpacing: 4 }}>
              {info?.code ?? "—"}
            </div>
            {info ? (
              <div className="row" style={{ gap: 10, flexWrap: "wrap", marginTop: 6 }}>
                <Button
                  variant="secondary"
                  size="sm"
                  iconLeft="copy"
                  onClick={() => void salin(info.code, "Kode disalin")}
                >
                  Salin kode
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  iconLeft="share"
                  onClick={() =>
                    void salin(`${SHARE_BASE}${info.code}`, "Tautan disalin")
                  }
                >
                  Salin tautan
                </Button>
              </div>
            ) : (
              <span className="t-small" style={{ opacity: 0.9 }}>
                Kode belum tersedia. Coba muat ulang halaman, ya.
              </span>
            )}
          </div>

          {/* 3 stat card */}
          <section>
            <h3 className="t-h3" style={{ marginBottom: 12 }}>
              Hasil ajakanmu
            </h3>
            <div className="pkg-grid">
              {stats.map((s) => (
                <div key={s.label} className="card pkg" style={{ cursor: "default" }}>
                  <div className="cr num">{s.value}</div>
                  <div className="pr">{s.label}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Cara kerja */}
          <section>
            <h3 className="t-h3" style={{ marginBottom: 12 }}>
              Cara kerja
            </h3>
            <div className="card pad">
              <ol
                className="stack"
                style={{ "--gap": "14px", margin: 0, padding: 0, listStyle: "none" } as CSSProperties}
              >
                {STEPS.map((step, i) => (
                  <li key={step.title} className="row" style={{ gap: 12, alignItems: "flex-start" }}>
                    <span
                      className="num"
                      style={{
                        flex: "none",
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        background: "var(--primary-50)",
                        color: "var(--primary-600)",
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      {i + 1}
                    </span>
                    <div className="grow">
                      <div className="strong" style={{ fontWeight: 600, fontSize: 14 }}>
                        {step.title}
                      </div>
                      <div className="t-small muted">{step.desc}</div>
                    </div>
                  </li>
                ))}
              </ol>
              <div
                className="row"
                style={{
                  gap: 8,
                  marginTop: 16,
                  paddingTop: 14,
                  borderTop: "1px solid var(--border)",
                  color: "var(--text-faint)",
                }}
              >
                <Icon name="gift" />
                <span className="t-small">
                  Bonus dihitung dari pembelian pertama tiap teman dan masuk
                  otomatis setelah pembayaran lunas.
                </span>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
