import { PrismaClient } from "@prisma/client";
import { auth } from "../lib/auth";
import { hashPassword } from "better-auth/crypto";

const prisma = new PrismaClient();

// Pairs are admin-managed only and are never auto-seeded. Create them from
// the console-panel; the engine picks them up live starting at basePrice.

async function main() {
  console.log("Seeding database...");

  const adminEmail = process.env.ADMIN_EMAIL || "admin@nextorx.app";
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    throw new Error("ADMIN_PASSWORD environment variable is required");
  }

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    const hash = await hashPassword(adminPassword);
    await prisma.account.updateMany({
      where: { userId: existing.id, providerId: "credential" },
      data: { password: hash },
    });
    if (existing.role !== "super_admin") {
      await prisma.user.update({
        where: { email: adminEmail },
        data: { role: "super_admin", emailVerified: true },
      });
      console.log(`Promoted ${adminEmail} to super_admin, password reset`);
    } else {
      console.log(`Admin ensured: ${adminEmail}, password reset`);
    }
  } else {
    const signUp = await auth.api.signUpEmail({
      body: { email: adminEmail, password: adminPassword, name: "Admin" },
    });

    await prisma.user.update({
      where: { email: adminEmail },
      data: { role: "super_admin", emailVerified: true },
    });

    console.log(`Created super_admin: ${adminEmail}`);
    void signUp;
  }

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Pair" ALTER COLUMN "volatility" TYPE DECIMAL(12,6)`
  ).catch(() => {});

  await prisma.paymentMethod.upsert({
    where: { name_networkName: { name: "USDT", networkName: "TRC20" } },
    update: {},
    create: { name: "USDT", label: "USDT (Tether)", networkName: "TRC20", minDeposit: 1000, maxDeposit: 10000000, minWithdraw: 500, maxWithdraw: 10000000 },
  });
  await prisma.paymentMethod.upsert({
    where: { name_networkName: { name: "USDT", networkName: "ERC20" } },
    update: {},
    create: { name: "USDT", label: "USDT (Ethereum)", networkName: "ERC20", minDeposit: 2000, maxDeposit: 10000000, minWithdraw: 1000, maxWithdraw: 10000000 },
  });
  console.log("Created payment methods");

  const settings = [
    { key: "bonusTurnoverMultiplier", value: 30, label: "Bonus turnover multiplier" },
    { key: "bonusValidityDays", value: 30, label: "Bonus validity (days)" },
    { key: "maxBonusBet", value: 1000, label: "Max stake while bonus active (cents)" },
    { key: "defaultPayoutPercent", value: 80, label: "Default payout percent" },
    { key: "minTradeAmount", value: 100, label: "Min trade amount (cents)" },
    { key: "maxTradeAmount", value: 500000, label: "Max trade amount (cents)" },
  ];
  for (const setting of settings) {
    await prisma.platformSetting.upsert({ where: { key: setting.key }, update: {}, create: setting });
  }
  console.log("Created platform settings");

  console.log("Seeding complete!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
