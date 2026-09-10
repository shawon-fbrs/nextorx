import { toJsonError, ApiError } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const { name } = await params;
    const decoded = decodeURIComponent(name).slice(0, 200);
    if (!decoded || decoded.includes("/") || decoded.includes("\\")) {
      throw new ApiError(400, "Invalid filename");
    }
    const asset = await prisma.resourceAsset.findFirst({
      where: { filename: decoded },
      select: { id: true },
    });
    if (!asset) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    return Response.redirect(`/api/resources/${asset.id}`, 302);
  } catch (e) {
    return toJsonError(e);
  }
}
