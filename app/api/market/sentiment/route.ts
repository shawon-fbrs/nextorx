import { NextRequest } from "next/server";
import { createHmac } from "crypto";
import { toJsonError } from "@/lib/api";
import { getDaySeed } from "@/lib/seeds";
import { dayStringUTC } from "@/lib/pf-math";

function unit(seed: string, msg: string): number {
  const d = createHmac("sha256", seed).update(msg, "utf8").digest();
  return d.readUInt32BE(0) / 4294967296;
}

const seedCache = new Map<string, string>();

async function daySeed(day: string): Promise<string> {
  const hit = seedCache.get(day);
  if (hit) return hit;
  const s = await getDaySeed(day).catch(() => null);
  if (!s) return day;
  if (seedCache.size > 7) seedCache.clear();
  seedCache.set(day, s);
  return s;
}

export async function GET(request: NextRequest) {
  try {
    const pairId = request.nextUrl.searchParams.get("pairId") ?? "MARKET";
    const now = Date.now();
    const day = dayStringUTC(new Date(now));
    const bucket = Math.floor(now / 5000);
    const seed = await daySeed(day);
    const cur = 30 + unit(seed, `${pairId}:${day}:${bucket}:a`) * 40;
    const prev = 30 + unit(seed, `${pairId}:${day}:${bucket - 1}:a`) * 40;
    const upPct = Math.max(10, Math.min(90, Math.round((cur + prev) / 2)));
    return Response.json({ pairId, upPct, downPct: 100 - upPct });
  } catch (e) {
    return toJsonError(e);
  }
}
