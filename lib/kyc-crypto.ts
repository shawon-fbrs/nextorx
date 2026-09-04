import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { env } from "@/env";

function getKey(): Buffer {
  return createHash("sha256").update(`${env.BETTER_AUTH_SECRET}:kyc-documents`).digest();
}

export function encryptDocument(plaintext: Buffer): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]);
}

export function decryptDocument(payload: Buffer): Buffer {
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const ciphertext = payload.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
