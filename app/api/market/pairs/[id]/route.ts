import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { toJsonError } from "@/lib/api";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const pair = await prisma.pair.findUnique({
      where: { id },
    });
    if (!pair) {
      return Response.json({ error: "Pair not found" }, { status: 404 });
    }
    return Response.json({ pair });
  } catch (e) {
    return toJsonError(e);
  }
}
