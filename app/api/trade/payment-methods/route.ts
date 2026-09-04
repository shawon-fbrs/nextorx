import { prisma } from "@/lib/db";
import { toJsonError } from "@/lib/api";

export async function GET() {
  try {
    const methods = await prisma.paymentMethod.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        label: true,
        networkName: true,
        logoUrl: true,
        networkLogoUrl: true,
        region: true,
        minDeposit: true,
        maxDeposit: true,
        minWithdraw: true,
        maxWithdraw: true,
        accountAddress: true,
        accountQrUrl: true,
      },
    });
    return Response.json({ methods });
  } catch (e) {
    return toJsonError(e);
  }
}
