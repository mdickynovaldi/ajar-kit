"use client";

/* AjarKit — /lupa-sandi (design.md §9.B.3)
   DUAL MODE: mode mock = simulasi (tidak berubah); mode Supabase = kirim
   email reset nyata dgn tautan ke /reset-sandi. */

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { useApp } from "@/lib/store";
import { authErrorMessage, getSupabase } from "@/lib/supabase/client";
import { AuthShell } from "../_components/auth-card";

export default function LupaSandiPage() {
  const { mode } = useApp();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Masukkan emailmu dulu, ya.");
      return;
    }
    setError("");
    setLoading(true);

    if (mode === "supabase") {
      const sb = getSupabase()!;
      const { error: err } = await sb.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + "/reset-sandi",
      });
      if (err) {
        setError(authErrorMessage(err.message));
        setLoading(false);
        return;
      }
      setLoading(false);
      setSent(true);
      return;
    }

    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 800);
  }

  return (
    <AuthShell>
      <div
        className="card pad-lg stack"
        style={{ "--gap": "14px", boxShadow: "var(--sh-md)" } as React.CSSProperties}
      >
        {sent ? (
          <div className="stack" style={{ "--gap": "14px", textAlign: "center" } as React.CSSProperties}>
            <span className="auth-ill">
              <Icon name="checkCircle" />
            </span>
            <h1 className="t-h2">Cek emailmu — kami kirim tautan reset.</h1>
            <p className="muted t-small">
              Tautan dikirim ke <strong className="strong">{email.trim()}</strong>. Tidak
              menerima? Periksa folder spam.
            </p>
            <Link
              className="t-small"
              style={{ color: "var(--primary-600)", fontWeight: 600 }}
              href="/masuk"
            >
              ← Kembali ke Masuk
            </Link>
          </div>
        ) : (
          <>
            <div style={{ textAlign: "center" }}>
              <h1 className="t-h2">Lupa sandi?</h1>
              <p className="muted t-small" style={{ marginTop: 4 }}>
                Masukkan email akunmu — kami kirim tautan reset.
              </p>
            </div>

            <form className="stack" style={{ "--gap": "14px" } as React.CSSProperties} noValidate onSubmit={submit}>
              <div className={`field${error ? " error" : ""}`}>
                <label htmlFor="email">Email</label>
                <div className="input-icon">
                  <Icon name="mail" />
                  <input
                    className="input"
                    id="email"
                    type="email"
                    placeholder="nama@sekolah.sch.id"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                {error && <p className="help">{error}</p>}
              </div>

              <Button type="submit" block size="lg" loading={loading}>
                {loading ? "Mengirim…" : "Kirim tautan reset"}
              </Button>
            </form>

            <p className="t-small muted" style={{ textAlign: "center" }}>
              <Link href="/masuk" style={{ color: "var(--primary-600)", fontWeight: 600 }}>
                ← Kembali ke Masuk
              </Link>
            </p>
          </>
        )}
      </div>
    </AuthShell>
  );
}
