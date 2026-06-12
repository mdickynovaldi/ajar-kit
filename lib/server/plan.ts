/* AjarKit — resolusi paket (plan) user di SISI SERVER untuk kebijakan ekspor
   (prd.md: gratis = watermark + ajakan upgrade; berbayar = bersih).
   JANGAN PERNAH percaya field plan/watermark dari body klien.

   Aturan:
   - Supabase TIDAK terkonfigurasi (mode mock dev) → perlakukan sebagai "free".
   - Supabase terkonfigurasi → WAJIB Authorization Bearer; tanpa token → 401.
     plan dibaca dari profiles.plan milik user via klien ber-RLS (userClient).
     Gagal baca profil → fallback "free" (default paling ketat). */

import "server-only";
import {
  SUPABASE_SERVER_ENABLED,
  getUserFromRequest,
  userClient,
} from "@/lib/server/supabase";
import type { Plan } from "@/lib/types";

export type PlanResolution =
  | {
      ok: true;
      plan: Plan;
      /** token Bearer user (utk RPC lanjutan, mis. register_export);
          tidak ada pada mode mock (Supabase tidak terkonfigurasi). */
      token?: string;
    }
  | { ok: false; status: number; error: string };

export async function resolvePlanFromRequest(
  req: Request,
): Promise<PlanResolution> {
  if (!SUPABASE_SERVER_ENABLED) {
    return { ok: true, plan: "free" };
  }

  const auth = await getUserFromRequest(req);
  if (!auth) {
    return { ok: false, status: 401, error: "TIDAK_LOGIN" };
  }

  const sb = userClient(auth.token);
  if (!sb) {
    return { ok: false, status: 500, error: "SUPABASE_BELUM_DIKONFIGURASI" };
  }

  const { data, error } = (await sb
    .from("profiles")
    .select("plan")
    .eq("id", auth.user.id)
    .single()) as { data: { plan?: string } | null; error: unknown };

  const plan: Plan =
    !error && (data?.plan === "pro" || data?.plan === "school")
      ? data.plan
      : "free";
  return { ok: true, plan, token: auth.token };
}

/* ---------------------------------------------------------------------------
   registerExport: catat ekspor & tegakkan jatah paket free via RPC
   register_export (migration 0007, security definer — sumber kebenaran).
   - allowed=false → jatah ekspor free (1x) sudah terpakai → blokir (403).
   - missing=true  → fungsi belum ada di DB (migration 0007 belum dijalankan);
                     JANGAN memblokir — pemanggil cukup console.warn.
--------------------------------------------------------------------------- */
export async function registerExport(
  token: string,
  kind: string,
): Promise<{ allowed: boolean; missing?: boolean }> {
  const sb = userClient(token);
  if (!sb) {
    return { allowed: true, missing: true };
  }

  const { data, error } = await sb.rpc("register_export", { p_kind: kind });
  if (error) {
    const e = error as { code?: string; message?: string };
    // PGRST202 = fungsi tidak ditemukan di schema cache (PostgREST)
    if (
      e.code === "PGRST202" ||
      (e.message ?? "").includes("register_export")
    ) {
      return { allowed: true, missing: true };
    }
  }
  return { allowed: Boolean(data) };
}
