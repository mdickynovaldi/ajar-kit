"use client";

/* AjarKit — Pusat Notifikasi (design.md §9.K, prd.md §8.8).
   Porting Ajarkit/app-notifikasi.html: daftar dari store.notifications,
   tandai dibaca + navigasi sesuai jenis, filter chip, empty state. */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Chip,
  EmptyState,
  Skeleton,
} from "@/components/ui/controls";
import { Icon, type IconName } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { useApp } from "@/lib/store";
import type { AppNotification } from "@/lib/types";

type FilterVal = "" | "unread" | AppNotification["type"];

const FILTERS: { value: FilterVal; label: string }[] = [
  { value: "", label: "Semua" },
  { value: "unread", label: "Belum dibaca" },
  { value: "dokumen", label: "Dokumen" },
  { value: "review", label: "Review" },
  { value: "kredit", label: "Kredit" },
  { value: "langganan", label: "Langganan" },
];

function metaFor(n: AppNotification): {
  icon: IconName;
  color: string;
  href: string | null;
} {
  switch (n.type) {
    case "dokumen":
      return { icon: "sparkles", color: "ic-blue", href: "/app/dokumen" };
    case "review":
      return n.title.toLowerCase().includes("revisi")
        ? { icon: "edit", color: "ic-amber", href: "/app/ruang/review" }
        : { icon: "checkCircle", color: "ic-green", href: "/app/ruang/review" };
    case "kredit":
      return { icon: "wallet", color: "ic-amber", href: "/app/kredit" };
    case "langganan":
      return { icon: "clock", color: "ic-purple", href: "/app/kredit" };
    default:
      return { icon: "bell", color: "ic-blue", href: null };
  }
}

export default function NotifikasiPage() {
  const app = useApp();
  const toast = useToast();
  const router = useRouter();
  const [filter, setFilter] = useState<FilterVal>("");

  const list = useMemo(() => {
    if (filter === "unread") return app.notifications.filter((n) => !n.read);
    if (filter) return app.notifications.filter((n) => n.type === filter);
    return app.notifications;
  }, [app.notifications, filter]);

  function open(n: AppNotification) {
    app.markNotificationRead(n.id);
    const { href } = metaFor(n);
    if (href) router.push(href);
  }

  function readAll() {
    app.markAllNotificationsRead();
    toast("Semua ditandai dibaca");
  }

  return (
    <>
      <div
        className="row between"
        style={{ marginBottom: 16, flexWrap: "wrap", gap: 10 }}
      >
        <div>
          <h1 className="t-h1">Notifikasi</h1>
          <p className="muted t-small">{app.unreadCount} belum dibaca</p>
        </div>
        <Button variant="secondary" iconLeft="check" onClick={readAll}>
          Tandai semua dibaca
        </Button>
      </div>

      <div
        className="row wrap"
        style={{ gap: 8, marginBottom: 16 }}
        role="group"
        aria-label="Filter notifikasi"
      >
        {FILTERS.map((f) => (
          <Chip
            key={f.value || "semua"}
            on={filter === f.value}
            onToggle={() => setFilter(f.value)}
          >
            {f.label}
          </Chip>
        ))}
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        {!app.hydrated ? (
          <div className="stack" style={{ padding: 16 }}>
            <Skeleton height={48} />
            <Skeleton height={48} />
            <Skeleton height={48} />
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            icon="bell"
            title="Belum ada notifikasi"
            desc="Kabar terbaru akan muncul di sini."
          />
        ) : (
          list.map((n) => {
            const meta = metaFor(n);
            return (
              <button
                key={n.id}
                type="button"
                className={`nitem${n.read ? "" : " unread"}`}
                onClick={() => open(n)}
              >
                <span className={`ni ${meta.color}`}>
                  <Icon name={meta.icon} />
                </span>
                <div className="grow">
                  <div
                    className="strong"
                    style={{ fontWeight: 600, fontSize: 14 }}
                  >
                    {n.title}
                  </div>
                  <p className="t-small muted" style={{ marginTop: 2 }}>
                    {n.body}
                  </p>
                  <span className="t-small faint">{n.timeLabel}</span>
                </div>
                {!n.read && <span className="udot" aria-label="Belum dibaca" />}
              </button>
            );
          })
        )}
      </div>
    </>
  );
}
