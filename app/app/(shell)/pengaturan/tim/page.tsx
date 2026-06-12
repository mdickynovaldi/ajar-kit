"use client";

/* AjarKit — Pengaturan / Tim (admin) (design.md §9.J, prd.md §8.8).
   Porting pane "Tim" dari Ajarkit/app-pengaturan.html:
   nama ruang, logo, kebijakan approval, kursi & langganan. */

import { useState } from "react";
import Link from "next/link";
import { Button, Field, Switch } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { MOCK_WORKSPACE } from "@/data/mock";
import { SettingsShell } from "../_components/settings-nav";

export default function PengaturanTimPage() {
  const toast = useToast();
  const [namaRuang, setNamaRuang] = useState(MOCK_WORKSPACE.nama);
  const [approval, setApproval] = useState(true);

  return (
    <SettingsShell>
      <section
        className="card pad-lg stack"
        style={{ "--gap": "16px" } as React.CSSProperties}
      >
        <h3 className="t-h3">Tim (Admin)</h3>

        <div className="row" style={{ gap: 14 }}>
          <span className="set-logo" aria-hidden="true">
            <Icon name="school" />
          </span>
          <div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => toast("Fitur ubah logo segera hadir")}
            >
              Ubah logo
            </Button>
          </div>
        </div>

        <Field label="Nama ruang">
          <input
            className="input"
            value={namaRuang}
            onChange={(e) => setNamaRuang(e.target.value)}
          />
        </Field>

        <div
          className="opt-row"
          style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}
        >
          <div>
            <strong className="strong" style={{ fontSize: 14 }}>
              Approval wajib
            </strong>
            <p className="t-small muted">
              Dokumen harus ditinjau admin sebelum final
            </p>
          </div>
          <Switch on={approval} onChange={setApproval} label="Approval wajib" />
        </div>

        <div className="row between">
          <div>
            <strong className="strong" style={{ fontSize: 14 }}>
              Kursi terpakai
            </strong>
            <p className="t-small muted">
              {MOCK_WORKSPACE.seatsUsed} dari {MOCK_WORKSPACE.seats} kursi
            </p>
          </div>
          <Link className="btn btn-secondary sm" href="/app/langganan">
            Kelola langganan tim
          </Link>
        </div>

        <div>
          <Button onClick={() => toast("Pengaturan tim disimpan")}>
            Simpan
          </Button>
        </div>
      </section>
    </SettingsShell>
  );
}
