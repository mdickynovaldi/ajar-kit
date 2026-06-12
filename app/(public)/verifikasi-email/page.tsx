"use client";

/* AjarKit — /verifikasi-email (design.md §9.B.5)
   DUAL MODE: mode mock = simulasi (tidak berubah); mode Supabase = verifyOtp/
   resend nyata + auto-redirect bila user klik tautan email di tab ini. */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { useApp } from "@/lib/store";
import { authErrorMessage, getSupabase } from "@/lib/supabase/client";
import { AuthShell } from "../_components/auth-card";

/* panjang kode OTP email Supabase (setel sama dgn "Email OTP Length" di dashboard) */
const LEN = 8;

export default function VerifikasiEmailPage() {
  const router = useRouter();
  const toast = useToast();
  const app = useApp();

  const [code, setCode] = useState<string[]>(Array(LEN).fill(""));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(60);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (count <= 0) return;
    const t = setInterval(() => setCount((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [count]);

  // Tautan verifikasi diklik (tab ini maupun tab lain) → poll sesi tiap 3 dtk.
  // PENTING: redirect HANYA bila sesi milik email yang sedang didaftarkan DAN
  // sudah terkonfirmasi — sesi lama akun lain di browser yang sama tidak
  // boleh meloloskan pendaftar baru tanpa verifikasi.
  useEffect(() => {
    if (app.mode !== "supabase") return;
    const sb = getSupabase();
    if (!sb) return;
    const targetEmail = (app.pendingEmail ?? app.user.email)?.toLowerCase();
    const check = () => {
      sb.auth.getSession().then(({ data }) => {
        const su = data.session?.user;
        if (!su?.email_confirmed_at) return;
        if (targetEmail && su.email?.toLowerCase() !== targetEmail) return;
        router.replace("/onboarding");
      });
    };
    check();
    const t = setInterval(check, 3000);
    return () => clearInterval(t);
  }, [app.mode, app.pendingEmail, app.user.email, router]);

  function setDigit(i: number, raw: string) {
    const digits = raw.replace(/\D/g, "");
    setCode((prev) => {
      const next = [...prev];
      if (!digits) {
        next[i] = "";
        return next;
      }
      // dukung paste beberapa digit sekaligus
      for (let k = 0; k < digits.length && i + k < LEN; k++) {
        next[i + k] = digits[k];
      }
      return next;
    });
    if (digits) {
      const target = Math.min(i + digits.length, LEN - 1);
      refs.current[target]?.focus();
    }
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !code[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < LEN - 1) refs.current[i + 1]?.focus();
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (code.join("").length < LEN) {
      setError("Masukkan 8 digit kode dari emailmu.");
      return;
    }
    setError("");
    setLoading(true);

    if (app.mode === "supabase") {
      const targetEmail = app.pendingEmail ?? app.user.email;
      const sb = getSupabase()!;
      const { error: err } = await sb.auth.verifyOtp({
        email: targetEmail,
        token: code.join(""),
        type: "signup",
      });
      if (err) {
        // template default Supabase mengirim TAUTAN; kode hanya valid bila
        // template menyertakan variabel {{ .Token }} — arahkan ke tautan
        toast("Kode tidak cocok. Kamu juga bisa klik tautan di email.", false);
        setLoading(false);
        return;
      }
      router.push("/onboarding");
      return;
    }

    setTimeout(() => router.push("/onboarding"), 800);
  }

  async function resend() {
    if (count > 0) return;

    if (app.mode === "supabase") {
      const targetEmail = app.pendingEmail ?? app.user.email;
      if (!targetEmail) {
        toast("Email tidak ditemukan. Silakan daftar ulang.", false);
        return;
      }
      const sb = getSupabase()!;
      const { error: err } = await sb.auth.resend({
        type: "signup",
        email: targetEmail,
      });
      if (err) {
        toast(authErrorMessage(err.message), false);
        return;
      }
      toast("Kode baru dikirim ke emailmu — cek kotak masuk/spam.");
      setCount(60);
      return;
    }

    toast("Kode baru dikirim ke emailmu.");
    setCount(60);
  }

  return (
    <AuthShell>
      <div
        className="card pad-lg stack"
        style={{ "--gap": "16px", boxShadow: "var(--sh-md)" } as React.CSSProperties}
      >
        <span className="auth-ill mail">
          <Icon name="mail" />
        </span>

        <div style={{ textAlign: "center" }}>
          <h1 className="t-h2">Verifikasi emailmu</h1>
          <p className="muted t-small" style={{ marginTop: 4 }}>
            Kami kirim kode verifikasi ke{" "}
            <strong className="strong">{app.pendingEmail ?? app.user.email}</strong>.
            Masukkan 8 digit kodenya di bawah.
          </p>
        </div>

        <form className="stack" style={{ "--gap": "14px" } as React.CSSProperties} noValidate onSubmit={verify}>
          <div className={`field${error ? " error" : ""}`}>
            <div className="otp-row">
              {code.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    refs.current[i] = el;
                  }}
                  className="input"
                  type="text"
                  inputMode="numeric"
                  autoComplete={i === 0 ? "one-time-code" : "off"}
                  maxLength={LEN}
                  aria-label={`Digit ${i + 1}`}
                  value={d}
                  onChange={(e) => setDigit(i, e.target.value)}
                  onKeyDown={(e) => onKeyDown(i, e)}
                  onFocus={(e) => e.target.select()}
                />
              ))}
            </div>
            {error && <p className="help" style={{ textAlign: "center" }}>{error}</p>}
          </div>

          <Button type="submit" block size="lg" loading={loading}>
            {loading ? "Memverifikasi…" : "Verifikasi"}
          </Button>
        </form>

        <p className="t-small muted" style={{ textAlign: "center" }}>
          Tidak menerima kode?{" "}
          {count > 0 ? (
            <span className="faint">Kirim ulang ({count}d)</span>
          ) : (
            <button
              type="button"
              onClick={resend}
              style={{
                background: "none",
                border: 0,
                padding: 0,
                cursor: "pointer",
                font: "inherit",
                color: "var(--primary-600)",
                fontWeight: 600,
              }}
            >
              Kirim ulang
            </button>
          )}
        </p>
      </div>
    </AuthShell>
  );
}
