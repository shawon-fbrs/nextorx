import crypto from "crypto";

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
  is_premium?: boolean;
}

interface TelegramInitData {
  user?: TelegramUser;
  auth_date: number;
  hash: string;
  [key: string]: unknown;
}

function parseInitData(initData: string): TelegramInitData {
  const params = new URLSearchParams(initData);
  const result: Record<string, unknown> = {};
  for (const [key, value] of params.entries()) {
    if (key === "user") {
      result[key] = JSON.parse(value);
    } else {
      result[key] = value;
    }
  }
  return result as TelegramInitData;
}

function checkInitDataHash(
  initData: string,
  botToken: string,
): boolean {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return false;

  params.delete("hash");
  const dataCheckArr: string[] = [];
  for (const [key, value] of params.entries()) {
    dataCheckArr.push(`${key}=${value}`);
  }
  dataCheckArr.sort();
  const dataCheckString = dataCheckArr.join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  return computedHash === hash;
}

export function verifyTelegramInitData(
  initData: string,
  botToken: string,
): TelegramInitData | null {
  if (!checkInitDataHash(initData, botToken)) {
    return null;
  }

  const data = parseInitData(initData);

  const authDate = Number(data.auth_date);
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > 86400) {
    return null;
  }

  return data;
}
