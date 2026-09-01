import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, bearer, twoFactor } from "better-auth/plugins";
import { prisma } from "@/lib/db";
import { env } from "@/env";
import { roles } from "@/lib/rbac";

const REFERRAL_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateReferralCode(length = 8): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(
    bytes,
    (b) => REFERRAL_ALPHABET[b % REFERRAL_ALPHABET.length],
  ).join("");
}

function generateUid(): string {
  return String(10000000 + Math.floor(Math.random() * 90000000));
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? {
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
  } : {}),
  trustedOrigins: (req) => {
    const baseURL = env.BETTER_AUTH_URL.replace(/\/+$/, "");
    const origins = [baseURL];
    if (env.NODE_ENV !== "production") {
      origins.push("http://localhost:3000", "http://0.0.0.0:3000");
    }
    try {
      const base = new URL(baseURL);
      const hostname = base.hostname;
      if (!hostname.startsWith("www.")) {
        origins.push(`https://www.${hostname}`, `http://www.${hostname}`);
      } else {
        const bare = hostname.replace(/^www\./, "");
        origins.push(`https://${bare}`, `http://${bare}`);
      }
      origins.push(`https://${hostname}`, `http://${hostname}`);
      const originHeader = req?.headers.get("origin");
      if (originHeader) {
        const origin = new URL(originHeader);
        const baseHostname = base.hostname.replace(/^www\./, "");
        const reqHostname = origin.hostname.replace(/^www\./, "");
        if (reqHostname === baseHostname) {
          origins.push(origin.origin);
        }
      }
    } catch {}
    return origins;
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: false,
  },
  plugins: [
    admin({
      defaultRole: "player",
      adminRoles: ["super_admin"],
      roles,
    }),
    bearer(),
    twoFactor({
      issuer: "NextOrx",
      totpOptions: {
        period: 30,
        digits: 6,
      },
    }),
  ],
  user: {
    additionalFields: {
      uid: { type: "string", required: false },
      phone: { type: "string", required: false },
      kycStatus: { type: "string", required: false },
      referralCode: { type: "string", required: false },
      referredBy: { type: "string", required: false },
      nickname: { type: "string", required: false },
      firstName: { type: "string", required: false },
      lastName: { type: "string", required: false },
      country: { type: "string", required: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          return {
            data: {
              ...user,
              referralCode: generateReferralCode(),
              uid: generateUid(),
            },
          };
        },
      },
    },
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
});
