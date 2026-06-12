/* AjarKit — helper format (Rupiah, tanggal lokal) */

export function rupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

export function countdownLabel(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function tanggalPanjang(d: Date = new Date()): string {
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

/** "2 Maret 2026" — utk blok tanda tangan dokumen */
export function tanggalID(d: Date = new Date()): string {
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

/** Label waktu relatif Bahasa Indonesia dari ISO timestamp (utk data Supabase) */
export function relativeLabel(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const mnt = Math.floor(diffMs / 60_000);
  if (mnt < 1) return "Baru saja";
  if (mnt < 60) return `${mnt} menit lalu`;
  const jam = Math.floor(mnt / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  if (hari === 1) return "Kemarin";
  if (hari < 7) return `${hari} hari lalu`;
  const minggu = Math.floor(hari / 7);
  if (minggu < 5) return `${minggu} minggu lalu`;
  const d = new Date(iso);
  return `${d.getDate()} ${BULAN[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

/** "10 Jun 2026" dari ISO timestamp */
export function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${BULAN[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

export function initialsOf(nama: string): string {
  return nama
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}
