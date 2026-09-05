import { NextRequest } from "next/server";
import { toJsonError } from "@/lib/api";
import { dayStringUTC } from "@/lib/pf-math";
import { getSeedHash, getSeedReveal } from "@/lib/otc-engine";

export async function GET(request: NextRequest) {
  try {
    const day = request.nextUrl.searchParams.get("day") ?? dayStringUTC(new Date());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      return Response.json({ error: "Invalid day (YYYY-MM-DD)" }, { status: 400 });
    }
    const info = await getSeedHash(day);
    return Response.json(info);
  } catch (e) {
    return toJsonError(e);
  }
}
