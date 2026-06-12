/* AjarKit — komponen & token PDF bersama (server-only, @react-pdf/renderer).
   Memakai font bawaan Helvetica (tanpa registrasi → andal di serverless).
   Desain custom: header berlogo gradien, warna brand, footer bernomor. */

import "server-only";
import { StyleSheet, Svg, Path, Rect, Defs, LinearGradient, Stop, Text, View } from "@react-pdf/renderer";

export const C = {
  primary: "#2B59E0",
  primaryDark: "#1E45C0",
  accent: "#7C5CE0",
  ink: "#0F172A",
  text: "#334155",
  muted: "#64748B",
  faint: "#94A3B8",
  border: "#E5E8EF",
  soft: "#F1F4F9",
  bg: "#F7F8FB",
  success: "#16A34A",
  successBg: "#E9F7EF",
  white: "#FFFFFF",
};

export const styles = StyleSheet.create({
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
    color: C.text,
  },
  // header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: C.primary,
    paddingBottom: 12,
    marginBottom: 18,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandName: { fontSize: 15, fontFamily: "Helvetica-Bold", color: C.ink, lineHeight: 1.5 },
  brandTag: { fontSize: 7.5, color: C.muted, marginTop: 1, lineHeight: 1.5 },
  headerRight: { alignItems: "flex-end" },
  kicker: {
    fontSize: 7.5,
    letterSpacing: 1.2,
    color: C.primary,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    lineHeight: 1.5,
  },
  metaLine: { fontSize: 8.5, color: C.muted, marginTop: 2, lineHeight: 1.5 },
  // judul
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", color: C.ink, marginBottom: 4, lineHeight: 1.5 },
  subtitle: { fontSize: 9.5, color: C.muted, marginBottom: 4, lineHeight: 1.5 },
  disclaimer: {
    fontSize: 8,
    color: C.faint,
    fontFamily: "Helvetica-Oblique",
    marginBottom: 16,
    lineHeight: 1.5,
  },
  // section
  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 11.5,
    fontFamily: "Helvetica-Bold",
    color: C.primaryDark,
    marginBottom: 5,
    paddingBottom: 3,
    borderBottomWidth: 0.6,
    borderBottomColor: C.border,
    lineHeight: 1.5,
  },
  para: { marginBottom: 4, textAlign: "justify", lineHeight: 1.5 },
  bulletRow: { flexDirection: "row", marginBottom: 3, paddingLeft: 4 },
  bulletDot: { width: 10, color: C.primary, fontFamily: "Helvetica-Bold", lineHeight: 1.5 },
  bulletText: { flex: 1, lineHeight: 1.5 },
  // tabel
  table: { borderWidth: 0.6, borderColor: C.border, borderRadius: 4, marginTop: 4 },
  tHead: { flexDirection: "row", backgroundColor: C.soft },
  tRow: { flexDirection: "row", borderTopWidth: 0.6, borderTopColor: C.border },
  th: { padding: 5, fontSize: 8, fontFamily: "Helvetica-Bold", color: C.ink, lineHeight: 1.5 },
  td: { padding: 5, fontSize: 8.5, color: C.text, lineHeight: 1.5 },
  /* footer full-bleed absolute (pola RpsFooter di rps-pdf) — View fixed yang
     hanya diposisikan `bottom` tidak dirender react-pdf v4 pada halaman wrap */
  footerWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
    paddingBottom: 24,
    paddingHorizontal: 44,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.6,
    borderTopColor: C.border,
    paddingTop: 6,
    fontSize: 7.5,
    color: C.faint,
  },
});

/** Logo gradien (dokumen RPS + percikan tongkat ajaib), sebesar `size` px */
export function BrandMark({ size = 26 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Defs>
        <LinearGradient id="akg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={C.primary} />
          <Stop offset="1" stopColor={C.accent} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="512" height="512" rx="116" fill="url(#akg)" />
      <Path
        d="M150 138a26 26 0 0 1 26-26h120l62 62v176a26 26 0 0 1-26 26H176a26 26 0 0 1-26-26z M296 112v62h62 M186 212h120 M186 254h120 M186 296h74"
        fill="none"
        stroke={C.white}
        strokeWidth={22}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M372 300l20 44 44 20-44 20-20 44-20-44-44-20 44-20z" fill={C.white} />
    </Svg>
  );
}

/** Footer bernomor halaman, tampil di SETIAP halaman (fixed full-bleed).
    Render komponen ini SEBELUM konten halaman agar muncul di tiap halaman. */
export function Footer({ note }: { note?: string }) {
  return (
    <View style={styles.footerWrap} fixed>
      <View style={styles.footer}>
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
