"use client";

/* AjarKit — /daftar (porting daftar.html, design.md §9.B.2)
   DUAL MODE: mode mock = simulasi (tidak berubah); mode Supabase = signUp nyata
   (profil + bonus kredit dibuat trigger DB dari metadata { nama, role }). */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { Button } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { useApp } from "@/lib/store";
import { authErrorMessage, getSupabase } from "@/lib/supabase/client";
import type { Role } from "@/lib/types";
import { MOCK_USERS } from "@/data/mock";
import { AuthShell, AuthDivider } from "../_components/auth-card";

const STRENGTH_COLORS = ["var(--error)", "var(--warning)", "var(--primary-500)", "var(--success)"];
const STRENGTH_LABELS = ["Lemah", "Cukup", "Baik", "Kuat"];

function pwScore(v: string): number {
  let s = 0;
  if (v.length >= 8) s++;
  if (/[A-Z]/.test(v)) s++;
  if (/[0-9]/.test(v)) s++;
  if (/[^A-Za-z0-9]/.test(v)) s++;
  return s;
}

export default function DaftarPage() {
  const router = useRouter();
  const toast = useToast();
  const app = useApp();

  const [role, setRoleLocal] = useState<Role>("guru");
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<{ nama?: string; email?: string; pw?: string }>({});
  const [emailTaken, setEmailTaken] = useState(false);
  const [loading, setLoading] = useState(false);

  const score = pwScore(pw);
  const strengthIdx = Math.max(0, score - 1);

  const isEmailTerdaftar = (v: string) =>
    Object.values(MOCK_USERS).some(
      (u) => u.email.toLowerCase() === v.trim().toLowerCase(),
    );

  async function daftarGoogle() {
    if (app.mode === "supabase") {
      const sb = getSupabase()!;
      const { error: err } = await sb.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + "/app" },
      });
      if (err) toast(authErrorMessage(err.message), false);
      return; // sukses → browser dialihkan ke Google
    }
    posthog.capture("user_signed_up", { method: "google", role });
    app.setRole(role);
    app.setOnboardingDone(false);
    app.setPendingEmail(email || null);
    toast("Daftar Google disimulasikan");
    setTimeout(() => router.push("/onboarding"), 700);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!nama.trim()) next.nama = "Wajib diisi.";
    if (!email.trim()) next.email = "Wajib diisi.";
    if (!pw) next.pw = "Wajib diisi.";
    setErrors(next);
    const taken =
      app.mode !== "supabase" && !next.email && isEmailTerdaftar(email);
    setEmailTaken(taken);
    if (Object.keys(next).length || taken) return;
    if (!agree) {
      toast("Setujui syarat & privasi dulu, ya.", false);
      return;
    }
    setLoading(true);

    if (app.mode === "supabase") {
      const sb = getSupabase()!;
      // sesi lama di browser ini (akun lain) bisa membuat pendaftar baru
      // "lolos" halaman verifikasi — putus dulu sebelum mendaftar
      const { data: existing } = await sb.auth.getSession();
      if (existing.session) await sb.auth.signOut();
      const { data, error: err } = await sb.auth.signUp({
        email: email.trim(),
        password: pw,
        options: {
          data: { nama: nama.trim(), role },
          emailRedirectTo: window.location.origin + "/app",
        },
      });
      if (err) {
        const m = err.message.toLowerCase();
        if (m.includes("already registered") || m.includes("already been registered")) {
          setEmailTaken(true);
        } else {
          toast(authErrorMessage(err.message), false);
        }
        setLoading(false);
        return;
      }
      // konfirmasi email AKTIF: email terdaftar tidak memunculkan error,
      // tapi user "palsu" tanpa identities (anti enumerasi Supabase)
      if (data.user && data.user.identities?.length === 0) {
        setEmailTaken(true);
        setLoading(false);
        return;
      }
      // profil (role, bonus kredit, onboarding_done=false) dibuat trigger DB
      const userId = data.user?.id ?? email.trim();
      posthog.identify(userId, { email: email.trim(), role });
      posthog.capture("user_signed_up", { method: "email", role });
      app.setPendingEmail(email.trim());
      if (data.session) router.push("/onboarding"); // konfirmasi email OFF
      else router.push("/verifikasi-email");
      return;
    }

    posthog.capture("user_signed_up", { method: "email", role });
    app.setRole(role);
    app.setOnboardingDone(false);
    app.setPendingEmail(email || null);
    setTimeout(() => router.push("/verifikasi-email"), 800);
  }

  return (
    <AuthShell wide gap={16}>
      <div
        className="card pad-lg stack"
        style={{ "--gap": "16px", boxShadow: "var(--sh-md)" } as React.CSSProperties}
      >
        <div style={{ textAlign: "center" }}>
          <h1 className="t-h2">Buat akun gratis</h1>
          <p className="muted t-small" style={{ marginTop: 4 }}>
            Tanpa kartu kredit. Mulai dalam semenit.
          </p>
        </div>

        <div>
          <span className="lbl">Saya seorang…</span>
          <div className="auth-roles" role="radiogroup" aria-label="Saya seorang">
            <button
              type="button"
              className={`auth-role${role === "guru" ? " on" : ""}`}
              role="radio"
              aria-checked={role === "guru"}
              onClick={() => setRoleLocal("guru")}
            >
              <span className="ic ic-blue">
                <Icon name="book" />
              </span>
              <strong className="strong" style={{ display: "block" }}>
                Guru
              </strong>
              <span className="t-small muted">Modul Ajar, LKPD, asesmen, bank soal</span>
            </button>
            <button
              type="button"
              className={`auth-role${role === "dosen" ? " on" : ""}`}
              role="radio"
              aria-checked={role === "dosen"}
              onClick={() => setRoleLocal("dosen")}
            >
              <span className="ic ic-teal">
                <Icon name="layers" />
              </span>
              <strong className="strong" style={{ display: "block" }}>
                Dosen
              </strong>
              <span className="t-small muted">RPS berbasis OBE &amp; bahan ajar</span>
            </button>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          block
          iconLeft="google"
          onClick={daftarGoogle}
        >
          Daftar dengan Google
        </Button>
        <AuthDivider tight />

        <form className="stack" style={{ "--gap": "14px" } as React.CSSProperties} noValidate onSubmit={submit}>
          <div className={`field${errors.nama ? " error" : ""}`}>
            <label htmlFor="nama">Nama lengkap</label>
            <input
              className="input"
              id="nama"
              placeholder="Mis. Budi Santoso"
              autoComplete="name"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
            />
            {errors.nama && <p className="help">{errors.nama}</p>}
          </div>

          <div className={`field${errors.email || emailTaken ? " error" : ""}`}>
            <label htmlFor="email">Email</label>
            <input
              className="input"
              id="email"
              type="email"
              placeholder="nama@sekolah.sch.id"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailTaken(false);
              }}
            />
            {errors.email ? (
              <p className="help">{errors.email}</p>
            ) : (
              emailTaken && (
                <p className="help">
                  Email sudah terdaftar.{" "}
                  <Link
                    href="/masuk"
                    style={{ color: "var(--primary-600)", fontWeight: 600 }}
                  >
                    Masuk
                  </Link>
                </p>
              )
            )}
          </div>

          <div className={`field${errors.pw ? " error" : ""}`}>
            <label htmlFor="pw">Kata sandi</label>
            <input
              className="input"
              id="pw"
              type="password"
              placeholder="Minimal 8 karakter"
              autoComplete="new-password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
            />
            <div className="auth-meter">
              <span
                style={{
                  width: pw ? `${score * 25}%` : 0,
                  background: pw ? STRENGTH_COLORS[strengthIdx] : undefined,
                }}
              />
            </div>
            <p className="help">
              {errors.pw ||
                (pw
                  ? `Kekuatan sandi: ${STRENGTH_LABELS[strengthIdx]}`
                  : "Gunakan kombinasi huruf & angka.")}
            </p>
          </div>

          <label className="auth-check">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
            />
            <span>
              Saya setuju dengan{" "}
              <a href="#" style={{ color: "var(--primary-600)" }} onClick={(e) => e.preventDefault()}>
                Syarat
              </a>{" "}
              &amp;{" "}
              <a href="#" style={{ color: "var(--primary-600)" }} onClick={(e) => e.preventDefault()}>
                Kebijakan Privasi
              </a>{" "}
              AjarKit.
            </span>
          </label>

          <Button type="submit" block size="lg" loading={loading}>
            {loading ? "Membuat akun…" : "Buat akun"}
          </Button>
        </form>
      </div>

      <p className="t-small muted" style={{ textAlign: "center" }}>
        Sudah punya akun?{" "}
        <Link href="/masuk" style={{ color: "var(--primary-600)", fontWeight: 600 }}>
          Masuk
        </Link>
      </p>
    </AuthShell>
  );
}
