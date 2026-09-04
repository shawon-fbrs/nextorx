import { NextRequest } from "next/server";
import { requirePermission, toJsonError, parseListQuery } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    await requirePermission("trade", "list");
    const { status, limit } = parseListQuery(request.nextUrl, ["PENDING", "ACTIVE", "WON", "LOST", "CANCELLED"], 500);

    const trades = await prisma.trade.findMany({
      where: status ? { status: status as "ACTIVE" } : undefined,
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 500),
      include: {
        pair: { select: { id: true, name: true, category: true } },
        user: { select: { id: true, name: true, email: true, uid: true } },
      },
    });

    return Response.json({ trades });
  } catch (e) {
    return toJsonError(e);
  }
}
