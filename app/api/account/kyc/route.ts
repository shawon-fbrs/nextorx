import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser, toJsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { encryptDocument } from "@/lib/kyc-crypto";

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_ID_TYPES = new Set(["passport", "national_id", "driving_licence"]);

async function readImage(form: FormData, key: string, required: boolean): Promise<{ data: Buffer; mime: string } | null> {
  const file = form.get(key);
  if (!file || !(file instanceof File) || file.size === 0) {
    if (required) throw new Error(`${key} is required`);
    return null;
  }
  if (!ALLOWED_MIME.has(file.type)) throw new Error(`${key} must be JPEG, PNG, or WebP`);
  if (file.size > MAX_FILE_BYTES) throw new Error(`${key} must be under 4MB`);
  const bytes = Buffer.from(await file.arrayBuffer());
  return { data: encryptDocument(bytes), mime: file.type };
}

export async function GET() {
  try {
    const user = await requireUser();
    const [submission, profile] = await Promise.all([
      prisma.kycSubmission.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true, tier: true, idType: true, status: true,
          reviewedAt: true, note: true, createdAt: true,
          idFrontMime: true, idBackMime: true, selfieMime: true,
        },
      }),
      prisma.user.findUnique({ where: { id: user.id }, select: { kycStatus: true } }),
    ]);
    return Response.json({ kycStatus: profile?.kycStatus ?? "NOT_SUBMITTED", submission });
  } catch (e) {
    return toJsonError(e);
  }
}

const metaSchema = z.object({
  idType: z.string().refine((v) => ALLOWED_ID_TYPES.has(v), "Invalid ID type"),
  idNumber: z.string().min(3).max(50),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const form = await request.formData();
    const parsed = metaSchema.safeParse({
      idType: form.get("idType"),
      idNumber: form.get("idNumber"),
    });
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }

    let idFront: { data: Buffer; mime: string } | null;
    let selfie: { data: Buffer; mime: string } | null;
    let idBack: { data: Buffer; mime: string } | null;
    try {
      idFront = await readImage(form, "idFront", true);
      selfie = await readImage(form, "selfie", true);
      idBack = await readImage(form, "idBack", false);
    } catch (e) {
      return Response.json({ error: e instanceof Error ? e.message : "Invalid file" }, { status: 400 });
    }

    const submission = await prisma.$transaction(async (tx) => {
      const created = await tx.kycSubmission.create({
        data: {
          userId: user.id,
          tier: "TIER_1",
          idType: parsed.data.idType,
          idNumber: parsed.data.idNumber,
          idFront: idFront?.data,
          idFrontMime: idFront?.mime,
          idBack: idBack?.data,
          idBackMime: idBack?.mime,
          selfie: selfie?.data,
          selfieMime: selfie?.mime,
          status: "PENDING",
        },
        select: { id: true, status: true, createdAt: true },
      });
      await tx.user.update({
        where: { id: user.id },
        data: { kycStatus: "PENDING" },
      });
      return created;
    });

    return Response.json({ submission }, { status: 201 });
  } catch (e) {
    return toJsonError(e);
  }
}
