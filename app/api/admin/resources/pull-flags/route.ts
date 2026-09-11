import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { readFile } from "fs/promises";
import { join } from "path";
import { requirePermission, toJsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/services/audit";
import { isS3Configured, s3Put } from "@/lib/s3";
import { FLAG_CURRENCIES, fetchFlagSvg, flagFileName } from "@/lib/flags";

async function loadFlagSvg(code: string): Promise<Buffer | null> {
  try {
    const buf = await readFile(join(process.cwd(), "public", "flags", `${code.toLowerCase()}.svg`));
    if (buf.length > 0 && buf.toString("utf8", 0, 200).includes("<svg")) return buf;
  } catch {}
  return fetchFlagSvg(code);
}

export async function POST() {
  try {
    const admin = await requirePermission("payment", "manage");
    if (!isS3Configured()) {
      return Response.json({ error: "MinIO storage is not configured" }, { status: 503 });
    }
    let category = await prisma.resourceCategory.findUnique({ where: { name: "Flags" } });
    if (!category) {
      category = await prisma.resourceCategory.create({ data: { name: "Flags" } });
    }
    const existing = (await prisma.resourceAsset.findMany({
      where: { categoryId: category.id },
      select: { filename: true },
    })) as Array<{ filename: string }>;
    const have = new Set(existing.map((e) => e.filename));
    let added = 0;
    let skipped = 0;
    const failed: string[] = [];
    for (const code of FLAG_CURRENCIES) {
      const filename = flagFileName(code);
      if (have.has(filename)) {
        skipped++;
        continue;
      }
      const buf = await loadFlagSvg(code);
      if (!buf) {
        failed.push(code);
        continue;
      }
      const key = `assets/${randomUUID()}-${filename}`;
      try {
        await s3Put(key, buf, "image/svg+xml");
        await prisma.resourceAsset.create({
          data: { categoryId: category.id, filename, mime: "image/svg+xml", size: buf.length, data: null, key },
        });
        added++;
      } catch {
        failed.push(code);
      }
    }
    await logAudit(admin.id, "resource.pull_flags", "ResourceCategory", category.id, { added, skipped, failed });
    return NextResponse.json({ added, skipped, failed, total: FLAG_CURRENCIES.length });
  } catch (e) {
    return toJsonError(e);
  }
}
