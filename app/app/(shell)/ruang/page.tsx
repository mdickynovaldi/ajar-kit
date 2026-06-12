"use client";

/* AjarKit — Ringkasan Ruang Sekolah (/app/ruang).
   Porting Ajarkit/app-ruang.html · design.md §9.H.1 · prd.md §8.6.
   Dual-mode: workspace/anggota/review dari useApp() — mock memakai fixture
   (visual sama seperti sebelumnya), Supabase memakai data nyata. */

import { useState } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icon";
import { Banner, Button, EmptyState, Field } from "@/components/ui/controls";
import { useToast } from "@/components/ui/toast";
import { useApp } from "@/lib/store";
import { InviteSheet, type RuangRole } from "./_components/shared";

interface FeedItem {
  who: string;
  what: React.ReactNode;
  ago: string;
  ic: IconName;
  c: string;
}

const FEED: FeedItem[] = [
  {
    who: "Rina W.",
    what: (
      <>
        mengajukan <b>Modul Ajar IPAS</b> untuk ditinjau
      </>
    ),
    ago: "10 menit lalu",
    ic: "check",
    c: "ic-amber",
  },
  {
    who: "Kepala Sekolah",
    what: (
      <>
        menyetujui <b>Asesmen Sumatif B. Indonesia</b>
      </>
    ),
    ago: "1 jam lalu",
    ic: "checkCircle",
    c: "ic-green",
  },
  {
    who: "Adi S.",
    what: (
      <>
        menambahkan <b>Bank Soal HOTS IPA</b> ke bank dokumen
      </>
    ),
    ago: "3 jam lalu",
    ic: "bank",
    c: "ic-teal",
  },
  {
    who: "Siti N.",
    what: (
      <>
        bergabung ke ruang sebagai <b>Anggota</b>
      </>
    ),
    ago: "Kemarin",
    ic: "user",
    c: "ic-blue",
  },
  {
    who: "Kepala Sekolah",
    what: (
      <>
        meminta revisi pada <b>Modul Ajar B. Inggris</b>
      </>
    ),
    ago: "2 hari lalu",
    ic: "edit",
    c: "ic-amber",
  },
];

export default function RuangPage() {
  const app = useApp();
  const toast = useToast();
  const { members, workspace } = app;
  const [inviteOpen, setInviteOpen] = useState(false);
  const [namaRuang, setNamaRuang] = useState("");
  const [creating, setCreating] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const isAdmin = workspace?.myRole === "admin";
  const docsRuang = app.documents.filter(
    (d) => d.workspaceId === workspace?.id,
  ).length;
  const menunggu = app.reviews.filter((r) => r.status === "menunggu").length;

  const invite = async (email: string, role: RuangRole) => {
    const res = await app.inviteMember(email, role);
    if (res.ok) toast("Undangan terkirim");
    else toast(res.error ?? "Gagal mengirim undangan. Coba lagi, ya.", false);
  };

  const createRuang = async (e: React.FormEvent) => {
    e.preventDefault();
    const nama = namaRuang.trim();
    if (!nama) {
      toast("Nama ruang wajib diisi.", false);
      return;
    }
    setCreating(true);
    try {
      await app.createWorkspace(nama);
      setNamaRuang("");
      toast("Ruang dibuat 🎉");
    } catch {
      toast("Gagal membuat ruang. Coba lagi, ya.", false);
    }
    setCreating(false);
  };

  const acceptInvite = async () => {
    setAccepting(true);
    try {
      await app.acceptInvite();
      toast("Undangan diterima 🎉");
    } catch {
      toast("Gagal menerima undangan. Coba lagi, ya.", false);
    }
    setAccepting(false);
  };

  /* Belum punya ruang — empty state + upsell (design.md §9.H.1).
     Mock: dosen · Supabase: semua user tanpa ruang (plus form buat ruang). */
  if (workspace === null) {
    return (
      <>
        <EmptyState
          icon="school"
          title="Buat Ruang Sekolah/Prodi"
          desc="Kamu belum tergabung di ruang mana pun. Dengan Ruang, tim prodi bekerja dalam satu tempat: kolaborasi, approval, dan bank dokumen."
        />
        <div className="ruang-empty-benefits">
          <div className="card pad ruang-benefit">
            <span className="doc-ic ic-blue">
              <Icon name="users" />
            </span>
            <div>
              <div className="strong" style={{ fontWeight: 600 }}>
                Kolaborasi
              </div>
              <p className="t-small muted">
                Susun dokumen bersama seluruh anggota dalam satu ruang.
              </p>
            </div>
          </div>
          <div className="card pad ruang-benefit">
            <span className="doc-ic ic-amber">
              <Icon name="check" />
            </span>
            <div>
              <div className="strong" style={{ fontWeight: 600 }}>
                Approval
              </div>
              <p className="t-small muted">
                Alur review &amp; persetujuan dari Kaprodi atau Kepala Sekolah.
              </p>
            </div>
          </div>
          <div className="card pad ruang-benefit">
            <span className="doc-ic ic-teal">
              <Icon name="bank" />
            </span>
            <div>
              <div className="strong" style={{ fontWeight: 600 }}>
                Bank dokumen
              </div>
              <p className="t-small muted">
                Template resmi yang bisa dipakai ulang seluruh anggota.
              </p>
            </div>
          </div>
        </div>
        {app.mode === "supabase" && (
          <form className="card pad-lg ruang-create" onSubmit={createRuang}>
            <Field label="Nama ruang">
              <input
                className="input"
                placeholder="mis. SDN Merdeka 01"
                value={namaRuang}
                onChange={(e) => setNamaRuang(e.target.value)}
              />
            </Field>
            <Button type="submit" block loading={creating} style={{ marginTop: 12 }}>
              Buat Ruang Sekolah/Prodi
            </Button>
          </form>
        )}
        <div className="card pad-lg ruang-upsell">
          <div className="grow">
            <div className="strong" style={{ fontWeight: 600 }}>
              Tersedia di Paket Sekolah/Kampus
            </div>
            <p className="t-small muted">
              Multi-akun, kolaborasi, approval, bank dokumen, dashboard admin.
            </p>
          </div>
          <Link className="btn btn-primary" href="/app/langganan">
            Lihat paket Sekolah/Kampus
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      {workspace.myStatus === "diundang" && (
        <Banner variant="info" icon="users" style={{ marginBottom: 18 }}>
          <div className="grow">
            <span>Kamu diundang ke ruang {workspace.nama}.</span>
          </div>
          <Button
            size="sm"
            loading={accepting}
            style={{ flex: "none" }}
            onClick={() => void acceptInvite()}
          >
            Terima undangan
          </Button>
        </Banner>
      )}

      <div className="ruang-head">
        <span className="ruang-logo">
          <Icon name="school" />
        </span>
        <div className="grow">
          <h1 className="t-h1">{workspace.nama}</h1>
          <p className="muted t-small">
            Ruang Sekolah · {members.length} anggota · Paket {workspace.plan}
          </p>
        </div>
        {isAdmin && (
          <Link className="btn btn-secondary hide-mobile" href="/app/ruang/admin">
            <Icon name="settings" />
            Kelola
          </Link>
        )}
        {isAdmin && (
          <Button iconLeft="plus" onClick={() => setInviteOpen(true)}>
            Undang anggota
          </Button>
        )}
      </div>

      <div className="metric-grid">
        <div className="card pad metric">
          <div className="v num">{members.length}</div>
          <div className="l">Anggota</div>
        </div>
        <div className="card pad metric">
          <div className="v num">{docsRuang}</div>
          <div className="l">Dokumen ruang</div>
        </div>
        <div className="card pad metric">
          <Link href="/app/ruang/review" style={{ color: "inherit" }}>
            <div className="v num" style={{ color: "var(--warning)" }}>
              {menunggu}
            </div>
            <div className="l">Menunggu review</div>
          </Link>
        </div>
        <div className="card pad metric">
          <div className="v">
            <span className="num">2.4</span>k
          </div>
          <div className="l">Kredit tim bulan ini</div>
        </div>
      </div>

      <div className="b2b-grid">
        <div className="card pad-lg">
          <h3 className="t-h3" style={{ marginBottom: 6 }}>
            Aktivitas terbaru
          </h3>
          <div>
            {FEED.map((f, i) => (
              <div className="feed-item" key={i}>
                <span className={`fi ${f.c}`}>
                  <Icon name={f.ic} />
                </span>
                <div className="grow">
                  <p className="t-body">
                    <b className="strong">{f.who}</b> {f.what}
                  </p>
                  <span className="t-small faint">{f.ago}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="stack" style={{ "--gap": "14px" } as React.CSSProperties}>
          <Link
            className="card pad hover"
            href="/app/ruang/review"
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              textDecoration: "none",
            }}
          >
            <span className="doc-ic ic-amber">
              <Icon name="check" />
            </span>
            <div className="grow">
              <div className="strong" style={{ fontWeight: 600 }}>
                Antrean Review
              </div>
              <p className="t-small muted">
                {menunggu} dokumen menunggu persetujuanmu
              </p>
            </div>
            <span style={{ color: "var(--primary-500)" }}>
              <Icon name="chevR" />
            </span>
          </Link>
          <Link
            className="card pad hover"
            href="/app/ruang/anggota"
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              textDecoration: "none",
            }}
          >
            <span className="doc-ic ic-blue">
              <Icon name="users" />
            </span>
            <div className="grow">
              <div className="strong" style={{ fontWeight: 600 }}>
                Anggota &amp; Peran
              </div>
              <p className="t-small muted">
                Kelola {members.length} anggota tim
              </p>
            </div>
            <span style={{ color: "var(--primary-500)" }}>
              <Icon name="chevR" />
            </span>
          </Link>
          <Link
            className="card pad hover"
            href="/app/ruang/bank"
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              textDecoration: "none",
            }}
          >
            <span className="doc-ic ic-teal">
              <Icon name="bank" />
            </span>
            <div className="grow">
              <div className="strong" style={{ fontWeight: 600 }}>
                Bank Dokumen
              </div>
              <p className="t-small muted">Template resmi sekolah</p>
            </div>
            <span style={{ color: "var(--primary-500)" }}>
              <Icon name="chevR" />
            </span>
          </Link>
        </div>
      </div>

      <InviteSheet
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvite={(email, role) => void invite(email, role)}
        withMessage
      />
    </>
  );
}
