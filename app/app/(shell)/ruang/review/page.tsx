"use client";

/* AjarKit — Review & Approval (/app/ruang/review).
   Porting Ajarkit/app-ruang-review.html · design.md §9.H.3 · prd.md §8.6.
   Antrean dari store.reviews (dual-mode). Keputusan via decideReview —
   store menyinkronkan status dokumen + notifikasi di kedua mode. */

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Avatar, Button, EmptyState, Field } from "@/components/ui/controls";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { useApp } from "@/lib/store";
import { DOC_TYPES } from "@/lib/constants";
import type { ReviewItem } from "@/lib/types";
import { Crumb, DosenEmptyState } from "../_components/shared";

type Tab = ReviewItem["status"];
type Decision = "disetujui" | "revisi";

const FALLBACK_PREVIEW =
  "Pratinjau dokumen: capaian pembelajaran, kegiatan inti berbasis PjBL, dan asesmen formatif-sumatif sudah tersusun. Komponen 6 dimensi Profil Pelajar Pancasila tercantum…";
/* mode Supabase: konten dokumen anggota lain tidak ikut dimuat */
const PREVIEW_UNAVAILABLE = "Pratinjau tidak tersedia.";

function dateLabel(r: ReviewItem, status: Tab): string {
  if (status === "disetujui") return `Disetujui ${r.tanggal}`;
  if (status === "revisi") return `Revisi diminta ${r.tanggal}`;
  return `Diajukan ${r.tanggal}`;
}

export default function ReviewPage() {
  const app = useApp();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("menunggu");
  const [busy, setBusy] = useState<{ id: string; act: Decision } | null>(null);
  const [detail, setDetail] = useState<ReviewItem | null>(null);
  const [comment, setComment] = useState("");

  const lists: Record<Tab, ReviewItem[]> = {
    menunggu: [],
    disetujui: [],
    revisi: [],
  };
  for (const r of app.reviews) lists[r.status].push(r);

  const openDetail = (r: ReviewItem) => {
    setDetail(r);
    setComment("");
  };

  const approve = async (r: ReviewItem, fromSheet: boolean) => {
    if (busy) return;
    setBusy({ id: r.id, act: "disetujui" });
    try {
      await app.decideReview(r.id, "disetujui");
      toast(fromSheet ? "Dokumen disetujui ✓" : "Disetujui ✓");
      if (fromSheet) setDetail(null);
    } catch {
      toast("Gagal menyetujui dokumen. Coba lagi, ya.", false);
    }
    setBusy(null);
  };

  const requestRevision = async (r: ReviewItem) => {
    if (busy) return;
    if (!comment.trim()) {
      toast("Tulis catatan untuk pembuat dulu", false);
      return;
    }
    setBusy({ id: r.id, act: "revisi" });
    try {
      await app.decideReview(r.id, "revisi", comment.trim());
      toast("Permintaan revisi dikirim", false);
      setDetail(null);
    } catch {
      toast("Gagal mengirim permintaan revisi. Coba lagi, ya.", false);
    }
    setBusy(null);
  };

  const list = lists[tab];
  const detailDoc = detail
    ? app.documents.find((d) => d.id === detail.documentId)
    : undefined;

  if (!app.workspace) return <DosenEmptyState />;

  return (
    <>
      <Crumb current="Review" />
      <h1 className="t-h1" style={{ marginBottom: 16 }}>
        Review &amp; Approval
      </h1>

      <div className="segmented" style={{ marginBottom: 20 }} role="tablist">
        <button
          role="tab"
          aria-selected={tab === "menunggu"}
          className={tab === "menunggu" ? "on" : ""}
          onClick={() => setTab("menunggu")}
        >
          Menunggu{" "}
          <span className="badge badge-review" style={{ marginLeft: 4 }}>
            {lists.menunggu.length}
          </span>
        </button>
        <button
          role="tab"
          aria-selected={tab === "disetujui"}
          className={tab === "disetujui" ? "on" : ""}
          onClick={() => setTab("disetujui")}
        >
          Disetujui
        </button>
        <button
          role="tab"
          aria-selected={tab === "revisi"}
          className={tab === "revisi" ? "on" : ""}
          onClick={() => setTab("revisi")}
        >
          Perlu Revisi
        </button>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon="checkCircle"
          title="Tidak ada yang perlu ditinjau 🎉"
          desc="Semua dokumen sudah diproses."
        />
      ) : (
        <div className="rev-grid">
          {list.map((r) => {
            const meta = DOC_TYPES[r.docType];
            const note = r.catatan;
            return (
              <div className="card rev-item hover" key={r.id}>
                <span className={`doc-ic ${meta.color}`} style={{ flex: "none" }}>
                  <Icon name={meta.icon} />
                </span>
                <div className="grow" style={{ minWidth: 0 }}>
                  {tab === "menunggu" ? (
                    <button
                      className="strong rev-title"
                      style={{
                        fontFamily: "inherit",
                        fontWeight: 600,
                        fontSize: 15,
                        background: "none",
                        border: 0,
                        padding: 0,
                        textAlign: "left",
                        color: "inherit",
                      }}
                      onClick={() => openDetail(r)}
                    >
                      {r.title}
                    </button>
                  ) : (
                    <div className="strong" style={{ fontWeight: 600, fontSize: 15 }}>
                      {r.title}
                    </div>
                  )}
                  <div className="who" style={{ marginTop: 4 }}>
                    <Avatar initials={r.initials} size="sm" />
                    <span className="t-small muted">
                      {r.pembuat} · {meta.shortLabel} · {dateLabel(r, tab)}
                    </span>
                  </div>
                  {tab === "revisi" && note && (
                    <p
                      className="t-small"
                      style={{ color: "var(--warning)", marginTop: 6 }}
                    >
                      Catatan: {note}
                    </p>
                  )}
                </div>
                {tab === "menunggu" ? (
                  <>
                    <div
                      className="row hide-mobile"
                      style={{ gap: 8, flex: "none" }}
                    >
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={busy !== null}
                        onClick={() => openDetail(r)}
                      >
                        Revisi
                      </Button>
                      <Button
                        size="sm"
                        loading={
                          busy !== null &&
                          busy.id === r.id &&
                          busy.act === "disetujui"
                        }
                        disabled={busy !== null}
                        onClick={() => void approve(r, false)}
                      >
                        Setujui
                      </Button>
                    </div>
                    <button
                      className="iconbtn hide-desktop"
                      aria-label={`Tinjau ${r.title}`}
                      onClick={() => openDetail(r)}
                    >
                      <Icon name="chevR" />
                    </button>
                  </>
                ) : (
                  <span
                    className={`badge ${
                      tab === "disetujui" ? "badge-disetujui" : "badge-revisi"
                    }`}
                    style={{ flex: "none" }}
                  >
                    {tab === "disetujui" ? "Disetujui" : "Perlu Revisi"}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Sheet detail review */}
      <Sheet open={detail !== null} onClose={() => setDetail(null)}>
        {detail && (
          <>
            <h3 className="t-h3" style={{ marginBottom: 4 }}>
              {detail.title}
            </h3>
            <p className="muted t-small" style={{ marginBottom: 14 }}>
              {DOC_TYPES[detail.docType].shortLabel} · oleh {detail.pembuat} ·
              Diajukan {detail.tanggal}
            </p>
            <div
              className="card pad"
              style={{
                background: "var(--surface-2)",
                border: "none",
                maxHeight: 180,
                overflow: "auto",
                marginBottom: 14,
              }}
            >
              {detailDoc?.content ? (
                detailDoc.content.sections.slice(0, 3).map((s) => (
                  <p
                    key={s.id}
                    className="t-small"
                    style={{ lineHeight: 1.6, marginBottom: 8 }}
                  >
                    <strong className="strong">{s.title}.</strong>{" "}
                    {s.blocks.join(" ")}
                  </p>
                ))
              ) : (
                <p className="t-small" style={{ lineHeight: 1.6 }}>
                  {app.mode === "supabase" ? PREVIEW_UNAVAILABLE : FALLBACK_PREVIEW}
                </p>
              )}
            </div>
            <Field label="Catatan untuk pembuat">
              <textarea
                className="textarea"
                placeholder="Tulis masukan…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </Field>
            <div className="row" style={{ gap: 8, marginTop: 14 }}>
              <Button
                variant="secondary"
                className="grow"
                loading={busy?.id === detail.id && busy?.act === "revisi"}
                disabled={busy !== null}
                onClick={() => void requestRevision(detail)}
              >
                Minta revisi
              </Button>
              <Button
                className="grow"
                iconLeft="check"
                loading={busy?.id === detail.id && busy?.act === "disetujui"}
                disabled={busy !== null}
                onClick={() => void approve(detail, true)}
              >
                Setujui
              </Button>
            </div>
          </>
        )}
      </Sheet>
    </>
  );
}
