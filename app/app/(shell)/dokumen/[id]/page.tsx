"use client";

/* AjarKit — Editor & Preview Dokumen (design.md §9.G.1, prd.md §8.4).
   Porting Ajarkit/app-editor.html: judul editable, autosave indicator,
   kanvas dokumen dgn blok contentEditable + regenerasi per-bagian,
   panel Asisten AI (desktop) / FAB + Sheet (mobile), ekspor & bagikan,
   tabel pertemuan RPS yang bisa diedit. Semua data mock via store. */

import {
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icon";
import {
  Banner,
  Button,
  EmptyState,
  Field,
  Skeleton,
  StatusBadge,
} from "@/components/ui/controls";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { useApp } from "@/lib/store";
import { DOC_TYPES, QUALITY_MODES, STATUS_META } from "@/lib/constants";
import { tanggalID } from "@/lib/format";
import type { AtpRow, DocContent, Document, User } from "@/lib/types";

/* Tag tahap penyusunan Modul Ajar (per app-editor.html) */
const PHASE_TAGS: Record<string, string> = {
  identifikasi: "Tahap 1 · Identifikasi",
  dimensi: "Tahap 2 · Desain",
  desain: "Tahap 2 · Desain",
  pengalaman: "Tahap 3 · Pengalaman Belajar",
  asesmen: "Tahap 4 · Asesmen",
};

/* Variasi teks mock utk "Susun ulang dengan AI" */
const SWAPS: [RegExp, string][] = [
  [/peserta didik/gi, "siswa"],
  [/\bmampu\b/gi, "dapat"],
  [/menjelaskan/gi, "menguraikan"],
  [/menyusun/gi, "merancang"],
  [/kegiatan/gi, "aktivitas"],
  [/mengidentifikasi/gi, "mengenali"],
  [/menganalisis/gi, "mengkaji"],
  [/pengamatan/gi, "observasi"],
];
/* Konvensi list ringan (per app-editor.html): blok berawalan "- " dirender
   sebagai <li>; blok berurutan digabung jadi satu <ul>. Prefiks dilepas saat
   tampil dan dikembalikan saat blur agar round-trip ke store tetap utuh. */
const LIST_PREFIX = "- ";

function variantText(t: string): string {
  const isItem = t.startsWith(LIST_PREFIX);
  let out = isItem ? t.slice(LIST_PREFIX.length) : t;
  for (const [re, rep] of SWAPS) out = out.replace(re, rep);
  out = out.charAt(0).toUpperCase() + out.slice(1);
  return isItem ? LIST_PREFIX + out : out;
}

type BlockRun =
  | { kind: "p"; text: string; bi: number }
  | { kind: "ul"; items: { text: string; bi: number }[] };

function groupBlocks(blocks: string[]): BlockRun[] {
  const runs: BlockRun[] = [];
  blocks.forEach((b, bi) => {
    if (b.startsWith(LIST_PREFIX)) {
      const item = { text: b.slice(LIST_PREFIX.length), bi };
      const last = runs[runs.length - 1];
      if (last?.kind === "ul") last.items.push(item);
      else runs.push({ kind: "ul", items: [item] });
    } else {
      runs.push({ kind: "p", text: b, bi });
    }
  });
  return runs;
}

function regenCost(blockCount: number): number {
  return blockCount >= 3 ? 10 : 8;
}

/* Kop instansi dari Pengaturan → Profil. Bila Profil Instansi belum diisi,
   nama jatuh ke sekolah/PT dari onboarding agar kop tetap terisi wajar
   (semua kosong → Header jatuh ke header AjarKit). */
function instansiPayload(u: User) {
  return {
    induk: u.instansiInduk,
    nama: u.namaInstansi || u.sekolah || u.pt,
    alamat: u.alamatInstansi,
    kontak: u.kontakInstansi,
    logoDataUrl: u.logoInstansi,
  };
}

/* Blok ttd: pimpinan (kiri) + penyusun (kanan) dari profil pengguna.
   Jabatan pimpinan SELALU terkirim (default per peran) dan nama/NIP yang
   belum diisi dikirim sebagai "" — bukan undefined — agar blok ttd tetap
   dirender dengan garis titik sebagai tempat tanda tangan. */
function ttdPayload(u: User, isRps: boolean) {
  return {
    kota: u.kota,
    tanggal: tanggalID(),
    penyusunJabatan: isRps ? "Dosen Pengampu" : "Guru Mata Pelajaran",
    penyusunNama: u.nama || "",
    penyusunNip: u.nip ?? "",
    pimpinanJabatan:
      u.pimpinanJabatan || (isRps ? "Ketua Program Studi" : "Kepala Sekolah"),
    pimpinanNama: u.pimpinanNama ?? "",
    pimpinanNip: u.pimpinanNip ?? "",
  };
}

/* Payload ekspor Modul Ajar/RPP guru — dipakai unduh PDF & DOCX agar layout
   resmi (kop instansi, tabel identitas, tabel kegiatan, ttd) identik. */
function buildRppExportPayload(cur: Document, u: User) {
  return {
    template: "rpp" as const,
    title: cur.title,
    typeLabel: DOC_TYPES[cur.type].label,
    meta: `${cur.subject} · ${cur.jenjang}`,
    sections: cur.content?.sections ?? [],
    kegiatan: cur.content?.kegiatan ?? undefined,
    instansi: instansiPayload(u),
    ttd: ttdPayload(u, false),
  };
}

/* Nama berkas .docx dari judul — cermin sanitasi di /api/export/docx */
function docxFilename(title: string): string {
  const base = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return `${base || "dokumen"}.docx`;
}

const AI_ACTIONS: { icon: IconName; label: string; msg: string }[] = [
  { icon: "edit", label: "Perbaiki bahasa", msg: "Bagian diperbaiki" },
  { icon: "zap", label: "Perpendek", msg: "Teks dipersingkat" },
  { icon: "plus", label: "Tambah kegiatan", msg: "Kegiatan ditambahkan" },
  { icon: "refresh", label: "Ubah gaya bahasa", msg: "Bahasa diubah" },
];

const ghostItem: CSSProperties = { justifyContent: "flex-start" };

export default function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const app = useApp();
  const toast = useToast();
  const router = useRouter();

  const doc = app.documents.find((d) => d.id === id) ?? null;
  const docRef = useRef<Document | null>(doc);
  useEffect(() => {
    docRef.current = doc;
  }, [doc]);

  /* ---------- indikator autosave ---------- */
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markEdit = useCallback(() => {
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaveState("saved"), 900);
  }, []);

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );

  /* Konfirmasi keluar saat masih "Menyimpan…" */
  useEffect(() => {
    if (saveState !== "saving") return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [saveState]);

  /* Tautan internal yang meninggalkan editor: konfirmasi dulu saat menyimpan
     (beforeunload hanya menangkap tutup tab, bukan navigasi client-side). */
  const guardNav = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (saveState !== "saving") return;
      if (!window.confirm("Perubahan sedang disimpan. Yakin ingin meninggalkan halaman?")) {
        e.preventDefault();
      }
    },
    [saveState],
  );

  /* ---------- commit perubahan ke store ---------- */
  const touch = useCallback(
    (patch: Partial<Document>) => {
      app.updateDocument(id, {
        ...patch,
        updatedLabel: "Baru saja",
        updatedAt: new Date().toISOString(),
      });
    },
    [app, id],
  );

  function cloneContent(): DocContent | null {
    const cur = docRef.current?.content;
    if (!cur) return null;
    return {
      sections: cur.sections.map((s) => ({ ...s, blocks: [...s.blocks] })),
      pertemuan: cur.pertemuan ? cur.pertemuan.map((p) => ({ ...p })) : undefined,
      atp: cur.atp ? cur.atp.map((r) => ({ ...r })) : undefined,
      kegiatan: cur.kegiatan
        ? cur.kegiatan.map((k) => ({
            ...k,
            tahap: k.tahap.map((t) => ({
              ...t,
              siswa: [...t.siswa],
              guru: [...t.guru],
            })),
          }))
        : undefined,
    };
  }

  function commitTitle(text: string) {
    const t = text.trim();
    if (!t || t === docRef.current?.title) return;
    touch({ title: t });
  }
  function commitSectionTitle(si: number, text: string) {
    const next = cloneContent();
    if (!next || !text.trim()) return;
    if (next.sections[si].title === text.trim()) return;
    next.sections[si].title = text.trim();
    touch({ content: next });
  }
  function commitBlock(si: number, bi: number, text: string) {
    const next = cloneContent();
    if (!next) return;
    if (next.sections[si].blocks[bi] === text) return;
    next.sections[si].blocks[bi] = text;
    touch({ content: next });
  }
  function commitCell(
    ri: number,
    field: "subCpmk" | "materi" | "metode" | "indikator" | "bobot",
    text: string,
  ) {
    const next = cloneContent();
    if (!next?.pertemuan) return;
    if (next.pertemuan[ri][field] === text) return;
    next.pertemuan[ri][field] = text;
    touch({ content: next });
  }
  function commitAtpCell(ri: number, field: keyof AtpRow, text: string) {
    const next = cloneContent();
    if (!next?.atp) return;
    if (next.atp[ri][field] === text) return;
    next.atp[ri][field] = text;
    touch({ content: next });
  }
  function addRow() {
    const next = cloneContent();
    if (!next) return;
    const rows = next.pertemuan ?? [];
    const minggu = rows.length ? rows[rows.length - 1].minggu + 1 : 1;
    next.pertemuan = [
      ...rows,
      {
        minggu,
        subCpmk: "Sub-CPMK baru",
        materi: "Materi pertemuan",
        metode: "—",
        indikator: "—",
        bobot: "0%",
      },
    ];
    touch({ content: next });
    markEdit();
  }
  function removeRow(ri: number) {
    const next = cloneContent();
    if (!next?.pertemuan) return;
    next.pertemuan = next.pertemuan.filter((_, i) => i !== ri);
    touch({ content: next });
    markEdit();
  }

  /* ---------- regenerasi per-bagian ---------- */
  const [regenId, setRegenId] = useState<string | null>(null);
  const [shortCost, setShortCost] = useState<number | null>(null);
  function regen(si: number) {
    const cur = docRef.current;
    if (!cur?.content || regenId) return;
    const sec = cur.content.sections[si];
    const cost = regenCost(sec.blocks.length);
    if (app.credits < cost) {
      setShortCost(cost);
      return;
    }
    setRegenId(sec.id);
    setTimeout(() => {
      const next = cloneContent();
      if (next) {
        next.sections[si].blocks = next.sections[si].blocks.map(variantText);
        touch({ content: next });
        app.deductCredits(cost);
      }
      setRegenId(null);
      toast("Bagian disusun ulang");
    }, 1500);
  }

  /* ---------- aksi Asisten AI (mock) ---------- */
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  function runAi(label: string, msg: string) {
    if (aiBusy) return;
    setAiBusy(label);
    setTimeout(() => {
      setAiBusy(null);
      toast(msg);
    }, 1200);
  }

  /* ---------- sheets ---------- */
  const [exportOpen, setExportOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [reviewer, setReviewer] = useState("Kepala Sekolah — Ibu Sri Wahyuni");

  const shareLink = `https://ajarkit.id/d/${id}`;

  /* Unduh DOCX via POST /api/export/docx → blob → <a download> sementara.
     Modul Ajar/RPP guru → payload lengkap sama dgn PDF (template "rpp"). */
  async function downloadDocx() {
    const cur = docRef.current;
    if (!cur) return;
    toast("Mengunduh DOCX…");
    try {
      const body =
        cur.type === "modul_ajar"
          ? buildRppExportPayload(cur, app.user)
          : {
              title: cur.title,
              typeLabel: DOC_TYPES[cur.type].label,
              meta: `${cur.subject} · ${cur.jenjang} · Penyusun: ${cur.ownerName}`,
              content: cur.content ?? { sections: [] },
            };
      const token = await app.getAccessToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch("/api/export/docx", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (res.status === 401) {
        toast("Sesi berakhir — masuk ulang.", false);
        return;
      }
      if (res.status === 403) {
        toast(
          "Ekspor Word khusus paket Pro. Versi gratis bisa ekspor PDF (dengan watermark).",
          false,
        );
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = docxFilename(cur.title);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch {
      toast("Gagal mengunduh DOCX — coba lagi.", false);
    }
  }

  /* Unduh PDF berbranding via POST /api/export/pdf → blob → unduh */
  async function downloadPdf() {
    const cur = docRef.current;
    if (!cur) return;
    toast("Mengunduh PDF…");
    try {
      const u = app.user;
      const token = await app.getAccessToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch("/api/export/pdf", {
        method: "POST",
        headers,
        body: JSON.stringify({
          kind: "document",
          // Modul Ajar/RPP guru → template formal monokrom + tabel kegiatan
          // (payload sama persis dgn unduh DOCX agar layout identik);
          // RPS dosen → template resmi universitas (rps-pdf, landscape).
          data:
            cur.type === "modul_ajar"
              ? buildRppExportPayload(cur, u)
              : cur.type === "rps"
                ? {
                    template: "rps" as const,
                    title: cur.title,
                    typeLabel: DOC_TYPES[cur.type].label,
                    meta: `${cur.subject} · ${cur.jenjang}`,
                    sections: cur.content?.sections ?? [],
                    pertemuan: cur.content?.pertemuan ?? undefined,
                    instansi: instansiPayload(u),
                    ttd: ttdPayload(u, true),
                  }
                : {
                    title: cur.title,
                    typeLabel: DOC_TYPES[cur.type].label,
                    meta: `${cur.subject} · ${cur.jenjang}`,
                    sections: cur.content?.sections ?? [],
                    pertemuan: cur.content?.pertemuan ?? undefined,
                    atp: cur.content?.atp ?? undefined,
                    // kop instansi dari Pengaturan → Profil (kosong → header AjarKit)
                    instansi: instansiPayload(u),
                    ttd: ttdPayload(u, false),
                  },
        }),
      });
      if (res.status === 401) {
        toast("Sesi berakhir — masuk ulang.", false);
        return;
      }
      if (res.status === 403) {
        // bedakan jatah ekspor free habis (EKSPOR_LIMIT) dari 403 lain
        const err = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        toast(
          err?.error === "EKSPOR_LIMIT"
            ? "Versi gratis hanya bisa ekspor 1x — upgrade ke Pro untuk ekspor tanpa batas."
            : "Ekspor ini tidak tersedia untuk paketmu.",
          false,
        );
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${docxFilename(cur.title).replace(/\.docx$/, "")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch {
      toast("Gagal mengunduh PDF — coba lagi.", false);
    }
  }

  function copyLink() {
    navigator.clipboard
      .writeText(shareLink)
      .then(() => toast("Tautan disalin"))
      .catch(() => toast("Gagal menyalin tautan", false));
  }
  function duplicate() {
    const newId = app.duplicateDocument(id);
    setMoreOpen(false);
    toast("Dokumen diduplikat");
    if (newId) router.push(`/app/dokumen/${newId}`);
  }
  function confirmDelete() {
    app.removeDocument(id);
    setDeleteOpen(false);
    toast("Dokumen dihapus", false);
    router.push("/app/dokumen");
  }
  /* Ajukan utk ditinjau via store (dual-mode): status dokumen + baris review
     + notifikasi admin ditangani store.submitForReview. */
  async function submitReview() {
    const cur = docRef.current;
    if (!cur || submittingReview) return;
    setSubmittingReview(true);
    try {
      await app.submitForReview(cur.id);
      setReviewOpen(false);
      toast("Diajukan untuk ditinjau ✅");
    } catch (e) {
      if (e instanceof Error && e.message === "BELUM_PUNYA_RUANG") {
        toast(
          "Kamu belum tergabung di ruang. Buat/terima undangan dulu di menu Ruang.",
          false,
        );
      } else {
        toast("Gagal mengajukan review. Coba lagi, ya.", false);
      }
    }
    setSubmittingReview(false);
  }
  function scrollToSection(secId: string) {
    document
      .getElementById(`sec-${secId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- state: loading / tidak ditemukan ---------- */
  if (!app.hydrated) {
    return (
      <>
        <div className="ed-head" aria-hidden="true">
          <Skeleton height={40} width={40} />
          <div className="grow" style={{ minWidth: 0 }}>
            <Skeleton height={24} width="55%" />
            <Skeleton height={14} width={220} style={{ marginTop: 8 }} />
          </div>
        </div>
        <div className="ed-grid" aria-hidden="true">
          <div className="ed-canvas">
            <div className="doc-page">
              <Skeleton height={24} width="70%" />
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} height={14} style={{ marginTop: 14 }} />
              ))}
            </div>
          </div>
          <aside className="hide-mobile">
            <Skeleton height={220} />
          </aside>
        </div>
      </>
    );
  }

  if (!doc) {
    return (
      <EmptyState
        icon="files"
        title="Dokumen tidak ditemukan"
        desc="Dokumen mungkin sudah dihapus atau tautannya tidak valid."
      >
        <Link className="btn btn-primary" href="/app/dokumen">
          <Icon name="chevL" />
          Kembali ke Dokumen Saya
        </Link>
      </EmptyState>
    );
  }

  const typeMeta = DOC_TYPES[doc.type];
  const st = STATUS_META[doc.status];
  const sections = doc.content?.sections ?? [];
  const pertemuan = doc.content?.pertemuan;
  const atp = doc.content?.atp;
  const kegiatan = doc.content?.kegiatan;
  const isFree = app.user.plan === "free";

  return (
    <>
      {/* ---------- Header dokumen ---------- */}
      <div className="ed-head">
        <Link
          className="iconbtn btn-secondary hide-mobile"
          href="/app/dokumen"
          style={{ width: 40, flex: "none" }}
          aria-label="Kembali"
          onClick={guardNav}
        >
          <Icon name="chevL" />
        </Link>
        <div className="grow" style={{ minWidth: 0 }}>
          <div
            className="ed-title"
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            role="textbox"
            aria-label="Judul dokumen"
            onInput={markEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
            onBlur={(e) => commitTitle(e.currentTarget.textContent ?? "")}
          >
            {doc.title}
          </div>
          <div className="row wrap" style={{ gap: 8, marginTop: 6 }}>
            <StatusBadge badge={st.badge}>{st.label}</StatusBadge>
            <span className="t-small muted">
              {typeMeta.shortLabel} · {doc.subject} · {doc.jenjang}
            </span>
            <span
              className={`ed-saved hide-mobile${saveState === "saving" ? " saving" : ""}`}
              aria-live="polite"
            >
              {saveState === "saving" ? (
                <>
                  <span className="spinner" style={{ width: 13, height: 13 }} />
                  Menyimpan…
                </>
              ) : (
                <>
                  <Icon name="check" />
                  Tersimpan
                </>
              )}
            </span>
          </div>
        </div>
        <Button
          variant="secondary"
          className="hide-mobile"
          iconLeft="download"
          onClick={() => setExportOpen(true)}
        >
          Ekspor
        </Button>
        <Button
          variant="secondary"
          className="hide-mobile"
          iconLeft="share"
          onClick={() => setShareOpen(true)}
        >
          Bagikan
        </Button>
        {app.workspace !== null && (
          <Button
            className="hide-mobile"
            iconLeft="check"
            onClick={() => setReviewOpen(true)}
          >
            Ajukan ditinjau
          </Button>
        )}
        <button
          className="iconbtn btn-secondary"
          style={{ width: 40 }}
          aria-label="Aksi lainnya"
          onClick={() => setMoreOpen(true)}
        >
          <Icon name="more" />
        </button>
      </div>

      {/* ---------- Banner ---------- */}
      <div className="stack" style={{ "--gap": "10px", marginBottom: 18 } as CSSProperties}>
        <Banner variant="info" icon="sparkles">
          <span>Dibuat oleh AI — periksa &amp; sesuaikan sebelum digunakan.</span>
        </Banner>
        {isFree && (
          <Banner variant="warn">
            <span className="grow">
              Versi gratis menyertakan watermark saat ekspor.
            </span>
            <Link
              className="btn btn-secondary sm"
              href="/app/langganan"
              style={{ flex: "none" }}
              onClick={guardNav}
            >
              Upgrade
            </Link>
          </Banner>
        )}
      </div>

      <div className="ed-grid">
        {/* ---------- Kanvas dokumen ---------- */}
        <div className="ed-canvas">
          <div className="doc-page">
            {doc.type === "modul_ajar" && (
              <span className="phase-tag">Tahap 1 · Identifikasi</span>
            )}
            <h1 className="t-h2" style={{ fontSize: 22 }}>
              {doc.title}
            </h1>
            <div className="doc-meta-grid">
              <div>
                <b>Jenis</b> {typeMeta.label}
              </div>
              <div>
                <b>Status</b> {st.label}
              </div>
              <div>
                <b>Mata Pelajaran</b> {doc.subject}
              </div>
              <div>
                <b>Jenjang</b> {doc.jenjang}
              </div>
              <div>
                <b>Penyusun</b> {doc.ownerName}
              </div>
              <div>
                <b>Mode</b> {QUALITY_MODES[doc.qualityMode].label}
              </div>
            </div>

            {sections.length === 0 && !pertemuan ? (
              <EmptyState
                icon="files"
                title="Konten belum tersedia"
                desc="Dokumen ini belum punya isi. Buat ulang dari generator untuk mengisinya."
              >
                <Link className="btn btn-secondary" href="/app/buat" onClick={guardNav}>
                  <Icon name="plus" />
                  Buat Dokumen
                </Link>
              </EmptyState>
            ) : (
              sections.map((sec, si) => {
                const cost = regenCost(sec.blocks.length);
                const busy = regenId === sec.id;
                const tag =
                  doc.type === "modul_ajar" ? PHASE_TAGS[sec.id] : undefined;
                return (
                  <section
                    key={sec.id}
                    id={`sec-${sec.id}`}
                    className={`dsec${busy ? " regenerating" : ""}`}
                    style={si === 0 ? { borderTop: "none" } : undefined}
                  >
                    <button
                      className="btn btn-ghost sm regen"
                      onClick={() => regen(si)}
                      disabled={!!regenId}
                      aria-label={`Susun ulang bagian ${sec.title} dengan AI — ${cost} kredit`}
                    >
                      {busy ? (
                        <span className="spinner" style={{ width: 14, height: 14 }} />
                      ) : (
                        <>
                          <Icon name="refresh" />
                          Susun ulang · {cost}
                        </>
                      )}
                    </button>
                    {tag && <span className="phase-tag">{tag}</span>}
                    <h3
                      contentEditable
                      suppressContentEditableWarning
                      spellCheck={false}
                      onInput={markEdit}
                      onBlur={(e) =>
                        commitSectionTitle(si, e.currentTarget.textContent ?? "")
                      }
                    >
                      {sec.title}
                    </h3>
                    {groupBlocks(sec.blocks).map((run) =>
                      run.kind === "p" ? (
                        <p
                          key={`${sec.id}-${run.bi}`}
                          contentEditable
                          suppressContentEditableWarning
                          spellCheck={false}
                          onInput={markEdit}
                          onBlur={(e) =>
                            commitBlock(si, run.bi, e.currentTarget.textContent ?? "")
                          }
                        >
                          {run.text}
                        </p>
                      ) : (
                        <ul key={`${sec.id}-${run.items[0].bi}`}>
                          {run.items.map((it) => (
                            <li
                              key={`${sec.id}-${it.bi}`}
                              contentEditable
                              suppressContentEditableWarning
                              spellCheck={false}
                              onInput={markEdit}
                              onBlur={(e) =>
                                commitBlock(
                                  si,
                                  it.bi,
                                  LIST_PREFIX + (e.currentTarget.textContent ?? ""),
                                )
                              }
                            >
                              {it.text}
                            </li>
                          ))}
                        </ul>
                      ),
                    )}
                  </section>
                );
              })
            )}

            {atp && (
              <>
                <div className="ed-rps-head">
                  <h3>Alur Tujuan Pembelajaran</h3>
                </div>
                <div className="ed-rps-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Alur Tujuan Pembelajaran</th>
                        <th>JP</th>
                        <th>Dimensi Profil Pelajar Pancasila</th>
                        <th>Indikator Pencapaian</th>
                      </tr>
                    </thead>
                    <tbody>
                      {atp.map((r, ri) => (
                        <tr key={ri}>
                          {(["tp", "jp", "dimensi", "indikator"] as const).map((f) => (
                            <td
                              key={f}
                              contentEditable
                              suppressContentEditableWarning
                              spellCheck={false}
                              onInput={markEdit}
                              onBlur={(e) =>
                                commitAtpCell(ri, f, e.currentTarget.textContent ?? "")
                              }
                            >
                              {r[f]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Rincian kegiatan Modul Ajar/RPP guru — pola tabel ATP/RPS.
                TODO: dukung edit sel (contentEditable) seperti tabel ATP/RPS;
                untuk saat ini tampilan baca-saja. */}
            {kegiatan?.map((k, ki) => (
              <div key={ki}>
                <div className="ed-rps-head">
                  <h3>{k.pertemuan}</h3>
                </div>
                <p className="t-small muted" style={{ marginBottom: 8 }}>
                  Alokasi waktu: {k.alokasi}
                </p>
                <div className="ed-rps-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Tahap</th>
                        <th>Kegiatan Peserta Didik</th>
                        <th>Kegiatan Guru</th>
                        <th>Waktu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {k.tahap.map((t, ti) => (
                        <tr key={ti}>
                          <td>{t.tahap}</td>
                          <td style={{ whiteSpace: "pre-line" }}>
                            {t.siswa.map((s) => `• ${s}`).join("\n")}
                          </td>
                          <td style={{ whiteSpace: "pre-line" }}>
                            {t.guru.map((g) => `• ${g}`).join("\n")}
                          </td>
                          <td>{t.waktu}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {pertemuan && (
              <>
                <div className="ed-rps-head">
                  <h3>Rencana 16 Pertemuan</h3>
                  <Button variant="secondary" size="sm" iconLeft="plus" onClick={addRow}>
                    Tambah baris
                  </Button>
                </div>
                <div className="ed-rps-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Minggu</th>
                        <th>Sub-CPMK</th>
                        <th>Materi</th>
                        <th>Metode</th>
                        <th>Indikator</th>
                        <th>Bobot</th>
                        <th aria-label="Aksi baris" />
                      </tr>
                    </thead>
                    <tbody>
                      {pertemuan.map((p, ri) => (
                        <tr key={`${p.minggu}-${ri}`}>
                          <td>{p.minggu}</td>
                          {(
                            ["subCpmk", "materi", "metode", "indikator", "bobot"] as const
                          ).map((f) => (
                            <td
                              key={f}
                              contentEditable
                              suppressContentEditableWarning
                              spellCheck={false}
                              onInput={markEdit}
                              onBlur={(e) =>
                                commitCell(ri, f, e.currentTarget.textContent ?? "")
                              }
                            >
                              {p[f]}
                            </td>
                          ))}
                          <td>
                            <button
                              className="iconbtn"
                              style={{ width: 32, height: 32, color: "var(--text-faint)" }}
                              aria-label={`Hapus baris minggu ${p.minggu}`}
                              onClick={() => removeRow(ri)}
                            >
                              <Icon name="x" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ---------- Panel Asisten AI (desktop) ---------- */}
        <aside className="hide-mobile">
          <div className="ai-panel">
            <div className="card pad">
              <div className="row between" style={{ marginBottom: 12 }}>
                <h4 className="t-h4">Asisten AI</h4>
                <span className="badge badge-ai">
                  <Icon name="sparkles" />
                  AI
                </span>
              </div>
              <div className="stack" style={{ "--gap": "8px" } as CSSProperties}>
                {AI_ACTIONS.map((a) => (
                  <button
                    key={a.label}
                    className="ai-act"
                    disabled={!!aiBusy}
                    onClick={() => runAi(a.label, a.msg)}
                  >
                    {aiBusy === a.label ? (
                      <span className="spinner" />
                    ) : (
                      <Icon name={a.icon} />
                    )}
                    {a.label}
                  </button>
                ))}
              </div>
              <p className="t-small faint" style={{ marginTop: 10 }}>
                Regenerasi sebagian memakai sedikit kredit (≈ 8–10).
              </p>
            </div>
            {sections.length > 0 && (
              <div className="card pad ed-outline">
                <h4 className="t-h4" style={{ marginBottom: 8 }}>
                  Daftar bagian
                </h4>
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#sec-${s.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSection(s.id);
                    }}
                  >
                    {s.title}
                  </a>
                ))}
              </div>
            )}
            <div className="card pad">
              <Button
                variant="secondary"
                block
                iconLeft="download"
                onClick={() => setExportOpen(true)}
              >
                Ekspor DOCX / PDF
              </Button>
            </div>
          </div>
        </aside>
      </div>

      {/* FAB Asisten AI (mobile) */}
      <button className="ai-fab" aria-label="Asisten AI" onClick={() => setAiOpen(true)}>
        <Icon name="sparkles" />
      </button>

      {/* ---------- Sheet Asisten AI (mobile) ---------- */}
      <Sheet open={aiOpen} onClose={() => setAiOpen(false)}>
        <h3 className="t-h3" style={{ marginBottom: 12 }}>
          Asisten AI
        </h3>
        <div className="stack" style={{ "--gap": "8px" } as CSSProperties}>
          {AI_ACTIONS.map((a) => (
            <button
              key={a.label}
              className="btn btn-secondary block"
              style={ghostItem}
              onClick={() => {
                setAiOpen(false);
                runAi(a.label, a.msg);
              }}
            >
              <Icon name={a.icon} />
              {a.label}
            </button>
          ))}
          <button
            className="btn btn-secondary block"
            style={ghostItem}
            onClick={() => {
              setAiOpen(false);
              setExportOpen(true);
            }}
          >
            <Icon name="download" />
            Ekspor DOCX / PDF
          </button>
        </div>
        {sections.length > 0 && (
          <div className="ed-outline" style={{ marginTop: 14 }}>
            <h4 className="t-h4" style={{ marginBottom: 8 }}>
              Daftar bagian
            </h4>
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#sec-${s.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  setAiOpen(false);
                  scrollToSection(s.id);
                }}
              >
                {s.title}
              </a>
            ))}
          </div>
        )}
      </Sheet>

      {/* ---------- Sheet ekspor ---------- */}
      <Sheet open={exportOpen} onClose={() => setExportOpen(false)}>
        <h3 className="t-h3" style={{ marginBottom: 6 }}>
          Ekspor
        </h3>
        {isFree && (
          <p className="muted t-small" style={{ marginBottom: 14 }}>
            Versi gratis menyertakan watermark.
          </p>
        )}
        <div className="stack" style={{ "--gap": "8px" } as CSSProperties}>
          <button
            className="btn btn-secondary block"
            style={ghostItem}
            disabled={isFree}
            title={isFree ? "Upgrade untuk ekspor Word yang bisa diedit" : undefined}
            onClick={() => {
              setExportOpen(false);
              void downloadDocx();
            }}
          >
            <Icon name="download" />
            Unduh DOCX
            {isFree && (
              <span className="t-small muted" style={{ marginLeft: "auto" }}>
                Khusus Pro
              </span>
            )}
          </button>
          <button
            className="btn btn-secondary block"
            style={ghostItem}
            onClick={() => {
              setExportOpen(false);
              void downloadPdf();
            }}
          >
            <Icon name="download" />
            Unduh PDF
          </button>
          {isFree && (
            <p className="t-small muted" style={{ margin: "2px 0 0" }}>
              Versi gratis: PDF dengan watermark ·{" "}
              <Link
                href="/app/langganan"
                onClick={(e) => {
                  guardNav(e);
                  if (!e.defaultPrevented) setExportOpen(false);
                }}
              >
                Upgrade
              </Link>
            </p>
          )}
        </div>
        {isFree && (
          <div className="banner info" style={{ marginTop: 14 }}>
            <Icon name="sparkles" />
            <div className="grow">
              <strong className="strong">Hapus watermark</strong>
              <p className="t-small muted">Upgrade ke Pro untuk ekspor bersih.</p>
            </div>
            <Link
              className="btn btn-secondary sm"
              href="/app/langganan"
              style={{ flex: "none" }}
              onClick={(e) => {
                guardNav(e);
                if (!e.defaultPrevented) setExportOpen(false);
              }}
            >
              Upgrade
            </Link>
          </div>
        )}
      </Sheet>

      {/* ---------- Sheet bagikan ---------- */}
      <Sheet open={shareOpen} onClose={() => setShareOpen(false)}>
        <h3 className="t-h3" style={{ marginBottom: 6 }}>
          Bagikan dokumen
        </h3>
        <p className="muted t-small" style={{ marginBottom: 14 }}>
          Siapa pun dengan tautan ini bisa melihat versi baca-saja.
        </p>
        <Field label="Tautan baca-saja">
          <input className="input" readOnly value={shareLink} onFocus={(e) => e.target.select()} />
        </Field>
        <Button block iconLeft="copy" style={{ marginTop: 14 }} onClick={copyLink}>
          Salin tautan
        </Button>
      </Sheet>

      {/* ---------- Sheet ajukan review ---------- */}
      <Sheet open={reviewOpen} onClose={() => setReviewOpen(false)}>
        <h3 className="t-h3" style={{ marginBottom: 10 }}>
          Ajukan untuk ditinjau
        </h3>
        <div style={{ marginBottom: 12 }}>
          <Field label="Pilih reviewer">
            <select
              className="select"
              value={reviewer}
              onChange={(e) => setReviewer(e.target.value)}
            >
              <option>Kepala Sekolah — Ibu Sri Wahyuni</option>
              <option>Wakil Kurikulum — Pak Agus</option>
            </select>
          </Field>
        </div>
        <div style={{ marginBottom: 16 }}>
          <Field label="Catatan (opsional)">
            <textarea className="textarea" placeholder="Mohon ditinjau untuk minggu depan…" />
          </Field>
        </div>
        <Button block loading={submittingReview} onClick={() => void submitReview()}>
          Kirim pengajuan
        </Button>
      </Sheet>

      {/* ---------- Sheet aksi lainnya ---------- */}
      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)}>
        <h3 className="t-h3" style={{ marginBottom: 10 }}>
          Aksi dokumen
        </h3>
        <div className="stack" style={{ "--gap": "4px" } as CSSProperties}>
          <button
            className="btn btn-ghost block hide-desktop"
            style={ghostItem}
            onClick={() => {
              setMoreOpen(false);
              setExportOpen(true);
            }}
          >
            <Icon name="download" />
            Ekspor
          </button>
          <button
            className="btn btn-ghost block hide-desktop"
            style={ghostItem}
            onClick={() => {
              setMoreOpen(false);
              setShareOpen(true);
            }}
          >
            <Icon name="share" />
            Bagikan
          </button>
          {app.workspace !== null && (
            <button
              className="btn btn-ghost block hide-desktop"
              style={ghostItem}
              onClick={() => {
                setMoreOpen(false);
                setReviewOpen(true);
              }}
            >
              <Icon name="check" />
              Ajukan untuk ditinjau
            </button>
          )}
          <button className="btn btn-ghost block" style={ghostItem} onClick={duplicate}>
            <Icon name="copy" />
            Duplikat
          </button>
          <button
            className="btn btn-ghost block"
            style={{ ...ghostItem, color: "var(--error)" }}
            onClick={() => {
              setMoreOpen(false);
              setDeleteOpen(true);
            }}
          >
            <Icon name="x" />
            Hapus
          </button>
        </div>
      </Sheet>

      {/* ---------- Sheet konfirmasi hapus ---------- */}
      <Sheet open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <h3 className="t-h3" style={{ marginBottom: 8 }}>
          Hapus dokumen?
        </h3>
        <p className="muted t-body" style={{ marginBottom: 16 }}>
          “{doc.title}” akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
        </p>
        <div className="stack" style={{ "--gap": "8px" } as CSSProperties}>
          <Button variant="destructive" block onClick={confirmDelete}>
            Hapus
          </Button>
          <Button variant="secondary" block onClick={() => setDeleteOpen(false)}>
            Batal
          </Button>
        </div>
      </Sheet>

      {/* ---------- Sheet kredit tidak cukup ---------- */}
      <Sheet open={shortCost !== null} onClose={() => setShortCost(null)}>
        <h3 className="t-h3">Kredit tidak cukup</h3>
        <p className="muted" style={{ margin: "8px 0 16px" }}>
          Butuh {shortCost} kredit, saldomu {app.credits}.
        </p>
        <Link
          href="/app/kredit"
          className="btn btn-primary block"
          onClick={(e) => {
            guardNav(e);
            if (!e.defaultPrevented) setShortCost(null);
          }}
        >
          Isi ulang kredit
        </Link>
      </Sheet>
    </>
  );
}
