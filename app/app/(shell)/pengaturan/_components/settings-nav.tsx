"use client";

/* AjarKit — sub-nav Pengaturan (design.md §9.J, porting Ajarkit/app-pengaturan.html).
   Tab: Profil, Akun, Notifikasi, Tim — aktif berdasarkan pathname. */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icon";

const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: "/app/pengaturan/profil", label: "Profil", icon: "user" },
  { href: "/app/pengaturan/akun", label: "Akun", icon: "settings" },
  { href: "/app/pengaturan/notifikasi", label: "Notifikasi", icon: "bell" },
  { href: "/app/pengaturan/tim", label: "Tim", icon: "users" },
];

export function SettingsNav() {
  const pathname = usePathname() ?? "";
  return (
    <nav className="set-subnav" aria-label="Menu pengaturan">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={pathname.startsWith(t.href) ? "on" : ""}
          aria-current={pathname.startsWith(t.href) ? "page" : undefined}
        >
          <Icon name={t.icon} />
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

/* Kerangka halaman pengaturan: judul + grid sub-nav + pane konten */
export function SettingsShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h1 className="t-h1" style={{ marginBottom: 20 }}>
        Pengaturan
      </h1>
      <div className="set-grid">
        <SettingsNav />
        <div className="set-pane">{children}</div>
      </div>
    </>
  );
}
