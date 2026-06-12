/* AjarKit — PDF struk/invoice pembayaran berbranding (prd.md §9.I.3). */

import "server-only";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { BrandMark, Footer, styles, C } from "./shared";

const inv = StyleSheet.create({
  /* lineHeight per-teks (bukan di Page) — lihat catatan styles.page di shared */
  metaGrid: { flexDirection: "row", justifyContent: "space-between", marginBottom: 22 },
  metaCol: { gap: 2 },
  metaLabel: { fontSize: 7.5, color: C.faint, textTransform: "uppercase", letterSpacing: 0.8, lineHeight: 1.5 },
  metaVal: { fontSize: 10, color: C.ink, fontFamily: "Helvetica-Bold", lineHeight: 1.5 },
  metaSub: { fontSize: 9, color: C.text, lineHeight: 1.5 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: C.successBg,
    color: C.success,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 20,
    marginTop: 2,
    lineHeight: 1.5,
  },
  itemHead: { flexDirection: "row", backgroundColor: C.ink, borderRadius: 4, paddingVertical: 7, paddingHorizontal: 10 },
  itemHeadText: { color: C.white, fontSize: 8.5, fontFamily: "Helvetica-Bold", lineHeight: 1.5 },
  itemRow: { flexDirection: "row", paddingVertical: 9, paddingHorizontal: 10, borderBottomWidth: 0.6, borderBottomColor: C.border },
  itemCell: { fontSize: 9.5, color: C.ink, lineHeight: 1.5 },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 14, gap: 24, alignItems: "center" },
  totalLabel: { fontSize: 11, color: C.muted, lineHeight: 1.5 },
  totalVal: { fontSize: 18, fontFamily: "Helvetica-Bold", color: C.primary, lineHeight: 1.5 },
  note: { marginTop: 26, padding: 12, backgroundColor: C.bg, borderRadius: 6, fontSize: 8.5, color: C.muted, lineHeight: 1.6 },
});

export interface InvoicePdfInput {
  orderId: string;
  tanggal: string;
  jenis: string; // "Top-up kredit" / "Langganan Pro"
  metode: string;
  status: string; // "Lunas" / "Pending" / "Gagal"
  nominalLabel: string; // "Rp 39.000"
  pelanggan: string;
  email: string;
}

export function InvoicePdf({ data }: { data: InvoicePdfInput }) {
  return (
    <Document title={`Struk ${data.orderId}`} author="AjarKit">
      <Page size="A4" style={styles.page}>
        {/* fixed dirender SEBELUM konten agar muncul di SETIAP halaman */}
        <Footer />
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <BrandMark size={26} />
            <View>
              <Text style={styles.brandName}>AjarKit</Text>
              <Text style={styles.brandTag}>Perangkat Ajar OS — Lanius Lab</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.kicker}>Struk Pembayaran</Text>
            <Text style={styles.metaLine}>No. {data.orderId}</Text>
            <Text style={styles.metaLine}>{data.tanggal}</Text>
          </View>
        </View>

        <View style={inv.metaGrid}>
          <View style={inv.metaCol}>
            <Text style={inv.metaLabel}>Ditagihkan kepada</Text>
            <Text style={inv.metaVal}>{data.pelanggan}</Text>
            <Text style={inv.metaSub}>{data.email}</Text>
          </View>
          <View style={[inv.metaCol, { alignItems: "flex-end" }]}>
            <Text style={inv.metaLabel}>Status</Text>
            <Text style={inv.badge}>{data.status}</Text>
            <Text style={[inv.metaSub, { marginTop: 4 }]}>Metode: {data.metode}</Text>
          </View>
        </View>

        <View style={inv.itemHead}>
          <Text style={[inv.itemHeadText, { flex: 1 }]}>Deskripsi</Text>
          <Text style={[inv.itemHeadText, { width: 120, textAlign: "right" }]}>Jumlah</Text>
        </View>
        <View style={inv.itemRow}>
          <Text style={[inv.itemCell, { flex: 1 }]}>{data.jenis}</Text>
          <Text style={[inv.itemCell, { width: 120, textAlign: "right" }]}>
            {data.nominalLabel}
          </Text>
        </View>

        <View style={inv.totalRow}>
          <Text style={inv.totalLabel}>Total dibayar</Text>
          <Text style={inv.totalVal}>{data.nominalLabel}</Text>
        </View>

        <Text style={inv.note}>
          Struk ini dibuat otomatis oleh AjarKit dan sah tanpa tanda tangan.
          Pembayaran diproses aman oleh Pakasir. Terima kasih telah memakai AjarKit
          untuk menyusun perangkat ajarmu.
        </Text>
      </Page>
    </Document>
  );
}

export function renderInvoicePdf(data: InvoicePdfInput): Promise<Uint8Array> {
  return renderToBuffer(<InvoicePdf data={data} />) as Promise<Uint8Array>;
}
