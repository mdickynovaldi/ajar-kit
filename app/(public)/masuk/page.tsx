"use client";

/* AjarKit — /masuk (porting masuk.html, design.md §9.B.1)
   DUAL MODE: mode mock = simulasi (tidak berubah); mode Supabase = auth nyata. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { Button } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { useApp } from "@/lib/store";
import { authErrorMessage, getSupabase } from "@/lib/supabase/client";
import { AuthShell, AuthDivider } from "../_components/auth-card";

export default function MasukPage() {
  const router = useRouter();
  const toast = useToast();
  const { mode, authStatus } = useApp();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /* Navigasi reaktif: tunggu store benar-benar "signedIn" sebelum ke /app.
     router.push langsung setelah signIn bisa kalah cepat dari onAuthStateChange
     → guard AppShell memantulkan balik ke /masuk (race). Efek ini juga
     otomatis mengalihkan pengunjung yang sudah login. */
  useEffect(() => {
    if (mode === "supabase" && authStatus === "signedIn") {
      router.replace("/app");
    }
  }, [mode, authStatus, router]);

  async function loginGoogle() {
    if (mode === "supabase") {
      const sb = getSupabase()!;
      const { error: err } = await sb.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + "/app" },
      });
      if (err) toast(authErrorMessage(err.message), false);
      return; // sukses → browser dialihkan ke Google
    }
    posthog.capture("user_logged_in", { method: "google" });
    toast("Login Google disimulasikan");
    setTimeout(() => router.push("/app"), 700);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !pw) {
      setError("Email atau sandi salah.");
      return;
    }
    setError("");
    setLoading(true);

    if (mode === "supabase") {
      const sb = getSupabase()!;
      const { data, error: err } = await sb.auth.signInWithPassword({
        email: email.trim(),
        password: pw,
      });
      if (err) {
        setError(authErrorMessage(err.message));
        setLoading(false);
        return;
      }
      const userId = data.user?.id ?? email.trim();
      posthog.identify(userId, { email: email.trim() });
      posthog.capture("user_logged_in", { method: "email" });
      router.push("/app");
      return;
    }

    posthog.capture("user_logged_in", { method: "email" });
    setTimeout(() => router.push("/app"), 800);
  }

  return (
    <AuthShell>
      <div
        className="card pad-lg stack"
        style={{ "--gap": "14px", boxShadow: "var(--sh-md)" } as React.CSSProperties}
      >
        <div style={{ textAlign: "center" }}>
          <h1 className="t-h2">Masuk ke AjarKit</h1>
          <p className="muted t-small" style={{ marginTop: 4 }}>
            Lanjutkan membuat perangkat ajarmu.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          block
          iconLeft="google"
          onClick={loginGoogle}
        >
          Lanjut dengan Google
        </Button>
        <AuthDivider />

        <form className="stack" style={{ "--gap": "14px" } as React.CSSProperties} noValidate onSubmit={submit}>
          <div className="field">
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
          </div>

          <div className={`field${error ? " error" : ""}`}>
            <div className="row between" style={{ marginBottom: 6 }}>
              <label htmlFor="pw" style={{ margin: 0 }}>
                Kata sandi
              </label>
              <Link
                className="t-small"
                style={{ color: "var(--primary-600)", fontWeight: 600 }}
                href="/lupa-sandi"
              >
                Lupa sandi?
              </Link>
            </div>
            <div className="input-icon" style={{ position: "relative" }}>
              <Icon name="lock" />
              <input
                className="input"
                id="pw"
                type={showPw ? "text" : "password"}
                placeholder="Kata sandi"
                autoComplete="current-password"
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
            {error && <p className="help">{error}</p>}
          </div>

          <Button type="submit" block size="lg" loading={loading}>
            {loading ? "Memproses…" : "Masuk"}
          </Button>
        </form>
      </div>

      <p className="t-small muted" style={{ textAlign: "center" }}>
        Belum punya akun?{" "}
        <Link href="/daftar" style={{ color: "var(--primary-600)", fontWeight: 600 }}>
          Daftar
        </Link>
      </p>
    </AuthShell>
  );
}
