import { toJsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { s3PresignGet } from "@/lib/s3";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const asset = await prisma.resourceAsset.findUnique({ where: { id } });
    if (!asset) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    if (asset.key) {
      const url = await s3PresignGet(asset.key, 3600);
      if (url) {
        return Response.redirect(url, 302);
      }
    }
    if (!asset.data) {
      return Response.json({ error: "File unavailable" }, { status: 410 });
    }
    return new Response(new Uint8Array(Buffer.from(asset.data)), {
      headers: {
        "Content-Type": asset.mime,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(asset.size),
      },
    });
  } catch (e) {
    return toJsonError(e);
  }
}
