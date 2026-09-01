import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { toJsonError } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const category = request.nextUrl.searchParams.get("category");
    const pairs = await prisma.pair.findMany({
      where: {
        isActive: true,
        ...(category ? { category } : {}),
      },
      orderBy: { sortOrder: "asc" },
    });
    return Response.json({ pairs });
  } catch (e) {
    return toJsonError(e);
  }
}
