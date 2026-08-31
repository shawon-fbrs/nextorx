import { NextRequest } from "next/server";
import { requirePermission, toJsonError } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    await requirePermission("trade", "list");
    const status = request.nextUrl.searchParams.get("status");
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? 100);

    const trades = await prisma.trade.findMany({
      where: status ? { status: status as any } : undefined,
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
