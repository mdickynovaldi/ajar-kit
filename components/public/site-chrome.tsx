"use client";

/* AjarKit — chrome halaman publik: nav sticky (solid saat scroll) + footer global */

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { useApp } from "@/lib/store";

const NAV_LINKS = [
  { href: "/fitur", label: "Fitur" },
  { href: "/harga", label: "Harga" },
  { href: "/tentang", label: "Tentang" },
  { href: "/bantuan", label: "Bantuan" },
] as const;

export function SiteNav({
  transparentAtTop = false,
}: {
  /** true (landing): transparan di atas, solid saat scroll. false: selalu solid. */
  transparentAtTop?: boolean;
}) {
  const [solid, setSolid] = useState(!transparentAtTop);
  const [menuOpen, setMenuOpen] = useState(false);
  const app = useApp();
  /* CTA sadar-login dirender SETELAH mount — SSR selalu versi tamu,
     mencegah hydration mismatch (riwayat bug nav-cta). */
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- flag mount sekali; SSR & render pertama wajib identik (anti hydration mismatch)
    setMounted(true);
  }, []);
  const signedIn = mounted && app.authStatus === "signedIn";
  /* pertama kali (belum onboarding) → /onboarding, selebihnya → /app */
  const dashboardHref = app.onboardingDone ? "/app" : "/onboarding";
  const firstName = (app.user?.nama || "").split(" ")[0];

  useEffect(() => {
    if (!transparentAtTop) return;
    const onScroll = () => setSolid(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [transparentAtTop]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className={`nav${solid ? " solid" : ""}`}>
      <div className="container nav-inner">
        <Link className="brand" href="/">
          <span className="mark">
            <Icon name="logo" />
          </span>
          AjarKit
        </Link>
        <nav className="links grow">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </nav>
        <span className="grow hide-desktop" />
        <ThemeToggle />
        {signedIn ? (
          <>
            <Link
              className="btn btn-ghost sm nav-cta"
              href={dashboardHref}
              title={app.user?.email}
            >
              <span
                className="avatar"
                style={{ width: 22, height: 22, fontSize: 10 }}
              >
                {app.user?.initials || "?"}
              </span>
              {firstName || "Akun"}
            </Link>
            <Link className="btn btn-primary sm nav-cta" href={dashboardHref}>
              Dashboard
            </Link>
          </>
        ) : (
          <>
            <Link className="btn btn-ghost sm nav-cta" href="/masuk">
              Masuk
            </Link>
            <Link className="btn btn-primary sm nav-cta" href="/daftar">
              Coba Gratis
            </Link>
          </>
        )}
        <button
          type="button"
          className="iconbtn nav-burger"
          aria-label="Buka menu"
          aria-haspopup="dialog"
          onClick={() => setMenuOpen(true)}
        >
          <Icon name="list" />
        </button>
      </div>

      <Sheet open={menuOpen} onClose={closeMenu}>
        <nav className="nav-drawer" aria-label="Menu">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={closeMenu}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div
          className="stack"
          style={{ "--gap": "10px", marginTop: 14 } as React.CSSProperties}
        >
          {signedIn ? (
            <Link
              className="btn btn-primary block"
              href={dashboardHref}
              onClick={closeMenu}
            >
              Dashboard — {firstName || "Akun"}
            </Link>
          ) : (
            <>
              <Link className="btn btn-ghost block" href="/masuk" onClick={closeMenu}>
                Masuk
              </Link>
              <Link className="btn btn-primary block" href="/daftar" onClick={closeMenu}>
                Coba Gratis
              </Link>
            </>
          )}
        </div>
      </Sheet>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="cols">
          <div>
            <Link className="brand" href="/">
              <span className="mark">
                <Icon name="logo" />
              </span>
              AjarKit
            </Link>
            <p className="muted t-small" style={{ marginTop: 12, maxWidth: 280 }}>
              Perangkat Ajar OS untuk guru &amp; dosen Indonesia. Buatan Lanius
              Lab.
            </p>
            <span className="badge badge-disetujui" style={{ marginTop: 14 }}>
              <Icon name="check" /> Sesuai Permendikdasmen 13/2025
            </span>
          </div>
          <div>
            <h5>Produk</h5>
            <Link href="/fitur">Fitur</Link>
            <Link href="/harga">Harga</Link>
            <Link href="/app/buat">Buat Dokumen</Link>
          </div>
          <div>
            <h5>Sumber Daya</h5>
            <Link href="/bantuan">Bantuan</Link>
            <Link href="/bantuan">Panduan</Link>
            <Link href="/bantuan">Status</Link>
          </div>
          <div>
            <h5>Perusahaan</h5>
            <Link href="/tentang">Tentang</Link>
            <Link href="/tentang">Privasi</Link>
            <Link href="/tentang">Syarat</Link>
          </div>
        </div>
        <div
          className="row between wrap"
          style={{
            marginTop: 36,
            paddingTop: 20,
            borderTop: "1px solid var(--border)",
          }}
        >
          <span className="t-small faint">© 2026 AjarKit oleh Lanius Lab</span>
        </div>
      </div>
    </footer>
  );
}
