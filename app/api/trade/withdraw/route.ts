import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser, toJsonError, parseListQuery } from "@/lib/api";
import { requestWithdrawal } from "@/lib/services/withdrawals";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const { limit } = parseListQuery(request.nextUrl, undefined, 50);
    const withdrawals = await prisma.withdrawalRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true, amount: true, method: true, network: true,
        status: true, note: true, createdAt: true, reviewedAt: true,
      },
    });
    return Response.json({ withdrawals });
  } catch (e) {
    return toJsonError(e);
  }
}

const withdrawSchema = z.object({
  amount: z.number().int().min(100),
  method: z.string(),
  walletAddress: z.string().min(1),
  network: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const parsed = withdrawSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }

    const withdrawal = await requestWithdrawal(
      user.id,
      parsed.data.amount,
      parsed.data.method,
      parsed.data.walletAddress,
      parsed.data.network,
    );

    return Response.json({ withdrawal }, { status: 201 });
  } catch (e) {
    return toJsonError(e);
  }
}
