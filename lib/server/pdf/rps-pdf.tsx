/* AjarKit — PDF RPS DOSEN format resmi universitas (pola UM), A4 LANDSCAPE
   monokrom bergaris penuh: kop (logo + induk multi-baris + nama, uppercase
   bold) → judul "RENCANA PEMBELAJARAN SEMESTER (RPS)" → tabel identitas MK
   6 kolom + baris PENGESAHAN (Ketua KBK | Kaprodi | Ketua GKM, ruang ttd
   tinggi) → tabel Capaian Pembelajaran (SCPL/CPMK/Sub-CPMK) → tabel
   Deskripsi Isi MK / Sumber Rujukan / Dosen Pengampu / Matakuliah Prasyarat
   → MATRIKS 16 pertemuan 11 kolom header 2 tingkat → blok ttd.
   Khusus type rps; tipe dokumen lain tetap lewat jalur document-pdf. */

import "server-only";
import type { ReactNode } from "react";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { BrandMark, C } from "./shared";
import {
  TtdBlock,
  UPGRADE_NOTE,
  Watermark,
  logoSrc,
  type DocPdfInput,
  type DocPdfPertemuan,
} from "./document-pdf";

/* ----- tipe input (cermin RpsPertemuan di lib/types) ----- */
export interface RpsPdfPertemuan extends DocPdfPertemuan {
  kodeCpmk?: string;
  kriteria?: string[];
  offline?: string;
  sinkron?: string;
  asinkron?: string;
  media?: string;
  sumber?: string;
}
export interface RpsPdfInput extends Omit<DocPdfInput, "pertemuan"> {
  /** matriks 16 pertemuan dgn kolom resmi universitas */
  pertemuan?: RpsPdfPertemuan[];
}

/* ----- palet monokrom dokumen resmi ----- */
const INK = "#111111";
const LINE = "#333333";
const HEAD_BG = "#E9E9E9";
const FAINT = "#555555";

const s = StyleSheet.create({
  /* CATATAN: lineHeight sengaja TIDAK dipasang di page — pada react-pdf
     4.5.1, lineHeight yang diwariskan dari Page membuat semua elemen
     ber-prop `render` (nomor halaman footer) tidak dirender sama sekali.
     lineHeight dipasang per-style teks di bawah. */
  page: {
    paddingTop: 28,
    paddingBottom: 52,
    paddingHorizontal: 30,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: INK,
  },
  /* ----- kop ----- */
  kopWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 6,
  },
  kopLogo: { width: 52, height: 52, objectFit: "contain" },
  kopMid: { flex: 1, alignItems: "center" },
  kopLine: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: INK,
    textAlign: "center",
    textTransform: "uppercase",
  },
  judul: {
    fontSize: 11.5,
    fontFamily: "Helvetica-Bold",
    color: INK,
    textAlign: "center",
    textTransform: "uppercase",
    marginTop: 4,
    marginBottom: 2,
  },
  disclaimer: {
    fontSize: 7,
    color: FAINT,
    fontFamily: "Helvetica-Oblique",
    textAlign: "center",
    marginBottom: 8,
  },
  /* ----- grid bergaris penuh: container top+left, sel right+bottom ----- */
  grid: {
    borderTopWidth: 0.8,
    borderLeftWidth: 0.8,
    borderColor: LINE,
    marginBottom: 10,
  },
  row: { flexDirection: "row" },
  cell: {
    borderRightWidth: 0.8,
    borderBottomWidth: 0.8,
    borderColor: LINE,
    paddingVertical: 3,
    paddingHorizontal: 4,
    fontSize: 8,
    color: INK,
    lineHeight: 1.35,
  },
  bold: { fontFamily: "Helvetica-Bold" },
  center: { textAlign: "center" },
  head: { backgroundColor: HEAD_BG, fontFamily: "Helvetica-Bold" },
  /* sel berbentuk View (utk justifyContent / isi bertumpuk) */
  vCell: {
    borderRightWidth: 0.8,
    borderBottomWidth: 0.8,
    borderColor: LINE,
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  cellText: { fontSize: 8, color: INK, lineHeight: 1.35 },
  /* ----- pengesahan ----- */
  ttdSpace: { minHeight: 50, justifyContent: "flex-end" },
  /* ----- matriks (semua teks ≤8pt) ----- */
  mCellText: { fontSize: 7.5, color: INK, lineHeight: 1.3 },
  mHeadText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: INK,
    textAlign: "center",
  },
  mHCell: {
    borderRightWidth: 0.8,
    borderBottomWidth: 0.8,
    borderColor: LINE,
    backgroundColor: HEAD_BG,
    paddingVertical: 2,
    paddingHorizontal: 2,
    justifyContent: "center",
  },
  mCell: {
    borderRightWidth: 0.8,
    borderBottomWidth: 0.8,
    borderColor: LINE,
    paddingVertical: 2,
    paddingHorizontal: 3,
  },
  mNum: {
    borderRightWidth: 0.8,
    borderBottomWidth: 0.8,
    borderColor: LINE,
    backgroundColor: HEAD_BG,
    paddingVertical: 1,
    fontSize: 7,
    color: INK,
    textAlign: "center",
  },
  bulletRow: { flexDirection: "row", marginBottom: 1 },
  bulletDot: { width: 7, fontSize: 7.5, color: INK },
  bulletText: { flex: 1, fontSize: 7.5, color: INK, lineHeight: 1.3 },
  /* footer lokal: full-bleed absolute (pola Watermark) — Footer shared yang
     hanya memakai `bottom` tidak dirender react-pdf v4 pada halaman wrap. */
  footWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
    paddingBottom: 24,
    paddingHorizontal: 30,
  },
  footRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.6,
    borderTopColor: C.border,
    paddingTop: 6,
    fontSize: 7.5,
    color: C.faint,
  },
});

/** Footer bernomor halaman, tampil di SETIAP halaman (fixed full-bleed). */
function RpsFooter({ note }: { note?: string }) {
  return (
    <View style={s.footWrap} fixed>
      <View style={s.footRow}>
        <Text>AjarKit · Perangkat Ajar OS — Lanius Lab</Text>
        {!!note && <Text>{note}</Text>}
        {/* Text render butuh prop fixed sendiri agar terisi tiap halaman */}
        <Text
          fixed
          render={({ pageNumber, totalPages }) =>
            `Hal. ${pageNumber} / ${totalPages}`
          }
        />
      </View>
    </View>
  );
}

/* ===== util parsing blok "Label: nilai" ===== */

function clean(b: string): string {
  return b.startsWith("- ") ? b.slice(2) : b;
}

/** pecah tiap blok pada ":" pertama → pasangan [label, nilai] terurut */
function parseKv(blocks: string[]): [string, string][] {
  const pairs: [string, string][] = [];
  for (const b of blocks) {
    const text = clean(b);
    const sep = text.indexOf(":");
    if (sep === -1) continue;
    const label = text.slice(0, sep).trim();
    const value = text.slice(sep + 1).trim();
    if (label) pairs.push([label, value]);
  }
  return pairs;
}

/** nilai pertama yang labelnya memuat salah satu kata kunci */
function findVal(pairs: [string, string][], ...needles: string[]): string {
  for (const [label, value] of pairs) {
    const l = label.toLowerCase();
    if (needles.some((n) => l.includes(n))) return value;
  }
  return "";
}

/* ===== kop: logo kiri + baris uppercase bold tengah + judul RPS ===== */

function RpsKop({ data }: { data: RpsPdfInput }) {
  const inst = data.instansi;
  const logo = logoSrc(inst?.logoDataUrl);
  const lines = (inst?.induk ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (inst?.nama) lines.push(inst.nama);
  if (lines.length === 0) lines.push("AjarKit — Perangkat Ajar OS");
  return (
    <View>
      <View style={s.kopWrap}>
        {logo ? (
          // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image
          <Image src={logo} style={s.kopLogo} />
        ) : (
          <BrandMark size={48} />
        )}
        <View style={s.kopMid}>
          {lines.map((l, i) => (
            <Text key={i} style={s.kopLine}>
              {l}
            </Text>
          ))}
        </View>
        {/* penyeimbang kiri-kanan agar teks tengah presisi */}
        <View style={{ width: 52 }} />
      </View>
      <Text style={s.judul}>Rencana Pembelajaran Semester (RPS)</Text>
      <Text style={s.disclaimer}>
        Dibuat dengan AjarKit — periksa &amp; sesuaikan sebelum digunakan.
      </Text>
    </View>
  );
}

/* ===== tabel identitas MK 6 kolom + baris PENGESAHAN ===== */

const ID_COLS = [
  { label: "MATA KULIAH (MK)", needles: ["mata kuliah"], w: "22%" },
  { label: "KODE", needles: ["kode"], w: "12%" },
  { label: "Rumpun MK", needles: ["rumpun"], w: "16%" },
  { label: "BOBOT (sks)", needles: ["bobot"], w: "16%" },
  { label: "SEMESTER", needles: ["semester"], w: "12%" },
  { label: "Tgl Penyusunan", needles: ["tgl", "tanggal"], w: "22%" },
] as const;

const SIGNERS = [
  { label: "Ketua KBK", needles: ["kbk"] },
  { label: "Kaprodi", needles: ["kaprodi", "ketua program studi"] },
  { label: "Ketua GKM", needles: ["gkm"] },
] as const;

function IdentitasTable({
  identitas,
  pengesahan,
}: {
  identitas: [string, string][];
  pengesahan: [string, string][];
}) {
  return (
    <View style={s.grid}>
      <View style={s.row} wrap={false}>
        {ID_COLS.map((c) => (
          <Text key={c.label} style={[s.cell, s.head, s.center, { width: c.w }]}>
            {c.label}
          </Text>
        ))}
      </View>
      <View style={s.row} wrap={false}>
        {ID_COLS.map((c) => (
          <Text key={c.label} style={[s.cell, s.center, { width: c.w }]}>
            {findVal(identitas, ...c.needles) || "-"}
          </Text>
        ))}
      </View>
      <View style={s.row} wrap={false}>
        <View style={[s.vCell, { width: "16%", justifyContent: "center" }]}>
          <Text style={[s.cellText, s.bold, s.center]}>PENGESAHAN</Text>
        </View>
        {SIGNERS.map((sg) => {
          const nama = findVal(pengesahan, ...sg.needles);
          const kosong = !nama || /^\.+$/.test(nama);
          return (
            <View key={sg.label} style={{ width: "28%" }}>
              <Text style={[s.cell, s.head, s.center, { width: "100%" }]}>
                {sg.label}
              </Text>
              <View
                style={[s.vCell, s.ttdSpace, { width: "100%", flexGrow: 1 }]}
              >
                <Text style={[s.cellText, s.bold, s.center]}>
                  {kosong ? "(…………………………………)" : nama}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/* ===== tabel Capaian Pembelajaran: SCPL → CPMK → Sub-CPMK ===== */

const CAPAIAN_GROUPS = [
  {
    id: "cpl",
    header:
      "Standar Capaian Pembelajaran Lulusan (Standar CPL) yang Dibebankan pada Mata Kuliah",
  },
  { id: "cpmk", header: "Capaian Pembelajaran Mata Kuliah (CPMK)" },
  { id: "subcpmk", header: "Kemampuan akhir tiap tahapan belajar (Sub-CPMK)" },
] as const;

function splitKode(block: string): { kode: string; isi: string } {
  const text = clean(block);
  const sep = text.indexOf(":");
  if (sep === -1 || sep > 24) return { kode: "", isi: text };
  return { kode: text.slice(0, sep).trim(), isi: text.slice(sep + 1).trim() };
}

function CapaianTable({
  groups,
}: {
  groups: { header: string; blocks: string[] }[];
}) {
  if (groups.every((g) => g.blocks.length === 0)) return null;
  return (
    <View style={s.grid}>
      <View style={s.row}>
        {/* kolom kiri sempit ala rowspan */}
        <View style={[s.vCell, { width: "12%", justifyContent: "flex-start" }]}>
          <Text style={[s.cellText, s.bold]}>Capaian Pembelajaran</Text>
        </View>
        <View style={{ width: "88%" }}>
          {groups.map(
            (g) =>
              g.blocks.length > 0 && (
                <View key={g.header}>
                  <View style={s.row} wrap={false}>
                    <Text style={[s.cell, s.head, s.center, { width: "10%" }]}>
                      Kode
                    </Text>
                    <Text style={[s.cell, s.head, { width: "90%" }]}>
                      {g.header}
                    </Text>
                  </View>
                  {g.blocks.map((b, i) => {
                    const { kode, isi } = splitKode(b);
                    return (
                      <View style={s.row} key={i} wrap={false}>
                        <Text style={[s.cell, s.center, { width: "10%" }]}>
                          {kode || "-"}
                        </Text>
                        <Text style={[s.cell, { width: "90%" }]}>{isi}</Text>
                      </View>
                    );
                  })}
                </View>
              ),
          )}
        </View>
      </View>
    </View>
  );
}

/* ===== tabel Deskripsi Isi MK / Sumber Rujukan / Dosen / Prasyarat ===== */

function InfoTable({
  deskripsi,
  pustaka,
  dosen,
  prasyarat,
}: {
  deskripsi: string[];
  pustaka: string[];
  dosen: string;
  prasyarat: string;
}) {
  const rows: { label: string; body: ReactNode }[] = [
    {
      label: "Deskripsi Isi MK",
      body: deskripsi.length ? (
        deskripsi.map((p, i) => (
          <Text key={i} style={[s.cellText, { textAlign: "justify" }]}>
            {p}
          </Text>
        ))
      ) : (
        <Text style={s.cellText}>-</Text>
      ),
    },
    {
      label: "Sumber Rujukan",
      body: pustaka.length ? (
        pustaka.map((p, i) => (
          <Text key={i} style={[s.cellText, { marginBottom: 1 }]}>
            {`${i + 1}. ${p}`}
          </Text>
        ))
      ) : (
        <Text style={s.cellText}>-</Text>
      ),
    },
    { label: "Dosen Pengampu", body: <Text style={s.cellText}>{dosen || "-"}</Text> },
    {
      label: "Matakuliah Prasyarat",
      body: <Text style={s.cellText}>{prasyarat || "-"}</Text>,
    },
  ];
  return (
    <View style={s.grid}>
      {rows.map((r) => (
        <View style={s.row} key={r.label} wrap={false}>
          <View style={[s.vCell, { width: "18%" }]}>
            <Text style={[s.cellText, s.bold]}>{r.label}</Text>
          </View>
          <View style={[s.vCell, { width: "82%" }]}>{r.body}</View>
        </View>
      ))}
    </View>
  );
}

/* ===== MATRIKS 16 pertemuan — 11 kolom, header 2 tingkat ===== */

/* lebar kolom daun (%) sesuai SPEC: 4|6|5|17|4|9|17|8|17|6|7 = 100 */
const MW = [4, 6, 5, 17, 4, 9, 17, 8, 17, 6, 7] as const;
const pct = (n: number) => `${n}%`;
/** lebar sub-kolom relatif terhadap kolom gabungan induknya */
const sub = (n: number, total: number) => `${(n / total) * 100}%`;

function HCell({ w, children }: { w: string; children: string }) {
  return (
    <View style={[s.mHCell, { width: w }]}>
      <Text style={s.mHeadText}>{children}</Text>
    </View>
  );
}

function MatrixHeader() {
  return (
    <View fixed>
      <View style={s.row}>
        <HCell w={pct(MW[0])}>Pertemuan ke</HCell>
        <HCell w={pct(MW[1])}>Kode CPMK</HCell>
        <HCell w={pct(MW[2])}>Kode SUB CPMK</HCell>
        {/* Penilaian: 2 sub-kolom */}
        <View style={{ width: pct(MW[3] + MW[4]) }}>
          <HCell w="100%">Penilaian</HCell>
          <View style={[s.row, { flexGrow: 1 }]}>
            <HCell w={sub(MW[3], MW[3] + MW[4])}>Kriteria dan indikator</HCell>
            <HCell w={sub(MW[4], MW[3] + MW[4])}>Bobot (%)</HCell>
          </View>
        </View>
        <HCell w={pct(MW[5])}>Deskripsi Materi</HCell>
        {/* Pengalaman Belajar: 3 sub-kolom */}
        <View style={{ width: pct(MW[6] + MW[7] + MW[8]) }}>
          <HCell w="100%">Pengalaman Belajar dan Estimasi Waktu</HCell>
          <View style={[s.row, { flexGrow: 1 }]}>
            <HCell w={sub(MW[6], MW[6] + MW[7] + MW[8])}>Offline</HCell>
            <HCell w={sub(MW[7], MW[6] + MW[7] + MW[8])}>Sinkronus</HCell>
            <HCell w={sub(MW[8], MW[6] + MW[7] + MW[8])}>Asinkronus</HCell>
          </View>
        </View>
        <HCell w={pct(MW[9])}>Media belajar</HCell>
        <HCell w={pct(MW[10])}>Sumber Rujukan</HCell>
      </View>
      {/* baris nomor kolom (1)..(11) */}
      <View style={s.row}>
        {MW.map((w, i) => (
          <Text key={i} style={[s.mNum, { width: pct(w) }]}>
            ({i + 1})
          </Text>
        ))}
      </View>
    </View>
  );
}

function KriteriaList({ items }: { items: string[] }) {
  return (
    <>
      {items.map((t, i) => (
        <View style={s.bulletRow} key={i}>
          <Text style={s.bulletDot}>•</Text>
          <Text style={s.bulletText}>{clean(t)}</Text>
        </View>
      ))}
    </>
  );
}

function MatrixRow({ p }: { p: RpsPdfPertemuan }) {
  const kriteria =
    p.kriteria && p.kriteria.length > 0
      ? p.kriteria
      : p.indikator
        ? [p.indikator]
        : ["-"];
  const txt = (v?: string, fb = "-") => v || fb;
  return (
    <View style={s.row} wrap={false}>
      <View style={[s.mCell, { width: pct(MW[0]) }]}>
        <Text style={[s.mCellText, { textAlign: "center" }]}>{p.minggu}</Text>
      </View>
      <View style={[s.mCell, { width: pct(MW[1]) }]}>
        <Text style={[s.mCellText, { textAlign: "center" }]}>
          {txt(p.kodeCpmk)}
        </Text>
      </View>
      <View style={[s.mCell, { width: pct(MW[2]) }]}>
        <Text style={[s.mCellText, { textAlign: "center" }]}>
          {txt(p.subCpmk)}
        </Text>
      </View>
      <View style={[s.mCell, { width: pct(MW[3]) }]}>
        <KriteriaList items={kriteria} />
      </View>
      <View style={[s.mCell, { width: pct(MW[4]) }]}>
        <Text style={[s.mCellText, { textAlign: "center" }]}>{txt(p.bobot)}</Text>
      </View>
      <View style={[s.mCell, { width: pct(MW[5]) }]}>
        <Text style={s.mCellText}>{txt(p.materi)}</Text>
      </View>
      <View style={[s.mCell, { width: pct(MW[6]) }]}>
        <Text style={s.mCellText}>{txt(p.offline, p.metode || "-")}</Text>
      </View>
      <View style={[s.mCell, { width: pct(MW[7]) }]}>
        <Text style={s.mCellText}>{txt(p.sinkron)}</Text>
      </View>
      <View style={[s.mCell, { width: pct(MW[8]) }]}>
        <Text style={s.mCellText}>{txt(p.asinkron)}</Text>
      </View>
      <View style={[s.mCell, { width: pct(MW[9]) }]}>
        <Text style={[s.mCellText, { textAlign: "center" }]}>{txt(p.media)}</Text>
      </View>
      <View style={[s.mCell, { width: pct(MW[10]) }]}>
        <Text style={[s.mCellText, { textAlign: "center" }]}>{txt(p.sumber)}</Text>
      </View>
    </View>
  );
}

function MatrixTable({ rows }: { rows: RpsPdfPertemuan[] }) {
  return (
    <View style={s.grid}>
      <MatrixHeader />
      {rows.map((p, i) => (
        <MatrixRow p={p} key={i} />
      ))}
    </View>
  );
}

/* ===== dokumen ===== */

export function RpsPdf({ data }: { data: RpsPdfInput }) {
  const sec = (id: string) => data.sections.find((x) => x.id === id);
  const identitas = parseKv(sec("identitas-mk")?.blocks ?? []);
  const pengesahan = parseKv(sec("pengesahan")?.blocks ?? []);
  const capaian = CAPAIAN_GROUPS.map((g) => ({
    header: g.header,
    blocks: (sec(g.id)?.blocks ?? []).filter(Boolean),
  }));
  const deskripsi = (sec("deskripsi")?.blocks ?? []).map(clean).filter(Boolean);
  const pustaka = (sec("pustaka")?.blocks ?? []).map(clean).filter(Boolean);
  const dosen = findVal(identitas, "dosen");
  const prasyarat = findVal(identitas, "prasyarat");
  /* section selain yang sudah dipetakan tetap tampil sbg blok teks biasa */
  const KNOWN = new Set([
    "identitas-mk",
    "pengesahan",
    "cpl",
    "cpmk",
    "subcpmk",
    "deskripsi",
    "pustaka",
  ]);
  const sisa = data.sections.filter((x) => !KNOWN.has(x.id));

  return (
    <Document title={data.title} author="AjarKit">
      <Page size="A4" orientation="landscape" style={s.page}>
        {data.watermark && <Watermark />}
        {/* fixed dirender SEBELUM konten agar muncul di SETIAP halaman */}
        <RpsFooter note={data.watermark ? UPGRADE_NOTE : undefined} />
        <RpsKop data={data} />

        <IdentitasTable identitas={identitas} pengesahan={pengesahan} />
        <CapaianTable groups={capaian} />
        <InfoTable
          deskripsi={deskripsi}
          pustaka={pustaka}
          dosen={dosen}
          prasyarat={prasyarat}
        />

        {sisa.map((x) => (
          <View key={x.id} style={{ marginBottom: 10 }} wrap={false}>
            <Text style={[s.cellText, s.bold, { marginBottom: 2 }]}>
              {x.title}
            </Text>
            {x.blocks.map((b, i) => (
              <Text key={i} style={s.cellText}>
                {clean(b)}
              </Text>
            ))}
          </View>
        ))}

        {data.pertemuan && data.pertemuan.length > 0 && (
          <MatrixTable rows={data.pertemuan} />
        )}

        {data.ttd && <TtdBlock ttd={data.ttd} />}
      </Page>
    </Document>
  );
}

export function renderRpsPdf(data: RpsPdfInput): Promise<Uint8Array> {
  return renderToBuffer(<RpsPdf data={data} />) as Promise<Uint8Array>;
}
