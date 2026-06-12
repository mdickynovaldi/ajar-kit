/* AjarKit — klien Supabase SISI SERVER (route handlers).
   File ini hanya boleh diimpor dari app/api/** — memakai secret server. */

import "server-only";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const SUPABASE_SERVER_ENABLED = Boolean(URL_ && ANON);

/** Klien admin (service role) — lewati RLS. HANYA utk webhook/settlement. */
export function adminClient(): SupabaseClient | null {
  if (!URL_ || !SERVICE) return null;
  return createClient(URL_, SERVICE, { auth: { persistSession: false } });
}

/** Klien yang berjalan SEBAGAI USER (JWT dari header Authorization) —
    semua query/RPC tunduk RLS & auth.uid() user tsb. */
export function userClient(accessToken: string): SupabaseClient | null {
  if (!URL_ || !ANON) return null;
  return createClient(URL_, ANON, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

/** Ambil & verifikasi user dari "Authorization: Bearer <jwt>". */
export async function getUserFromRequest(
  req: Request,
): Promise<{ user: User; token: string } | null> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token || !URL_ || !ANON) return null;
  const sb = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return null;
  return { user: data.user, token };
}
