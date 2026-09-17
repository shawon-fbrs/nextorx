'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

export interface PairDef {
  id: string;
  name: string;
  category: string;
  payoutPercent: number;
  basePrice: number;
  spread: number;
  minTrade: number;
  maxTrade: number;
  iconUrl?: string | null;
  iconUrl2?: string | null;
  changePct24h?: number | null;
}

interface PairsState {
  pairs: PairDef[];
  payoutMap: Record<string, number>;
  loaded: boolean;
}

const PairsContext = createContext<PairsState>({
  pairs: [],
  payoutMap: {},
  loaded: false,
});

export function usePairs() {
  return useContext(PairsContext);
}

export function PairsProvider({ children }: { children: React.ReactNode }) {
  const [pairs, setPairs] = useState<PairDef[]>([]);
  const [payoutMap, setPayoutMap] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);
  const fetchedRef = useRef(false);

  const loadPairs = useCallback(async () => {
    try {
      const res = await fetch('/api/market/pairs');
      if (!res.ok) return;
      const data = await res.json();
      const normalized = (data.pairs || []).map((p: Record<string, unknown>) => ({
        ...p,
        payoutPercent: Number(p.payoutPercent),
        basePrice: Number(p.basePrice),
        spread: Number(p.spread ?? 0),
        minTrade: Number(p.minTrade),
        maxTrade: Number(p.maxTrade),
      })) as PairDef[];
      setPairs(normalized);
      setLoaded(true);
    } catch {}
  }, []);

  const loadPayouts = useCallback(async (pairList: PairDef[]) => {
    if (pairList.length === 0) return;
    try {
      const res = await fetch('/api/market/payouts');
      if (!res.ok) return;
      const data = await res.json();
      const map: Record<string, number> = {};
      for (const p of pairList) {
        const payout = data.payouts?.[p.id];
        if (typeof payout === 'number') {
          map[p.id] = payout;
        }
      }
      setPayoutMap(map);
    } catch {}
  }, []);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    loadPairs();
  }, [loadPairs]);

  useEffect(() => {
    if (pairs.length > 0) {
      loadPayouts(pairs);
      const timer = setInterval(() => loadPayouts(pairs), 60000);
      return () => clearInterval(timer);
    }
  }, [pairs, loadPayouts]);

  return (
    <PairsContext.Provider value={{ pairs, payoutMap, loaded }}>
      {children}
    </PairsContext.Provider>
  );
}
