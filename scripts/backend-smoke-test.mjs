/* AjarKit — smoke test backend Supabase.
   Jalankan SETELAH: (1) SQL supabase/migrations/0001_init.sql di-run,
   (2) .env.local terisi NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY.

     bun run scripts/backend-smoke-test.mjs

   Menguji end-to-end: signup → profil + bonus kredit → generate (potong
   kredit, idempoten) → saldo kurang ditolak → top-up simulasi (idempoten)
   → CRUD dokumen → notifikasi → langganan Pro → RLS dasar.

   Catatan: skrip membuat 1 user uji (email acak @example.com). Bila
   SUPABASE_SERVICE_ROLE_KEY terisi di .env.local, user uji otomatis dihapus
   di akhir; bila tidak, hapus manual di Dashboard → Authentication → Users. */

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

const sb = createClient(URL_, ANON, { auth: { persistSession: false } });

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

const stamp = Date.now();
// catatan: Supabase menolak domain example.com — pakai format gmail valid
const EMAIL = `ajarkit.smoke.${stamp}@gmail.com`;
const PASS = `Uji-${stamp}-rahasia!`;
let userId = null;

console.log(`\nAjarKit backend smoke test → ${URL_}\nUser uji: ${EMAIL}\n`);

try {
  // ---------- 1. Auth: buat user uji ----------
  // Dengan service key: buat via admin API (terkonfirmasi, TANPA kirim email —
  // menghindari rate limit email bawaan Supabase). Tanpa service key: signUp publik.
  console.log("1. Auth & profil");
  if (SERVICE) {
    const adminTmp = createClient(URL_, SERVICE, { auth: { persistSession: false } });
    const { data: cu, error: cuErr } = await adminTmp.auth.admin.createUser({
      email: EMAIL,
      password: PASS,
      email_confirm: true,
      user_metadata: { nama: "Uji Coba", role: "guru" },
    });
    if (cuErr) {
      bad("buat user uji (admin)", cuErr.message);
      throw new Error("Tidak bisa lanjut tanpa user.");
    }
    ok("buat user uji via admin (trigger profil tetap berjalan)");
    userId = cu.user?.id ?? null;
  } else {
    const { data: su, error: suErr } = await sb.auth.signUp({
      email: EMAIL,
      password: PASS,
      options: { data: { nama: "Uji Coba", role: "guru" } },
    });
    if (suErr) {
      bad("signUp", suErr.message);
      throw new Error("Tidak bisa lanjut tanpa user.");
    }
    ok("signUp");
    userId = su.user?.id ?? null;
  }

  const { error: siErr } = await sb.auth.signInWithPassword({
    email: EMAIL,
    password: PASS,
  });
  if (siErr) {
    bad(
      "signIn",
      `${siErr.message} — bila "Confirm email" aktif & tanpa service key, ` +
        `matikan dulu di Dashboard → Authentication → Sign In / Up.`,
    );
    throw new Error("Butuh sesi untuk lanjut.");
  }
  ok("punya sesi login");

  // ---------- 2. Profil + bonus kredit dari trigger ----------
  const { data: prof, error: profErr } = await sb
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  expect(!profErr && prof, "trigger handle_new_user membuat baris profiles", profErr?.message);
  expect(prof?.role === "guru", "role dari metadata signup", `role=${prof?.role}`);

  // bonus pendaftaran dibaca dinamis dari ledger (50 sejak 0007_free_tier);
  // semua angka saldo di bawah dihitung relatif terhadap nilai ini
  const { data: bonusRow, error: bonusErr } = await sb
    .from("credit_ledger")
    .select("delta")
    .eq("user_id", userId)
    .eq("ref_id", "signup-bonus")
    .single();
  const BONUS = bonusRow?.delta ?? 50;
  expect(
    !bonusErr && bonusRow?.delta === 50,
    "ledger signup-bonus = 50 (free tier, migration 0007)",
    bonusErr?.message ?? `delta=${bonusRow?.delta}`,
  );
  expect(prof?.credits === BONUS, `bonus kredit awal ${BONUS} (cache)`, `credits=${prof?.credits}`);

  const { data: bal0 } = await sb.rpc("credit_balance");
  expect(bal0 === BONUS, `credit_balance() dari ledger = ${BONUS}`, `balance=${bal0}`);

  // ---------- 3. Generate: potong kredit atomik ----------
  console.log("\n2. Generate dokumen (RPC generate_documents)");
  const GEN_COST = 30; // harus < bonus pendaftaran + REGEN_COST agar alur uji muat di saldo awal
  const REGEN_COST = 8;
  const TOPUP_CREDITS = 300;
  const jobRef = `job-smoke-${stamp}`;
  const docsPayload = [
    {
      title: "Modul Ajar Uji — Ekosistem",
      type: "modul_ajar",
      subject: "IPAS",
      jenjang: "Kelas 5",
      quality_mode: "standar",
      content: { sections: [{ id: "s1", title: "Uji", blocks: ["Halo"] }] },
    },
    {
      title: "LKPD Uji — Ekosistem",
      type: "lkpd",
      subject: "IPAS",
      jenjang: "Kelas 5",
      quality_mode: "standar",
      content: null,
    },
  ];
  const { data: gen, error: genErr } = await sb.rpc("generate_documents", {
    p_job_ref: jobRef,
    p_cost: GEN_COST,
    p_docs: docsPayload,
  });
  expect(!genErr, "generate_documents sukses", genErr?.message);
  expect(gen?.length === 2, "2 dokumen dibuat", `dapat ${gen?.length}`);

  const afterGen = BONUS - GEN_COST;
  const { data: bal1 } = await sb.rpc("credit_balance");
  expect(bal1 === afterGen, `kredit terpotong ${GEN_COST} → ${afterGen}`, `balance=${bal1}`);

  // idempoten: panggil ulang ref sama → tidak memotong lagi
  const { data: gen2, error: gen2Err } = await sb.rpc("generate_documents", {
    p_job_ref: jobRef,
    p_cost: GEN_COST,
    p_docs: docsPayload,
  });
  const { data: bal2 } = await sb.rpc("credit_balance");
  expect(
    !gen2Err && bal2 === afterGen && gen2?.length === 2,
    "idempoten: ref sama tidak memotong ulang & kembalikan dokumen yang sama",
    gen2Err?.message ?? `balance=${bal2}, docs=${gen2?.length}`,
  );

  // saldo kurang → ditolak, kredit utuh
  const { error: brokeErr } = await sb.rpc("generate_documents", {
    p_job_ref: `job-mahal-${stamp}`,
    p_cost: 999999,
    p_docs: [docsPayload[0]],
  });
  const { data: bal3 } = await sb.rpc("credit_balance");
  expect(
    brokeErr?.message?.includes("KREDIT_TIDAK_CUKUP") && bal3 === afterGen,
    "saldo kurang → error KREDIT_TIDAK_CUKUP, kredit utuh",
    brokeErr?.message ?? `balance=${bal3}`,
  );

  // ---------- 4. spend_credits (regenerasi editor) ----------
  const afterRegen = afterGen - REGEN_COST;
  const { data: spent, error: spendErr } = await sb.rpc("spend_credits", {
    p_amount: REGEN_COST,
    p_ref: `regen-${stamp}`,
  });
  expect(
    !spendErr && spent === afterRegen,
    `spend_credits ${REGEN_COST} → ${afterRegen}`,
    spendErr?.message ?? `=${spent}`,
  );

  // ---------- 5. Pembayaran simulasi ----------
  console.log("\n3. Top-up & langganan (RPC simulate_payment)");
  const orderId = `order-smoke-${stamp}`;
  const afterTopup = afterRegen + TOPUP_CREDITS;
  const { data: paid, error: payErr } = await sb.rpc("simulate_payment", {
    p_order_id: orderId,
    p_type: "topup",
    p_label: `Top-up ${TOPUP_CREDITS} kredit`,
    p_method: "qris",
    p_amount: 39000,
    p_credits: TOPUP_CREDITS,
  });
  expect(
    !payErr && paid === afterTopup,
    `top-up ${TOPUP_CREDITS} → saldo ${afterTopup}`,
    payErr?.message ?? `=${paid}`,
  );

  const { data: paid2 } = await sb.rpc("simulate_payment", {
    p_order_id: orderId,
    p_type: "topup",
    p_label: `Top-up ${TOPUP_CREDITS} kredit`,
    p_method: "qris",
    p_amount: 39000,
    p_credits: TOPUP_CREDITS,
  });
  expect(paid2 === afterTopup, "idempoten: order_id sama tidak menambah ulang", `=${paid2}`);

  const { data: trxs } = await sb.from("transactions").select("*");
  expect(trxs?.length === 1 && trxs[0].status === "lunas", "1 transaksi lunas tercatat", `n=${trxs?.length}`);

  const { data: subBal, error: subErr } = await sb.rpc("simulate_payment", {
    p_order_id: `order-pro-${stamp}`,
    p_type: "subscription",
    p_label: "Pro 30 hari",
    p_method: "qris",
    p_amount: 49000,
    p_credits: 0,
  });
  const { data: prof2 } = await sb.from("profiles").select("plan").eq("id", userId).single();
  expect(
    !subErr && subBal === afterTopup && prof2?.plan === "pro",
    "langganan Pro → plan=pro, kredit tetap",
    subErr?.message ?? `plan=${prof2?.plan}`,
  );

  // ---------- 6. CRUD dokumen via RLS ----------
  console.log("\n4. Dokumen, notifikasi & RLS");
  // fallback bila generate gagal: insert langsung agar seksi CRUD/RLS tetap teruji
  let docId = gen?.[0]?.id ?? null;
  if (!docId) {
    bad("dokumen dari generate tersedia", "generate gagal — pakai insert langsung");
    const { data: ins } = await sb
      .from("documents")
      .insert({ owner_id: userId, type: "modul_ajar", title: "Fallback Uji" })
      .select("id")
      .single();
    docId = ins?.id ?? null;
  }
  const { error: updErr } = await sb
    .from("documents")
    .update({ title: "Modul Ajar Uji (diedit)", status: "draft" })
    .eq("id", docId);
  expect(!updErr, "update dokumen milik sendiri", updErr?.message);

  const { error: insNotifErr } = await sb.from("notifications").insert({
    user_id: userId,
    type: "dokumen",
    payload: { title: "Uji notifikasi", body: "Halo" },
  });
  expect(!insNotifErr, "insert notifikasi milik sendiri", insNotifErr?.message);

  // RLS: tulis langsung ke ledger harus DITOLAK
  const { error: ledgerErr } = await sb.from("credit_ledger").insert({
    user_id: userId,
    delta: 999999,
    reason: "bonus",
    balance_after: 999999,
  });
  expect(!!ledgerErr, "RLS: insert langsung ke credit_ledger DITOLAK", "harusnya ditolak!");

  const { error: trxInsErr } = await sb.from("transactions").insert({
    user_id: userId,
    type: "topup",
    label: "curang",
    method: "qris",
    amount: 0,
    order_id: `hack-${stamp}`,
  });
  expect(!!trxInsErr, "RLS: insert langsung ke transactions DITOLAK", "harusnya ditolak!");

  // update credits cache langsung harus DITOLAK (column grant)
  const { data: credPatch } = await sb
    .from("profiles")
    .update({ credits: 999999 })
    .eq("id", userId)
    .select("credits");
  const { data: balAkhir } = await sb.rpc("credit_balance");
  expect(
    (!credPatch || credPatch.length === 0 || credPatch[0]?.credits !== 999999) && balAkhir === afterTopup,
    "kolom profiles.credits tidak bisa diubah klien",
    `cache=${JSON.stringify(credPatch)}, ledger=${balAkhir}`,
  );

  const { error: delErr } = await sb.from("documents").delete().eq("id", docId);
  expect(!delErr, "hapus dokumen milik sendiri", delErr?.message);

  await sb.auth.signOut();
  ok("signOut");
} catch (e) {
  console.error(`\nBerhenti lebih awal: ${e.message}`);
} finally {
  // ---------- bersih-bersih ----------
  if (SERVICE && userId) {
    const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });
    const { error } = await admin.auth.admin.deleteUser(userId);
    console.log(
      error
        ? `\n(✖ gagal hapus user uji: ${error.message})`
        : `\n(user uji ${EMAIL} sudah dihapus)`,
    );
  } else if (userId) {
    console.log(`\n(Catatan: hapus user uji ${EMAIL} manual di Dashboard → Authentication → Users)`);
  }
}

console.log(`\nHasil: ${pass} lulus, ${fail} gagal\n`);
process.exit(fail > 0 ? 1 : 0);
