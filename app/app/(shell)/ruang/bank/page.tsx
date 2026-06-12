"use client";

/* AjarKit — Bank Dokumen Sekolah (/app/ruang/bank).
   Tanpa HTML export — mengikuti design.md §9.H.4 & pola kartu Dokumen Saya.
   "Gunakan sebagai dasar" menduplikasi dokumen (hemat kredit) lalu membuka editor. */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { Button, EmptyState, StatusBadge, Switch } from "@/components/ui/controls";
import { useToast } from "@/components/ui/toast";
import { useApp } from "@/lib/store";
import { MOCK_WORKSPACE } from "@/data/mock";
import { DOC_TYPES, STATUS_META } from "@/lib/constants";
import type { DocContent, DocType, Document } from "@/lib/types";
import { Crumb, DosenEmptyState } from "../_components/shared";

interface SchoolTemplate {
  id: string;
  title: string;
  type: DocType;
  subject: string;
  jenjang: string;
  content: DocContent;
}

const TEMPLATES: SchoolTemplate[] = [
  {
    id: "tpl-1",
    title: "Template Modul Ajar — Standar SDN Merdeka 01",
    type: "modul_ajar",
    subject: "Semua mapel",
    jenjang: "Fase A–C",
    content: {
      sections: [
        {
          id: "identitas",
          title: "Identitas",
          blocks: [
            "Mata pelajaran: … · Jenjang: … · Semester: …",
            "Materi: … · Alokasi waktu: …",
          ],
        },
        {
          id: "kerangka",
          title: "Kerangka Standar Sekolah",
          blocks: [
            "Gunakan kerangka resmi sekolah: tujuan pembelajaran, kegiatan (awal–inti–penutup), dan asesmen. Lengkapi sesuai kelasmu.",
          ],
        },
      ],
    },
  },
  {
    id: "tpl-2",
    title: "Template Asesmen Sumatif — Standar Sekolah",
    type: "asesmen",
    subject: "Semua mapel",
    jenjang: "Kelas 1–6",
    content: {
      sections: [
        {
          id: "kisi",
          title: "Kisi-kisi",
          blocks: [
            "Materi: … · Bentuk: pilihan ganda (…) + uraian (…).",
            "Indikator: … (isi sesuai tujuan pembelajaran).",
          ],
        },
        {
          id: "rubrik",
          title: "Rubrik Penilaian",
          blocks: ["Skor 4: … · Skor 2: … · Skor 1: … (sesuaikan kriteria sekolah)."],
        },
      ],
    },
  },
  {
    id: "tpl-3",
    title: "Template LKPD — Standar Sekolah",
    type: "lkpd",
    subject: "Semua mapel",
    jenjang: "Kelas 1–6",
    content: {
      sections: [
        {
          id: "aktivitas",
          title: "Aktivitas 1",
          blocks: [
            "Petunjuk: … (tulis langkah kegiatan peserta didik).",
            "Pertanyaan pemantik: …",
          ],
        },
      ],
    },
  },
];

/* Dokumen baru dari template — dibuat saat tombol diklik (bukan saat render) */
function buildTemplateDoc(
  t: SchoolTemplate,
  ownerId: string,
  ownerName: string,
  workspaceId: string,
): Document {
  const ts = Date.now();
  return {
    id: `doc-${ts}`,
    title: `${t.title} (salinan)`,
    type: t.type,
    status: "draft",
    subject: t.subject,
    jenjang: t.jenjang,
    updatedLabel: "Baru saja",
    updatedAt: new Date(ts).toISOString(),
    ownerId,
    ownerName,
    workspaceId,
    qualityMode: "standar",
    content: t.content,
  };
}

export default function BankDokumenPage() {
  const app = useApp();
  const toast = useToast();
  const router = useRouter();
  /* penanda "Template resmi" utk dokumen ruang (mutasi lokal, tidak perlu persist) */
  const [official, setOfficial] = useState<Set<string>>(new Set());

  /* mock: fixture ws-1 · Supabase: ruang milik user */
  const wsId = app.workspace?.id ?? "ws-1";
  const isAdmin = app.workspace?.myRole === "admin";

  const docs = app.documents
    .filter((d) => d.workspaceId === wsId)
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const duplicateFromDoc = (id: string) => {
    const newId = app.duplicateDocument(id);
    if (!newId) {
      toast("Dokumen tidak ditemukan", false);
      return;
    }
    toast("Dokumen disalin sebagai dasar");
    router.push(`/app/dokumen/${newId}`);
  };

  const createFromTemplate = (t: SchoolTemplate) => {
    const doc = buildTemplateDoc(t, app.user.id, app.user.nama, wsId);
    const docId = app.addDocument(doc); // mode Supabase memakai id UUID baru
    toast("Dokumen baru dibuat dari template resmi");
    router.push(`/app/dokumen/${docId}`);
  };

  const toggleOfficial = (id: string) => {
    setOfficial((set) => {
      const next = new Set(set);
      if (next.has(id)) {
        next.delete(id);
        toast("Tanda template resmi dihapus");
      } else {
        next.add(id);
        toast("Ditandai sebagai template resmi sekolah");
      }
      return next;
    });
  };

  if (!app.workspace) return <DosenEmptyState />;

  return (
    <>
      <Crumb current="Bank Dokumen" />
      <div
        className="row between"
        style={{ marginBottom: 18, flexWrap: "wrap", gap: 12 }}
      >
        <div>
          <h1 className="t-h1">Bank Dokumen</h1>
          <p className="muted t-small">
            Template resmi &amp; dokumen ruang · {app.workspace?.nama ?? MOCK_WORKSPACE.nama}
          </p>
        </div>
        <Link className="btn btn-secondary" href="/app/dokumen">
          <Icon name="files" />
          Dokumen Saya
        </Link>
      </div>

      <h2 className="t-h3" style={{ marginBottom: 12 }}>
        Template resmi sekolah
      </h2>
      <div className="ruang-doc-grid" style={{ marginBottom: 26 }}>
        {TEMPLATES.map((t) => {
          const meta = DOC_TYPES[t.type];
          return (
            <div className="card rbank-card pad hover" key={t.id}>
              <div className="top">
                <span className={`doc-ic ${meta.color}`}>
                  <Icon name={meta.icon} />
                </span>
                <span className="badge badge-disetujui rbank-badge">
                  <Icon name="check" />
                  Template resmi
                </span>
              </div>
              <h4
                className="t-h4"
                style={{ margin: "12px 0 6px", fontSize: 15, lineHeight: 1.35 }}
              >
                {t.title}
              </h4>
              <p className="t-small muted">
                {meta.shortLabel} · {t.subject} · {t.jenjang}
              </p>
              <Button
                variant="secondary"
                size="sm"
                block
                iconLeft="copy"
                style={{ marginTop: 12 }}
                onClick={() => createFromTemplate(t)}
              >
                Gunakan sebagai dasar
              </Button>
            </div>
          );
        })}
      </div>

      <h2 className="t-h3" style={{ marginBottom: 12 }}>
        Dokumen ruang
      </h2>
      {docs.length === 0 ? (
        <EmptyState
          icon="files"
          title="Belum ada dokumen ruang"
          desc="Dokumen yang disetujui akan muncul di sini untuk dipakai ulang seluruh anggota."
        />
      ) : (
        <div className="ruang-doc-grid">
          {docs.map((d) => {
            const meta = DOC_TYPES[d.type];
            const status = STATUS_META[d.status];
            const isOfficial = official.has(d.id);
            return (
              <div className="card rbank-card pad hover" key={d.id}>
                <div className="top">
                  <span className={`doc-ic ${meta.color}`}>
                    <Icon name={meta.icon} />
                  </span>
                  <span className="row" style={{ gap: 6 }}>
                    {isOfficial && (
                      <span className="badge badge-disetujui rbank-badge">
                        <Icon name="check" />
                        Template resmi
                      </span>
                    )}
                    <StatusBadge badge={status.badge}>{status.label}</StatusBadge>
                  </span>
                </div>
                <h4
                  className="t-h4"
                  style={{ margin: "12px 0 6px", fontSize: 15, lineHeight: 1.35 }}
                >
                  <Link href={`/app/dokumen/${d.id}`} style={{ color: "inherit" }}>
                    {d.title}
                  </Link>
                </h4>
                <p className="t-small muted">
                  {meta.shortLabel} · {d.subject} · {d.jenjang}
                </p>
                <div className="row between" style={{ marginTop: 6 }}>
                  <span className="t-small faint">oleh {d.ownerName}</span>
                  <span className="t-small faint">{d.updatedLabel}</span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  block
                  iconLeft="copy"
                  style={{ marginTop: 12 }}
                  onClick={() => duplicateFromDoc(d.id)}
                >
                  Gunakan sebagai dasar
                </Button>
                {isAdmin && (
                  <div className="rbank-tpl-toggle">
                    <Switch
                      on={isOfficial}
                      onChange={() => toggleOfficial(d.id)}
                      label={`Tandai “${d.title}” sebagai template resmi sekolah`}
                    />
                    <span className="t-small muted">Template resmi sekolah</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
