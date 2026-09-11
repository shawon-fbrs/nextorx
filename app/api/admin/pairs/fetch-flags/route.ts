import { NextRequest } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { requirePermission, toJsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/services/audit";
import { s3Put, isS3Configured } from "@/lib/s3";

const schema = z.object({
  base: z.string().length(3).regex(/^[A-Z]{3}$/, "Base must be a 3-letter code like EUR"),
  quote: z.string().length(3).regex(/^[A-Z]{3}$/, "Quote must be a 3-letter code like USD"),
  pairId: z.string().max(20).optional(),
});

async function fetchFlag(code: string): Promise<Buffer | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(`https://flagcdn.com/${code.toLowerCase()}.svg`, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        Accept: 'image/svg+xml,image/*,*/*',
      },
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("svg")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > 500 * 1024) return null;
    if (!buf.toString("utf8", 0, 200).includes("<svg")) return null;
    return buf;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requirePermission("pair", "update");
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    if (!isS3Configured()) {
      return Response.json({ error: "MinIO storage is not configured" }, { status: 503 });
    }
    const base = parsed.data.base;
    const quote = parsed.data.quote;
    let category = await prisma.resourceCategory.findUnique({ where: { name: "Flags" } });
    if (!category) {
      category = await prisma.resourceCategory.create({ data: { name: "Flags" } });
    }
    const urls: { base?: string; quote?: string } = {};
    for (const [cc, field] of [[base, "iconUrl"], [quote, "iconUrl2"]] as const) {
      const buf = await fetchFlag(cc);
      if (!buf) continue;
      const key = `assets/${randomUUID()}-flag-${cc.toLowerCase()}.svg`;
      await s3Put(key, buf, "image/svg+xml");
      const asset = await prisma.resourceAsset.create({
        data: {
          categoryId: category.id,
          filename: `flag-${cc.toLowerCase()}.svg`,
          mime: "image/svg+xml",
          size: buf.length,
          data: null,
          key,
        },
        select: { id: true },
      });
      urls[field === "iconUrl" ? "base" : "quote"] = `/api/resources/${asset.id}`;
    }
    if (!urls.base && !urls.quote) {
      return Response.json({ error: "Could not download flags. Check the currency codes." }, { status: 502 });
    }
    if (parsed.data.pairId) {
      await prisma.pair.update({
        where: { id: parsed.data.pairId },
        data: {
          ...(urls.base ? { iconUrl: urls.base } : {}),
          ...(urls.quote ? { iconUrl2: urls.quote } : {}),
        },
      }).catch(() => {});
    }
    await logAudit(admin.id, "pair.fetch_flags", "Pair", parsed.data.pairId ?? `${base}${quote}`, { base, quote, ...urls });
    return Response.json({ base, quote, ...urls });
  } catch (e) {
    return toJsonError(e);
  }
}
