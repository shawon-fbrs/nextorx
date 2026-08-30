import { NextRequest } from "next/server";
import { z } from "zod";
import { requirePermission, toJsonError } from "@/lib/api";
import { logAudit } from "@/lib/services/audit";
import { prisma } from "@/lib/db";

const createSchema = z.object({
  code: z.string().trim().min(2).max(30),
  label: z.string().trim().max(120).optional().nullable(),
  percent: z.number().int().min(1).max(100),
  maxBonus: z.number().int().min(0).default(0),
  minDeposit: z.number().int().min(0).default(0),
  maxUses: z.number().int().min(0).default(0),
  usesPerUser: z.number().int().min(0).default(0),
  validUntil: z.string().datetime({ offset: true }).nullable().optional(),
});

export async function GET() {
  try {
    await requirePermission("promo", "read");
    const promos = await prisma.promoCode.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { uses: true } } },
    });
    return Response.json({ promos });
  } catch (e) {
    return toJsonError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requirePermission("promo", "manage");
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }
    const { code, validUntil, ...data } = parsed.data;
    const promo = await prisma.promoCode.create({
      data: {
        ...data,
        code: code.toUpperCase(),
        validUntil: validUntil ? new Date(validUntil) : null,
      },
    });
    await logAudit(admin.id, "promo.create", "PromoCode", promo.id, {
      code: promo.code,
      percent: promo.percent,
    });
    return Response.json({ promo }, { status: 201 });
  } catch (e) {
    return toJsonError(e);
  }
}
