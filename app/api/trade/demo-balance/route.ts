import { prisma } from "@/lib/db";
import { requireUser, toJsonError } from "@/lib/api";
import { credit } from "@/lib/ledger";

const DEMO_STARTING_BALANCE = 10_000_00; // $10,000 in cents

export async function POST() {
  try {
    const user = await requireUser();

    // Only credit if user has zero balance and no deposits
    const [depositCount, currentBalance] = await Promise.all([
      prisma.depositRequest.count({ where: { userId: user.id, status: "VERIFIED" } }),
      prisma.user.findUnique({ where: { id: user.id }, select: { balance: true } }),
    ]);

    if ((currentBalance?.balance ?? 0) > 0 || depositCount > 0) {
      return Response.json({ balance: currentBalance?.balance ?? 0 });
    }

    await credit({ userId: user.id, type: "PROMO_CREDIT", amount: DEMO_STARTING_BALANCE, description: "Demo starting balance" });

    return Response.json({ balance: DEMO_STARTING_BALANCE });
  } catch (e) {
    return toJsonError(e);
  }
}
