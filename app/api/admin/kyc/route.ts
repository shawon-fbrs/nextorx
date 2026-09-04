import { NextRequest } from "next/server";
import { z } from "zod";
import { requirePermission, toJsonError } from "@/lib/api";
import { logAudit } from "@/lib/services/audit";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    await requirePermission("kyc", "list");
    const status = request.nextUrl.searchParams.get("status");
    const [submissions, counts] = await Promise.all([
      prisma.kycSubmission.findMany({
        where: status ? { status } : {},
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true, userId: true, tier: true, idType: true, idNumber: true,
          status: true, reviewedAt: true, note: true, createdAt: true,
          idFrontMime: true, idBackMime: true, selfieMime: true,
        },
      }),
      prisma.kycSubmission.groupBy({ by: ["status"], _count: true }),
    ]);
    const users = await prisma.user.findMany({
      where: { id: { in: submissions.map((s) => s.userId) } },
      select: { id: true, email: true, name: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));
    return Response.json({
      submissions: submissions.map((s) => ({ ...s, user: userMap.get(s.userId) ?? null })),
      counts: Object.fromEntries(counts.map((c) => [c.status, c._count])),
    });
  } catch (e) {
    return toJsonError(e);
  }
}

const reviewSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["approve", "reject"]),
  note: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const admin = await requirePermission("kyc", "approve");
    const parsed = reviewSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }
    if (parsed.data.action === "reject") {
      await requirePermission("kyc", "reject");
    }
    const submission = await prisma.kycSubmission.findUnique({
      where: { id: parsed.data.id },
    });
    if (!submission) {
      return Response.json({ error: "Submission not found" }, { status: 404 });
    }
    if (submission.status !== "PENDING") {
      return Response.json({ error: `Submission already ${submission.status.toLowerCase()}` }, { status: 400 });
    }
    const status = parsed.data.action === "approve" ? "APPROVED" : "REJECTED";
    await prisma.$transaction(async (tx) => {
      await tx.kycSubmission.update({
        where: { id: submission.id },
        data: {
          status,
          reviewedById: admin.id,
          reviewedAt: new Date(),
          note: parsed.data.note,
        },
      });
      await tx.user.update({
        where: { id: submission.userId },
        data: { kycStatus: status === "APPROVED" ? "TIER_1" : "REJECTED" },
      });
    });
    await logAudit(admin.id, `kyc.${parsed.data.action}`, "KycSubmission", submission.id, {
      userId: submission.userId,
      note: parsed.data.note,
    });
    return Response.json({ ok: true, status });
  } catch (e) {
    return toJsonError(e);
  }
}
