import { NextRequest } from "next/server";
import { z } from "zod";
import { requirePermission, toJsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/services/audit";
import { getOTCEngine } from "@/lib/otc-engine";

const updatePairSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  symbol: z.string().max(20).optional().nullable(),
  category: z.enum(["forex", "crypto", "commodities", "indices"]).optional(),
  basePrice: z.number().positive().optional(),
  volatility: z.number().positive().optional(),
  payoutPercent: z.number().min(50).max(95).optional(),
  weekendPayout: z.number().min(50).max(95).optional().nullable(),
  spread: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  minTrade: z.number().positive().optional(),
  maxTrade: z.number().positive().optional(),
  maxPayout: z.number().min(50).max(95).optional().nullable(),
  description: z.string().optional().nullable(),
  tradingHours: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  maxDailyVolume: z.number().int().positive().optional().nullable(),
  sortOrder: z.number().int().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requirePermission("pair", "update");
    const { id } = await params;
    const parsed = updatePairSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }

    const existing = await prisma.pair.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Pair not found" }, { status: 404 });
    }

    const data = parsed.data;

    const pair = await prisma.pair.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.symbol !== undefined && { symbol: data.symbol }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.basePrice !== undefined && { basePrice: data.basePrice }),
        ...(data.volatility !== undefined && { volatility: data.volatility }),
        ...(data.payoutPercent !== undefined && { payoutPercent: data.payoutPercent }),
        ...(data.weekendPayout !== undefined && { weekendPayout: data.weekendPayout }),
        ...(data.spread !== undefined && { spread: data.spread }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.isFeatured !== undefined && { isFeatured: data.isFeatured }),
        ...(data.minTrade !== undefined && { minTrade: data.minTrade }),
        ...(data.maxTrade !== undefined && { maxTrade: data.maxTrade }),
        ...(data.maxPayout !== undefined && { maxPayout: data.maxPayout }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.tradingHours !== undefined && { tradingHours: data.tradingHours }),
        ...(data.tags !== undefined && { tags: data.tags }),
        ...(data.maxDailyVolume !== undefined && { maxDailyVolume: data.maxDailyVolume }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      },
    });

    try {
      const engine = await getOTCEngine();
      const changes: Record<string, unknown> = {};
      if (data.volatility !== undefined) changes.volatility = data.volatility;
      if (data.payoutPercent !== undefined) changes.payoutPercent = data.payoutPercent;
      if (data.spread !== undefined) changes.spread = data.spread;
      if (data.isActive !== undefined) changes.isActive = data.isActive;
      if (Object.keys(changes).length > 0) {
        await engine.updatePair(id, changes);
      }
    } catch {}

    await logAudit(admin.id, "pair.update", "Pair", pair.id, data);

    return Response.json({ pair });
  } catch (e) {
    return toJsonError(e);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requirePermission("pair", "delete");
    const { id } = await params;

    const existing = await prisma.pair.findUnique({
      where: { id },
      include: { _count: { select: { trades: { where: { status: { in: ["PENDING", "ACTIVE"] } } } } } },
    });
    if (!existing) {
      return Response.json({ error: "Pair not found" }, { status: 404 });
    }
    if (existing._count.trades > 0) {
      return Response.json(
        { error: "Cannot delete pair with active trades. Disable it instead." },
        { status: 409 }
      );
    }

    await prisma.candle.deleteMany({ where: { pairId: id } });
    await prisma.pair.delete({ where: { id } });

    try {
      const engine = await getOTCEngine();
      await engine.removePair(id);
    } catch {}

    await logAudit(admin.id, "pair.delete", "Pair", id, { name: existing.name });

    return Response.json({ success: true });
  } catch (e) {
    return toJsonError(e);
  }
}
