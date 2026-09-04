import { prisma } from "@/lib/db";
import { requireUser, toJsonError } from "@/lib/api";
import { credit, debit } from "@/lib/ledger";

const DEMO_STARTING_BALANCE = 10_000_00; // $10,000 in cents
const DEMO_MIN_BALANCE = 100_00; // $100 minimum
const DEMO_MAX_BALANCE = 100_000_00; // $100,000 maximum

export async function POST() {
  try {
    const user = await requireUser();

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

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json().catch(() => ({})) as { balance?: number };
    const { balance } = body;

    if (typeof balance !== 'number' || isNaN(balance)) {
      return Response.json({ error: "Balance must be a number" }, { status: 400 });
    }

    const cents = Math.round(balance * 100);

    if (cents < DEMO_MIN_BALANCE) {
      return Response.json({ error: `Minimum balance is $${DEMO_MIN_BALANCE / 100}` }, { status: 400 });
    }

    if (cents > DEMO_MAX_BALANCE) {
      return Response.json({ error: `Maximum balance is $${DEMO_MAX_BALANCE / 100}` }, { status: 400 });
    }

    const depositCount = await prisma.depositRequest.count({
      where: { userId: user.id, status: "VERIFIED" },
    });

    if (depositCount > 0) {
      return Response.json({ error: "Cannot adjust balance on real account" }, { status: 400 });
    }

    const current = await prisma.user.findUnique({
      where: { id: user.id },
      select: { balance: true },
    });
    const currentCents = current?.balance ?? 0;
    const diff = cents - currentCents;

    if (diff !== 0) {
      const referenceId = `demo-adjust:${user.id}:${Date.now()}`;
      if (diff > 0) {
        await credit({
          userId: user.id,
          type: "PROMO_CREDIT",
          amount: diff,
          referenceId,
          description: "Demo balance top-up",
        });
      } else {
        await debit({
          userId: user.id,
          type: "ADMIN_ADJUSTMENT",
          amount: -diff,
          referenceId,
          description: "Demo balance reset",
        });
      }
    }

    return Response.json({ balance: cents });
  } catch (e) {
    return toJsonError(e);
  }
}
