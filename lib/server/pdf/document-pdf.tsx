/* AjarKit — PDF dokumen ajar (ATP/RPP/Modul Ajar/RPS/…) format resmi.
   Mengikuti pola dokumen contoh pengguna: KOP instansi (logo + instansi induk
   + nama + alamat + garis ganda) → judul → identitas/isi → (RPS: matriks
   pertemuan, landscape) → blok TANDA TANGAN (Mengetahui pimpinan ↔ kota,
   tanggal, penyusun + NIP). Tanpa profil instansi → header AjarKit. */

import "server-only";
import {
  Document,
  Image,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { BrandMark, Footer, styles, C } from "./shared";

export interface DocPdfSection {
  id: string;
  title: string;
  blocks: string[];
}
export interface DocPdfPertemuan {
  minggu: number;
  subCpmk: string;
  materi: string;
  metode: string;
  indikator: string;
  bobot: string;
}
export interface DocPdfAtpRow {
  tp: string;
  jp: string;
  dimensi: string;
  indikator: string;
}
export interface DocPdfInstansi {
  /** baris atas kop (boleh multi-baris, pisah dgn \n), mis. "PEMERINTAH …\nDINAS PENDIDIKAN" */
  induk?: string;
  nama?: string;
  alamat?: string;
  kontak?: string;
  /** data-URL base64 (png/jpg) */
  logoDataUrl?: string;
}
export interface DocPdfTtd {
  kota?: string;
  tanggal: string;
  penyusunJabatan: string; // "Guru Mata Pelajaran" / "Dosen Pengampu"
  penyusunNama: string;
  penyusunNip?: string;
  pimpinanJabatan?: string; // "Kepala Sekolah" / "Ketua Program Studi"
  pimpinanNama?: string;
  pimpinanNip?: string;
}
export interface DocPdfInput {
  title: string;
  typeLabel: string;
  meta: string;
  sections: DocPdfSection[];
  pertemuan?: DocPdfPertemuan[];
  /** tabel ATP/SAP guru: TP | JP | Dimensi | Indikator */
  atp?: DocPdfAtpRow[];
  /** matriks RPS lebar → landscape */
  landscape?: boolean;
  instansi?: DocPdfInstansi;
  ttd?: DocPdfTtd;
  /** paket gratis → watermark diagonal tiap halaman + ajakan upgrade di footer.
      DITENTUKAN SERVER (route) dari profiles.plan — jangan percaya body klien. */
  watermark?: boolean;
}

const kop = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 8,
    marginBottom: 4,
  },
  logo: { width: 58, height: 58, objectFit: "contain" },
  mid: { flex: 1, alignItems: "center" },
  /* lineHeight per-teks (bukan di Page) — lihat catatan styles.page di shared */
  induk: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
    textAlign: "center",
    textTransform: "uppercase",
    lineHeight: 1.5,
  },
  nama: {
    fontSize: 13.5,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
    textAlign: "center",
    textTransform: "uppercase",
    marginTop: 1,
    lineHeight: 1.5,
  },
  alamat: { fontSize: 8, color: C.text, textAlign: "center", marginTop: 2, lineHeight: 1.5 },
  kontak: { fontSize: 7.5, color: C.muted, textAlign: "center", marginTop: 1, lineHeight: 1.5 },
  ruleThick: { height: 2.2, backgroundColor: C.ink, marginTop: 6 },
  ruleThin: { height: 0.8, backgroundColor: C.ink, marginTop: 1.5, marginBottom: 14 },
  judulDok: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
    textAlign: "center",
    textTransform: "uppercase",
    marginBottom: 2,
    lineHeight: 1.5,
  },
  subJudul: { fontSize: 9.5, color: C.text, textAlign: "center", marginBottom: 14, lineHeight: 1.5 },
});

const ttdS = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
    paddingHorizontal: 8,
  },
  col: { width: "42%", alignItems: "flex-start" },
  colR: { width: "42%", alignItems: "flex-start" },
  line: { fontSize: 10, color: C.ink, marginBottom: 2 },
  space: { height: 52 },
  nama: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
    textDecoration: "underline",
  },
  nip: { fontSize: 9, color: C.text, marginTop: 2 },
});

function Blocks({ blocks }: { blocks: string[] }) {
  return (
    <>
      {blocks.map((b, i) =>
        b.startsWith("- ") ? (
          <View style={styles.bulletRow} key={i}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>{b.slice(2)}</Text>
          </View>
        ) : (
          <Text style={styles.para} key={i}>
            {b}
          </Text>
        ),
      )}
    </>
  );
}

const PCOL = [
  { key: "minggu", label: "Mg", w: "5%" },
  { key: "subCpmk", label: "Sub-CPMK", w: "18%" },
  { key: "materi", label: "Materi / Bahan Kajian", w: "30%" },
  { key: "metode", label: "Metode / Pengalaman Belajar", w: "22%" },
  { key: "indikator", label: "Indikator & Kriteria", w: "18%" },
  { key: "bobot", label: "Bobot", w: "7%" },
] as const;

function PertemuanTable({ rows }: { rows: DocPdfPertemuan[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Rencana 16 Pertemuan</Text>
      <View style={styles.table}>
        <View style={styles.tHead} fixed>
          {PCOL.map((c) => (
            <Text key={c.key} style={[styles.th, { width: c.w }]}>
              {c.label}
            </Text>
          ))}
        </View>
        {rows.map((r, i) => (
          <View style={styles.tRow} key={i} wrap={false}>
            {PCOL.map((c) => (
              <Text key={c.key} style={[styles.td, { width: c.w }]}>
                {String(r[c.key as keyof DocPdfPertemuan] ?? "")}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const ACOL = [
  { key: "tp", label: "Alur Tujuan Pembelajaran", w: "42%" },
  { key: "jp", label: "JP", w: "8%" },
  { key: "dimensi", label: "Dimensi Profil Pelajar Pancasila", w: "22%" },
  { key: "indikator", label: "Indikator Pencapaian", w: "28%" },
] as const;

function AtpTable({ rows }: { rows: DocPdfAtpRow[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Alur Tujuan Pembelajaran</Text>
      <View style={styles.table}>
        <View style={styles.tHead} fixed>
          {ACOL.map((c) => (
            <Text key={c.key} style={[styles.th, { width: c.w }]}>
              {c.label}
            </Text>
          ))}
        </View>
        {rows.map((r, i) => (
          <View style={styles.tRow} key={i} wrap={false}>
            {ACOL.map((c) => (
              <Text key={c.key} style={[styles.td, { width: c.w }]}>
                {String(r[c.key as keyof DocPdfAtpRow] ?? "")}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

/* react-pdf Image menggantung pada src string data-URL —
   dekode ke Buffer + format eksplisit (bentuk yang didukung stabil). */
export function logoSrc(
  dataUrl?: string,
): { data: Buffer; format: "png" | "jpg" } | null {
  const m = dataUrl?.match(/^data:image\/(png|jpe?g);base64,(.+)$/);
  if (!m) return null;
  return {
    data: Buffer.from(m[2], "base64"),
    format: m[1] === "png" ? "png" : "jpg",
  };
}

/** KOP instansi resmi; fallback header AjarKit bila profil instansi kosong.
    Diekspor agar template lain (rpp-pdf) memakai kop & logika logo yang sama. */
export function Header({ data }: { data: DocPdfInput }) {
  const inst = data.instansi;
  if (inst?.nama) {
    const logo = logoSrc(inst.logoDataUrl);
    return (
      <View>
        <View style={kop.wrap}>
          {logo ? (
            // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image
            <Image src={logo} style={kop.logo} />
          ) : (
            <BrandMark size={52} />
          )}
          <View style={kop.mid}>
            {(inst.induk ?? "")
              .split("\n")
              .map((l) => l.trim())
              .filter(Boolean)
              .map((l, i) => (
                <Text key={i} style={kop.induk}>
                  {l}
                </Text>
              ))}
            <Text style={kop.nama}>{inst.nama}</Text>
            {!!inst.alamat && <Text style={kop.alamat}>{inst.alamat}</Text>}
            {!!inst.kontak && <Text style={kop.kontak}>{inst.kontak}</Text>}
          </View>
          {/* penyeimbang kiri-kanan agar teks tengah presisi */}
          <View style={{ width: 58 }} />
        </View>
        <View style={kop.ruleThick} />
        <View style={kop.ruleThin} />
        <Text style={kop.judulDok}>{data.typeLabel}</Text>
        {!!data.meta && <Text style={kop.subJudul}>{data.meta}</Text>}
      </View>
    );
  }
  return (
    <View>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <BrandMark size={26} />
          <View>
            <Text style={styles.brandName}>AjarKit</Text>
            <Text style={styles.brandTag}>Perangkat Ajar OS</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.kicker}>{data.typeLabel}</Text>
          {!!data.meta && <Text style={styles.metaLine}>{data.meta}</Text>}
        </View>
      </View>
    </View>
  );
}

/* ----- watermark paket gratis (prd.md: free = watermark + ajakan upgrade) ----- */

/** Baris ajakan upgrade di footer halaman ber-watermark. */
export const UPGRADE_NOTE =
  "Dibuat gratis di ajarkit.com — upgrade ke Pro untuk menghilangkan watermark.";

const wm = StyleSheet.create({
  /* full-bleed + flex center → otomatis pas di tengah, portrait maupun
     landscape (RPS). position absolute → tidak mengganggu layout konten. */
  wrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  /* rotasi di View pembungkus → kedua baris miring BERSAMA (-30deg).
     Lebar TETAP + textAlign center: tanpa lebar eksplisit kontainer menyusut
     selebar baris link sehingga baris kedua bisa terpotong/tak ter-render. */
  tilt: {
    width: 520,
    alignItems: "center",
    transform: "rotate(-30deg)",
  },
  text: {
    width: 520,
    fontSize: 52,
    fontFamily: "Helvetica-Bold",
    color: "#9aa3b2",
    opacity: 0.18,
    textAlign: "center",
    textDecoration: "none",
  },
  /* baris kedua ajakan upgrade — warna & opacity sama dgn baris link */
  upgrade: {
    width: 520,
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#9aa3b2",
    opacity: 0.18,
    textAlign: "center",
    marginTop: 8,
  },
});

/** Watermark diagonal "ajarkit.com" + baris "UPGRADE PREMIUM" di tengah
    SETIAP halaman (fixed) — tautan hidup HANYA pada "ajarkit.com".
    Render SEBELUM konten halaman agar berada di belakang teks (react-pdf
    menggambar sesuai urutan elemen). Dipakai ulang oleh rpp-pdf & rps-pdf.
    `lineHeight` opsional mengganti warisan Page yang dihapus (template
    pemanggil punya nilai berbeda; rps tanpa). */
export function Watermark({ lineHeight }: { lineHeight?: number }) {
  return (
    <View style={lineHeight ? [wm.wrap, { lineHeight }] : wm.wrap} fixed>
      <View style={wm.tilt}>
        <Link src="https://ajarkit.com" style={wm.text}>
          ajarkit.com
        </Link>
        <Text style={wm.upgrade}>U P G R A D E&nbsp;&nbsp;P R E M I U M</Text>
      </View>
    </View>
  );
}

/* Placeholder garis titik utk nama/NIP yang belum diisi pada blok ttd */
const TTD_NAMA_KOSONG = "(………………………………… )";
const TTD_NIP_KOSONG = "…………………………";

/** Blok tanda tangan: kiri "Mengetahui, {pimpinan}" ↔ kanan "{kota}, {tanggal}" + penyusun.
    Dua kolom SELALU dirender selama objek ttd ada; nama/NIP kosong tampil
    sebagai garis titik. Diekspor untuk dipakai ulang template rpp-pdf &
    rps-pdf. `lineHeight` opsional mengganti warisan Page yang dihapus
    (1.5 document-pdf, 1.45 rpp; rps memang tanpa lineHeight). */
export function TtdBlock({ ttd, lineHeight }: { ttd: DocPdfTtd; lineHeight?: number }) {
  return (
    <View style={lineHeight ? [ttdS.wrap, { lineHeight }] : ttdS.wrap} wrap={false}>
      <View style={ttdS.col}>
        <Text style={ttdS.line}>Mengetahui,</Text>
        <Text style={ttdS.line}>{ttd.pimpinanJabatan || "Kepala Sekolah"}</Text>
        <View style={ttdS.space} />
        {ttd.pimpinanNama ? (
          <Text style={ttdS.nama}>{ttd.pimpinanNama}</Text>
        ) : (
          <Text style={ttdS.line}>{TTD_NAMA_KOSONG}</Text>
        )}
        <Text style={ttdS.nip}>NIP. {ttd.pimpinanNip || TTD_NIP_KOSONG}</Text>
      </View>
      <View style={ttdS.colR}>
        <Text style={ttdS.line}>
          {ttd.kota ? `${ttd.kota}, ${ttd.tanggal}` : ttd.tanggal}
        </Text>
        <Text style={ttdS.line}>{ttd.penyusunJabatan}</Text>
        <View style={ttdS.space} />
        {ttd.penyusunNama ? (
          <Text style={ttdS.nama}>{ttd.penyusunNama}</Text>
        ) : (
          <Text style={ttdS.line}>{TTD_NAMA_KOSONG}</Text>
        )}
        <Text style={ttdS.nip}>NIP. {ttd.penyusunNip || TTD_NIP_KOSONG}</Text>
      </View>
    </View>
  );
}

export function DocumentPdf({ data }: { data: DocPdfInput }) {
  return (
    <Document title={data.title} author="AjarKit">
      <Page
        size="A4"
        orientation={data.landscape ? "landscape" : "portrait"}
        style={styles.page}
      >
        {data.watermark && <Watermark lineHeight={1.5} />}
        {/* fixed dirender SEBELUM konten agar muncul di SETIAP halaman */}
        <Footer note={data.watermark ? UPGRADE_NOTE : undefined} />
        <Header data={data} />

        <Text style={styles.title}>{data.title}</Text>
        <Text style={styles.disclaimer}>
          Dibuat dengan AjarKit — periksa &amp; sesuaikan sebelum digunakan.
        </Text>

        {data.sections.map((s) => (
          <View style={styles.section} key={s.id} wrap={false}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Blocks blocks={s.blocks} />
          </View>
        ))}

        {data.atp && data.atp.length > 0 && <AtpTable rows={data.atp} />}

        {data.pertemuan && data.pertemuan.length > 0 && (
          <PertemuanTable rows={data.pertemuan} />
        )}

        {data.ttd && <TtdBlock ttd={data.ttd} lineHeight={1.5} />}
      </Page>
    </Document>
  );
}

export function renderDocumentPdf(data: DocPdfInput): Promise<Uint8Array> {
  return renderToBuffer(<DocumentPdf data={data} />) as Promise<Uint8Array>;
}

export { C };
