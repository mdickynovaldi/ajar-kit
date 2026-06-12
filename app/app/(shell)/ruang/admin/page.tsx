"use client";

/* AjarKit — Admin Dashboard ruang (/app/ruang/admin).
   Tanpa HTML export — mengikuti design.md §9.H.5 & pola kartu/metric ruang.
   Grafik batang CSS sederhana (pemakaian kredit per bulan, mock 6 bulan). */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import {
  Avatar,
  Button,
  EmptyState,
  Field,
  Progress,
  Switch,
} from "@/components/ui/controls";
import { useToast } from "@/components/ui/toast";
import { useApp } from "@/lib/store";
import { MOCK_WORKSPACE } from "@/data/mock";
import { Crumb, DosenEmptyState } from "../_components/shared";

const USAGE = [
  { bulan: "Jan", kredit: 1240 },
  { bulan: "Feb", kredit: 1580 },
  { bulan: "Mar", kredit: 1320 },
  { bulan: "Apr", kredit: 1860 },
  { bulan: "Mei", kredit: 2120 },
  { bulan: "Jun", kredit: 2410 },
];

export default function RuangAdminPage() {
  const app = useApp();
  const toast = useToast();
  const ws = app.workspace;
  const [nama, setNama] = useState(ws?.nama ?? MOCK_WORKSPACE.nama);
  const [approvalWajib, setApprovalWajib] = useState(true);

  /* mode Supabase: data ruang termuat async — sinkronkan isian nama */
  const wsNama = ws?.nama;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sinkron satu arah saat workspace termuat
    if (wsNama) setNama(wsNama);
  }, [wsNama]);

  const docsRuang = app.documents.filter(
    (d) => d.workspaceId === ws?.id,
  ).length;
  const aktif = app.members.filter((m) => m.status === "aktif").length;
  const byDocs = app.members.slice().sort((a, b) => b.dokumen - a.dokumen);
  const maxUsage = Math.max(...USAGE.map((u) => u.kredit));
  const seats = ws?.seats ?? MOCK_WORKSPACE.seats;
  const seatsUsed = Math.min(seats, aktif);

  /* TODO: kolom workspaces.approval_required sudah ada (lihat WorkspaceSummary
     .approvalRequired) — wiring kebijakan approval ke Supabase menyusul;
     untuk sekarang switch tetap kosmetik (toast saja). */
  const togglePolicy = (on: boolean) => {
    setApprovalWajib(on);
    toast(on ? "Kebijakan approval diaktifkan" : "Kebijakan approval dimatikan");
  };

  if (!ws) return <DosenEmptyState />;
  if (ws.myRole !== "admin")
    return (
      <EmptyState icon="school" title="Halaman khusus admin ruang.">
        <Link className="btn btn-secondary" href="/app/ruang">
          Kembali ke Ruang
        </Link>
      </EmptyState>
    );

  return (
    <>
      <Crumb current="Admin" />
      <div
        className="row between"
        style={{ marginBottom: 18, flexWrap: "wrap", gap: 12 }}
      >
        <div>
          <h1 className="t-h1">Admin Dashboard</h1>
          <p className="muted t-small">
            {ws.nama} · Paket {ws.plan}
          </p>
        </div>
        <Link className="btn btn-secondary" href="/app/langganan">
          <Icon name="wallet" />
          Kelola langganan tim
        </Link>
      </div>

      <div className="metric-grid">
        <div className="card pad metric">
          <div className="v">2.410</div>
          <div className="l">Kredit bulan ini</div>
        </div>
        <div className="card pad metric">
          <div className="v num">{docsRuang}</div>
          <div className="l">Dokumen ruang</div>
        </div>
        <div className="card pad metric">
          <div className="v num">{aktif}</div>
          <div className="l">Anggota aktif</div>
        </div>
        <div className="card pad metric">
          <div className="v">
            {seatsUsed}
            <span style={{ color: "var(--text-faint)" }}>/{seats}</span>
          </div>
          <div className="l">Kursi terpakai</div>
        </div>
      </div>

      <div className="ruang-admin-grid">
        <div className="stack" style={{ "--gap": "18px" } as React.CSSProperties}>
          <div className="card pad-lg">
            <h3 className="t-h3" style={{ marginBottom: 4 }}>
              Pemakaian kredit per bulan
            </h3>
            <p className="muted t-small" style={{ marginBottom: 14 }}>
              Total kredit tim · Semester Genap 2025/2026
            </p>
            <div className="ruang-chart" role="img" aria-label="Grafik pemakaian kredit tim per bulan, Januari sampai Juni">
              {USAGE.map((u, i) => (
                <div className="rc-col" key={u.bulan}>
                  <span className="rc-val">
                    {u.kredit.toLocaleString("id-ID")}
                  </span>
                  <div
                    className={`rc-bar${i === USAGE.length - 1 ? " cur" : ""}`}
                    style={{
                      height: Math.round((u.kredit / maxUsage) * 110),
                    }}
                  />
                  <span className="rc-lbl">{u.bulan}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card pad-lg">
            <div className="row between" style={{ marginBottom: 6 }}>
              <h3 className="t-h3">Dokumen per anggota</h3>
              <Link
                className="t-small"
                style={{ color: "var(--primary-600)", fontWeight: 600 }}
                href="/app/ruang/anggota"
              >
                Kelola anggota
              </Link>
            </div>
            <div>
              {byDocs.map((m) => (
                <div className="ruang-member-row" key={m.id}>
                  <Avatar initials={m.initials} size="sm" />
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="strong" style={{ fontWeight: 600, fontSize: 14 }}>
                      {m.nama}
                    </div>
                    <div className="t-small faint">{m.mapel}</div>
                  </div>
                  <span className="t-small muted num" style={{ flex: "none" }}>
                    {m.status === "diundang" ? "—" : `${m.dokumen} dokumen`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="stack" style={{ "--gap": "18px" } as React.CSSProperties}>
          <div className="card pad-lg">
            <h3 className="t-h3" style={{ marginBottom: 10 }}>
              Kursi terpakai
            </h3>
            <div
              className="strong"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: 28,
                marginBottom: 10,
              }}
            >
              {seatsUsed}
              <span style={{ color: "var(--text-faint)" }}>/{seats}</span>
            </div>
            <Progress value={(seatsUsed / seats) * 100} />
            <p className="t-small muted" style={{ marginTop: 10 }}>
              {seats - seatsUsed} kursi tersisa di Paket {ws.plan}.
            </p>
          </div>

          <div className="card pad-lg">
            <h3 className="t-h3" style={{ marginBottom: 14 }}>
              Pengaturan ruang
            </h3>
            <Field label="Nama ruang">
              <input
                className="input"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
              />
            </Field>
            <div className="row" style={{ gap: 12, margin: "16px 0" }}>
              <Switch
                on={approvalWajib}
                onChange={togglePolicy}
                label="Kebijakan approval wajib"
              />
              <div className="grow">
                <div className="strong" style={{ fontWeight: 600, fontSize: 14 }}>
                  Approval wajib
                </div>
                <p className="t-small muted">
                  Dokumen anggota harus disetujui admin sebelum masuk Bank
                  Dokumen.
                </p>
              </div>
            </div>
            <Button block onClick={() => toast("Pengaturan ruang disimpan")}>
              Simpan
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
