/* AjarKit — ingest korpus kurikulum untuk RAG (prd.md §9).
   Membaca semua .md/.txt di supabase/curriculum/, memecah per-section,
   lalu menyimpan ke tabel curriculum_docs (full-text). Idempoten per file.

     bun run scripts/ingest-curriculum.mjs

   Butuh SUPABASE_SERVICE_ROLE_KEY di .env.local (insert ke curriculum_docs
   hanya boleh lewat service role — klien diblokir RLS). */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const dir = join(root, "supabase", "curriculum");

// ---------- env ----------
const env = {};
try {
  for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
} catch {
  console.error("✖ .env.local tidak ditemukan.");
  process.exit(1);
}
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !SERVICE) {
  console.error("✖ Butuh NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY di .env.local");
  process.exit(1);
}
const sb = createClient(URL_, SERVICE, { auth: { persistSession: false } });

// ---------- parse frontmatter ----------
function parse(raw) {
  let scope = "umum";
  let jenjang = null;
  let title = null;
  let body = raw;
  const fm = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (fm) {
    for (const line of fm[1].split("\n")) {
      const kv = line.match(/^(\w+):\s*(.+)$/);
      if (!kv) continue;
      const k = kv[1].toLowerCase();
      const v = kv[2].trim();
      if (k === "scope") scope = v.toLowerCase();
      else if (k === "jenjang") jenjang = v;
      else if (k === "title") title = v;
    }
    body = fm[2];
  }
  if (!["guru", "dosen", "umum"].includes(scope)) scope = "umum";
  return { scope, jenjang, title, body };
}

// ---------- pecah per-section (## heading), gabung yang terlalu pendek ----------
function chunk(body, fallbackTitle) {
  const parts = [];
  let curTitle = fallbackTitle;
  let buf = [];
  const flush = () => {
    const text = buf.join("\n").trim();
    if (text.length >= 40) parts.push({ title: curTitle, text });
    buf = [];
  };
  for (const line of body.split("\n")) {
    const h = line.match(/^#{1,3}\s+(.+)$/);
    if (h) {
      flush();
      curTitle = h[1].trim();
    } else {
      buf.push(line);
    }
  }
  flush();
  // batasi panjang per potongan (~1800 char) agar prompt tetap ringkas
  return parts.flatMap((p) => {
    if (p.text.length <= 1800) return [p];
    const sub = [];
    for (let i = 0; i < p.text.length; i += 1800)
      sub.push({ title: p.title, text: p.text.slice(i, i + 1800) });
    return sub;
  });
}

// ---------- jalankan ----------
let files;
try {
  files = readdirSync(dir).filter((f) => /\.(md|txt)$/i.test(f) && !/^README/i.test(f));
} catch {
  console.error(`✖ Folder tidak ditemukan: ${dir}`);
  process.exit(1);
}
if (files.length === 0) {
  console.log("Tidak ada file .md/.txt di supabase/curriculum/. Tidak ada yang di-ingest.");
  process.exit(0);
}

console.log(`Ingest ${files.length} file → curriculum_docs\n`);
let total = 0;
for (const file of files) {
  const source = `ingest:${file}`;
  const { scope, jenjang, title, body } = parse(readFileSync(join(dir, file), "utf8"));
  const chunks = chunk(body, title ?? file.replace(/\.(md|txt)$/i, ""));

  // idempoten: bersihkan potongan lama dari file ini, lalu masukkan ulang
  await sb.from("curriculum_docs").delete().eq("source", source);
  if (chunks.length === 0) {
    console.log(`  • ${file}: (kosong, dilewati)`);
    continue;
  }
  const rows = chunks.map((c) => ({
    scope,
    jenjang,
    title: (title ? `${title} — ` : "") + c.title,
    source,
    chunk_text: c.text,
  }));
  const { error } = await sb.from("curriculum_docs").insert(rows);
  if (error) {
    console.error(`  ✖ ${file}: ${error.message}`);
    continue;
  }
  total += rows.length;
  console.log(`  ✓ ${file}  [scope=${scope}${jenjang ? `, jenjang=${jenjang}` : ""}]  → ${rows.length} potongan`);
}

const { count } = await sb
  .from("curriculum_docs")
  .select("*", { count: "exact", head: true });
console.log(`\nSelesai: ${total} potongan baru di-ingest. Total korpus sekarang: ${count} baris.`);
