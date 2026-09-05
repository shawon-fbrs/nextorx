import { NextRequest } from "next/server";
import { z } from "zod";
import { requirePermission, toJsonError } from "@/lib/api";
import { logAudit } from "@/lib/services/audit";
import { prisma } from "@/lib/db";

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
          select: { id: true, filename: true, mime: true, size: true, createdAt: true },
        },
      },
    });
    const withUrls = categories.map((c) => ({
      ...c,
      assets: c.assets.map((a) => ({ ...a, url: `/api/resources/${a.id}` })),
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
      const categoryId = String(form.get("categoryId") ?? "");
      const file = form.get("file");
      if (!categoryId) return Response.json({ error: "categoryId is required" }, { status: 400 });
      if (!file || !(file instanceof File) || file.size === 0) {
        return Response.json({ error: "file is required" }, { status: 400 });
      }
      if (!ALLOWED_MIME.has(file.type)) {
        return Response.json({ error: "Only JPEG, PNG, WebP, GIF, SVG images allowed" }, { status: 400 });
      }
      if (file.size > MAX_IMAGE_BYTES) {
        return Response.json({ error: "File must be under 5MB" }, { status: 400 });
      }
      const category = await prisma.resourceCategory.findUnique({ where: { id: categoryId } });
      if (!category) return Response.json({ error: "Category not found" }, { status: 404 });
      const bytes = Buffer.from(await file.arrayBuffer());
      const asset = await prisma.resourceAsset.create({
        data: {
          categoryId,
          filename: file.name.slice(0, 200),
          mime: file.type,
          size: bytes.length,
          data: bytes,
        },
        select: { id: true, filename: true, mime: true, size: true, createdAt: true },
      });
      await logAudit(admin.id, "resource.upload", "ResourceAsset", asset.id, {
        filename: asset.filename,
        categoryId,
      });
      return Response.json({ asset: { ...asset, url: `/api/resources/${asset.id}` } }, { status: 201 });
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
      await prisma.resourceAsset.delete({ where: { id: parsed.data.id } });
      await logAudit(admin.id, "resource.delete", "ResourceAsset", parsed.data.id);
    }
    return Response.json({ ok: true });
  } catch (e) {
    return toJsonError(e);
  }
}
