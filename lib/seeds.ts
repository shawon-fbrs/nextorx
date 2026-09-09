import { createHash, randomBytes, createCipheriv, createDecipheriv } from "crypto";
import { prisma } from "./db";
import { logAudit } from "./services/audit";

export interface SeedInfo {
  day: string;
  seedHash: string;
  revealed: boolean;
}

function encKey(): Buffer | null {
  const raw = process.env.SEED_ENC_KEY;
  if (!raw) return null;
  const hex = raw.trim().toLowerCase();
  if (/^[0-9a-f]{64}$/.test(hex)) return Buffer.from(hex, "hex");
  if (raw.trim().length >= 32) return createHash("sha256").update(raw.trim(), "utf8").digest();
  return null;
}

export function encryptSeed(seed: string): string | null {
  const key = encKey();
  if (!key) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(seed, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `gcm1:${iv.toString("hex")}:${tag.toString("hex")}:${ct.toString("hex")}`;
}

export function decryptSeed(payload: string): string | null {
  try {
    const key = encKey();
    if (!key) return null;
    const [v, ivHex, tagHex, ctHex] = payload.split(":");
    if (v !== "gcm1" || !ivHex || !tagHex || !ctHex) return null;
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    return Buffer.concat([decipher.update(Buffer.from(ctHex, "hex")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export async function readSeedValue(row: { seed: string | null; seedEnc: string | null }): Promise<string | null> {
  if (row.seedEnc) {
    const dec = decryptSeed(row.seedEnc);
    if (dec) return dec;
  }
  return row.seed;
}

export async function ensureSeedDay(day: string): Promise<SeedInfo> {
  const seed = randomBytes(32).toString("hex");
  const seedHash = createHash("sha256").update(seed, "utf8").digest("hex");
  const seedEnc = encryptSeed(seed);
  const row = await prisma.serverSeed.upsert({
    where: { day },
    update: {},
    create: {
      day,
      seedHash,
      seed: seedEnc ? null : seed,
      seedEnc: seedEnc ?? null,
      revealed: false,
    },
  });
  if (row.seedHash === seedHash) {
    try {
      await logAudit(null, "seed.minted", "ServerSeed", day, { seedHash, encrypted: !!seedEnc });
    } catch {}
  }
  return { day, seedHash: row.seedHash, revealed: row.revealed };
}

export async function getDaySeed(day: string): Promise<string | null> {
  const row = await prisma.serverSeed.findUnique({ where: { day } });
  if (!row) return null;
  const value = await readSeedValue(row);
  if (value && row.seed && !row.seedEnc && encKey()) {
    const enc = encryptSeed(value);
    if (enc) {
      await prisma.serverSeed.update({ where: { id: row.id }, data: { seedEnc: enc, seed: null } }).catch(() => {});
    }
  }
  return value;
}

export async function getDaySeedHash(day: string): Promise<SeedInfo> {
  return ensureSeedDay(day);
}

export async function getDaySeedReveal(day: string): Promise<{ day: string; seed: string } | null> {
  const row = await prisma.serverSeed.findUnique({ where: { day } });
  if (!row || !row.revealed) return null;
  const seed = await readSeedValue(row);
  if (!seed) return null;
  return { day, seed };
}

export async function revealDueSeeds(now = new Date()): Promise<string[]> {
  const { dayStringUTC } = await import("./pf-math");
  const today = dayStringUTC(now);
  const revealed: string[] = [];
  const pending = await prisma.serverSeed.findMany({ where: { revealed: false } });
  for (const row of pending) {
    if (row.day < today) {
      await prisma.serverSeed.update({
        where: { id: row.id },
        data: { revealed: true, revealedAt: now },
      });
      revealed.push(row.day);
    }
  }
  return revealed;
}
