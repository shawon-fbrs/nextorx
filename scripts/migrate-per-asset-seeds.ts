// scripts/migrate-per-asset-seeds.ts
// Run this once on the server: npx tsx scripts/migrate-per-asset-seeds.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Clearing old ServerSeed rows (old architecture)...");
  const deleted = await prisma.serverSeed.deleteMany();
  console.log(`Deleted ${deleted.count} old seed rows.`);
  console.log("Done. New per-asset seeds will be created automatically by the engine.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
