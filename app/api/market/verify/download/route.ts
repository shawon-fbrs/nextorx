import { NextRequest } from "next/server";
import { toJsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { dayStringUTC } from "@/lib/pf-math";

export async function GET(request: NextRequest) {
  try {
    const asset = request.nextUrl.searchParams.get("asset") ?? "";
    const date = request.nextUrl.searchParams.get("date") ?? dayStringUTC(new Date());
    if (!/^[A-Z0-9]+$/.test(asset)) {
      return Response.json({ error: "Invalid asset" }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return Response.json({ error: "Invalid date (YYYY-MM-DD)" }, { status: 400 });
    }
    const start = Date.parse(`${date}T00:00:00.000Z`);
    const end = start + 86400000;
    const candles = await prisma.secondCandle.findMany({
      where: {
        pairId: asset,
        timestamp: { gte: BigInt(start), lt: BigInt(end) },
      },
      orderBy: { timestamp: "asc" },
      take: 86400,
    });
    if (candles.length === 0) {
      return Response.json({ error: "No data for asset/date (1s candles kept 7 days)" }, { status: 404 });
    }
    const lines = ["timestamp,open,high,low,close,ticks"];
    for (const c of candles) {
      lines.push(
        `${c.timestamp},${c.open},${c.high},${c.low},${c.close},${c.ticks}`,
      );
    }
    return new Response(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${asset}-${date}-1s.csv"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    return toJsonError(e);
  }
}
