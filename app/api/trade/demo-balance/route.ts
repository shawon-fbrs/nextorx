import { prisma } from "@/lib/db";
import { requireUser, toJsonError } from "@/lib/api";
import { credit, debit, LedgerError } from "@/lib/ledger";

const DEMO_STARTING_BALANCE = 10_000_00;
const DEMO_MIN_BALANCE = 100_00;
const DEMO_MAX_BALANCE = 100_000_00;

export async function POST() {
  try {
    const user = await requireUser();
    const current = await prisma.user.findUnique({
      where: { id: user.id },
      select: { demoBalance: true },
    });
    if ((current?.demoBalance ?? 0) > 0) {
      return Response.json({ balance: current?.demoBalance ?? 0 });
    }
    try {
      await credit({
        userId: user.id,
        type: "PROMO_CREDIT",
        amount: DEMO_STARTING_BALANCE,
        wallet: "demo",
        referenceId: "demo-start",
        description: "Demo starting balance",
      });
    } catch (e) {
      if (!(e instanceof LedgerError && e.code === "ALREADY_PROCESSED")) throw e;
    }
    const updated = await prisma.user.findUnique({
      where: { id: user.id },
      select: { demoBalance: true },
    });
    return Response.json({ balance: updated?.demoBalance ?? DEMO_STARTING_BALANCE });
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

    const current = await prisma.user.findUnique({
      where: { id: user.id },
      select: { demoBalance: true },
    });
    const currentCents = current?.demoBalance ?? 0;
    const diff = cents - currentCents;

    if (diff !== 0) {
      const referenceId = `demo-adjust:${Date.now()}`;
      if (diff > 0) {
        await credit({
          userId: user.id,
          type: "PROMO_CREDIT",
          amount: diff,
          wallet: "demo",
          referenceId,
          description: "Demo balance top-up",
        });
      } else {
        await debit({
          userId: user.id,
          type: "ADMIN_ADJUSTMENT",
          amount: -diff,
          wallet: "demo",
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
