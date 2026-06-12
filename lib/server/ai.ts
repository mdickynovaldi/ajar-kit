/* AjarKit — generasi konten AI via OpenRouter (server-only, prd.md §2 & §9).
   Routing model per mode kualitas; output JSON terstruktur DocContent;
   validasi kelengkapan sebelum dipakai. API key TIDAK pernah ke browser. */

import "server-only";
import type {
  DocContent,
  DocType,
  KegiatanPertemuan,
  QualityMode,
  RpsPertemuan,
} from "@/lib/types";

const API_KEY = process.env.OPENROUTER_API_KEY;
export const AI_ENABLED = Boolean(API_KEY);

/* Routing model (prd.md §9): hemat → lite/deepseek · standar → gemini flash ·
   tinggi → premium. Override via env; default = model OpenRouter yang tersedia.
   TODO: naikkan ke generasi model terbaru (mis. gemini-3-flash) saat tersedia. */
const MODELS: Record<QualityMode, string> = {
  hemat: process.env.OPENROUTER_MODEL_HEMAT || "google/gemini-2.5-flash-lite",
  standar: process.env.OPENROUTER_MODEL_STANDAR || "google/gemini-2.5-flash",
  tinggi: process.env.OPENROUTER_MODEL_TINGGI || "google/gemini-2.5-pro",
};

/* fallback otomatis bila model utama gagal/timeout (prd.md §9) */
const FALLBACK_MODEL =
  process.env.OPENROUTER_MODEL_FALLBACK || "google/gemini-2.5-flash-lite";

/* Batas token output per mode — tanpa ini OpenRouter mereservasi output
   maksimum model (≈65k) dan menolak akun bersaldo kecil (402). JSON modul
   ajar lengkap ±1,5-4k token; RPS 16 pertemuan paling besar. */
const MAX_TOKENS: Record<QualityMode, number> = {
  hemat: Number(process.env.OPENROUTER_MAX_TOKENS_HEMAT) || 6000,
  standar: Number(process.env.OPENROUTER_MAX_TOKENS_STANDAR) || 8192,
  tinggi: Number(process.env.OPENROUTER_MAX_TOKENS_TINGGI) || 12288,
};

const DOC_GUIDANCE: Record<DocType, string> = {
  atp: `Susun dokumen ATP/SAP gabungan untuk GURU (mengikuti format ATP sekolah + skenario ala SAP): section id persis: "identitas" (Satuan Pendidikan, Mata Pelajaran, Fase/Kelas, Tahun Pelajaran, Penyusun), "capaian" (ringkasan CP fase tsb + elemen mapel), "strategi" (pendekatan, model, metode pembelajaran), "media" (bahan ajar, media, sumber belajar, alat sebagai butir "- "), "skenario" (kegiatan Pendahuluan/Inti/Penutup sebagai butir "- " yang menyebut kegiatan peserta didik, kegiatan guru, dan alokasi menit). WAJIB isi field "atp": array 8-14 objek {tp (butir tujuan pembelajaran bernomor mis. "3.1 Menganalisis …"), jp (mis. "4 JP"), dimensi (1-2 dimensi Profil Pelajar Pancasila), indikator (indikator pencapaian terukur)} terurut dari mudah ke kompleks; baris terakhir TIDAK perlu baris total.`,
  modul_ajar: `Susun MODUL AJAR (RPP) GURU format dokumen resmi sekolah. Section id PERSIS dan BERURUTAN: "identitas" (judul "Identitas Modul"; blocks format "Label: nilai" dengan label persis — Sekolah, Mata Pelajaran, Kelas/Semester, Materi Pokok, Alokasi Waktu, Penyusun, Tahun Pelajaran — isi nilai dari "Detail dari pengguna", JANGAN pakai placeholder kurung siku), "informasi-khusus" (judul "Informasi Khusus"; blocks format "Label: nilai" — Kompetensi Awal, Penguatan Profil Pelajar Pancasila (sebutkan dimensi + elemennya), Sarana dan Prasarana, Target Peserta Didik, Model Pembelajaran, Pendekatan, Metode), "capaian" (paragraf Capaian Pembelajaran fase terkait), "tujuan" (butir "- " tujuan pembelajaran), "indikator" (butir "- " indikator ketercapaian tujuan pembelajaran), "pemahaman-bermakna" (paragraf pemahaman bermakna), "pertanyaan-pemantik" (butir "- "), "asesmen" (LENGKAP & RINCI: tiga jenis — Asesmen Awal/diagnostik, Asesmen Proses/formatif, Asesmen Akhir/sumatif; untuk MASING-MASING tulis butir "- " berisi: teknik penilaian, bentuk instrumen, dan 2-3 CONTOH butir instrumen konkret (contoh pertanyaan diagnostik, butir lembar observasi, contoh soal sumatif)), "rubrik" (judul "Rubrik Penilaian"; butir "- " kriteria penilaian dengan 4 tingkat skor, mis. "Kemampuan analisis — Skor 4: …; Skor 3: …; Skor 2: …; Skor 1: …" minimal 3 kriteria), "pustaka" (butir "- " daftar pustaka gaya APA). WAJIB isi field "kegiatan": array pertemuan (jumlah TEPAT sesuai "Jumlah pertemuan" pada Detail dari pengguna; bila tidak disebut, 1-2 pertemuan) {pertemuan: "Pertemuan ke-1: <judul kegiatan>", alokasi: "2 JP @45 menit", tahap: [5-7 baris]} dengan baris tahap RINCI mengikuti dokumen resmi: (1) "Pendahuluan" — salam/doa/presensi, penyampaian tujuan, APERSEPSI KONKRET (sebutkan fenomena/media spesifik yang ditunjukkan guru) dan di butir guru sertakan "Pertanyaan yang diharapkan muncul: …" (2-3 pertanyaan); (2) Inti DIPECAH per sintaks model pembelajaran sebagai baris terpisah dengan nama sintaks di kolom tahap (mis. "Inti — Orientasi masalah", "Inti — Investigasi kelompok", "Inti — Presentasi hasil", "Inti — Evaluasi"), tiap baris 3-5 butir siswa & guru berpasangan yang OPERASIONAL dan spesifik materi (bukan generik); (3) "Penutup" — simpulan, refleksi, tindak lanjut/tugas, doa. Total waktu semua baris = alokasi.`,
  lkpd: `Susun LKPD (Lembar Kerja Peserta Didik): section "tujuan", lalu 2-3 section "aktivitas-N" (judul aktivitas; petunjuk langkah sebagai butir "- "; pertanyaan pemantik), dan "refleksi".`,
  asesmen: `Susun ASESMEN: section "kisi" (kisi-kisi: materi, bentuk, indikator), "soal" (butir soal bernomor), "rubrik" (kriteria penskoran), "kunci" (kunci jawaban ringkas).`,
  bank_soal: `Susun BANK SOAL: section "soal" (butir bernomor, tandai soal HOTS dengan prefiks "(HOTS)"), "kunci" (kunci + pembahasan singkat per nomor). Sertakan campuran LOTS/MOTS/HOTS.`,
  prota_promes: `Susun PROTA & PROMES: section "prota" (distribusi unit per semester sebagai butir "- "), "promes" (rincian mingguan ringkas per bulan sebagai butir "- "), "catatan".`,
  rps: `Susun RPS DOSEN berbasis OBE format dokumen resmi universitas (pola UM). Section id PERSIS dan BERURUTAN: "identitas-mk" (blocks format "Label: nilai" dengan label persis — Mata Kuliah, Kode, Rumpun MK, Bobot (sks) (mis. "3 sks (2T, 1P)"), Semester, Tgl Penyusunan, Dosen Pengampu (pakai nama penyusun dari Detail), Matakuliah Prasyarat), "pengesahan" (blocks persis "Ketua KBK: ........." / "Kaprodi: ........." / "Ketua GKM: ........." — isi nama hanya bila tersedia di Detail, selain itu biarkan "........."), "cpl" (blocks format "SCPL<no>: deskripsi" 1-2 butir Standar CPL yang dibebankan pada MK), "cpmk" (blocks format "CPMK<no>: …" 3-4 butir kemampuan dengan kata kerja operasional), "subcpmk" (blocks format "<cpmk>.<no>: …" mis "1.1: …" 6-8 butir kemampuan akhir tiap tahapan belajar, menginduk ke CPMK), "deskripsi" (1 paragraf padat Deskripsi Isi MK), "pustaka" (butir "- " gaya APA bernomor implisit, 8-12 entri Sumber Rujukan; nomor urutnya dirujuk kolom sumber matriks). WAJIB isi field "pertemuan": array TEPAT 16 objek {minggu (1-16), kodeCpmk ("CPMK1"), subCpmk (kode sub mis "1.1"), kriteria (array 2-4 butir kriteria + indikator penilaian, indikator berawalan "Mampu …"), materi, metode (ringkas), indikator (string indikator utama), bobot ("5%"), offline ("Kuliah: …" deskripsi kegiatan tatap muka), asinkron ("Tugas Mandiri: …; Tugas Terstruktur: …"), media ("LMS/SIPEJAR"), sumber (nomor pustaka mis "1-3")} — minggu 8 UTS (bobot 15-20%), minggu 16 UAS (bobot 20-25%), total bobot 100%.`,
};

const SYSTEM_PROMPT = `Kamu adalah asisten perangkat ajar untuk guru & dosen Indonesia. Jawab HANYA dengan JSON valid (tanpa markdown) berskema:
{
  "sections": [ { "id": string, "title": string, "blocks": string[] } ],
  "pertemuan": [ { "minggu": number, "kodeCpmk": string, "subCpmk": string, "kriteria": string[], "materi": string, "metode": string, "indikator": string, "bobot": string, "offline": string, "asinkron": string, "media": string, "sumber": string } ],  // HANYA untuk RPS
  "atp": [ { "tp": string, "jp": string, "dimensi": string, "indikator": string } ],  // HANYA untuk ATP/SAP
  "kegiatan": [ { "pertemuan": string, "alokasi": string, "tahap": [ { "tahap": string, "siswa": string[], "guru": string[], "waktu": string } ] } ]  // HANYA untuk Modul Ajar/RPP
}
Aturan: Bahasa Indonesia baku & ramah guru; blocks = paragraf pendek ATAU butir berawalan "- "; konten akurat sesuai kurikulum terbaru; tanpa placeholder kosong.`;

interface AiDocInput {
  title: string;
  type: DocType;
  subject: string;
  jenjang: string;
  qualityMode: QualityMode;
  /** khusus modul_ajar: jumlah pertemuan yang diminta (1-16) */
  pertemuanCount?: number;
  /** khusus modul_ajar: sertakan lampiran LKPD di dalam dokumen */
  includeLkpd?: boolean;
  /** potongan konteks kurikulum hasil match_curriculum (RAG, prd.md §9) */
  context?: string[];
  /** profil penyusun (dari tabel profiles) — menghilangkan placeholder identitas */
  penyusun?: { nama?: string; sekolah?: string };
}

function isValidContent(
  c: unknown,
  type: DocType,
  pertemuanCount?: number,
): c is DocContent {
  if (!c || typeof c !== "object") return false;
  const obj = c as DocContent;
  if (!Array.isArray(obj.sections) || obj.sections.length === 0) return false;
  for (const s of obj.sections) {
    if (typeof s?.title !== "string" || !Array.isArray(s?.blocks)) return false;
    if (!s.blocks.every((b) => typeof b === "string")) return false;
  }
  if (type === "rps") {
    if (!Array.isArray(obj.pertemuan) || obj.pertemuan.length !== 16) return false;
  }
  if (type === "atp") {
    if (!Array.isArray(obj.atp) || obj.atp.length < 6) return false;
  }
  if (type === "modul_ajar") {
    const minKegiatan = Math.max(1, pertemuanCount ?? 1);
    if (!Array.isArray(obj.kegiatan) || obj.kegiatan.length < minKegiatan)
      return false;
    for (const k of obj.kegiatan) {
      if (!Array.isArray(k?.tahap) || k.tahap.length < 3) return false;
    }
  }
  return true;
}

function normalize(c: DocContent, type: DocType): DocContent {
  const sections = c.sections.map((s, i) => ({
    id: (s.id || `bagian-${i + 1}`).toString().slice(0, 60),
    title: s.title.slice(0, 200),
    blocks: s.blocks.filter(Boolean).map((b) => b.slice(0, 2000)),
  }));
  const out: DocContent = { sections };
  if (type === "rps" && c.pertemuan) {
    out.pertemuan = c.pertemuan.map(
      (p, i): RpsPertemuan => ({
        minggu: typeof p.minggu === "number" ? p.minggu : i + 1,
        subCpmk: String(p.subCpmk ?? ""),
        materi: String(p.materi ?? ""),
        metode: String(p.metode ?? ""),
        indikator: String(p.indikator ?? ""),
        bobot: String(p.bobot ?? ""),
        // kolom matriks RPS resmi universitas (opsional pada tipe)
        kodeCpmk: String(p.kodeCpmk ?? ""),
        kriteria: (Array.isArray(p.kriteria) ? p.kriteria : []).map(String),
        offline: String(p.offline ?? ""),
        sinkron: String(p.sinkron ?? ""),
        asinkron: String(p.asinkron ?? ""),
        media: String(p.media ?? ""),
        sumber: String(p.sumber ?? ""),
      }),
    );
  }
  if (type === "atp" && c.atp) {
    out.atp = c.atp.map((r) => ({
      tp: String(r.tp ?? ""),
      jp: String(r.jp ?? ""),
      dimensi: String(r.dimensi ?? ""),
      indikator: String(r.indikator ?? ""),
    }));
  }
  if (type === "modul_ajar" && c.kegiatan) {
    out.kegiatan = c.kegiatan.map(
      (k): KegiatanPertemuan => ({
        pertemuan: String(k.pertemuan ?? ""),
        alokasi: String(k.alokasi ?? ""),
        tahap: (Array.isArray(k.tahap) ? k.tahap : []).map((t) => ({
          tahap: String(t.tahap ?? ""),
          siswa: (Array.isArray(t.siswa) ? t.siswa : []).map(String),
          guru: (Array.isArray(t.guru) ? t.guru : []).map(String),
          waktu: String(t.waktu ?? ""),
        })),
      }),
    );
  }
  return out;
}

async function callModel(model: string, doc: AiDocInput): Promise<DocContent> {
  // modul_ajar dgn N pertemuan & RPS (matriks 16 pertemuan 11 kolom) butuh
  // output lebih panjang — naikkan budget token per panggilan (konstanta
  // MAX_TOKENS global tidak diubah).
  const maxTokens =
    doc.type === "rps"
      ? Math.min(MAX_TOKENS[doc.qualityMode] + 8000, 24000)
      : doc.type === "modul_ajar" && doc.pertemuanCount && doc.pertemuanCount > 1
        ? Math.min(MAX_TOKENS[doc.qualityMode] + (doc.pertemuanCount - 1) * 1800, 24000)
        : MAX_TOKENS[doc.qualityMode];
  return callModelWith(model, doc, maxTokens);
}

async function callModelWith(
  model: string,
  doc: AiDocInput,
  maxTokens: number,
): Promise<DocContent> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "AjarKit",
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      temperature: 0.4,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content:
            `${DOC_GUIDANCE[doc.type]}\n\n` +
            (doc.context && doc.context.length
              ? `Konteks kurikulum (acuan — patuhi struktur & istilah di sini):\n` +
                doc.context.map((c, i) => `${i + 1}. ${c}`).join("\n") +
                "\n\n"
              : "") +
            `Detail dari pengguna:\n` +
            `- Judul/materi: ${doc.title}\n` +
            `- Mata pelajaran/MK: ${doc.subject}\n` +
            `- Jenjang/kelas: ${doc.jenjang}\n` +
            (doc.type === "modul_ajar" && doc.pertemuanCount
              ? `- Jumlah pertemuan: ${doc.pertemuanCount} — field "kegiatan" WAJIB berisi TEPAT ${doc.pertemuanCount} pertemuan (Pertemuan ke-1 … ke-${doc.pertemuanCount}), tiap pertemuan 5-7 baris tahap\n`
              : "") +
            (doc.type === "modul_ajar" && doc.includeLkpd
              ? `- Sertakan LKPD: WAJIB tambahkan satu section tambahan dengan id "lampiran-lkpd" (judul "Lampiran: LKPD") tepat SEBELUM section "pustaka". Isinya: kolom identitas siswa sebagai baris "Label: ........." (Nama: ........., Kelas: ........., Kelompok: .........), tujuan LKPD, petunjuk pengerjaan, 2-3 aktivitas berlangkah sebagai butir "- ", dan pertanyaan diskusi.\n`
              : "") +
            `- Tingkat kedalaman: ${doc.qualityMode === "tinggi" ? "sangat mendalam dan lengkap" : doc.qualityMode === "hemat" ? "ringkas, draft awal" : "seimbang"}` +
            (doc.penyusun?.sekolah
              ? `\n- Nama sekolah/instansi: ${doc.penyusun.sekolah}`
              : "") +
            (doc.penyusun?.nama
              ? `\n- Nama penyusun: ${doc.penyusun.nama}`
              : "") +
            (!doc.penyusun?.sekolah || !doc.penyusun?.nama
              ? `\n- Bila nama sekolah/instansi atau nama penyusun tidak tersedia di atas, tulis "................." sebagai isian manual (JANGAN menulis placeholder dalam kurung siku).`
              : ""),
        },
      ],
    }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    // 402 "can only afford N tokens" → sekali retry dgn budget sebatas saldo
    if (res.status === 402) {
      const afford = Number(errText.match(/can only afford (\d+)/)?.[1]);
      const retryTokens = Math.floor(afford - 256);
      if (retryTokens >= 3000 && retryTokens < maxTokens) {
        console.warn(
          `AjarKit AI: saldo OpenRouter terbatas — retry ${model} dgn max_tokens ${retryTokens}`,
        );
        return callModelWith(model, doc, retryTokens);
      }
    }
    throw new Error(`OPENROUTER_${res.status}: ${errText.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = json.choices?.[0]?.message?.content ?? "";
  // beberapa model tetap membungkus ```json — bersihkan
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const parsed = JSON.parse(cleaned) as unknown;
  if (!isValidContent(parsed, doc.type, doc.pertemuanCount))
    throw new Error("KONTEN_TIDAK_VALID");
  return normalize(parsed, doc.type);
}

/** Generate konten satu dokumen; coba model sesuai mode → fallback otomatis. */
export async function generateDocContent(doc: AiDocInput): Promise<DocContent> {
  if (!AI_ENABLED) throw new Error("AI_BELUM_DIKONFIGURASI");
  const primary = MODELS[doc.qualityMode];
  try {
    return await callModel(primary, doc);
  } catch (e) {
    console.error(`AjarKit AI: model ${primary} gagal, fallback`, e);
    if (FALLBACK_MODEL && FALLBACK_MODEL !== primary)
      return await callModel(FALLBACK_MODEL, doc);
    throw e;
  }
}
