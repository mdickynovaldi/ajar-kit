/* AjarKit — POST /api/generate (prd.md §9, kontrak Edge Function "generate").
   Server-side: panggil model via OpenRouter (rahasia di server), validasi JSON,
   lalu simpan dokumen + potong kredit ATOMIK via RPC generate_documents yang
   dijalankan SEBAGAI USER (RLS + auth.uid() tetap berlaku).

   Bila OPENROUTER_API_KEY kosong → { mode: "simulated" } dan klien memakai
   jalur fallback konten contoh (prd.md §14).
   Konteks RAG: match_curriculum (full-text; migrations 0003-0004). TODO M1+:
   upgrade ke pgvector saat pipeline embedding tersedia. */

import { NextResponse } from "next/server";
import { AI_ENABLED, generateDocContent } from "@/lib/server/ai";
import { allowRequest } from "@/lib/server/rate-limit";
import { getUserFromRequest, userClient } from "@/lib/server/supabase";
import { getPostHogClient } from "@/lib/posthog-server";
import type { DocContent, DocType, QualityMode } from "@/lib/types";

export const maxDuration = 120; // AI bisa 30-90 dtk

interface GenerateBody {
  jobRef: string;
  cost: number;
  docs: {
    title: string;
    type: DocType;
    subject: string;
    jenjang: string;
    qualityMode: QualityMode;
    /** khusus modul_ajar: jumlah pertemuan yang diminta (1-16) */
    pertemuanCount?: number;
    /** khusus modul_ajar: sertakan lampiran LKPD di dalam dokumen */
    includeLkpd?: boolean;
    /** konten contoh dari klien — dipakai bila AI gagal utk dokumen tsb */
    fallbackContent: DocContent | null;
  }[];
}

export async function POST(req: Request) {
  if (!AI_ENABLED) {
    return NextResponse.json({ mode: "simulated" as const });
  }

  const auth = await getUserFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "TIDAK_LOGIN" }, { status: 401 });
  }

  // batasi panggilan AI berbayar: 6 generate / menit / user
  if (!allowRequest(`gen:${auth.user.id}`, 6, 60_000)) {
    return NextResponse.json(
      { error: "TERLALU_SERING" },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  let body: GenerateBody;
  try {
    body = (await req.json()) as GenerateBody;
  } catch {
    return NextResponse.json({ error: "BODY_TIDAK_VALID" }, { status: 400 });
  }
  if (
    !body?.jobRef ||
    !Array.isArray(body.docs) ||
    body.docs.length === 0 ||
    body.docs.length > 6 ||
    typeof body.cost !== "number" ||
    body.cost < 0 ||
    body.cost > 1000 ||
    body.docs.some(
      (d) =>
        (d.pertemuanCount !== undefined &&
          (typeof d.pertemuanCount !== "number" ||
            !Number.isInteger(d.pertemuanCount) ||
            d.pertemuanCount < 1 ||
            d.pertemuanCount > 16)) ||
        (d.includeLkpd !== undefined && typeof d.includeLkpd !== "boolean"),
    )
  ) {
    return NextResponse.json({ error: "BODY_TIDAK_VALID" }, { status: 400 });
  }

  const sb = userClient(auth.token);
  if (!sb) {
    return NextResponse.json({ error: "SUPABASE_BELUM_DIKONFIGURASI" }, { status: 500 });
  }

  // 0) Profil penyusun (nama + sekolah/instansi) — agar AI mengisi identitas
  //    dokumen tanpa placeholder — sekaligus plan utk penegakan paket.
  //    Best-effort utk identitas: gagal → AI memberi isian manual.
  const { data: prof } = (await sb
    .from("profiles")
    .select("nama, nama_instansi, sekolah, plan")
    .eq("id", auth.user.id)
    .single()) as {
    data: {
      nama?: string | null;
      nama_instansi?: string | null;
      sekolah?: string | null;
      plan?: string | null;
    } | null;
  };
  const penyusun = {
    nama: prof?.nama || undefined,
    sekolah: prof?.nama_instansi || prof?.sekolah || undefined,
  };

  // Paket free hanya boleh model paling hemat — PAKSA di server utk SEMUA
  // dokumen SEBELUM pre-check kredit & panggilan AI, apa pun kiriman klien.
  // Profil gagal dibaca → perlakukan sebagai free (default paling ketat).
  // cost dari klien dibiarkan: RPC generate_documents tetap sumber kebenaran.
  if (!prof || (prof.plan ?? "free") === "free") {
    for (const d of body.docs) d.qualityMode = "hemat";
  }

  // 0b) Pra-cek saldo SEBELUM panggilan AI berbayar — mencegah user tanpa
  //     kredit membakar biaya model berulang kali. Validasi final tetap
  //     atomik di RPC generate_documents (sumber kebenaran).
  {
    const { data: bal, error: balErr } = await sb.rpc("credit_balance");
    if (balErr) {
      console.error("AjarKit: credit_balance gagal", balErr);
      return NextResponse.json({ error: "GENERATE_GAGAL" }, { status: 500 });
    }
    if (typeof bal === "number" && bal < body.cost) {
      return NextResponse.json({ error: "KREDIT_TIDAK_CUKUP" }, { status: 402 });
    }
  }

  // 1) Konteks RAG dari curriculum_docs (prd.md §9 langkah 1) — best-effort
  let context: string[] = [];
  try {
    const first = body.docs[0];
    const { data: chunks } = await sb.rpc("match_curriculum", {
      p_query: `${first.title} ${first.subject} ${first.jenjang}`,
      p_scope: first.type === "rps" ? "dosen" : "guru",
      p_k: 4,
    });
    context = ((chunks ?? []) as { chunk_text: string }[]).map(
      (c) => c.chunk_text,
    );
  } catch (e) {
    console.error("AjarKit RAG: match_curriculum gagal (lanjut tanpa konteks)", e);
  }

  // 2) Generate konten per dokumen (paralel); gagal per-dokumen → fallback
  const contents = await Promise.all(
    body.docs.map(async (d) => {
      try {
        return await generateDocContent({
          title: d.title,
          type: d.type,
          subject: d.subject,
          jenjang: d.jenjang,
          qualityMode: d.qualityMode,
          pertemuanCount: d.pertemuanCount,
          includeLkpd: d.includeLkpd,
          context,
          penyusun,
        });
      } catch (e) {
        console.error(`AjarKit AI: gagal utk "${d.title}" — pakai fallback`, e);
        return d.fallbackContent;
      }
    }),
  );

  // 3) Simpan + potong kredit ATOMIK sebagai user (validasi saldo di DB)
  const { data, error } = await sb.rpc("generate_documents", {
    p_job_ref: body.jobRef,
    p_cost: body.cost,
    p_docs: body.docs.map((d, i) => ({
      title: d.title,
      type: d.type,
      subject: d.subject,
      jenjang: d.jenjang,
      quality_mode: d.qualityMode,
      content: contents[i],
    })),
  });

  if (error) {
    if (error.message.includes("KREDIT_TIDAK_CUKUP")) {
      return NextResponse.json({ error: "KREDIT_TIDAK_CUKUP" }, { status: 402 });
    }
    console.error("AjarKit: RPC generate_documents gagal", error);
    return NextResponse.json({ error: "GENERATE_GAGAL" }, { status: 500 });
  }

  const rows = (data ?? []) as { id: string; title: string; type: DocType }[];
  const contentByTitle = new Map(body.docs.map((d, i) => [d.title, contents[i]]));

  const phog = getPostHogClient();
  phog.capture({
    distinctId: auth.user.id,
    event: "document_generated",
    properties: {
      doc_count: rows.length,
      doc_types: body.docs.map((d) => d.type),
      cost: body.cost,
      quality_mode: body.docs[0]?.qualityMode,
      mode: "ai",
    },
  });
  await phog.shutdown();

  return NextResponse.json({
    mode: "ai" as const,
    docs: rows.map((r) => ({
      ...r,
      content: contentByTitle.get(r.title) ?? null,
    })),
  });
}
