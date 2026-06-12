"use client";

/* AjarKit — App Shell (design.md §6 & §8, porting AK.shell):
   Sidebar (desktop) + TopBar desktop + TopBar mobile + BottomNav (mobile). */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { RevealScope } from "@/components/motion";
import { ThemeToggle } from "./theme-toggle";
import { useApp } from "@/lib/store";

interface NavItem {
  id: string;
  label: string;
  icon: IconName;
  href: string;
  match: (path: string) => boolean;
}

const APP_NAV: NavItem[] = [
  {
    id: "beranda",
    label: "Beranda",
    icon: "home",
    href: "/app",
    match: (p) => p === "/app",
  },
  {
    id: "buat",
    label: "Buat Dokumen",
    icon: "plus",
    href: "/app/buat",
    match: (p) => p.startsWith("/app/buat"),
  },
  {
    id: "dokumen",
    label: "Dokumen Saya",
    icon: "files",
    href: "/app/dokumen",
    match: (p) => p.startsWith("/app/dokumen"),
  },
  {
    id: "ruang",
    label: "Ruang Sekolah",
    icon: "school",
    href: "/app/ruang",
    match: (p) => p.startsWith("/app/ruang"),
  },
];

const APP_NAV2: NavItem[] = [
  {
    id: "kredit",
    label: "Kredit & Langganan",
    icon: "wallet",
    href: "/app/kredit",
    match: (p) =>
      p.startsWith("/app/kredit") ||
      p.startsWith("/app/langganan") ||
      p.startsWith("/app/tagihan"),
  },
  {
    id: "referral",
    label: "Ajak Teman",
    icon: "gift",
    href: "/app/referral",
    match: (p) => p.startsWith("/app/referral"),
  },
  {
    id: "pengaturan",
    label: "Pengaturan",
    icon: "settings",
    href: "/app/pengaturan/profil",
    match: (p) => p.startsWith("/app/pengaturan"),
  },
  {
    id: "bantuan",
    label: "Bantuan",
    icon: "help",
    href: "/bantuan",
    match: () => false,
  },
];

const TITLES: [prefix: string, title: string][] = [
  ["/app/buat/modul-ajar", "Buat Modul Ajar"],
  ["/app/buat/lkpd", "Buat LKPD"],
  ["/app/buat/asesmen", "Buat Asesmen"],
  ["/app/buat/bank-soal", "Buat Bank Soal"],
  ["/app/buat/prota-promes", "Buat Prota & Promes"],
  ["/app/buat/kit-lengkap", "Buat Kit Lengkap"],
  ["/app/buat/rps", "Buat RPS"],
  ["/app/buat", "Buat Dokumen"],
  ["/app/dokumen/", "Editor Dokumen"],
  ["/app/dokumen", "Dokumen Saya"],
  ["/app/ruang/anggota", "Anggota & Peran"],
  ["/app/ruang/review", "Review & Approval"],
  ["/app/ruang/bank", "Bank Dokumen"],
  ["/app/ruang/admin", "Admin Dashboard"],
  ["/app/ruang", "Ruang Sekolah"],
  ["/app/kredit", "Kredit & Langganan"],
  ["/app/langganan", "Langganan"],
  ["/app/tagihan", "Riwayat Tagihan"],
  ["/app/referral", "Ajak Teman"],
  ["/app/pengaturan", "Pengaturan"],
  ["/app/notifikasi", "Notifikasi"],
  ["/app", "Beranda"],
];

function titleFor(path: string): string {
  for (const [prefix, title] of TITLES) {
    if (path === prefix || path.startsWith(prefix)) return title;
  }
  return "AjarKit";
}

function BellLink() {
  const { unreadCount } = useApp();
  return (
    <Link
      className="iconbtn"
      href="/app/notifikasi"
      aria-label="Notifikasi"
      style={{ position: "relative" }}
    >
      <Icon name="bell" />
      {unreadCount > 0 && <span className="dot" />}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/app";
  const router = useRouter();
  const { credits, user, hydrated, onboardingDone, mode, authStatus, signOut } =
    useApp();
  const title = titleFor(pathname);
  const [signingOut, setSigningOut] = useState(false);

  async function keluar() {
    if (signingOut) return;
    setSigningOut(true);
    await signOut();
    router.replace("/masuk");
  }

  // Mode Supabase: /app butuh login (prd.md §8.1 ✓ "Tidak bisa masuk /app tanpa login")
  useEffect(() => {
    if (mode === "supabase" && authStatus === "signedOut")
      router.replace("/masuk");
  }, [mode, authStatus, router]);

  // PRD §8.1 ✓ — belum onboarding → redirect /onboarding
  useEffect(() => {
    if (hydrated && authStatus === "signedIn" && !onboardingDone)
      router.replace("/onboarding");
  }, [hydrated, authStatus, onboardingDone, router]);

  const navLink = (n: NavItem) => (
    <Link
      key={n.id}
      className={`navlink${n.match(pathname) ? " on" : ""}`}
      href={n.href}
    >
      <Icon name={n.icon} />
      <span>{n.label}</span>
    </Link>
  );

  return (
    <div className="app">
      {/* Sidebar (desktop) */}
      <aside className="sidebar">
        <Link className="brand" href="/app">
          <span className="mark">
            <Icon name="logo" />
          </span>
          AjarKit
        </Link>
        <nav>{APP_NAV.map(navLink)}</nav>
        <div className="nav-sep" />
        <div className="nav-label">Akun</div>
        <nav>
          {APP_NAV2.map(navLink)}
          <button
            type="button"
            className="navlink"
            onClick={keluar}
            disabled={signingOut}
            style={{
              width: "100%",
              background: "none",
              border: 0,
              cursor: "pointer",
              font: "inherit",
              textAlign: "left",
              color: "red",
            }}
          >
            <Icon name="logout" />
            <span>{signingOut ? "Keluar…" : "Keluar"}</span>
          </button>
        </nav>
        <div className="sidebar-foot">
          <div
            className="card pad"
            style={{ padding: 14, background: "var(--surface-2)", border: "none" }}
          >
            <div className="row between">
              <span className="t-caption muted">SALDO KREDIT</span>
            </div>
            <div className="row between" style={{ marginTop: 6 }}>
              <span className="strong" style={{ fontWeight: 700, fontSize: 18 }}>
                <span style={{ color: "var(--accent-500)" }}>◈</span>{" "}
                <span className="num">{credits}</span>
              </span>
              <Link className="btn btn-primary sm" href="/app/kredit">
                Isi ulang
              </Link>
            </div>
          </div>
        </div>
      </aside>

      <div className="content-col">
        {/* TopBar mobile */}
        <header className="app-topbar hide-desktop">
          <Link className="brand grow" href="/app" style={{ fontSize: 16 }}>
            <span className="mark">
              <Icon name="logo" />
            </span>
            AjarKit
          </Link>
          <Link className="credit" href="/app/kredit">
            <span className="gem">◈</span>
            <span className="num">{credits}</span>
            <span className="plus">+</span>
          </Link>
          <ThemeToggle />
          <BellLink />
          <button
            type="button"
            className="iconbtn"
            aria-label="Keluar"
            title="Keluar"
            onClick={keluar}
            disabled={signingOut}
          >
            <Icon name="logout" />
          </button>
        </header>

        {/* TopBar desktop */}
        <header className="desk-topbar">
          <strong className="t-h3 grow" style={{ fontSize: 17 }}>
            {title}
          </strong>
          <button className="iconbtn" aria-label="Cari">
            <Icon name="search" />
          </button>
          <ThemeToggle />
          <BellLink />
          <Link className="avatar" href="/app/pengaturan/profil" title="Profil">
            {user.initials}
          </Link>
        </header>

        <RevealScope>
          <main className="app-main">{children}</main>
        </RevealScope>

        {/* Bottom nav (mobile) */}
        <nav className="bottomnav hide-desktop">
          <Link href="/app" className={pathname === "/app" ? "on" : ""}>
            <Icon name="home" />
            Beranda
          </Link>
          <Link
            href="/app/dokumen"
            className={pathname.startsWith("/app/dokumen") ? "on" : ""}
          >
            <Icon name="files" />
            Dokumen
          </Link>
          <Link href="/app/buat" aria-label="Buat dokumen">
            <span className="fab">
              <Icon name="plus" />
            </span>
          </Link>
          <Link
            href="/app/ruang"
            className={pathname.startsWith("/app/ruang") ? "on" : ""}
          >
            <Icon name="school" />
            Ruang
          </Link>
          <Link
            href="/app/pengaturan/profil"
            className={pathname.startsWith("/app/pengaturan") ? "on" : ""}
          >
            <Icon name="user" />
            Akun
          </Link>
        </nav>
      </div>
    </div>
  );
}
