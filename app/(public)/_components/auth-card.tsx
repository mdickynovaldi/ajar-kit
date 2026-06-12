"use client";

/* AjarKit — kerangka bersama halaman auth: layout terpusat di atas var(--bg)
   dengan logo brand di atas (porting .auth-wrap/.auth-card dari masuk.html). */

import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { RevealScope } from "@/components/motion";

export function AuthShell({
  wide,
  gap = 18,
  children,
}: {
  /** kartu lebih lebar (460px, dipakai /daftar) */
  wide?: boolean;
  gap?: number;
  children: React.ReactNode;
}) {
  return (
    <RevealScope>
      <div className="auth-wrap">
        <div
          className={`auth-card stack${wide ? " wide" : ""}`}
          style={{ "--gap": `${gap}px` } as React.CSSProperties}
        >
          <div className="auth-top">
            <Link
              className="brand"
              href="/"
              style={{ justifyContent: "center", fontSize: 20 }}
            >
              <span className="mark">
                <Icon name="logo" />
              </span>
              AjarKit
            </Link>
          </div>
          {children}
        </div>
      </div>
    </RevealScope>
  );
}

export function AuthDivider({ tight }: { tight?: boolean }) {
  return <div className={`auth-divider${tight ? " tight" : ""}`}>atau</div>;
}
