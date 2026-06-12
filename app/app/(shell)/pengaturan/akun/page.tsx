"use client";

/* AjarKit — Pengaturan / Akun (design.md §9.J, prd.md §8.8).
   Porting pane "Akun" dari Ajarkit/app-pengaturan.html:
   email, ubah kata sandi (sheet + validasi), akun tertaut Google,
   bahasa, tema Terang/Gelap/Sistem (kunci 'ajarkit-theme'),
   zona waktu, Keluar (logout), dan Zona bahaya (hapus akun, ketik HAPUS).
   DUAL-MODE: mode Supabase memakai auth.updateUser utk ganti sandi dan
   signOut utk keluar/hapus akun; mode mock tetap perilaku lama. */

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, StatusBadge } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { useApp } from "@/lib/store";
import { authErrorMessage, getSupabase } from "@/lib/supabase/client";
import { SettingsShell } from "../_components/settings-nav";

type ThemePref = "light" | "dark" | "system";

const THEME_KEY = "ajarkit-theme";

/* Preferensi tema dibaca dari localStorage sebagai "external store"
   (aman hidrasi: snapshot server selalu "system").
   Event "ajarkit-theme" dikirim store.toggleTheme (ThemeToggle di shell)
   maupun halaman ini agar semua kontrol tema saling sinkron. */
const themeListeners = new Set<() => void>();
function subscribeTheme(cb: () => void) {
  themeListeners.add(cb);
  window.addEventListener("storage", cb);
  window.addEventListener("ajarkit-theme", cb);
  return () => {
    themeListeners.delete(cb);
    window.removeEventListener("storage", cb);
    window.removeEventListener("ajarkit-theme", cb);
  };
}
function emitTheme() {
  themeListeners.forEach((l) => l());
  // sinkronkan kontrol lain (ikon tema di shell pakai MutationObserver
  // pada data-theme, tapi event ini menjaga konsistensi antar-listener)
  window.dispatchEvent(new Event("ajarkit-theme"));
}
function readThemePref(): ThemePref {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

export default function PengaturanAkunPage() {
  const app = useApp();
  const toast = useToast();
  const router = useRouter();

  /* --- tema --- */
  const theme = useSyncExternalStore(
    subscribeTheme,
    readThemePref,
    () => "system" as ThemePref,
  );

  function pilihTema(t: ThemePref) {
    try {
      if (t === "system") {
        localStorage.removeItem(THEME_KEY);
        document.documentElement.setAttribute(
          "data-theme",
          window.matchMedia &&
            window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light",
        );
      } else {
        localStorage.setItem(THEME_KEY, t);
        document.documentElement.setAttribute("data-theme", t);
      }
    } catch {
      /* abaikan */
    }
    emitTheme();
  }

  /* --- akun tertaut Google --- */
  const [googleLinked, setGoogleLinked] = useState(false);

  /* --- ubah kata sandi --- */
  const [pwOpen, setPwOpen] = useState(false);
  const [pwCur, setPwCur] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwNew2, setPwNew2] = useState("");
  const [pwErr, setPwErr] = useState<{ cur?: string; baru?: string; ulang?: string }>({});
  const [pwLoading, setPwLoading] = useState(false);

  async function simpanSandi(e: React.FormEvent) {
    e.preventDefault();
    const err: typeof pwErr = {};
    if (!pwCur) err.cur = "Masukkan kata sandi saat ini.";
    if (pwNew.length < 8) err.baru = "Minimal 8 karakter.";
    if (pwNew2 !== pwNew || !pwNew2) err.ulang = "Kata sandi tidak sama.";
    setPwErr(err);
    if (Object.keys(err).length) return;

    if (app.mode === "supabase") {
      // Catatan: Supabase updateUser tidak memverifikasi sandi lama —
      // field "Kata sandi saat ini" dipertahankan untuk UX/validasi form.
      setPwLoading(true);
      const { error } = await getSupabase()!.auth.updateUser({
        password: pwNew,
      });
      setPwLoading(false);
      if (error) {
        toast(authErrorMessage(error.message), false);
        return;
      }
    }

    setPwOpen(false);
    setPwCur("");
    setPwNew("");
    setPwNew2("");
    toast("Kata sandi diperbarui");
  }

  /* --- keluar (logout) --- */
  const [outLoading, setOutLoading] = useState(false);

  async function keluar() {
    setOutLoading(true);
    try {
      await app.signOut();
      toast("Sampai jumpa 👋");
      router.push("/masuk");
    } catch (e) {
      setOutLoading(false);
      toast(authErrorMessage(e instanceof Error ? e.message : ""), false);
    }
  }

  /* --- hapus akun --- */
  const [delOpen, setDelOpen] = useState(false);
  const [delConf, setDelConf] = useState("");
  const [delLoading, setDelLoading] = useState(false);

  async function hapusAkun() {
    if (delConf !== "HAPUS") return;

    if (app.mode === "supabase") {
      // Penghapusan sungguhan via /api/account/delete (service role di server,
      // auth.admin.deleteUser → data ikut terhapus oleh FK ON DELETE CASCADE).
      // { mode: "simulated" } = service key belum dikonfigurasi → perilaku lama.
      setDelLoading(true);
      try {
        const { data: sess } = await getSupabase()!.auth.getSession();
        const token = sess.session?.access_token ?? "";
        const res = await fetch("/api/account/delete", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          // sesi dipertahankan agar pengguna bisa coba lagi
          toast("Gagal menghapus akun. Coba lagi, ya.", false);
          return;
        }
        const json = (await res.json().catch(() => null)) as {
          mode?: "deleted" | "simulated";
        } | null;
        if (json?.mode === "deleted") {
          setDelOpen(false);
          toast("Akun dan semua datamu dihapus permanen.");
          await app.signOut();
          router.push("/");
          return;
        }
        // mode "simulated" — service key kosong: akhiri sesi saja (perilaku lama)
        await app.signOut();
        setDelOpen(false);
        toast("Sesi diakhiri. Penghapusan permanen diproses admin (mock).", false);
        router.push("/");
      } catch {
        toast("Gagal menghapus akun. Coba lagi, ya.", false);
      } finally {
        setDelLoading(false);
      }
      return;
    }

    setDelOpen(false);
    app.resetMock();
    toast("Akun dijadwalkan dihapus", false);
    router.push("/");
  }

  return (
    <SettingsShell>
      <section
        className="card pad-lg stack"
        style={{ "--gap": "8px" } as React.CSSProperties}
      >
        <h3 className="t-h3" style={{ marginBottom: 6 }}>
          Akun
        </h3>

        <div className="opt-row">
          <div>
            <strong className="strong" style={{ fontSize: 14 }}>
              Email
            </strong>
            <p className="t-small muted">{app.user.email}</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => toast("Fitur ubah email segera hadir")}
          >
            Ubah
          </Button>
        </div>

        <div className="opt-row">
          <div>
            <strong className="strong" style={{ fontSize: 14 }}>
              Kata sandi
            </strong>
            <p className="t-small muted">Terakhir diubah 2 bulan lalu</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setPwOpen(true)}>
            Ubah sandi
          </Button>
        </div>

        <div className="opt-row">
          <div>
            <strong className="strong" style={{ fontSize: 14 }}>
              Akun tertaut
            </strong>
            <p className="t-small muted">
              {googleLinked ? "Google · budi.s@gmail.com" : "Google · belum terhubung"}
            </p>
          </div>
          {googleLinked ? (
            <StatusBadge badge="badge-selesai">Terhubung</StatusBadge>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setGoogleLinked(true);
                toast("Akun Google terhubung");
              }}
            >
              Hubungkan
            </Button>
          )}
        </div>

        <div className="opt-row">
          <div>
            <strong className="strong" style={{ fontSize: 14 }}>
              Bahasa
            </strong>
            <p className="t-small muted">Bahasa antarmuka</p>
          </div>
          <select className="select" style={{ width: "auto" }} aria-label="Bahasa antarmuka" defaultValue="Indonesia">
            <option>Indonesia</option>
            <option>English</option>
          </select>
        </div>

        <div className="opt-row">
          <div>
            <strong className="strong" style={{ fontSize: 14 }}>
              Tema
            </strong>
            <p className="t-small muted">Tampilan aplikasi</p>
          </div>
          <div className="segmented theme-seg" role="tablist" aria-label="Tema">
            <button
              type="button"
              role="tab"
              aria-selected={theme === "light"}
              className={theme === "light" ? "on" : ""}
              onClick={() => pilihTema("light")}
            >
              <Icon name="sun" />
              Terang
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={theme === "dark"}
              className={theme === "dark" ? "on" : ""}
              onClick={() => pilihTema("dark")}
            >
              <Icon name="moon" />
              Gelap
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={theme === "system"}
              className={theme === "system" ? "on" : ""}
              onClick={() => pilihTema("system")}
            >
              Sistem
            </button>
          </div>
        </div>

        <div className="opt-row">
          <div>
            <strong className="strong" style={{ fontSize: 14 }}>
              Zona waktu
            </strong>
            <p className="t-small muted">WIB (GMT+7)</p>
          </div>
          <select className="select" style={{ width: "auto" }} aria-label="Zona waktu" defaultValue="WIB">
            <option>WIB</option>
            <option>WITA</option>
            <option>WIT</option>
          </select>
        </div>

        <div className="opt-row">
          <div>
            <strong className="strong" style={{ fontSize: 14 }}>
              Sesi
            </strong>
            <p className="t-small muted">Keluar dari akun di perangkat ini</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            iconLeft="logout"
            loading={outLoading}
            onClick={keluar}
          >
            Keluar
          </Button>
        </div>
      </section>

      <section className="card pad-lg set-danger" style={{ marginTop: 18 }}>
        <h4 className="t-h4" style={{ color: "var(--error)" }}>
          Zona bahaya
        </h4>
        <p className="t-small muted" style={{ margin: "6px 0 12px" }}>
          Menghapus akun bersifat permanen. Semua dokumen akan hilang.
        </p>
        <Button
          variant="destructive"
          onClick={() => {
            setDelConf("");
            setDelOpen(true);
          }}
        >
          Hapus akun
        </Button>
      </section>

      {/* Sheet ubah kata sandi */}
      <Sheet open={pwOpen} onClose={() => setPwOpen(false)}>
        <h3 className="t-h3" style={{ marginBottom: 8 }}>
          Ubah kata sandi
        </h3>
        <form
          className="stack"
          style={{ "--gap": "14px" } as React.CSSProperties}
          noValidate
          onSubmit={simpanSandi}
        >
          <Field label="Kata sandi saat ini" error={pwErr.cur}>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              value={pwCur}
              onChange={(e) => setPwCur(e.target.value)}
            />
          </Field>
          <Field
            label="Kata sandi baru"
            error={pwErr.baru}
            help={pwErr.baru ? undefined : "Minimal 8 karakter."}
          >
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              value={pwNew}
              onChange={(e) => setPwNew(e.target.value)}
            />
          </Field>
          <Field label="Ulangi kata sandi baru" error={pwErr.ulang}>
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              value={pwNew2}
              onChange={(e) => setPwNew2(e.target.value)}
            />
          </Field>
          <div className="row" style={{ gap: 8 }}>
            <Button
              type="button"
              variant="secondary"
              className="grow"
              onClick={() => setPwOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" className="grow" loading={pwLoading}>
              Simpan sandi
            </Button>
          </div>
        </form>
      </Sheet>

      {/* Sheet konfirmasi hapus akun */}
      <Sheet open={delOpen} onClose={() => setDelOpen(false)}>
        <h3 className="t-h3" style={{ color: "var(--error)", marginBottom: 8 }}>
          Hapus akun
        </h3>
        <p className="muted" style={{ marginBottom: 12 }}>
          Ketik <b>HAPUS</b> untuk konfirmasi. Tindakan ini tidak bisa
          dibatalkan.
        </p>
        <input
          className="input"
          placeholder="HAPUS"
          aria-label="Ketik HAPUS untuk konfirmasi"
          value={delConf}
          onChange={(e) => setDelConf(e.target.value)}
          style={{ marginBottom: 14 }}
        />
        <div className="row" style={{ gap: 8 }}>
          <Button
            variant="secondary"
            className="grow"
            onClick={() => setDelOpen(false)}
          >
            Batal
          </Button>
          <Button
            variant="destructive"
            className="grow"
            disabled={delConf !== "HAPUS"}
            loading={delLoading}
            onClick={hapusAkun}
          >
            Hapus permanen
          </Button>
        </div>
      </Sheet>
    </SettingsShell>
  );
}
