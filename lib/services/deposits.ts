import { prisma } from "@/lib/db";
import { postEntryInTx } from "@/lib/ledger";
import { createNotification } from "@/lib/notify";
import { getSetting } from "@/lib/settings";

export class DepositError extends Error {}

type DepositTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function awardReferralBonus(tx: DepositTx, userId: string): Promise<void> {
  const me = await tx.user.findUnique({
    where: { id: userId },
    select: { referredBy: true },
  });
  if (!me?.referredBy) return;
  const referrer = await tx.user.findUnique({
    where: { referralCode: me.referredBy },
    select: { id: true },
  });
  if (!referrer || referrer.id === userId) return;
  const existing = await tx.referral.findUnique({ where: { referredId: userId } });
  if (existing?.bonusPaid) return;
  const [bonusAmount, turnoverMult, validityDays] = await Promise.all([
    getSetting("referralBonusAmount").catch(() => 2000),
    getSetting("bonusTurnoverMultiplier").catch(() => 30),
    getSetting("bonusValidityDays").catch(() => 30),
  ]);
  if (bonusAmount <= 0) return;
  await tx.referral.upsert({
    where: { referredId: userId },
    create: { referrerId: referrer.id, referredId: userId, bonusPaid: bonusAmount },
    update: { bonusPaid: bonusAmount },
  });
  await postEntryInTx(tx, {
    userId: referrer.id,
    type: "BONUS_CREDIT",
    amount: 0,
    bonusAmount,
    referenceId: `referral:${userId}`,
    description: "Referral bonus — friend's first deposit",
  });
  const referrerProfile = await tx.user.findUnique({
    where: { id: referrer.id },
    select: { bonusTurnoverRequired: true },
  });
  await tx.user.update({
    where: { id: referrer.id },
    data: {
      bonusTurnoverRequired: (referrerProfile?.bonusTurnoverRequired ?? 0) + bonusAmount * turnoverMult,
      bonusExpiresAt: new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000),
    },
  });
  await createNotification(
    referrer.id,
    "REFERRAL",
    "Referral bonus earned",
    `Your friend made a first deposit. $${(bonusAmount / 100).toFixed(2)} bonus credited.`,
  );
}

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

  const depositor = await prisma.user.findUnique({
    where: { id: userId },
    select: { depositLimitDaily: true },
  });
  if (depositor?.depositLimitDaily != null) {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const todayAgg = await prisma.depositRequest.aggregate({
      where: { userId, createdAt: { gte: dayStart } },
      _sum: { amount: true },
    });
    const todayTotal = todayAgg._sum.amount ?? 0;
    if (todayTotal + amount > depositor.depositLimitDaily) {
      throw new DepositError("Daily deposit limit reached");
    }
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

    const priorVerified = await tx.depositRequest.count({
      where: { userId: deposit.userId, status: "VERIFIED", id: { not: depositId } },
    });
    if (priorVerified === 0) {
      await awardReferralBonus(tx, deposit.userId);
    }

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
            const [turnoverMult, validityDays] = await Promise.all([
              getSetting("bonusTurnoverMultiplier").catch(() => 30),
              getSetting("bonusValidityDays").catch(() => 30),
            ]);
            const user = await tx.user.findUnique({
              where: { id: deposit.userId },
              select: { bonusTurnoverRequired: true, bonusTurnoverDone: true },
            });
            const done = user?.bonusTurnoverDone ?? 0;
            await postEntryInTx(tx, {
              userId: deposit.userId,
              type: "BONUS_CREDIT",
              amount: 0,
              bonusAmount: cappedBonus,
              referenceId: `bonus:${depositId}`,
              description: `Promo bonus ${deposit.promoCode} (${deposit.promoPercent}%)`,
            });
            await tx.user.update({
              where: { id: deposit.userId },
              data: {
                bonusTurnoverRequired: (user?.bonusTurnoverRequired ?? 0) + (deposit.amount + cappedBonus) * turnoverMult - done,
                bonusTurnoverDone: 0,
                bonusExpiresAt: new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000),
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
