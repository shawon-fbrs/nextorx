import { toJsonError } from "@/lib/api";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10)));
    const filter = url.searchParams.get("filter") ?? "all";
    const skip = (page - 1) * limit;

    const where =
      filter === "revealed"
        ? { revealed: true }
        : filter === "pending"
          ? { revealed: false }
          : {};

    const [seeds, total] = await Promise.all([
      prisma.serverSeed.findMany({
        where,
        orderBy: { day: "desc" },
        skip,
        take: limit,
        select: {
          day: true,
          seedHash: true,
          revealed: true,
          revealedAt: true,
          committedAt: true,
          createdAt: true,
        },
      }),
      prisma.serverSeed.count({ where }),
    ]);

    return Response.json({
      seeds,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (e) {
    return toJsonError(e);
  }
}
