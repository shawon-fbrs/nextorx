import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch {
    return Response.json({ status: "error", error: "Database connection failed" }, { status: 503 });
  }
}
