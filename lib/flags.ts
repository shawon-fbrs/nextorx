export const FLAG_CURRENCIES = [
  "EUR", "USD", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD",
  "MXN", "ZAR", "TRY", "BRL", "SGD", "HKD", "NOK", "SEK",
  "DKK", "PLN", "CZK", "HUF", "ILS", "PHP", "THB", "MYR",
  "IDR", "KRW", "CNY", "TWD", "AED", "SAR", "QAR", "KWD",
  "EGP", "NGN", "PKR", "LKR", "VND", "BDT", "INR",
];

export function flagFileName(code: string): string {
  return `flag-${code.toLowerCase()}.svg`;
}

export async function fetchFlagSvg(code: string): Promise<Buffer | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(`https://flagcdn.com/${code.toLowerCase()}.svg`, {
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept: "image/svg+xml,image/*,*/*",
      },
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("svg")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > 500 * 1024) return null;
    if (!buf.toString("utf8", 0, 200).includes("<svg")) return null;
    return buf;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
