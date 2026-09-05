import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser, toJsonError, parseListQuery } from "@/lib/api";
import { createDepositRequest } from "@/lib/services/deposits";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const id = request.nextUrl.searchParams.get("id");
    if (id) {
      const deposit = await prisma.depositRequest.findFirst({
        where: { id, userId: user.id },
        select: {
          id: true, amount: true, method: true, network: true,
          status: true, note: true, createdAt: true, reviewedAt: true,
        },
      });
      if (!deposit) return Response.json({ error: "Not found" }, { status: 404 });
      return Response.json({ deposit });
    }
    const { limit } = parseListQuery(request.nextUrl, undefined, 50);
    const deposits = await prisma.depositRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true, amount: true, method: true, network: true,
        status: true, note: true, createdAt: true, reviewedAt: true,
      },
    });
    return Response.json({ deposits });
  } catch (e) {
    return toJsonError(e);
  }
}

const depositSchema = z.object({
  amount: z.number().int().min(100),
  method: z.string(),
  txHash: z.string().min(1),
  walletAddress: z.string().optional(),
  network: z.string().optional(),
  promoCode: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const parsed = depositSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }

    const deposit = await createDepositRequest(
      user.id,
      parsed.data.amount,
      parsed.data.method,
      parsed.data.txHash,
      parsed.data.walletAddress,
      parsed.data.network,
      parsed.data.promoCode,
    );

    return Response.json({ deposit }, { status: 201 });
  } catch (e) {
    return toJsonError(e);
  }
}
