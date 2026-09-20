import { NextRequest } from "next/server";
import { toJsonError } from "@/lib/api";
import { dayStringUTC } from "@/lib/pf-math";
import { getSeedHash } from "@/lib/otc-engine";

export async function GET(request: NextRequest) {
  try {
    const day = request.nextUrl.searchParams.get("day") ?? dayStringUTC(new Date());
    const pairId = request.nextUrl.searchParams.get("pairId") ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      return Response.json({ error: "Invalid day (YYYY-MM-DD)" }, { status: 400 });
    }
    if (!pairId) {
      return Response.json({ error: "pairId is required" }, { status: 400 });
    }
    let info;
    try {
      info = await getSeedHash(day, pairId);
    } catch (e) {
      // Past day without a seed row: seeds are only born at day start, never
      // minted retroactively. Report 404, not 500.
      if (e instanceof Error && /No seed exists for past day/.test(e.message)) {
        return Response.json({ error: "Seed not found for this asset/day" }, { status: 404 });
      }
      throw e;
    }
    return Response.json(info);
  } catch (e) {
    return toJsonError(e);
  }
}
