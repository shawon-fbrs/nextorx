'use client';

import { createContext, useContext } from 'react';

interface BalanceState {
  balance: number;
  demoBalance: number;
  realBalance: number;
  accountType: string;
}

const BalanceContext = createContext<BalanceState>({
  balance: 0,
  demoBalance: 0,
  realBalance: 0,
  accountType: 'real',
});

export const BalanceProvider = BalanceContext.Provider;

export function useBalance(): BalanceState {
  return useContext(BalanceContext);
}
