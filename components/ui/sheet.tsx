"use client";

/* AjarKit — bottom sheet (mobile) / dialog (desktop), porting AK.openSheet.
   Pakai: <Sheet open={open} onClose={() => setOpen(false)}>…</Sheet> */

import { useEffect } from "react";
import { createPortal } from "react-dom";

export function Sheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="scrim"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="grip" />
        {children}
      </div>
    </div>,
    document.body,
  );
}
