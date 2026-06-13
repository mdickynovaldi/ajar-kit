/* AjarKit — DOCX Modul Ajar/RPP guru format resmi MONOKROM, meniru layout
   PDF rpp-pdf.tsx: kop instansi (logo + instansi induk + nama + alamat +
   garis ganda) → judul "MODUL AJAR (RPP)" → tabel identitas & informasi
   khusus bergaris penuh → section paragraf/butir → rincian kegiatan per
   pertemuan (tabel 4 kolom Tahap | Kegiatan Peserta Didik | Kegiatan Guru |
   Waktu) → DAFTAR PUSTAKA → blok tanda tangan. Khusus type modul_ajar;
   tipe dokumen lain tetap lewat jalur generic /api/export/docx. */

import "server-only";
import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import type {
  RppKegiatanPertemuan,
  RppPdfInput,
} from "../pdf/rpp-pdf";
import type { DocPdfInstansi, DocPdfTtd } from "../pdf/document-pdf";

/** Input ekspor DOCX RPP = input PDF RPP (payload sama, lihat rpp-pdf.tsx) */
export type RppDocxInput = RppPdfInput;

/* ----- palet monokrom dokumen resmi (tanpa "#" — konvensi docx) ----- */
const INK = "111111";
const FAINT = "555555";
const HEAD_BG = "EEEEEE";

const LIST_PREFIX = "- ";

/* ukuran font dlm half-point: 10pt → 20 dst. */
const SZ = {
  base: 20, // 10pt
  heading: 22, // 11pt
  judul: 26, // 13pt
  judulDok: 24, // 12pt
  namaInstansi: 28, // 14pt
  kecil: 18, // 9pt
  sel: 19, // 9.5pt
  selKegiatan: 17, // 8.5pt
} as const;

/* ----- border helpers ----- */
const THIN = { style: BorderStyle.SINGLE, size: 4, color: INK } as const;
const GRID_BORDERS = {
  top: THIN,
  bottom: THIN,
  left: THIN,
  right: THIN,
  insideHorizontal: THIN,
  insideVertical: THIN,
} as const;
const NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } as const;
const NO_BORDERS = {
  top: NONE,
  bottom: NONE,
  left: NONE,
  right: NONE,
  insideHorizontal: NONE,
  insideVertical: NONE,
} as const;
/* margin isi sel (twip) agar teks tidak menempel garis */
const CELL_MARGINS = { top: 57, bottom: 57, left: 85, right: 85 } as const;

/* lebar konten A4 dgn margin 2cm = 11906 − 2×1134 twip */
const CONTENT_W = 9638;
/* OOXML "pct" bersatuan 1/50 persen — rawan salah render; pakai twip (DXA) */
/** tblGrid eksplisit (twip) — tanpa ini library menulis gridCol 100 twip */
function grid(...cols: number[]): number[] {
  return cols.map((c) => Math.round((CONTENT_W * c) / 100));
}
function pct(size: number) {
  return { size: Math.round((CONTENT_W * size) / 100), type: WidthType.DXA } as const;
}

/* ----- logo kop: data-URL base64 → Buffer + tipe (cermin logoSrc pdf) ----- */
function parseLogo(
  dataUrl?: string,
): { data: Buffer; type: "png" | "jpg" } | null {
  const m = dataUrl?.match(/^data:image\/(png|jpe?g);base64,(.+)$/);
  if (!m) return null;
  return {
    data: Buffer.from(m[2], "base64"),
    type: m[1] === "png" ? "png" : "jpg",
  };
}

/* ----- KOP instansi: tabel [logo | teks center] + garis ganda ----- */
function kopChildren(inst?: DocPdfInstansi): (Paragraph | Table)[] {
  if (!inst?.nama) return [];

  const teks: Paragraph[] = [
    ...(inst.induk ?? "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map(
        (l) =>
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: l.toUpperCase(), bold: true, size: SZ.heading }),
            ],
          }),
      ),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: inst.nama.toUpperCase(),
          bold: true,
          size: SZ.namaInstansi,
        }),
      ],
    }),
  ];
  if (inst.alamat) {
    teks.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: inst.alamat, size: SZ.kecil })],
      }),
    );
  }
  if (inst.kontak) {
    teks.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: inst.kontak, size: SZ.kecil, color: FAINT }),
        ],
      }),
    );
  }

  const logo = parseLogo(inst.logoDataUrl);
  const out: (Paragraph | Table)[] = [];
  if (logo) {
    out.push(
      new Table({
        width: pct(100),
        columnWidths: grid(18, 82),
        borders: NO_BORDERS,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: pct(18),
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new ImageRun({
                        type: logo.type,
                        data: logo.data,
                        transformation: { width: 64, height: 64 },
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: pct(82),
                verticalAlign: VerticalAlign.CENTER,
                children: teks,
              }),
            ],
          }),
        ],
      }),
    );
  } else {
    out.push(...teks);
  }

  /* garis ganda penutup kop */
  out.push(
    new Paragraph({
      border: { bottom: { style: BorderStyle.DOUBLE, size: 12, color: INK } },
      spacing: { before: 80, after: 240 },
    }),
  );
  return out;
}

/* ----- judul tengah: "MODUL AJAR (RPP)" + meta + judul dokumen ----- */
function titleChildren(data: RppDocxInput): Paragraph[] {
  const out: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: "MODUL AJAR (RPP)", bold: true, size: SZ.judul }),
      ],
      spacing: { after: 40 },
    }),
  ];
  if (data.meta) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: data.meta, size: SZ.base })],
        spacing: { after: 60 },
      }),
    );
  }
  out.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: data.title, bold: true, size: SZ.judulDok }),
      ],
      spacing: { after: 240 },
    }),
  );
  return out;
}

/* ----- heading section uppercase ber-border-bottom tipis ----- */
function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: text.toUpperCase(), bold: true, size: SZ.heading }),
    ],
    border: { bottom: THIN },
    spacing: { before: 240, after: 120 },
  });
}

/* ----- tabel 2 kolom "Label : nilai" (identitas & informasi khusus) ----- */
function kvTable(blocks: string[]): Table {
  const rows = blocks.map((b) => {
    const text = b.startsWith(LIST_PREFIX) ? b.slice(LIST_PREFIX.length) : b;
    const sep = text.indexOf(": ");
    const label = sep === -1 ? "" : text.slice(0, sep);
    const value = sep === -1 ? text : text.slice(sep + 2);
    return new TableRow({
      children: label
        ? [
            new TableCell({
              width: pct(32),
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: label, bold: true, size: SZ.sel }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: pct(68),
              children: [
                new Paragraph({
                  children: [new TextRun({ text: value, size: SZ.sel })],
                }),
              ],
            }),
          ]
        : [
            new TableCell({
              columnSpan: 2,
              width: pct(100),
              children: [
                new Paragraph({
                  children: [new TextRun({ text: value, size: SZ.sel })],
                }),
              ],
            }),
          ],
    });
  });
  return new Table({
    width: pct(100),
    columnWidths: grid(32, 68),
    borders: GRID_BORDERS,
    margins: CELL_MARGINS,
    rows,
  });
}

/* ----- blok paragraf / butir ("- " → bullet) ----- */
function blockParagraphs(blocks: string[]): Paragraph[] {
  return blocks.map((b) =>
    b.startsWith(LIST_PREFIX)
      ? new Paragraph({
          children: [
            new TextRun({ text: b.slice(LIST_PREFIX.length), size: SZ.base }),
          ],
          bullet: { level: 0 },
          spacing: { after: 40 },
        })
      : new Paragraph({
          children: [new TextRun({ text: b, size: SZ.base })],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 80 },
        }),
  );
}

/* ----- butir • di dalam sel kegiatan siswa/guru ----- */
function cellList(items: string[]): Paragraph[] {
  if (items.length === 0) return [new Paragraph({})];
  return items.map(
    (t) =>
      new Paragraph({
        children: [
          new TextRun({
            text: `• ${t.startsWith(LIST_PREFIX) ? t.slice(LIST_PREFIX.length) : t}`,
            size: SZ.selKegiatan,
          }),
        ],
        spacing: { after: 30 },
      }),
  );
}

const KCOL = [
  { label: "Tahap", w: 13 },
  { label: "Kegiatan Peserta Didik", w: 37 },
  { label: "Kegiatan Guru", w: 37 },
  { label: "Waktu", w: 13 },
] as const;

/* ----- rincian kegiatan satu pertemuan: judul + tabel 4 kolom ----- */
function kegiatanChildren(p: RppKegiatanPertemuan): (Paragraph | Table)[] {
  const headerRow = new TableRow({
    tableHeader: true,
    children: KCOL.map(
      (c) =>
        new TableCell({
          width: pct(c.w),
          shading: { type: ShadingType.CLEAR, color: "auto", fill: HEAD_BG },
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: c.label, bold: true, size: SZ.kecil }),
              ],
            }),
          ],
        }),
    ),
  });
  const rows = p.tahap.map(
    (t) =>
      new TableRow({
        children: [
          new TableCell({
            width: pct(13),
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: t.tahap, bold: true, size: SZ.sel }),
                ],
              }),
            ],
          }),
          new TableCell({ width: pct(37), children: cellList(t.siswa) }),
          new TableCell({ width: pct(37), children: cellList(t.guru) }),
          new TableCell({
            width: pct(13),
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: t.waktu, size: SZ.sel })],
              }),
            ],
          }),
        ],
      }),
  );
  return [
    new Paragraph({
      children: [
        new TextRun({ text: p.pertemuan, bold: true, size: SZ.heading }),
      ],
      spacing: { before: 240, after: 20 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Alokasi waktu: ${p.alokasi}`, size: SZ.sel }),
      ],
      spacing: { after: 80 },
    }),
    new Table({
      width: pct(100),
      columnWidths: grid(13, 37, 37, 13),
      borders: GRID_BORDERS,
      margins: CELL_MARGINS,
      rows: [headerRow, ...rows],
    }),
  ];
}

/* ----- blok tanda tangan: kiri pimpinan ↔ kanan kota, tanggal, penyusun -----
   Dua kolom SELALU dirender; nama/NIP kosong → garis titik (cermin TtdBlock
   pdf/document-pdf.tsx). */
const TTD_NAMA_KOSONG = "(………………………………… )";
const TTD_NIP_KOSONG = "…………………………";

function ttdLine(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: SZ.base })],
    spacing: { after: 20 },
  });
}
function ttdNama(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text, bold: true, underline: {}, size: SZ.base }),
    ],
  });
}
function ttdNip(nip?: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `NIP. ${nip || TTD_NIP_KOSONG}`, size: SZ.kecil }),
    ],
    spacing: { before: 20 },
  });
}
/* 4 baris kosong utk ruang tanda tangan */
function ttdSpace(): Paragraph[] {
  return Array.from({ length: 4 }, () => new Paragraph({}));
}

function ttdTable(ttd: DocPdfTtd): Table {
  const left: Paragraph[] = [
    ttdLine("Mengetahui,"),
    ttdLine(ttd.pimpinanJabatan || "Kepala Sekolah"),
    ...ttdSpace(),
    ttd.pimpinanNama ? ttdNama(ttd.pimpinanNama) : ttdLine(TTD_NAMA_KOSONG),
    ttdNip(ttd.pimpinanNip),
  ];
  const right: Paragraph[] = [
    ttdLine(ttd.kota ? `${ttd.kota}, ${ttd.tanggal}` : ttd.tanggal),
    ttdLine(ttd.penyusunJabatan),
    ...ttdSpace(),
    ttd.penyusunNama ? ttdNama(ttd.penyusunNama) : ttdLine(TTD_NAMA_KOSONG),
    ttdNip(ttd.penyusunNip),
  ];
  return new Table({
    width: pct(100),
    columnWidths: grid(50, 50),
    borders: NO_BORDERS,
    rows: [
      new TableRow({
        children: [
          new TableCell({ width: pct(50), children: left }),
          new TableCell({ width: pct(50), children: right }),
        ],
      }),
    ],
  });
}

/* ----- susun seluruh isi dokumen (urutan = rpp-pdf.tsx) ----- */
/* Section "lampiran" apa pun (lampiran-lkpd, dll.) — diposisikan SETELAH
   tabel pertemuan & SEBELUM Daftar Pustaka (cermin rpp-pdf). */
function isLampiran(s: { id: string; title: string }): boolean {
  return s.id.startsWith("lampiran") || /^lampiran\b/i.test(s.title.trim());
}

function buildChildren(data: RppDocxInput): (Paragraph | Table)[] {
  const pustaka = data.sections.filter((s) => s.id === "pustaka");
  const lampiran = data.sections.filter(
    (s) => s.id !== "pustaka" && isLampiran(s),
  );
  const sections = data.sections.filter(
    (s) => s.id !== "pustaka" && !isLampiran(s),
  );

  const children: (Paragraph | Table)[] = [
    ...kopChildren(data.instansi),
    ...titleChildren(data),
  ];

  for (const sec of sections) {
    children.push(sectionHeading(sec.title));
    if (sec.id === "identitas" || sec.id === "informasi-khusus") {
      children.push(kvTable(sec.blocks));
    } else {
      children.push(...blockParagraphs(sec.blocks));
    }
  }

  for (const p of data.kegiatan ?? []) {
    children.push(...kegiatanChildren(p));
  }

  // lampiran → setelah pertemuan, sebelum daftar pustaka
  for (const sec of lampiran) {
    children.push(sectionHeading(sec.title));
    children.push(...blockParagraphs(sec.blocks));
  }

  for (const sec of pustaka) {
    children.push(sectionHeading("DAFTAR PUSTAKA"));
    children.push(...blockParagraphs(sec.blocks));
  }

  if (data.ttd) {
    children.push(new Paragraph({ spacing: { before: 360 } }));
    children.push(ttdTable(data.ttd));
  }

  return children;
}

/** Bangun .docx Modul Ajar/RPP guru — layout sama dgn renderRppPdf. */
export async function buildRppDocx(data: RppDocxInput): Promise<Buffer> {
  const doc = new Document({
    title: data.title,
    creator: "AjarKit",
    styles: {
      default: {
        document: { run: { font: "Arial", size: SZ.base, color: INK } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            /* A4 portrait, margin ±2cm (1134 twip) */
            size: { width: 11906, height: 16838 },
            margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
          },
        },
        children: buildChildren(data),
      },
    ],
  });
  return Packer.toBuffer(doc);
}
