"use client";

/* AjarKit — panel "Ringkasan" generator (desktop, porting aside
   app-modul-ajar.html): baris jenis/mapel/materi/komponen + estimasi biaya. */

export interface SummaryRow {
  label: string;
  value: string;
}

export function SummaryPanel({
  rows,
  cost,
  note,
}: {
  rows: SummaryRow[];
  cost: number;
  note?: string;
}) {
  return (
    <div className="card pad panel stack" style={{ "--gap": "14px" } as React.CSSProperties}>
      <h4 className="t-h4">Ringkasan</h4>
      <div className="stack" style={{ "--gap": "9px" } as React.CSSProperties}>
        {rows.map((r) => (
          <div className="row between" key={r.label}>
            <span className="t-small muted">{r.label}</span>
            <span className="t-small strong" style={{ textAlign: "right" }}>
              {r.value}
            </span>
          </div>
        ))}
      </div>
      <div
        className="row between"
        style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}
      >
        <span className="strong" style={{ fontWeight: 600 }}>
          Estimasi biaya
        </span>
        <span className="strong" style={{ fontWeight: 700 }}>
          <span style={{ color: "var(--accent-500)" }}>◈</span>{" "}
          <span className="num">{cost}</span>
        </span>
      </div>
      {note && <p className="t-small faint">{note}</p>}
    </div>
  );
}
