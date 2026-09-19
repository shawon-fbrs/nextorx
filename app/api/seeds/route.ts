import { toJsonError } from "@/lib/api";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const seeds = await prisma.serverSeed.findMany({
      orderBy: { day: "desc" },
      select: {
        day: true,
        seedHash: true,
        revealed: true,
        revealedAt: true,
        committedAt: true,
        gistUrl: true,
        createdAt: true,
      },
    });
    return Response.json({ seeds });
  } catch (e) {
    return toJsonError(e);
  }
}
