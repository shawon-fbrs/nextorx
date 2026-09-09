import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { toJsonError } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const pairId = request.nextUrl.searchParams.get("pairId");
    const where = {
      status: "ACTIVE" as const,
      ...(pairId ? { pairId } : {}),
    };
    const [up, down] = await Promise.all([
      prisma.trade.count({ where: { ...where, direction: "UP" } }),
      prisma.trade.count({ where: { ...where, direction: "DOWN" } }),
    ]);
    const total = up + down;
    return Response.json({
      pairId: pairId ?? null,
      up,
      down,
      total,
      upPct: total > 0 ? Math.round((up / total) * 100) : 50,
    });
  } catch (e) {
    return toJsonError(e);
  }
}
