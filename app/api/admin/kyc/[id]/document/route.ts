import { NextRequest } from "next/server";
import { requirePermission, toJsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { decryptDocument } from "@/lib/kyc-crypto";

const DOC_TYPES = new Set(["idFront", "idBack", "selfie"]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("kyc", "list");
    const { id } = await params;
    const type = request.nextUrl.searchParams.get("type") ?? "";
    if (!DOC_TYPES.has(type)) {
      return Response.json({ error: "Invalid document type" }, { status: 400 });
    }
    const submission = await prisma.kycSubmission.findUnique({ where: { id } });
    if (!submission) {
      return Response.json({ error: "Submission not found" }, { status: 404 });
    }
    const data = submission[type as "idFront" | "idBack" | "selfie"];
    const mime = submission[`${type}Mime` as "idFrontMime" | "idBackMime" | "selfieMime"];
    if (!data || !mime) {
      return Response.json({ error: "Document not available" }, { status: 404 });
    }
    const decrypted = decryptDocument(Buffer.from(data));
    return new Response(new Uint8Array(decrypted), {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "no-store",
        "Content-Length": String(decrypted.length),
      },
    });
  } catch (e) {
    return toJsonError(e);
  }
}
