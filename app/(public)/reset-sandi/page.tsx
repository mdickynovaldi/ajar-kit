"use client";

/* AjarKit — /reset-sandi?token=... (design.md §9.B.4)
   DUAL MODE: mode mock = simulasi (tidak berubah); mode Supabase = halaman
   dibuka dari tautan recovery (sesi terdeteksi otomatis) lalu updateUser. */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { useApp } from "@/lib/store";
import { authErrorMessage, getSupabase } from "@/lib/supabase/client";
import { AuthShell } from "../_components/auth-card";

export default function ResetSandiPage() {
  const router = useRouter();
  const toast = useToast();
  const { mode, authStatus } = useApp();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<{ pw?: string; confirm?: string }>({});
  const [loading, setLoading] = useState(false);

  // Mode Supabase tanpa sesi recovery → form tidak bisa dipakai
  const noSession = mode === "supabase" && authStatus === "signedOut";
  const waitingSession = mode === "supabase" && authStatus === "loading";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (noSession || waitingSession) return;
    const next: typeof errors = {};
    if (pw.length < 8) next.pw = "Minimal 8 karakter.";
    if (confirm !== pw || !confirm) next.confirm = "Konfirmasi sandi tidak cocok.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setLoading(true);

    if (mode === "supabase") {
      const sb = getSupabase()!;
      const { error: err } = await sb.auth.updateUser({ password: pw });
      if (err) {
        toast(authErrorMessage(err.message), false);
        setLoading(false);
        return;
      }
      toast("Sandi diperbarui");
      router.push("/masuk");
      return;
    }

    setTimeout(() => {
      toast("Sandi baru tersimpan. Silakan masuk.");
      router.push("/masuk");
    }, 800);
  }

  return (
    <AuthShell>
      <div
        className="card pad-lg stack"
        style={{ "--gap": "14px", boxShadow: "var(--sh-md)" } as React.CSSProperties}
      >
        <div style={{ textAlign: "center" }}>
          <h1 className="t-h2">Buat sandi baru</h1>
          <p className="muted t-small" style={{ marginTop: 4 }}>
            Sandi baru untuk akun AjarKit-mu.
          </p>
        </div>

        <form className="stack" style={{ "--gap": "14px" } as React.CSSProperties} noValidate onSubmit={submit}>
          <div className={`field${errors.pw ? " error" : ""}`}>
            <label htmlFor="pw">Sandi baru</label>
            <div className="input-icon" style={{ position: "relative" }}>
              <Icon name="lock" />
              <input
                className="input"
                id="pw"
                type={showPw ? "text" : "password"}
                placeholder="Minimal 8 karakter"
                autoComplete="new-password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
              />
              <button
                type="button"
                className="iconbtn pw-toggle"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Sembunyikan sandi" : "Lihat sandi"}
                aria-pressed={showPw}
              >
                <Icon name="eye" />
              </button>
            </div>
            {errors.pw && <p className="help">{errors.pw}</p>}
          </div>

          <div className={`field${errors.confirm ? " error" : ""}`}>
            <label htmlFor="confirm">Konfirmasi sandi baru</label>
            <div className="input-icon">
              <Icon name="lock" />
              <input
                className="input"
                id="confirm"
                type={showPw ? "text" : "password"}
                placeholder="Ulangi sandi baru"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            {errors.confirm && <p className="help">{errors.confirm}</p>}
          </div>

          {noSession && (
            <p className="help" style={{ textAlign: "center" }}>
              Buka halaman ini lewat tautan reset di emailmu.
            </p>
          )}

          <Button
            type="submit"
            block
            size="lg"
            loading={loading}
            disabled={noSession || waitingSession}
          >
            {loading ? "Menyimpan…" : "Simpan sandi baru"}
          </Button>
        </form>

        <p className="t-small muted" style={{ textAlign: "center" }}>
          <Link href="/masuk" style={{ color: "var(--primary-600)", fontWeight: 600 }}>
            ← Kembali ke Masuk
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
