import { NextRequest } from "next/server";
import { toJsonError } from "@/lib/api";
import { getDayParams } from "@/lib/seeds";

export const dynamic = "force-dynamic";

// Frozen daily candle-math inputs for (asset, day) — the exact values the
// engine generated with. Public: provably-fair verification must not require
// an account. Falls back to nulls (caller uses live pair values, best effort)
// for pre-snapshot days.
export async function GET(request: NextRequest) {
  try {
    const asset = request.nextUrl.searchParams.get("asset") ?? "";
    const date = request.nextUrl.searchParams.get("date") ?? "";
    if (!/^[A-Z0-9]+$/.test(asset)) {
      return Response.json({ error: "Invalid asset" }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return Response.json({ error: "Invalid date (YYYY-MM-DD)" }, { status: 400 });
    }
    const snap = await getDayParams(date, asset);
    if (!snap) {
      return Response.json({ asset, date, snapshot: false });
    }
    return Response.json({
      asset,
      date,
      snapshot: true,
      basePrice: snap.basePrice,
      volatility: snap.volatility,
      category: snap.category,
    });
  } catch (e) {
    return toJsonError(e);
  }
}
