import { requireUser, toJsonError } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireUser();
    const account = await prisma.account.findFirst({
      where: { userId: user.id, providerId: "credential" },
      select: { password: true },
    });
    return Response.json({ hasPassword: Boolean(account?.password) });
  } catch (e) {
    return toJsonError(e);
  }
}
