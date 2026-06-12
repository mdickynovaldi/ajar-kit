"use client";

/* AjarKit — Dokumen Saya / Bank Dokumen (design.md §9.G.2, prd.md §8.5).
   Porting Ajarkit/app-dokumen.html: search, filter jenis/status, sort,
   grid/list, menu aksi dokumen via Sheet. Data dari store (mock). */

import { useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import {
  Button,
  Chip,
  EmptyState,
  Field,
  Segmented,
  Skeleton,
  StatusBadge,
} from "@/components/ui/controls";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { useApp } from "@/lib/store";
import { DOC_TYPES, STATUS_META } from "@/lib/constants";
import type { DocStatus, DocType, Document } from "@/lib/types";

type SortKey = "terbaru" | "judul";
type Scope = "milik" | "ruang";

const STATUS_OPTIONS: { value: DocStatus | ""; label: string }[] = [
  { value: "", label: "Semua" },
  { value: "selesai", label: "Selesai" },
  { value: "draft", label: "Draft" },
  { value: "menunggu_review", label: "Menunggu Review" },
  { value: "disetujui", label: "Disetujui" },
  { value: "revisi", label: "Perlu Revisi" },
];

const TYPE_OPTIONS = Object.values(DOC_TYPES);

const ghostItem: CSSProperties = { justifyContent: "flex-start" };

export default function DokumenPage() {
  const app = useApp();
  const toast = useToast();
  const router = useRouter();

  const [scope, setScope] = useState<Scope>("milik");
  const [q, setQ] = useState("");
  const [type, setType] = useState<DocType | "">("");
  const [status, setStatus] = useState<DocStatus | "">("");
  const [sort, setSort] = useState<SortKey>("terbaru");
  const [grid, setGrid] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);

  const [menuDoc, setMenuDoc] = useState<Document | null>(null);
  const [renameDoc, setRenameDoc] = useState<Document | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [deleteDoc, setDeleteDoc] = useState<Document | null>(null);

  const scoped = useMemo(
    () =>
      scope === "ruang"
        ? app.documents.filter((d) => d.workspaceId)
        : app.documents,
    [app.documents, scope],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = scoped.filter(
      (d) =>
        (!status || d.status === status) &&
        (!type || d.type === type) &&
        (!needle ||
          d.title.toLowerCase().includes(needle) ||
          d.subject.toLowerCase().includes(needle)),
    );
    return [...list].sort((a, b) =>
      sort === "judul"
        ? a.title.localeCompare(b.title, "id")
        : b.updatedAt.localeCompare(a.updatedAt),
    );
  }, [scoped, q, type, status, sort]);

  const hasFilter = Boolean(q.trim() || type || status);

  /* ---------- aksi menu ---------- */
  function openDoc(doc: Document) {
    setMenuDoc(null);
    router.push(`/app/dokumen/${doc.id}`);
  }
  function duplicate(doc: Document) {
    app.duplicateDocument(doc.id);
    setMenuDoc(null);
    toast("Dokumen diduplikat");
  }
  function startRename(doc: Document) {
    setMenuDoc(null);
    setRenameVal(doc.title);
    setRenameDoc(doc);
  }
  function saveRename() {
    if (!renameDoc || !renameVal.trim()) return;
    app.updateDocument(renameDoc.id, {
      title: renameVal.trim(),
      updatedLabel: "Baru saja",
      updatedAt: new Date().toISOString(),
    });
    setRenameDoc(null);
    toast("Nama dokumen diubah");
  }
  function download(doc: Document) {
    void doc;
    setMenuDoc(null);
    toast("Mengunduh DOCX…");
  }
  function moveToFolder(doc: Document) {
    void doc;
    setMenuDoc(null);
    toast("Pindah ke folder disimulasikan");
  }
  function confirmDelete() {
    if (!deleteDoc) return;
    app.removeDocument(deleteDoc.id);
    setDeleteDoc(null);
    toast("Dokumen dihapus", false);
  }

  /* ---------- potongan render ---------- */
  function renderGrid() {
    return (
      <div className="doc-grid grid3">
        {filtered.map((d) => {
          const meta = DOC_TYPES[d.type];
          const st = STATUS_META[d.status];
          return (
            <div key={d.id} className="card dcard pad hover">
              <div className="top">
                <span className={`doc-ic ${meta.color}`}>
                  <Icon name={meta.icon} />
                </span>
                <button
                  className="iconbtn menu"
                  style={{ width: 32, height: 32 }}
                  aria-label={`Aksi untuk ${d.title}`}
                  onClick={() => setMenuDoc(d)}
                >
                  <Icon name="more" />
                </button>
              </div>
              <h4 className="t-h4 dcard-title">
                <Link href={`/app/dokumen/${d.id}`}>{d.title}</Link>
              </h4>
              <p className="t-small muted">
                {meta.shortLabel} · {d.subject} · {d.jenjang}
              </p>
              <div className="row between" style={{ marginTop: 12 }}>
                <StatusBadge badge={st.badge}>{st.label}</StatusBadge>
                <span className="t-small faint">{d.updatedLabel}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderList() {
    return (
      <div className="card pad" style={{ padding: "6px 16px" }}>
        {filtered.map((d) => {
          const meta = DOC_TYPES[d.type];
          const st = STATUS_META[d.status];
          return (
            <div key={d.id} className="dok-row">
              <span className={`doc-ic ${meta.color}`} style={{ flex: "none" }}>
                <Icon name={meta.icon} />
              </span>
              <div className="grow" style={{ minWidth: 0 }}>
                <Link href={`/app/dokumen/${d.id}`} className="dok-row-title">
                  {d.title}
                </Link>
                <div className="t-small muted">
                  {meta.shortLabel} · {d.subject} · {d.jenjang}
                </div>
              </div>
              <StatusBadge badge={st.badge}>{st.label}</StatusBadge>
              <span className="t-small faint hide-mobile" style={{ flex: "none" }}>
                {d.updatedLabel}
              </span>
              <button
                className="iconbtn"
                style={{ width: 32, height: 32, flex: "none", color: "var(--text-faint)" }}
                aria-label={`Aksi untuk ${d.title}`}
                onClick={() => setMenuDoc(d)}
              >
                <Icon name="more" />
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  function renderSkeleton() {
    return (
      <div className="doc-grid grid3" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="card pad">
            <Skeleton height={40} width={40} />
            <Skeleton height={16} style={{ marginTop: 14 }} />
            <Skeleton height={13} width="60%" style={{ marginTop: 8 }} />
            <Skeleton height={22} width={90} style={{ marginTop: 14 }} />
          </div>
        ))}
      </div>
    );
  }

  function renderStatusChips(afterPick?: () => void) {
    return STATUS_OPTIONS.map((s) => (
      <Chip
        key={s.value || "semua"}
        on={status === s.value}
        onToggle={() => {
          setStatus(s.value);
          afterPick?.();
        }}
      >
        {s.label}
      </Chip>
    ));
  }

  return (
    <>
      <div
        className="row between"
        style={{ marginBottom: 16, flexWrap: "wrap", gap: 12 }}
      >
        <div>
          <h1 className="t-h1">Dokumen Saya</h1>
          {app.hydrated ? (
            <p className="muted t-small">{filtered.length} dokumen</p>
          ) : (
            <Skeleton height={13} width={80} style={{ marginTop: 6 }} />
          )}
        </div>
        <Link className="btn btn-primary" href="/app/buat">
          <Icon name="plus" />
          Buat Dokumen
        </Link>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Segmented<Scope>
          options={[
            { value: "milik", label: "Milik Saya" },
            { value: "ruang", label: "Ruang Sekolah" },
          ]}
          value={scope}
          onChange={setScope}
        />
      </div>

      <div className="dok-toolbar">
        <div className="input-icon">
          <Icon name="search" />
          <input
            className="input"
            placeholder="Cari dokumen…"
            aria-label="Cari dokumen"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          className="select hide-mobile"
          aria-label="Filter jenis dokumen"
          style={{ width: "auto", minWidth: 150 }}
          value={type}
          onChange={(e) => setType(e.target.value as DocType | "")}
        >
          <option value="">Semua jenis</option>
          {TYPE_OPTIONS.map((t) => (
            <option key={t.type} value={t.type}>
              {t.shortLabel}
            </option>
          ))}
        </select>
        <select
          className="select hide-mobile"
          aria-label="Urutkan dokumen"
          style={{ width: "auto", minWidth: 120 }}
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
        >
          <option value="terbaru">Terbaru</option>
          <option value="judul">Judul</option>
        </select>
        <Button
          variant="secondary"
          className="hide-desktop"
          iconLeft="settings"
          onClick={() => setFilterOpen(true)}
        >
          Filter
        </Button>
        <button
          className="iconbtn btn-secondary"
          style={{ width: 44 }}
          aria-label="Ubah tampilan"
          aria-pressed={!grid}
          onClick={() => setGrid((g) => !g)}
        >
          <Icon name={grid ? "list" : "grid"} />
        </button>
      </div>

      <div className="dok-filters hide-mobile">{renderStatusChips()}</div>

      {!app.hydrated ? (
        renderSkeleton()
      ) : filtered.length === 0 ? (
        hasFilter ? (
          <EmptyState icon="search" title="Tidak ditemukan" desc="Coba kata kunci atau filter lain." />
        ) : (
          <EmptyState
            icon="files"
            title="Belum ada dokumen"
            desc="Yuk buat dokumen pertamamu — Modul Ajar, LKPD, sampai Bank Soal, selesai dalam hitungan menit."
          >
            <Link className="btn btn-primary" href="/app/buat">
              <Icon name="plus" />
              Buat Dokumen
            </Link>
          </EmptyState>
        )
      ) : grid ? (
        renderGrid()
      ) : (
        renderList()
      )}

      {/* Sheet filter (mobile) */}
      <Sheet open={filterOpen} onClose={() => setFilterOpen(false)}>
        <h3 className="t-h3" style={{ marginBottom: 14 }}>
          Filter & urutkan
        </h3>
        <Field label="Jenis dokumen">
          <select
            className="select"
            value={type}
            onChange={(e) => setType(e.target.value as DocType | "")}
          >
            <option value="">Semua jenis</option>
            {TYPE_OPTIONS.map((t) => (
              <option key={t.type} value={t.type}>
                {t.shortLabel}
              </option>
            ))}
          </select>
        </Field>
        <div className="field" style={{ marginTop: 12 }}>
          <label>Status</label>
          <div className="row wrap" style={{ gap: 8 }}>
            {renderStatusChips()}
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <Field label="Urutkan">
            <select
              className="select"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              <option value="terbaru">Terbaru</option>
              <option value="judul">Judul</option>
            </select>
          </Field>
        </div>
        <Button block style={{ marginTop: 16 }} onClick={() => setFilterOpen(false)}>
          Terapkan
        </Button>
      </Sheet>

      {/* Sheet aksi dokumen */}
      <Sheet open={!!menuDoc} onClose={() => setMenuDoc(null)}>
        <h3 className="t-h3" style={{ marginBottom: 10 }}>
          Aksi dokumen
        </h3>
        {menuDoc && (
          <div className="stack" style={{ "--gap": "4px" } as CSSProperties}>
            <button className="btn btn-ghost block" style={ghostItem} onClick={() => openDoc(menuDoc)}>
              Buka
            </button>
            <button className="btn btn-ghost block" style={ghostItem} onClick={() => duplicate(menuDoc)}>
              Duplikat
            </button>
            <button className="btn btn-ghost block" style={ghostItem} onClick={() => startRename(menuDoc)}>
              Ganti nama
            </button>
            <button className="btn btn-ghost block" style={ghostItem} onClick={() => download(menuDoc)}>
              Unduh DOCX
            </button>
            <button className="btn btn-ghost block" style={ghostItem} onClick={() => moveToFolder(menuDoc)}>
              Pindah ke folder
            </button>
            <button
              className="btn btn-ghost block"
              style={{ ...ghostItem, color: "var(--error)" }}
              onClick={() => {
                setDeleteDoc(menuDoc);
                setMenuDoc(null);
              }}
            >
              Hapus
            </button>
          </div>
        )}
      </Sheet>

      {/* Sheet ganti nama */}
      <Sheet open={!!renameDoc} onClose={() => setRenameDoc(null)}>
        <h3 className="t-h3" style={{ marginBottom: 14 }}>
          Ganti nama
        </h3>
        <Field label="Nama dokumen">
          <input
            className="input"
            value={renameVal}
            onChange={(e) => setRenameVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveRename();
            }}
          />
        </Field>
        <Button block style={{ marginTop: 16 }} disabled={!renameVal.trim()} onClick={saveRename}>
          Simpan
        </Button>
      </Sheet>

      {/* Sheet konfirmasi hapus */}
      <Sheet open={!!deleteDoc} onClose={() => setDeleteDoc(null)}>
        <h3 className="t-h3" style={{ marginBottom: 8 }}>
          Hapus dokumen?
        </h3>
        <p className="muted t-body" style={{ marginBottom: 16 }}>
          “{deleteDoc?.title}” akan dihapus permanen. Tindakan ini tidak bisa
          dibatalkan.
        </p>
        <div className="stack" style={{ "--gap": "8px" } as CSSProperties}>
          <Button variant="destructive" block onClick={confirmDelete}>
            Hapus
          </Button>
          <Button variant="secondary" block onClick={() => setDeleteDoc(null)}>
            Batal
          </Button>
        </div>
      </Sheet>
    </>
  );
}
