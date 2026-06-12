/* AjarKit — POST /api/export/docx (prd.md §8.4, ekspor dokumen).
   Transformasi JSON → .docx memakai paket "docx". Konvensi konten mengikuti
   editor: blok berawalan "- " adalah butir list. body { template: "rpp",
   …payload sama dgn PDF } → layout resmi Modul Ajar/RPP guru
   (lib/server/docx/rpp-docx); tanpa template → jalur generik.

   Kebijakan paket DITEGAKKAN DI SERVER (prd.md: DOCX khusus Pro/School):
   Supabase terkonfigurasi → wajib Bearer token (tanpa token → 401), plan
   dibaca dari profiles.plan; mode mock → free. Plan free → 403
   UPGRADE_DIPERLUKAN untuk SEMUA jalur. Jangan percaya body klien. */

import { NextResponse } from "next/server";
import { resolvePlanFromRequest } from "@/lib/server/plan";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { buildRppDocx, type RppDocxInput } from "@/lib/server/docx/rpp-docx";
import type {
  RppKegiatanPertemuan,
  RppKegiatanTahap,
} from "@/lib/server/pdf/rpp-pdf";

interface ExportSection {
  id: string;
  title: string;
  blocks: string[];
}

interface ExportPertemuan {
  minggu: number;
  subCpmk: string;
  materi: string;
  metode: string;
  indikator: string;
  bobot: string;
}

interface ExportBody {
  title: string;
  typeLabel: string;
  meta: string;
  content: {
    sections: ExportSection[];
    pertemuan?: ExportPertemuan[];
  };
}

const LIST_PREFIX = "- ";
/* Abu-abu lembut utk baris meta & catatan kaki */
const MUTED = "6B7280";

/* ---------- validasi body ---------- */

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function isSection(v: unknown): v is ExportSection {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.id === "string" &&
    typeof s.title === "string" &&
    isStringArray(s.blocks)
  );
}

function isPertemuan(v: unknown): v is ExportPertemuan {
  if (!v || typeof v !== "object") return false;
  const p = v as Record<string, unknown>;
  return (
    typeof p.minggu === "number" &&
    typeof p.subCpmk === "string" &&
    typeof p.materi === "string" &&
    typeof p.metode === "string" &&
    typeof p.indikator === "string" &&
    typeof p.bobot === "string"
  );
}

function parseBody(v: unknown): ExportBody | null {
  if (!v || typeof v !== "object") return null;
  const b = v as Record<string, unknown>;
  if (typeof b.title !== "string" || !b.title.trim()) return null;
  if (typeof b.typeLabel !== "string" || typeof b.meta !== "string") return null;
  if (!b.content || typeof b.content !== "object") return null;
  const content = b.content as Record<string, unknown>;
  if (!Array.isArray(content.sections) || !content.sections.every(isSection)) {
    return null;
  }
  if (
    content.pertemuan !== undefined &&
    (!Array.isArray(content.pertemuan) || !content.pertemuan.every(isPertemuan))
  ) {
    return null;
  }
  return b as unknown as ExportBody;
}

/* ---------- validasi body template "rpp" (payload sama dgn /api/export/pdf) ---------- */

function isKegiatanTahap(v: unknown): v is RppKegiatanTahap {
  if (!v || typeof v !== "object") return false;
  const t = v as Record<string, unknown>;
  return (
    typeof t.tahap === "string" &&
    isStringArray(t.siswa) &&
    isStringArray(t.guru) &&
    typeof t.waktu === "string"
  );
}

function isKegiatanPertemuan(v: unknown): v is RppKegiatanPertemuan {
  if (!v || typeof v !== "object") return false;
  const p = v as Record<string, unknown>;
  return (
    typeof p.pertemuan === "string" &&
    typeof p.alokasi === "string" &&
    Array.isArray(p.tahap) &&
    p.tahap.every(isKegiatanTahap)
  );
}

function parseRppBody(v: unknown): RppDocxInput | null {
  if (!v || typeof v !== "object") return null;
  const b = v as Record<string, unknown>;
  if (typeof b.title !== "string" || !b.title.trim()) return null;
  if (!Array.isArray(b.sections) || !b.sections.every(isSection)) return null;
  if (
    b.kegiatan !== undefined &&
    (!Array.isArray(b.kegiatan) || !b.kegiatan.every(isKegiatanPertemuan))
  ) {
    return null;
  }
  const instansi =
    b.instansi && typeof b.instansi === "object"
      ? ({ ...b.instansi } as RppDocxInput["instansi"])
      : undefined;
  const ttdRaw =
    b.ttd && typeof b.ttd === "object"
      ? (b.ttd as Record<string, unknown>)
      : undefined;
  const ttd =
    ttdRaw &&
    typeof ttdRaw.tanggal === "string" &&
    typeof ttdRaw.penyusunJabatan === "string" &&
    typeof ttdRaw.penyusunNama === "string"
      ? (ttdRaw as unknown as NonNullable<RppDocxInput["ttd"]>)
      : undefined;

  const data: RppDocxInput = {
    title: b.title,
    typeLabel: typeof b.typeLabel === "string" ? b.typeLabel : "Modul Ajar",
    meta: typeof b.meta === "string" ? b.meta : "",
    sections: b.sections,
    kegiatan: b.kegiatan as RppKegiatanPertemuan[] | undefined,
    instansi,
    ttd,
  };
  // logo wajib data-URL gambar & tidak kebesaran (≤ ~500KB) — cermin /api/export/pdf
  const logo = data.instansi?.logoDataUrl;
  if (
    logo &&
    (!/^data:image\/(png|jpe?g);base64,/.test(logo) || logo.length > 700_000)
  ) {
    data.instansi = { ...data.instansi, logoDataUrl: undefined };
  }
  return data;
}

/* Nama berkas aman dari judul, mis. "RPP Fotosintesis Kelas 7.docx" */
function sanitizeFilename(title: string): string {
  const base = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return `${base || "dokumen"}.docx`;
}

/* ---------- penyusunan dokumen ---------- */

const RPS_HEADERS = [
  "Minggu",
  "Sub-CPMK",
  "Materi",
  "Metode",
  "Indikator",
  "Bobot",
] as const;

function buildChildren(body: ExportBody): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      text: body.title,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `${body.typeLabel} · ${body.meta}`,
          italics: true,
          color: MUTED,
        }),
      ],
      spacing: { after: 280 },
    }),
  ];

  for (const sec of body.content.sections) {
    children.push(
      new Paragraph({
        text: sec.title,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 280, after: 120 },
      }),
    );
    for (const block of sec.blocks) {
      if (block.startsWith(LIST_PREFIX)) {
        children.push(
          new Paragraph({
            text: block.slice(LIST_PREFIX.length),
            bullet: { level: 0 },
            spacing: { after: 60 },
          }),
        );
      } else {
        children.push(new Paragraph({ text: block, spacing: { after: 120 } }));
      }
    }
  }

  const pertemuan = body.content.pertemuan;
  if (pertemuan && pertemuan.length > 0) {
    children.push(
      new Paragraph({
        text: "Rencana 16 Pertemuan",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 280, after: 120 },
      }),
    );
    const headerRow = new TableRow({
      tableHeader: true,
      children: RPS_HEADERS.map(
        (h) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: h, bold: true })],
              }),
            ],
          }),
      ),
    });
    const rows = pertemuan.map(
      (p) =>
        new TableRow({
          children: [
            String(p.minggu),
            p.subCpmk,
            p.materi,
            p.metode,
            p.indikator,
            p.bobot,
          ].map(
            (text, i) =>
              new TableCell({
                children: [
                  new Paragraph({
                    text,
                    alignment:
                      i === 0 ? AlignmentType.CENTER : AlignmentType.LEFT,
                  }),
                ],
              }),
          ),
        }),
    );
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [headerRow, ...rows],
      }),
    );
  }

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Dibuat dengan AjarKit — periksa & sesuaikan sebelum digunakan.",
          italics: true,
          color: MUTED,
        }),
      ],
      spacing: { before: 400 },
    }),
  );

  return children;
}

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function POST(req: Request) {
  const planRes = await resolvePlanFromRequest(req);
  if (!planRes.ok) {
    return NextResponse.json(
      { error: planRes.error },
      { status: planRes.status },
    );
  }
  // DOCX khusus paket berbayar — blokir SEMUA jalur (template rpp & generik)
  if (planRes.plan === "free") {
    return NextResponse.json({ error: "UPGRADE_DIPERLUKAN" }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "BODY_TIDAK_VALID" }, { status: 400 });
  }

  /* Modul Ajar/RPP guru → layout resmi (kop, tabel bergaris, ttd) */
  if (
    raw &&
    typeof raw === "object" &&
    (raw as Record<string, unknown>).template === "rpp"
  ) {
    const data = parseRppBody(raw);
    if (!data) {
      return NextResponse.json({ error: "BODY_TIDAK_VALID" }, { status: 400 });
    }
    let buffer: Buffer;
    try {
      buffer = await buildRppDocx(data);
    } catch (e) {
      console.error("AjarKit: render DOCX RPP gagal", e);
      return NextResponse.json({ error: "RENDER_GAGAL" }, { status: 500 });
    }
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": DOCX_MIME,
        "Content-Disposition": `attachment; filename="${sanitizeFilename(data.title)}"`,
      },
    });
  }

  const body = parseBody(raw);
  if (!body) {
    return NextResponse.json({ error: "BODY_TIDAK_VALID" }, { status: 400 });
  }

  const doc = new Document({
    sections: [{ children: buildChildren(body) }],
  });
  const buffer = await Packer.toBuffer(doc);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": DOCX_MIME,
      "Content-Disposition": `attachment; filename="${sanitizeFilename(body.title)}"`,
    },
  });
}
