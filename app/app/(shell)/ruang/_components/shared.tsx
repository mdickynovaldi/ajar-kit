"use client";

/* AjarKit — komponen bersama fitur Ruang Sekolah/Prodi (design.md §9.H, prd.md §8.6).
   Dipakai oleh /app/ruang dan sub-halamannya saja. Data ruang/anggota/review
   sepenuhnya dari useApp() (dual-mode) — helper merge/derive lama dihapus. */

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { Button, EmptyState, Field } from "@/components/ui/controls";
import type { Member } from "@/lib/types";

export type RuangRole = Member["role"];

/* ---------- Breadcrumb ruang ---------- */
export function Crumb({ current }: { current: string }) {
  return (
    <div className="crumb">
      <Link href="/app/ruang">Ruang Sekolah</Link>
      <Icon name="chevR" />
      <span>{current}</span>
    </div>
  );
}

/* ---------- Empty state "belum punya ruang" ----------
   Dipakai sub-halaman ruang (anggota/review/bank/admin) saat
   store.workspace === null (mock: dosen · Supabase: user tanpa ruang). */
export function DosenEmptyState() {
  return (
    <EmptyState
      icon="school"
      title="Belum punya ruang"
      desc="Halaman ini tersedia setelah kamu membuat atau bergabung ke Ruang Sekolah/Prodi."
    >
      <Link className="btn btn-secondary" href="/app/ruang">
        Kembali ke Ruang
      </Link>
    </EmptyState>
  );
}

/* ---------- Sheet "Undang anggota" ---------- */
export function InviteSheet({
  open,
  onClose,
  onInvite,
  withMessage = false,
}: {
  open: boolean;
  onClose: () => void;
  onInvite: (email: string, role: RuangRole) => void;
  withMessage?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<RuangRole>("anggota");
  const [pesan, setPesan] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (!email.trim()) {
      setError("Email wajib diisi.");
      return;
    }
    onInvite(email.trim(), role);
    setEmail("");
    setRole("anggota");
    setPesan("");
    setError("");
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <h3 className="t-h3" style={{ marginBottom: 12 }}>
        Undang anggota
      </h3>
      <div className="stack" style={{ "--gap": "12px" } as React.CSSProperties}>
        <Field label="Email" error={error || undefined}>
          <input
            className="input"
            type="email"
            placeholder="guru@sekolah.sch.id"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError("");
            }}
          />
        </Field>
        <Field label="Peran">
          <select
            className="select"
            value={role}
            onChange={(e) => setRole(e.target.value as RuangRole)}
          >
            <option value="anggota">Anggota (Guru)</option>
            <option value="admin">Admin</option>
          </select>
        </Field>
        {withMessage && (
          <Field label="Pesan (opsional)">
            <textarea
              className="textarea"
              placeholder="Yuk gabung ruang sekolah kita di AjarKit."
              value={pesan}
              onChange={(e) => setPesan(e.target.value)}
            />
          </Field>
        )}
      </div>
      <Button block style={{ marginTop: 16 }} onClick={submit}>
        Kirim undangan
      </Button>
    </Sheet>
  );
}
