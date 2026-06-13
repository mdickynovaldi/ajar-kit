/* AjarKit — PDF Modul Ajar/RPP guru format resmi MONOKROM, meniru dokumen
   contoh sekolah: kop instansi (reuse Header document-pdf) → judul
   "MODUL AJAR (RPP)" → tabel identitas & informasi khusus bergaris penuh →
   section paragraf/butir → rincian kegiatan per pertemuan (tabel 4 kolom
   Tahap | Kegiatan Peserta Didik | Kegiatan Guru | Waktu) → DAFTAR PUSTAKA →
   blok tanda tangan (reuse TtdBlock). Khusus type modul_ajar; tipe dokumen
   lain tetap lewat jalur generic document-pdf. */

import "server-only";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { Footer } from "./shared";
import {
  Header,
  TtdBlock,
  UPGRADE_NOTE,
  Watermark,
  type DocPdfInput,
  type DocPdfSection,
} from "./document-pdf";

/* ----- tipe input (cermin KegiatanTahap/KegiatanPertemuan di lib/types) ----- */
export interface RppKegiatanTahap {
  tahap: string;
  siswa: string[];
  guru: string[];
  waktu: string;
}
export interface RppKegiatanPertemuan {
  pertemuan: string;
  alokasi: string;
  tahap: RppKegiatanTahap[];
}
export interface RppPdfInput extends DocPdfInput {
  /** rincian kegiatan per pertemuan (khusus Modul Ajar/RPP guru) */
  kegiatan?: RppKegiatanPertemuan[];
}

/* ----- palet monokrom dokumen resmi ----- */
const INK = "#111111";
const LINE = "#333333";
const HEAD_BG = "#E9E9E9";
const FAINT = "#555555";

const r = StyleSheet.create({
  /* CATATAN: lineHeight sengaja TIDAK dipasang di page — pada react-pdf
     4.5.1, lineHeight yang diwariskan dari Page membuat semua elemen
     ber-prop `render` (nomor halaman footer) tidak dirender sama sekali.
     lineHeight dipasang per-style teks di bawah (pola rps-pdf). */
  page: {
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 44,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: INK,
  },
  title: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: INK,
    textAlign: "center",
    marginBottom: 2,
    lineHeight: 1.45,
  },
  disclaimer: {
    fontSize: 8,
    color: FAINT,
    fontFamily: "Helvetica-Oblique",
    textAlign: "center",
    marginBottom: 14,
    lineHeight: 1.45,
  },
  section: { marginBottom: 12 },
  secTitle: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: INK,
    textTransform: "uppercase",
    paddingBottom: 2,
    marginBottom: 5,
    borderBottomWidth: 0.8,
    borderBottomColor: INK,
    lineHeight: 1.45,
  },
  para: { marginBottom: 4, textAlign: "justify", lineHeight: 1.45 },
  bulletRow: { flexDirection: "row", marginBottom: 2, paddingLeft: 2 },
  bulletDot: { width: 10, color: INK, lineHeight: 1.45 },
  bulletText: { flex: 1, textAlign: "justify", lineHeight: 1.45 },
  /* tabel bergaris penuh: container top+left, sel right+bottom → grid tanpa dobel */
  grid: { borderTopWidth: 0.8, borderLeftWidth: 0.8, borderColor: LINE, marginTop: 2 },
  gRow: { flexDirection: "row" },
  gCell: {
    borderRightWidth: 0.8,
    borderBottomWidth: 0.8,
    borderColor: LINE,
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: 9.5,
    color: INK,
    lineHeight: 1.45,
  },
  gLabel: { fontFamily: "Helvetica-Bold" },
  gHead: {
    backgroundColor: HEAD_BG,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    textAlign: "center",
  },
  kegTitle: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: INK, lineHeight: 1.45 },
  kegAlokasi: { fontSize: 9.5, color: INK, marginBottom: 3, lineHeight: 1.45 },
  kCellList: { flexDirection: "column" },
  kItemRow: { flexDirection: "row", marginBottom: 2 },
  kDot: { width: 9, fontSize: 8.5, color: INK, lineHeight: 1.45 },
  kText: { flex: 1, fontSize: 8.5, color: INK, lineHeight: 1.45 },
});

/* ----- blok paragraf / butir • monokrom ----- */
function MonoBlocks({ blocks }: { blocks: string[] }) {
  return (
    <>
      {blocks.map((b, i) =>
        b.startsWith("- ") ? (
          <View style={r.bulletRow} key={i}>
            <Text style={r.bulletDot}>•</Text>
            <Text style={r.bulletText}>{b.slice(2)}</Text>
          </View>
        ) : (
          <Text style={r.para} key={i}>
            {b}
          </Text>
        ),
      )}
    </>
  );
}

/* ----- tabel 2 kolom "Label : nilai" (identitas & informasi khusus) ----- */
function KvTable({ blocks }: { blocks: string[] }) {
  return (
    <View style={r.grid}>
      {blocks.map((b, i) => {
        const text = b.startsWith("- ") ? b.slice(2) : b;
        const sep = text.indexOf(": ");
        const label = sep === -1 ? "" : text.slice(0, sep);
        const value = sep === -1 ? text : text.slice(sep + 2);
        return (
          <View style={r.gRow} key={i} wrap={false}>
            {label ? (
              <>
                <Text style={[r.gCell, r.gLabel, { width: "32%" }]}>{label}</Text>
                <Text style={[r.gCell, { width: "68%" }]}>{value}</Text>
              </>
            ) : (
              <Text style={[r.gCell, { width: "100%" }]}>{value}</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

/* ----- butir • di dalam sel kegiatan siswa/guru ----- */
function CellList({ items }: { items: string[] }) {
  return (
    <View style={r.kCellList}>
      {items.map((t, i) => (
        <View style={r.kItemRow} key={i}>
          <Text style={r.kDot}>•</Text>
          <Text style={r.kText}>{t.startsWith("- ") ? t.slice(2) : t}</Text>
        </View>
      ))}
    </View>
  );
}

const KCOL = [
  { label: "Tahap", w: "13%" },
  { label: "Kegiatan Peserta Didik", w: "37%" },
  { label: "Kegiatan Guru", w: "37%" },
  { label: "Waktu", w: "13%" },
] as const;

/* ----- rincian kegiatan satu pertemuan: judul + tabel 4 kolom ----- */
function KegiatanTable({ p }: { p: RppKegiatanPertemuan }) {
  return (
    <View style={r.section}>
      <Text style={r.kegTitle}>{p.pertemuan}</Text>
      <Text style={r.kegAlokasi}>Alokasi waktu: {p.alokasi}</Text>
      <View style={r.grid}>
        <View style={r.gRow} wrap={false}>
          {KCOL.map((c) => (
            <Text key={c.label} style={[r.gCell, r.gHead, { width: c.w }]}>
              {c.label}
            </Text>
          ))}
        </View>
        {p.tahap.map((t, i) => (
          <View style={r.gRow} key={i} wrap={false}>
            <Text style={[r.gCell, r.gLabel, { width: "13%" }]}>{t.tahap}</Text>
            <View style={[r.gCell, { width: "37%" }]}>
              <CellList items={t.siswa} />
            </View>
            <View style={[r.gCell, { width: "37%" }]}>
              <CellList items={t.guru} />
            </View>
            <Text style={[r.gCell, { width: "13%", textAlign: "center" }]}>
              {t.waktu}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function RppSection({ sec }: { sec: DocPdfSection }) {
  const asTable = sec.id === "identitas" || sec.id === "informasi-khusus";
  return (
    <View style={r.section} wrap={!asTable ? false : undefined}>
      <Text style={r.secTitle}>
        {sec.id === "pustaka" ? "DAFTAR PUSTAKA" : sec.title}
      </Text>
      {asTable ? <KvTable blocks={sec.blocks} /> : <MonoBlocks blocks={sec.blocks} />}
    </View>
  );
}

/* Section "lampiran" apa pun (lampiran-lkpd, lampiran-materi, dll.) — id
   berawalan "lampiran" atau judul diawali "Lampiran". Diposisikan SETELAH
   tabel pertemuan & SEBELUM Daftar Pustaka. */
function isLampiran(s: DocPdfSection): boolean {
  return s.id.startsWith("lampiran") || /^lampiran\b/i.test(s.title.trim());
}

export function RppPdf({ data }: { data: RppPdfInput }) {
  const pustaka = data.sections.filter((s) => s.id === "pustaka");
  const lampiran = data.sections.filter(
    (s) => s.id !== "pustaka" && isLampiran(s),
  );
  const sections = data.sections.filter(
    (s) => s.id !== "pustaka" && !isLampiran(s),
  );
  return (
    <Document title={data.title} author="AjarKit">
      <Page size="A4" orientation="portrait" style={r.page}>
        {data.watermark && <Watermark lineHeight={1.45} />}
        {/* fixed dirender SEBELUM konten agar muncul di SETIAP halaman */}
        <Footer note={data.watermark ? UPGRADE_NOTE : undefined} />
        <Header data={{ ...data, typeLabel: "MODUL AJAR (RPP)" }} />

        <Text style={r.title}>{data.title}</Text>
        <Text style={r.disclaimer}>
          Dibuat dengan AjarKit — periksa &amp; sesuaikan sebelum digunakan.
        </Text>

        {sections.map((s) => (
          <RppSection sec={s} key={s.id} />
        ))}

        {(data.kegiatan ?? []).map((p, i) => (
          <KegiatanTable p={p} key={i} />
        ))}

        {/* lampiran → setelah pertemuan, sebelum daftar pustaka */}
        {lampiran.map((s) => (
          <RppSection sec={s} key={s.id} />
        ))}

        {pustaka.map((s) => (
          <RppSection sec={s} key={s.id} />
        ))}

        {data.ttd && <TtdBlock ttd={data.ttd} lineHeight={1.45} />}
      </Page>
    </Document>
  );
}

export function renderRppPdf(data: RppPdfInput): Promise<Uint8Array> {
  return renderToBuffer(<RppPdf data={data} />) as Promise<Uint8Array>;
}
