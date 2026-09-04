import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Resetting database (keeping pairs, settings, payment methods)...");

  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.promoCodeUse.deleteMany(),
    prisma.userRiskProfile.deleteMany(),
    prisma.walletHold.deleteMany(),
    prisma.withdrawalRequest.deleteMany(),
    prisma.depositRequest.deleteMany(),
    prisma.ledgerEntry.deleteMany(),
    prisma.trade.deleteMany(),
    prisma.kycSubmission.deleteMany(),
    prisma.selfExclusion.deleteMany(),
    prisma.verification.deleteMany(),
    prisma.twoFactor.deleteMany(),
    prisma.bannedUser.deleteMany(),
    prisma.failedLoginAttempt.deleteMany(),
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  console.log("All user data cleared. Pairs, settings, and payment methods preserved.");

  const userCount = await prisma.user.count();
  const pairCount = await prisma.pair.count();
  console.log(`Users: ${userCount}, Pairs: ${pairCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
