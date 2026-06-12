/* AjarKit — uji E2E fitur referral (migration 0008 + revisi 0009) thd DB live.
   Jalankan SETELAH: (1) SQL supabase/migrations/0008_referral.sql DAN
   0009_referral_transaksi.sql di-run,
   (2) .env.local terisi NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
       + SUPABASE_SERVICE_ROLE_KEY (wajib — buat/hapus user uji & transaksi).

     bun run scripts/test-referral.mjs

   Menguji skema 0009 (reward HANYA setelah pembelian pertama teman):
   kode referral otomatis → apply kode (OK TANPA kredit / SUDAH_TERPAKAI /
   KODE_SENDIRI / KODE_TIDAK_DITEMUKAN) → award_referral_activation SUDAH
   TIDAK ADA → konversi pembelian pertama (pengundang +10% DAN pembeli +10%,
   idempoten) → referral_stats {invited, converted, earned} → cache credits.

   Exit code: 0 lulus semua · 1 ada assert gagal · 2 migration belum
   dijalankan (0008 belum ada, ATAU 0009 belum: award_referral_activation
   masih ada / constraint belum punya 'referral_conversion_bonus').
   Semua user uji dihapus otomatis di akhir (cascade ke profil/ledger/trx). */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// ---------- muat .env.local ----------
let envText = "";
try {
  envText = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
} catch {
  console.error("✖ .env.local tidak ditemukan. Salin dulu: cp .env.example .env.local");
  process.exit(1);
}
const env = {};
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_ || !ANON) {
  console.error("✖ NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY belum diisi di .env.local");
  process.exit(1);
}
if (!SERVICE) {
  console.error("✖ SUPABASE_SERVICE_ROLE_KEY wajib utk uji referral (buat user & transaksi uji).");
  process.exit(1);
}

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });

let pass = 0,
  fail = 0;
const ok = (name) => {
  pass++;
  console.log(`  ✓ ${name}`);
};
const bad = (name, detail) => {
  fail++;
  console.error(`  ✖ ${name}${detail ? ` — ${detail}` : ""}`);
};
const expect = (cond, name, detail) => (cond ? ok(name) : bad(name, detail));

/** error PostgREST "fungsi/kolom referral 0008 belum ada"? */
const isMissing0008 = (err) =>
  !!err &&
  (err.code === "PGRST202" ||
    err.code === "42703" ||
    /referral|schema cache/i.test(err.message ?? ""));

/** error "fungsi tidak ditemukan" (dipakai utk memastikan fungsi SUDAH dihapus) */
const isFunctionMissing = (err) =>
  !!err &&
  (err.code === "PGRST202" ||
    /could not find|schema cache|does not exist/i.test(err.message ?? ""));

/** error check constraint (reason 'referral_conversion_bonus' belum diizinkan
    → migration 0009 belum dijalankan) */
const isConstraintViolation = (err) =>
  !!err &&
  (err.code === "23514" ||
    /credit_ledger_reason_check|violates check constraint/i.test(err.message ?? ""));

const stamp = Date.now();
// catatan: Supabase menolak domain example.com — pakai format gmail valid
const EMAIL_A = `ajarkit.ref.a.${stamp}@gmail.com`;
const EMAIL_B = `ajarkit.ref.b.${stamp}@gmail.com`;
const PASS = `Uji-${stamp}-rahasia!`;
const testUserIds = []; // SEMUA user uji — dihapus di finally
let migrationMissing = false; // 0008 belum dijalankan
let migration0009Missing = false; // 0009 belum dijalankan

/** buat user uji terkonfirmasi via admin (tanpa kirim email) + sesi login */
async function makeUser(email, nama) {
  const { data: cu, error: cuErr } = await admin.auth.admin.createUser({
    email,
    password: PASS,
    email_confirm: true,
    user_metadata: { nama, role: "guru" },
  });
  if (cuErr) throw new Error(`buat user ${email} gagal: ${cuErr.message}`);
  testUserIds.push(cu.user.id);
  const client = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { error: siErr } = await client.auth.signInWithPassword({ email, password: PASS });
  if (siErr) throw new Error(`signIn ${email} gagal: ${siErr.message}`);
  return { id: cu.user.id, client };
}

/** baris ledger user (RLS: hanya milik sendiri) per reason */
async function ledgerRows(client, reason) {
  const { data, error } = await client
    .from("credit_ledger")
    .select("delta, reason, ref_id")
    .eq("reason", reason);
  if (error) throw new Error(`baca ledger gagal: ${error.message}`);
  return data ?? [];
}

console.log(`\nAjarKit uji referral (0008+0009) → ${URL_}\nUser uji: ${EMAIL_A} (A/pengundang), ${EMAIL_B} (B/teman)\n`);

try {
  // ---------- 0. Setup: user A (pengundang) & B (teman) ----------
  console.log("0. Setup user uji");
  const A = await makeUser(EMAIL_A, "Pengundang Uji");
  const B = await makeUser(EMAIL_B, "Teman Uji");
  ok("user A & B dibuat + punya sesi login");

  // deteksi dini: migration 0008 sudah dijalankan?
  {
    const { error } = await A.client.rpc("referral_stats");
    if (error && isMissing0008(error)) {
      migrationMissing = true;
      throw new Error("fungsi referral belum ada di DB");
    }
  }

  // ---------- 1. A punya referral_code ----------
  console.log("\n1. Kode referral otomatis");
  const { data: profA, error: profAErr } = await A.client
    .from("profiles")
    .select("referral_code")
    .eq("id", A.id)
    .single();
  if (profAErr && isMissing0008(profAErr)) {
    migrationMissing = true;
    throw new Error("kolom referral_code belum ada di DB");
  }
  const codeA = profA?.referral_code ?? null;
  expect(
    typeof codeA === "string" && /^[ABCDEFGHJKMNPQRS]{8}$/.test(codeA),
    "user A punya referral_code 8 huruf besar non-ambigu",
    `code=${codeA}`,
  );

  // ---------- 2. B apply kode A → OK TANPA kredit apa pun ----------
  console.log("\n2. apply_referral_code (0009: tanpa bonus langsung)");
  const { data: r1, error: r1Err } = await B.client.rpc("apply_referral_code", {
    p_code: ` ${String(codeA).toLowerCase()} `, // uji normalisasi upper(trim)
  });
  if (r1Err && isMissing0008(r1Err)) {
    migrationMissing = true;
    throw new Error("fungsi apply_referral_code belum ada di DB");
  }
  expect(!r1Err && r1 === "OK", "B apply kode A → 'OK'", r1Err?.message ?? `=${r1}`);

  // 0009: daftar pakai kode TIDAK memberi kredit — tidak boleh ada baris
  // ledger referral apa pun utk B setelah apply
  const { data: refRowsB, error: refRowsBErr } = await B.client
    .from("credit_ledger")
    .select("delta, reason, ref_id")
    .like("reason", "referral%");
  expect(
    !refRowsBErr && (refRowsB ?? []).length === 0,
    "ledger B: TIDAK ADA baris referral setelah apply (bonus pindah ke pembelian)",
    refRowsBErr?.message ?? JSON.stringify(refRowsB),
  );

  // ---------- 3. apply ulang → SUDAH_TERPAKAI ----------
  const { data: r2 } = await B.client.rpc("apply_referral_code", { p_code: codeA });
  expect(r2 === "SUDAH_TERPAKAI", "apply ulang → 'SUDAH_TERPAKAI'", `=${r2}`);

  // ---------- 4. kode sendiri → KODE_SENDIRI ----------
  const { data: r3 } = await A.client.rpc("apply_referral_code", { p_code: codeA });
  expect(r3 === "KODE_SENDIRI", "A apply kode sendiri → 'KODE_SENDIRI'", `=${r3}`);

  // ---------- 5. kode ngawur → KODE_TIDAK_DITEMUKAN ----------
  // 'Z' tidak ada di alfabet kode → dijamin tidak pernah cocok
  const { data: r4 } = await A.client.rpc("apply_referral_code", { p_code: "ZZZZZZZZ" });
  expect(r4 === "KODE_TIDAK_DITEMUKAN", "kode ngawur → 'KODE_TIDAK_DITEMUKAN'", `=${r4}`);

  // ---------- 6. award_referral_activation harus SUDAH TIDAK ADA (0009) ----------
  console.log("\n3. award_referral_activation (harus sudah dihapus)");
  const { error: actErr } = await B.client.rpc("award_referral_activation");
  if (!actErr) {
    migration0009Missing = true;
    bad("award_referral_activation masih ada di DB", "harusnya di-DROP oleh 0009");
    throw new Error("award_referral_activation masih ada");
  }
  expect(
    isFunctionMissing(actErr),
    "award_referral_activation SUDAH TIDAK ADA (error fungsi tidak ditemukan)",
    `${actErr.code ?? ""} ${actErr.message ?? ""}`,
  );

  // ---------- 7. Konversi: pembelian lunas pertama B → A +10% DAN B +10% ----------
  console.log("\n4. award_referral_conversion (dua arah)");
  const orderId = `order-ref-${stamp}`;
  const { error: trxErr } = await admin.from("transactions").insert({
    user_id: B.id,
    type: "topup",
    label: "Top-up uji referral",
    method: "qris",
    amount: 45000,
    status: "lunas",
    order_id: orderId,
    payload: { credits: 300 },
  });
  expect(!trxErr, "insert transaksi lunas B (admin, 300 kredit)", trxErr?.message);

  // klien biasa TIDAK boleh memanggil fungsi konversi (REVOKE authenticated)
  const { error: denyErr } = await B.client.rpc("award_referral_conversion", {
    p_order_id: orderId,
  });
  expect(!!denyErr, "REVOKE: klien authenticated DITOLAK panggil konversi", "harusnya ditolak!");

  const { error: convErr } = await admin.rpc("award_referral_conversion", {
    p_order_id: orderId,
  });
  if (convErr && isConstraintViolation(convErr)) {
    // constraint belum punya 'referral_conversion_bonus' → 0009 belum jalan
    migration0009Missing = true;
    throw new Error(`check constraint menolak insert: ${convErr.message}`);
  }
  expect(!convErr, "service_role panggil award_referral_conversion", convErr?.message);

  let convRowsA = await ledgerRows(A.client, "referral_conversion");
  expect(
    convRowsA.length === 1 && convRowsA[0].delta === 30 && convRowsA[0].ref_id === orderId,
    "ledger A: 1 baris referral_conversion +30 (floor(10% × 300))",
    JSON.stringify(convRowsA),
  );

  let convRowsB = await ledgerRows(B.client, "referral_conversion_bonus");
  expect(
    convRowsB.length === 1 && convRowsB[0].delta === 30 && convRowsB[0].ref_id === orderId,
    "ledger B: 1 baris referral_conversion_bonus +30 (pembeli juga dapat 10%)",
    JSON.stringify(convRowsB),
  );

  const { error: convErr2 } = await admin.rpc("award_referral_conversion", {
    p_order_id: orderId,
  });
  convRowsA = await ledgerRows(A.client, "referral_conversion");
  convRowsB = await ledgerRows(B.client, "referral_conversion_bonus");
  expect(
    !convErr2 && convRowsA.length === 1 && convRowsB.length === 1,
    "idempoten: ulang konversi → tetap masing-masing 1 baris (A & B)",
    convErr2?.message ?? `A=${convRowsA.length}, B=${convRowsB.length}`,
  );

  // ---------- 8. referral_stats A wajar ----------
  console.log("\n5. referral_stats");
  const { data: stats, error: statsErr } = await A.client.rpc("referral_stats");
  expect(
    !statsErr &&
      stats?.code === codeA &&
      stats?.invited === 1 &&
      stats?.converted === 1 &&
      stats?.earned === 30,
    "stats A: {code, invited:1, converted:1, earned:30}",
    statsErr?.message ?? JSON.stringify(stats),
  );

  // ---------- 9. cache profiles.credits sinkron dgn SUM(ledger) — A & B ----------
  console.log("\n6. Cache credits = SUM(ledger)");
  for (const [label, u] of [
    ["A", A],
    ["B", B],
  ]) {
    const { data: bal } = await u.client.rpc("credit_balance");
    const { data: prof } = await u.client
      .from("profiles")
      .select("credits")
      .eq("id", u.id)
      .single();
    expect(
      typeof bal === "number" && prof?.credits === bal,
      `cache profiles.credits ${label} = SUM(ledger)`,
      `cache=${prof?.credits}, ledger=${bal}`,
    );
  }
} catch (e) {
  if (migrationMissing) {
    console.error("\nJALANKAN 0008 DULU — supabase/migrations/0008_referral.sql belum dijalankan di DB.");
  } else if (migration0009Missing) {
    console.error("\nJALANKAN 0009 DULU — supabase/migrations/0009_referral_transaksi.sql belum dijalankan di DB.");
  } else {
    console.error(`\nBerhenti lebih awal: ${e.message}`);
    fail++;
  }
} finally {
  // ---------- bersih-bersih: hapus SEMUA user uji ----------
  for (const uid of testUserIds) {
    const { error } = await admin.auth.admin.deleteUser(uid);
    if (error) console.error(`(✖ gagal hapus user uji ${uid}: ${error.message})`);
  }
  if (testUserIds.length) {
    console.log(`\n(${testUserIds.length} user uji dibersihkan)`);
  }
}

if (migrationMissing || migration0009Missing) process.exit(2);
console.log(`\nHasil: ${pass} lulus, ${fail} gagal\n`);
process.exit(fail > 0 ? 1 : 0);
