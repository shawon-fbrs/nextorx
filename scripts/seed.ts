import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const OTC_PAIRS = [
  { id: "EURUSD", name: "EUR/USD", category: "forex", basePrice: 1.0850, volatility: 0.0008, payoutPercent: 80, sortOrder: 1 },
  { id: "GBPUSD", name: "GBP/USD", category: "forex", basePrice: 1.2700, volatility: 0.0010, payoutPercent: 77, sortOrder: 2 },
  { id: "USDJPY", name: "USD/JPY", category: "forex", basePrice: 149.50, volatility: 0.12, payoutPercent: 86, sortOrder: 3 },
  { id: "EURGBP", name: "EUR/GBP", category: "forex", basePrice: 0.8540, volatility: 0.0006, payoutPercent: 80, sortOrder: 4 },
  { id: "USDINR", name: "USD/INR", category: "forex", basePrice: 83.20, volatility: 0.08, payoutPercent: 82, sortOrder: 5 },
  { id: "USDBDT", name: "USD/BDT", category: "forex", basePrice: 117.50, volatility: 0.15, payoutPercent: 80, sortOrder: 6 },
  { id: "USDPKR", name: "USD/PKR", category: "forex", basePrice: 278.00, volatility: 0.30, payoutPercent: 80, sortOrder: 7 },
  { id: "USDNPR", name: "USD/NPR", category: "forex", basePrice: 133.50, volatility: 0.15, payoutPercent: 78, sortOrder: 8 },
  { id: "EURJPY", name: "EUR/JPY", category: "forex", basePrice: 162.30, volatility: 0.15, payoutPercent: 80, sortOrder: 9 },
  { id: "GBPJPY", name: "GBP/JPY", category: "forex", basePrice: 190.00, volatility: 0.18, payoutPercent: 84, sortOrder: 10 },
  { id: "BTCUSD", name: "BTC/USD", category: "crypto", basePrice: 67500.00, volatility: 800.00, payoutPercent: 90, sortOrder: 11 },
  { id: "ETHUSD", name: "ETH/USD", category: "crypto", basePrice: 3450.00, volatility: 50.00, payoutPercent: 88, sortOrder: 12 },
  { id: "SOLUSD", name: "SOL/USD", category: "crypto", basePrice: 175.00, volatility: 8.00, payoutPercent: 92, sortOrder: 13 },
  { id: "XRPUSD", name: "XRP/USD", category: "crypto", basePrice: 0.62, volatility: 0.015, payoutPercent: 89, sortOrder: 14 },
  { id: "DOGEUSD", name: "DOGE/USD", category: "crypto", basePrice: 0.185, volatility: 0.008, payoutPercent: 91, sortOrder: 15 },
  { id: "ADAUSD", name: "ADA/USD", category: "crypto", basePrice: 0.48, volatility: 0.012, payoutPercent: 87, sortOrder: 16 },
  { id: "BNBUSD", name: "BNB/USD", category: "crypto", basePrice: 610.00, volatility: 15.00, payoutPercent: 88, sortOrder: 17 },
  { id: "XAUUSD", name: "Gold", category: "commodities", basePrice: 2350.00, volatility: 25.00, payoutPercent: 87, sortOrder: 18 },
  { id: "XAGUSD", name: "Silver", category: "commodities", basePrice: 29.50, volatility: 0.40, payoutPercent: 84, sortOrder: 19 },
  { id: "WTIUSD", name: "Crude Oil", category: "commodities", basePrice: 78.00, volatility: 1.20, payoutPercent: 89, sortOrder: 20 },
  { id: "SPX500", name: "S&P 500", category: "indices", basePrice: 5250.00, volatility: 40.00, payoutPercent: 85, sortOrder: 21 },
  { id: "NIFTY50", name: "NIFTY 50", category: "indices", basePrice: 22500.00, volatility: 200.00, payoutPercent: 83, sortOrder: 22 },
  { id: "NIKKEI225", name: "Nikkei 225", category: "indices", basePrice: 38500.00, volatility: 350.00, payoutPercent: 84, sortOrder: 23 },
];

async function main() {
  console.log("Seeding database...");

  // Fix column width if needed
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Pair" ALTER COLUMN "volatility" TYPE DECIMAL(12,6)`
  ).catch(() => {});

  // Create admin user
  const adminEmail = process.env.ADMIN_EMAIL || "admin@nextorx.app";
  const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe!123456";

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Admin",
      emailVerified: true,
      role: "super_admin",
      referralCode: "ADMIN0001",
      uid: "10000001",
    },
  });
  console.log("Admin user:", admin.email);

  // Create admin Account with hashed password (so email/password login works)
  const existingAccount = await prisma.account.findFirst({
    where: { userId: admin.id, providerId: "credential" },
  });

  if (!existingAccount) {
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    await prisma.account.create({
      data: {
        accountId: adminEmail,
        providerId: "credential",
        userId: admin.id,
        password: hashedPassword,
      },
    });
    console.log("Admin account with password created");
  } else {
    console.log("Admin account already exists");
  }

  // Ensure all existing users without accounts get one
  const usersWithoutAccounts = await prisma.user.findMany({
    where: {
      accounts: { none: {} },
    },
  });
  for (const u of usersWithoutAccounts) {
    const acct = await prisma.account.findFirst({
      where: { userId: u.id, providerId: "credential" },
    });
    if (!acct && u.email) {
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      await prisma.account.create({
        data: {
          accountId: u.email,
          providerId: "credential",
          userId: u.id,
          password: hashedPassword,
        },
      });
      console.log(`Created account for existing user: ${u.email}`);
    }
  }

  // Create OTC pairs
  for (const pair of OTC_PAIRS) {
    await prisma.pair.upsert({
      where: { id: pair.id },
      update: {},
      create: pair,
    });
  }
  console.log(`Created ${OTC_PAIRS.length} OTC pairs`);

  // Create payment methods
  await prisma.paymentMethod.upsert({
    where: { name_networkName: { name: "USDT", networkName: "TRC20" } },
    update: {},
    create: {
      name: "USDT",
      label: "USDT (Tether)",
      networkName: "TRC20",
      minDeposit: 1000,
      maxDeposit: 10000000,
      minWithdraw: 500,
      maxWithdraw: 10000000,
    },
  });

  await prisma.paymentMethod.upsert({
    where: { name_networkName: { name: "USDT", networkName: "ERC20" } },
    update: {},
    create: {
      name: "USDT",
      label: "USDT (Ethereum)",
      networkName: "ERC20",
      minDeposit: 2000,
      maxDeposit: 10000000,
      minWithdraw: 1000,
      maxWithdraw: 10000000,
    },
  });
  console.log("Created payment methods");

  // Create platform settings
  const settings = [
    { key: "bonusTurnoverMultiplier", value: 30, label: "Bonus turnover multiplier" },
    { key: "bonusValidityDays", value: 30, label: "Bonus validity (days)" },
    { key: "maxBonusBet", value: 1000, label: "Max stake while bonus active (cents)" },
    { key: "defaultPayoutPercent", value: 80, label: "Default payout percent" },
    { key: "minTradeAmount", value: 100, label: "Min trade amount (cents)" },
    { key: "maxTradeAmount", value: 500000, label: "Max trade amount (cents)" },
  ];
  for (const setting of settings) {
    await prisma.platformSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log("Created platform settings");

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
