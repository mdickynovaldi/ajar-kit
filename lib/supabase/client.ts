/* AjarKit — klien Supabase (browser).
   Bila env belum diisi, getSupabase() mengembalikan null dan seluruh
   aplikasi otomatis jatuh ke MODE MOCK (lihat lib/store.tsx). */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const SUPABASE_ENABLED = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!SUPABASE_ENABLED) return null;
  if (!client) {
    client = createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true, // tangani link verifikasi/reset dari email
      },
    });
  }
  return client;
}

/** Pesan error Supabase → Bahasa Indonesia ramah pengguna */
export function authErrorMessage(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email atau sandi salah.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Email sudah terdaftar.";
  if (m.includes("email not confirmed"))
    return "Email belum diverifikasi. Cek kotak masukmu, ya.";
  if (m.includes("password should be at least"))
    return "Kata sandi minimal 6 karakter.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Terlalu banyak percobaan. Coba lagi sebentar lagi, ya.";
  if (m.includes("network") || m.includes("fetch"))
    return "Jaringan bermasalah. Coba lagi, ya.";
  return "Terjadi kesalahan. Coba lagi, ya.";
}
