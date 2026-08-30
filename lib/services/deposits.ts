import { prisma } from "@/lib/db";
import { postEntryInTx } from "@/lib/ledger";
import { createNotification } from "@/lib/notify";

export class DepositError extends Error {}

export async function createDepositRequest(
  userId: string,
  amount: number,
  method: string,
  txHash: string,
  walletAddress?: string,
  network?: string,
  promoCode?: string,
) {
  const paymentMethod = await prisma.paymentMethod.findFirst({
    where: { name: method },
  });
  const minDeposit = paymentMethod?.minDeposit ?? 1000;
  if (amount < minDeposit) {
    throw new DepositError(`Minimum deposit is $${(minDeposit / 100).toFixed(2)}`);
  }
  const maxDeposit = paymentMethod?.maxDeposit ?? 10000000;
  if (amount > maxDeposit) {
    throw new DepositError(`Maximum deposit is $${(maxDeposit / 100).toFixed(2)}`);
  }

  const duplicate = await prisma.depositRequest.findFirst({
    where: { txHash: { equals: txHash, mode: "insensitive" } },
    select: { id: true },
  });
  if (duplicate) {
    throw new DepositError("Transaction hash already used");
  }

  let promoPercent: number | null = null;
  let promoMaxBonus: number | null = null;
  if (promoCode?.trim()) {
    const promo = await prisma.promoCode.findUnique({
      where: { code: promoCode.trim().toUpperCase() },
    });
    if (!promo || !promo.active) {
      throw new DepositError("Invalid promo code");
    }
    if (promo.validUntil && promo.validUntil < new Date()) {
      throw new DepositError("Promo code expired");
    }
    if (promo.minDeposit > 0 && amount < promo.minDeposit) {
      throw new DepositError(`Minimum deposit for this promo is $${(promo.minDeposit / 100).toFixed(2)}`);
    }
    const uses = await prisma.promoCodeUse.count({ where: { promoId: promo.id } });
    if (promo.maxUses > 0 && uses >= promo.maxUses) {
      throw new DepositError("Promo code usage limit reached");
    }
    const userUses = await prisma.promoCodeUse.count({
      where: { promoId: promo.id, userId },
    });
    if (promo.usesPerUser > 0 && userUses >= promo.usesPerUser) {
      throw new DepositError("You have already used this promo code");
    }
    promoPercent = promo.percent;
    promoMaxBonus = promo.maxBonus;
  }

  return prisma.depositRequest.create({
    data: {
      userId,
      amount,
      method,
      txHash,
      walletAddress,
      network,
      promoCode: promoCode?.trim().toUpperCase() ?? null,
      promoPercent,
      promoMaxBonusInt: promoMaxBonus,
    },
  });
}

export async function verifyDeposit(depositId: string, reviewedById: string) {
  const deposit = await prisma.depositRequest.findUnique({
    where: { id: depositId },
  });
  if (!deposit) throw new DepositError("Deposit not found");
  if (deposit.status !== "PENDING") {
    throw new DepositError(`Deposit already ${deposit.status.toLowerCase()}`);
  }

  return prisma.$transaction(async (tx) => {
    const ledgerRow = await postEntryInTx(tx, {
      userId: deposit.userId,
      type: "DEPOSIT_CREDIT",
      amount: deposit.amount,
      referenceId: deposit.id,
      description: `Deposit verified (${deposit.method}: ${deposit.txHash})`,
    });

    await tx.depositRequest.update({
      where: { id: depositId },
      data: {
        status: "VERIFIED",
        reviewedById,
        reviewedAt: new Date(),
      },
    });

    if (deposit.promoCode && deposit.promoPercent) {
      const bonus = Math.floor((deposit.amount * deposit.promoPercent) / 100);
      const cappedBonus = deposit.promoMaxBonusInt && deposit.promoMaxBonusInt > 0
        ? Math.min(bonus, deposit.promoMaxBonusInt)
        : bonus;
      if (cappedBonus > 0) {
        const existingUse = await tx.promoCodeUse.findUnique({
          where: { depositId },
        });
        if (!existingUse) {
          const promo = await tx.promoCode.findUnique({
            where: { code: deposit.promoCode },
            select: { id: true },
          });
          if (promo) {
            await tx.promoCodeUse.create({
              data: {
                promoId: promo.id,
                userId: deposit.userId,
                depositId,
                bonusAmount: cappedBonus,
              },
            });
          }
        }
      }
    }

    await createNotification(
      deposit.userId,
      "DEPOSIT",
      "Deposit verified",
      `Your deposit of $${(deposit.amount / 100).toFixed(2)} has been credited.`,
    );

    return { entryId: ledgerRow.id, balanceAfter: ledgerRow.balanceAfter };
  });
}

export async function rejectDeposit(depositId: string, reviewedById: string, note?: string) {
  const deposit = await prisma.depositRequest.findUnique({
    where: { id: depositId },
  });
  if (!deposit) throw new DepositError("Deposit not found");
  if (deposit.status !== "PENDING") {
    throw new DepositError(`Deposit already ${deposit.status.toLowerCase()}`);
  }
  const rejected = await prisma.depositRequest.update({
    where: { id: depositId },
    data: {
      status: "REJECTED",
      reviewedById,
      reviewedAt: new Date(),
      note,
    },
  });
  await createNotification(
    deposit.userId,
    "DEPOSIT",
    "Deposit rejected",
    `Your deposit could not be verified${note ? `: ${note}` : ""}.`,
  );
  return rejected;
}
