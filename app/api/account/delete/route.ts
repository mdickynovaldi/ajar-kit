/* AjarKit — POST /api/account/delete (prd.md §12: "dukung hapus akun/data").
   Hapus permanen akun user yang sedang login: auth.users dihapus via admin
   API (service role) → seluruh data ikut terhapus oleh FK ON DELETE CASCADE
   (profiles → documents/ledger/transactions/notifications/dst).

   Bila SUPABASE_SERVICE_ROLE_KEY kosong → { mode: "simulated" } dan klien
   memakai perilaku lama (akhiri sesi saja). */

import { NextResponse } from "next/server";
import { adminClient, getUserFromRequest } from "@/lib/server/supabase";

export async function POST(req: Request) {
  const admin = adminClient();
  if (!admin) {
    return NextResponse.json({ mode: "simulated" as const });
  }

  const auth = await getUserFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "TIDAK_LOGIN" }, { status: 401 });
  }

  const { error } = await admin.auth.admin.deleteUser(auth.user.id);
  if (error) {
    console.error("AjarKit: hapus akun gagal", error);
    return NextResponse.json({ error: "HAPUS_GAGAL" }, { status: 500 });
  }

  return NextResponse.json({ mode: "deleted" as const });
}
