import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { requirePermission, toJsonError } from "@/lib/api";
import { logAudit } from "@/lib/services/audit";
import { prisma } from "@/lib/db";
import { isS3Configured, s3Delete, s3Put } from "@/lib/s3";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/gif"]);

export async function GET() {
  try {
    await requirePermission("payment", "list");
    const categories = await prisma.resourceCategory.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { assets: true } },
        assets: {
          orderBy: { createdAt: "desc" },
          select: { id: true, filename: true, mime: true, size: true, createdAt: true, key: true },
        },
      },
    });
    const withUrls = categories.map((c) => ({
      ...c,
      assets: c.assets.map((a) => ({ ...a, url: `/api/resources/${a.id}`, storage: (a as { key?: string | null }).key ? "minio" : "db" })),
    }));
    return Response.json({ categories: withUrls });
  } catch (e) {
    return toJsonError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requirePermission("payment", "manage");
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      let categoryId = String(form.get("categoryId") ?? "");
      const file = form.get("file");
      if (!file || !(file instanceof File) || file.size === 0) {
        return Response.json({ error: "file is required" }, { status: 400 });
      }
      if (!ALLOWED_MIME.has(file.type)) {
        return Response.json({ error: "Only JPEG, PNG, WebP, GIF, SVG images allowed" }, { status: 400 });
      }
      if (file.size > MAX_IMAGE_BYTES) {
        return Response.json({ error: "File must be under 5MB" }, { status: 400 });
      }
      let category = categoryId
        ? await prisma.resourceCategory.findUnique({ where: { id: categoryId } })
        : null;
      if (!category) {
        category = await prisma.resourceCategory.upsert({
          where: { name: "Asset Icons" },
          update: {},
          create: { name: "Asset Icons" },
        });
        categoryId = category.id;
      }
      const bytes = Buffer.from(await file.arrayBuffer());
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "upload";
      let key: string | null = null;
      let data: Buffer | null = bytes;
      if (isS3Configured()) {
        try {
          key = `assets/${randomUUID()}-${safeName}`;
          await s3Put(key, bytes, file.type);
          data = null;
        } catch {
          key = null;
          data = bytes;
        }
      }
      const asset = await prisma.resourceAsset.create({
        data: {
          categoryId,
          filename: file.name.slice(0, 200),
          mime: file.type,
          size: bytes.length,
          data,
          key,
        },
        select: { id: true, filename: true, mime: true, size: true, createdAt: true, key: true },
      });
      await logAudit(admin.id, "resource.upload", "ResourceAsset", asset.id, {
        filename: asset.filename,
        categoryId,
        storage: key ? "minio" : "db",
      });
      return Response.json({ asset: { ...asset, url: `/api/resources/${asset.id}`, storage: key ? "minio" : "db" } }, { status: 201 });
    }

    const schema = z.object({ name: z.string().trim().min(2).max(60) });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }
    const category = await prisma.resourceCategory.create({
      data: { name: parsed.data.name },
    });
    await logAudit(admin.id, "resource.category_create", "ResourceCategory", category.id, {
      name: category.name,
    });
    return Response.json({ category }, { status: 201 });
  } catch (e) {
    if (e instanceof Error && "code" in e && (e as { code: string }).code === "P2002") {
      return Response.json({ error: "Category already exists" }, { status: 409 });
    }
    return toJsonError(e);
  }
}

const deleteSchema = z.object({ id: z.string().min(1), categoryId: z.string().min(1).optional() });

export async function DELETE(request: NextRequest) {
  try {
    const admin = await requirePermission("payment", "manage");
    const parsed = deleteSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }
    if (parsed.data.categoryId) {
      const count = await prisma.resourceAsset.count({ where: { categoryId: parsed.data.id } });
      await prisma.resourceCategory.delete({ where: { id: parsed.data.id } });
      await logAudit(admin.id, "resource.category_delete", "ResourceCategory", parsed.data.id, { assets: count });
    } else {
      const doomed = await prisma.resourceAsset.findUnique({
        where: { id: parsed.data.id },
        select: { key: true },
      });
      await prisma.resourceAsset.delete({ where: { id: parsed.data.id } });
      if (doomed?.key) await s3Delete(doomed.key);
      await logAudit(admin.id, "resource.delete", "ResourceAsset", parsed.data.id);
    }
    return Response.json({ ok: true });
  } catch (e) {
    return toJsonError(e);
  }
}
