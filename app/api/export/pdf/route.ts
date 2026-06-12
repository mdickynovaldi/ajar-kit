/* AjarKit — POST /api/export/pdf : render PDF berbranding (dokumen / invoice).
   body = { kind: "document", data: DocPdfInput & { template?: "rpp" | "rps" } }
        | { kind: "invoice", data: InvoicePdfInput }
   template "rpp" → layout Modul Ajar/RPP guru formal (rpp-pdf);
   template "rps" → layout RPS dosen resmi universitas, landscape (rps-pdf).

   Kebijakan paket DITEGAKKAN DI SERVER (prd.md: gratis = watermark + ajakan
   upgrade; berbayar = bersih) utk kind "document": Supabase terkonfigurasi →
   wajib Bearer token (tanpa token → 401) dan plan dibaca dari profiles.plan;
   mode mock → free. Flag watermark dari body klien SELALU ditimpa.
   Invoice (struk) TIDAK diberi watermark → tidak perlu resolusi plan. */

import { registerExport, resolvePlanFromRequest } from "@/lib/server/plan";
import { renderDocumentPdf } from "@/lib/server/pdf/document-pdf";
import { renderInvoicePdf, type InvoicePdfInput } from "@/lib/server/pdf/invoice-pdf";
import { renderRppPdf, type RppPdfInput } from "@/lib/server/pdf/rpp-pdf";
import { renderRpsPdf, type RpsPdfInput } from "@/lib/server/pdf/rps-pdf";

export const runtime = "nodejs";

/** warn migration 0007 belum jalan: sekali saja per proses (hindari spam log) */
let warnedRegisterExportMissing = false;

function sanitize(name: string): string {
  return (
    name
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 80) || "ajarkit"
  );
}

export async function POST(req: Request) {
  let body: { kind?: string; data?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "BODY_TIDAK_VALID" }, { status: 400 });
  }

  let buffer: Uint8Array;
  let filename: string;

  try {
    if (body.kind === "document") {
      // plan WAJIB dari server (Bearer + profiles.plan) — bukan dari body
      const planRes = await resolvePlanFromRequest(req);
      if (!planRes.ok) {
        return Response.json(
          { error: planRes.error },
          { status: planRes.status },
        );
      }
      const data = body.data as RppPdfInput &
        RpsPdfInput & { template?: "rpp" | "rps" };
      if (!data?.title || !Array.isArray(data.sections)) {
        return Response.json({ error: "BODY_TIDAK_VALID" }, { status: 400 });
      }
      // logo wajib data-URL gambar & tidak kebesaran (≤ ~500KB)
      const logo = data.instansi?.logoDataUrl;
      if (logo && (!/^data:image\/(png|jpe?g);base64,/.test(logo) || logo.length > 700_000)) {
        data.instansi = { ...data.instansi, logoDataUrl: undefined };
      }
      // watermark DITENTUKAN SERVER dari plan — timpa apapun nilai dari klien
      data.watermark = planRes.plan === "free";
      // paket free: jatah ekspor PDF dokumen 1x — dicatat & ditegakkan di DB
      // via RPC register_export (security definer). Mode mock (tanpa token)
      // tidak dibatasi. (DOCX sudah 403 utk free di route-nya sendiri.)
      if (planRes.plan === "free" && planRes.token) {
        const reg = await registerExport(planRes.token, "document");
        if (!reg.allowed) {
          return Response.json(
            {
              error: "EKSPOR_LIMIT",
              message: "Versi gratis hanya bisa ekspor 1x",
            },
            { status: 403 },
          );
        }
        if (reg.missing && !warnedRegisterExportMissing) {
          warnedRegisterExportMissing = true;
          console.warn(
            "AjarKit: fungsi register_export belum ada — jalankan migration 0007 (jatah ekspor free tidak ditegakkan).",
          );
        }
      }
      buffer =
        data.template === "rps"
          ? await renderRpsPdf(data) // RPS dosen → landscape otomatis
          : data.template === "rpp"
            ? await renderRppPdf(data)
            : await renderDocumentPdf(data);
      filename = `${sanitize(data.title)}.pdf`;
    } else if (body.kind === "invoice") {
      const data = body.data as InvoicePdfInput;
      if (!data?.orderId) {
        return Response.json({ error: "BODY_TIDAK_VALID" }, { status: 400 });
      }
      buffer = await renderInvoicePdf(data);
      filename = `struk-${sanitize(data.orderId)}.pdf`;
    } else {
      return Response.json({ error: "KIND_TIDAK_DIKENAL" }, { status: 400 });
    }
  } catch (e) {
    console.error("AjarKit: render PDF gagal", e);
    return Response.json({ error: "RENDER_GAGAL" }, { status: 500 });
  }

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
