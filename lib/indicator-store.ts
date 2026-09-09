export interface StoredIndicator {
  name: string;
  calcParams?: number[];
  visible?: boolean;
  colors?: string[];
  overlay?: boolean;
}

export const INDICATOR_STORE_KEY = 'nextorx:indicators';

export function readStoredIndicators(): StoredIndicator[] {
  try {
    const raw = localStorage.getItem(INDICATOR_STORE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    const out: StoredIndicator[] = [];
    for (const v of arr) {
      if (typeof v !== 'object' || v === null) continue;
      const o = v as Record<string, unknown>;
      if (typeof o.name !== 'string' || o.name.length === 0) continue;
      const def: StoredIndicator = { name: o.name };
      if (Array.isArray(o.calcParams)) {
        const nums = (o.calcParams as unknown[]).filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
        if (nums.length > 0) def.calcParams = nums;
      }
      if (typeof o.visible === 'boolean') def.visible = o.visible;
      if (Array.isArray(o.colors)) {
        const cols = (o.colors as unknown[]).filter((c): c is string => typeof c === 'string' && c.length > 0);
        if (cols.length > 0) def.colors = cols;
      }
      if (typeof o.overlay === 'boolean') def.overlay = o.overlay;
      out.push(def);
    }
    return out;
  } catch {
    return [];
  }
}

export function writeStoredIndicators(list: StoredIndicator[]): void {
  try {
    localStorage.setItem(INDICATOR_STORE_KEY, JSON.stringify(list));
  } catch {}
}
