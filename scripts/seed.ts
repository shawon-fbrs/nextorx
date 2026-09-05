import { PrismaClient } from "@prisma/client";
import { auth } from "../lib/auth";
import { hashPassword } from "better-auth/crypto";

const prisma = new PrismaClient();

// Launch set: 5 real-mirror pairs (live market anchors via free feed).
// All other pairs stay admin-managed (synthetic PF engine).
// Volatility here only shapes the micro-wiggle around the anchor.
const OTC_PAIRS = [
  { id: "EURUSD", name: "EUR/USD", symbol: "EUR/USD", category: "forex", feed: "mirror", basePrice: 1.1627, volatility: 0.50, payoutPercent: 82, weekendPayout: 79, spread: 0.00015, tags: ["major", "popular"], sortOrder: 1 },
  { id: "GBPUSD", name: "GBP/USD", symbol: "GBP/USD", category: "forex", feed: "mirror", basePrice: 1.3500, volatility: 0.55, payoutPercent: 80, weekendPayout: 77, spread: 0.00020, tags: ["major", "popular"], sortOrder: 2 },
  { id: "USDJPY", name: "USD/JPY", symbol: "USD/JPY", category: "forex", feed: "mirror", basePrice: 155.00, volatility: 0.50, payoutPercent: 84, weekendPayout: 81, spread: 0.015, tags: ["major", "popular"], sortOrder: 3 },
  { id: "XAUUSD", name: "Gold", symbol: "XAU/USD", category: "commodities", feed: "mirror", basePrice: 3950.00, volatility: 0.90, payoutPercent: 85, weekendPayout: 82, spread: 0.30, tags: ["major", "popular"], sortOrder: 4 },
  { id: "BTCUSD", name: "BTC/USD", symbol: "BTC/USD", category: "crypto", feed: "mirror", basePrice: 92000.00, volatility: 2.20, payoutPercent: 90, weekendPayout: 90, spread: 25.00, tags: ["major", "popular", "volatile"], sortOrder: 5 },
];

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

  for (const pair of OTC_PAIRS) {
    await prisma.pair.upsert({
      where: { id: pair.id },
      update: {
        name: pair.name,
        symbol: pair.symbol,
        category: pair.category,
        feed: pair.feed,
        basePrice: pair.basePrice,
        volatility: pair.volatility,
        payoutPercent: pair.payoutPercent,
        weekendPayout: pair.weekendPayout,
        spread: pair.spread,
        tags: pair.tags,
        sortOrder: pair.sortOrder,
      },
      create: pair,
    });
  }
  console.log(`Created ${OTC_PAIRS.length} OTC pairs`);

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
