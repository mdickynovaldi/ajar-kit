"use client";

/* AjarKit — Anggota & Peran (/app/ruang/anggota).
   Porting Ajarkit/app-ruang-anggota.html · design.md §9.H.2 · prd.md §8.6.
   Anggota & mutasinya via store (dual-mode); mutasi khusus admin ruang. */

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Avatar, Button, EmptyState, StatusBadge } from "@/components/ui/controls";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { useApp } from "@/lib/store";
import type { Member } from "@/lib/types";
import {
  Crumb,
  DosenEmptyState,
  InviteSheet,
  type RuangRole,
} from "../_components/shared";

const STATUS_BADGE: Record<Member["status"], { badge: string; label: string }> =
  {
    aktif: { badge: "badge-selesai", label: "Aktif" },
    diundang: { badge: "badge-review", label: "Diundang" },
    nonaktif: { badge: "badge-draft", label: "Nonaktif" },
  };

const ROLE_LABEL: Record<RuangRole, string> = {
  admin: "Admin",
  anggota: "Anggota",
};

function RolePill({
  member,
  onChange,
}: {
  member: Member;
  onChange: (role: RuangRole) => void;
}) {
  return (
    <span className="role-wrap">
      <select
        className="role-pill"
        aria-label={`Ubah peran ${member.nama}`}
        value={member.role}
        onChange={(e) => onChange(e.target.value as RuangRole)}
      >
        <option value="anggota">Anggota</option>
        <option value="admin">Admin</option>
      </select>
      <Icon name="chevDown" />
    </span>
  );
}

export default function AnggotaPage() {
  const app = useApp();
  const toast = useToast();
  const { members } = app;
  const [q, setQ] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [manageId, setManageId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"nonaktifkan" | "hapus" | null>(null);

  const isAdmin = app.workspace?.myRole === "admin";
  const admins = members.filter((m) => m.role === "admin").length;
  const query = q.trim().toLowerCase();
  const filtered = members.filter(
    (m) =>
      !query ||
      m.nama.toLowerCase().includes(query) ||
      m.mapel.toLowerCase().includes(query),
  );
  const managed = members.find((m) => m.id === manageId) ?? null;

  const closeManage = () => {
    setManageId(null);
    setConfirm(null);
  };

  const changeRole = (id: string, role: RuangRole) => {
    app.updateMember(id, { role });
    toast("Peran diubah");
  };

  const invite = async (email: string, role: RuangRole) => {
    const res = await app.inviteMember(email, role);
    if (res.ok) toast("Undangan terkirim");
    else toast(res.error ?? "Gagal mengirim undangan. Coba lagi, ya.", false);
  };

  if (!app.workspace) return <DosenEmptyState />;

  return (
    <>
      <Crumb current="Anggota" />
      <div
        className="row between"
        style={{ marginBottom: 18, flexWrap: "wrap", gap: 12 }}
      >
        <div>
          <h1 className="t-h1">Anggota &amp; Peran</h1>
          <p className="muted t-small">
            {members.length} anggota · {admins} admin
          </p>
        </div>
        {isAdmin && (
          <Button iconLeft="plus" onClick={() => setInviteOpen(true)}>
            Undang
          </Button>
        )}
      </div>

      <div className="input-icon" style={{ marginBottom: 16, maxWidth: 340 }}>
        <Icon name="search" />
        <input
          className="input"
          placeholder="Cari anggota…"
          aria-label="Cari anggota"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="search" title="Tidak ditemukan" desc="Coba kata kunci lain." />
      ) : (
        <>
          {/* Desktop table */}
          <div className="desk-table card" style={{ overflow: "hidden" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Anggota</th>
                  <th>Mapel/MK</th>
                  <th>Peran</th>
                  <th>Status</th>
                  <th className="num">Pemakaian</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div className="mrow">
                        <Avatar initials={m.initials} size="sm" />
                        <div>
                          <div className="strong" style={{ fontWeight: 600 }}>
                            {m.nama}
                          </div>
                          <div className="t-small faint">{m.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="muted">{m.mapel}</td>
                    <td>
                      {isAdmin ? (
                        <RolePill member={m} onChange={(r) => changeRole(m.id, r)} />
                      ) : (
                        <span className="role-pill" style={{ cursor: "default" }}>
                          {ROLE_LABEL[m.role]}
                        </span>
                      )}
                    </td>
                    <td>
                      <StatusBadge badge={STATUS_BADGE[m.status].badge}>
                        {STATUS_BADGE[m.status].label}
                      </StatusBadge>
                    </td>
                    <td className="num muted">{m.pemakaian}</td>
                    <td style={{ textAlign: "right" }}>
                      {isAdmin && (
                        <button
                          className="iconbtn"
                          style={{ width: 32, height: 32 }}
                          aria-label={`Kelola ${m.nama}`}
                          onClick={() => setManageId(m.id)}
                        >
                          <Icon name="more" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="member-cards">
            {filtered.map((m) => (
              <div className="card pad" key={m.id}>
                <div className="mrow">
                  <Avatar initials={m.initials} />
                  <div className="grow">
                    <div className="strong" style={{ fontWeight: 600 }}>
                      {m.nama}
                    </div>
                    <div className="t-small faint">{m.mapel}</div>
                  </div>
                  {isAdmin && (
                    <button
                      className="iconbtn"
                      style={{ width: 32, height: 32 }}
                      aria-label={`Kelola ${m.nama}`}
                      onClick={() => setManageId(m.id)}
                    >
                      <Icon name="more" />
                    </button>
                  )}
                </div>
                <div className="row between" style={{ marginTop: 12 }}>
                  {isAdmin ? (
                    <RolePill member={m} onChange={(r) => changeRole(m.id, r)} />
                  ) : (
                    <span className="role-pill" style={{ cursor: "default" }}>
                      {ROLE_LABEL[m.role]}
                    </span>
                  )}
                  <StatusBadge badge={STATUS_BADGE[m.status].badge}>
                    {STATUS_BADGE[m.status].label}
                  </StatusBadge>
                  <span className="t-small faint num">{m.pemakaian}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Sheet kelola anggota + konfirmasi */}
      <Sheet open={managed !== null} onClose={closeManage}>
        {managed && confirm === null && (
          <>
            <h3 className="t-h3" style={{ marginBottom: 10 }}>
              Kelola anggota
            </h3>
            <div
              className="stack"
              style={{ "--gap": "4px" } as React.CSSProperties}
            >
              <button
                className="btn btn-ghost block"
                style={{ justifyContent: "flex-start" }}
                onClick={() => {
                  changeRole(
                    managed.id,
                    managed.role === "admin" ? "anggota" : "admin",
                  );
                  closeManage();
                }}
              >
                Ubah peran jadi{" "}
                {ROLE_LABEL[managed.role === "admin" ? "anggota" : "admin"]}
              </button>
              {managed.status === "nonaktif" ? (
                <button
                  className="btn btn-ghost block"
                  style={{ justifyContent: "flex-start" }}
                  onClick={() => {
                    app.updateMember(managed.id, { status: "aktif" });
                    toast("Anggota diaktifkan");
                    closeManage();
                  }}
                >
                  Aktifkan
                </button>
              ) : (
                <button
                  className="btn btn-ghost block"
                  style={{ justifyContent: "flex-start" }}
                  onClick={() => setConfirm("nonaktifkan")}
                >
                  Nonaktifkan
                </button>
              )}
              <button
                className="btn btn-ghost block"
                style={{ justifyContent: "flex-start", color: "var(--error)" }}
                onClick={() => setConfirm("hapus")}
              >
                Hapus dari ruang
              </button>
            </div>
          </>
        )}

        {managed && confirm === "nonaktifkan" && (
          <>
            <h3 className="t-h3" style={{ marginBottom: 8 }}>
              Nonaktifkan anggota?
            </h3>
            <p className="muted t-body" style={{ marginBottom: 16 }}>
              {managed.nama} tidak bisa mengakses ruang sampai diaktifkan lagi.
              Dokumen miliknya tetap tersimpan.
            </p>
            <div className="row" style={{ gap: 8 }}>
              <Button
                variant="secondary"
                className="grow"
                onClick={() => setConfirm(null)}
              >
                Batal
              </Button>
              <Button
                className="grow"
                onClick={() => {
                  app.updateMember(managed.id, { status: "nonaktif" });
                  toast("Anggota dinonaktifkan");
                  closeManage();
                }}
              >
                Nonaktifkan
              </Button>
            </div>
          </>
        )}

        {managed && confirm === "hapus" && (
          <>
            <h3 className="t-h3" style={{ marginBottom: 8 }}>
              Hapus dari ruang?
            </h3>
            <p className="muted t-body" style={{ marginBottom: 16 }}>
              “{managed.nama}” akan dihapus dari ruang ini. Tindakan ini tidak
              bisa dibatalkan.
            </p>
            <div className="row" style={{ gap: 8 }}>
              <Button
                variant="secondary"
                className="grow"
                onClick={() => setConfirm(null)}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                className="grow"
                onClick={() => {
                  app.removeMember(managed.id);
                  toast("Anggota dihapus", false);
                  closeManage();
                }}
              >
                Hapus
              </Button>
            </div>
          </>
        )}
      </Sheet>

      <InviteSheet
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvite={(email, role) => void invite(email, role)}
      />
    </>
  );
}
