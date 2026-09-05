import { NextRequest } from "next/server";
import { z } from "zod";
import { requirePermission, toJsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/services/audit";

const CATEGORY_DEFAULTS: Record<string, { volatility: number; spread: number; payoutPercent: number }> = {
  forex:       { volatility: 0.5,  spread: 0.0002, payoutPercent: 80 },
  crypto:      { volatility: 2.0,  spread: 0.001,  payoutPercent: 85 },
  commodities: { volatility: 1.0,  spread: 0.0005, payoutPercent: 78 },
  indices:     { volatility: 0.8,  spread: 0.0003, payoutPercent: 82 },
  stocks:      { volatility: 1.2,  spread: 0.0008, payoutPercent: 82 },
};

const createPairSchema = z.object({
  id: z.string().min(1).max(20).regex(/^[A-Z0-9]+$/, "ID must be uppercase alphanumeric"),
  name: z.string().min(1).max(50),
  symbol: z.string().max(20).optional(),
  category: z.enum(["forex", "crypto", "commodities", "indices", "stocks"]),
  feed: z.enum(["synthetic", "mirror"]).default("synthetic"),
  basePrice: z.number().positive(),
  volatility: z.number().positive().optional(),
  payoutPercent: z.number().min(50).max(95).optional(),
  weekendPayout: z.number().min(50).max(95).optional(),
  spread: z.number().min(0).optional(),
  minTrade: z.number().positive().optional(),
  maxTrade: z.number().positive().optional(),
  maxPayout: z.number().min(50).max(95).optional(),
  description: z.string().optional(),
  tradingHours: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isFeatured: z.boolean().optional(),
  maxDailyVolume: z.number().int().positive().optional(),
});

export async function GET() {
  try {
    await requirePermission("pair", "list");

    const pairs = await prisma.pair.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        _count: { select: { trades: true } },
      },
    });

    return Response.json({ pairs });
  } catch (e) {
    return toJsonError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requirePermission("pair", "create");
    const parsed = createPairSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }

    const existing = await prisma.pair.findUnique({ where: { id: parsed.data.id } });
    if (existing) {
      return Response.json({ error: `Pair "${parsed.data.id}" already exists` }, { status: 409 });
    }

    const defaults = CATEGORY_DEFAULTS[parsed.data.category];
    const maxSort = await prisma.pair.aggregate({ _max: { sortOrder: true } });

    const pair = await prisma.pair.create({
      data: {
        id: parsed.data.id,
        name: parsed.data.name,
        symbol: parsed.data.symbol,
        category: parsed.data.category,
        feed: parsed.data.feed,
        basePrice: parsed.data.basePrice,
        volatility: parsed.data.volatility ?? defaults.volatility,
        payoutPercent: parsed.data.payoutPercent ?? defaults.payoutPercent,
        weekendPayout: parsed.data.weekendPayout,
        spread: parsed.data.spread ?? defaults.spread,
        minTrade: parsed.data.minTrade ?? 1,
        maxTrade: parsed.data.maxTrade ?? 5000,
        maxPayout: parsed.data.maxPayout ?? 95,
        description: parsed.data.description,
        tradingHours: parsed.data.tradingHours ?? "24/7",
        tags: parsed.data.tags ?? [],
        isFeatured: parsed.data.isFeatured ?? false,
        maxDailyVolume: parsed.data.maxDailyVolume,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      },
    });

    await logAudit(admin.id, "pair.create", "Pair", pair.id, { name: pair.name, category: pair.category });

    return Response.json({ pair }, { status: 201 });
  } catch (e) {
    return toJsonError(e);
  }
}
