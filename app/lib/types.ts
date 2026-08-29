export interface Trade {
  id: string;
  symbol: string;
  type: 'up' | 'down';
  amount: number;
  payout: number;
  profit: number;
  time: string;
  timestamp: number;
  status: 'won' | 'lost';
  openPrice?: number;
  closePrice?: number;
  payoutPercent?: number;
}

export interface SymbolDef {
  id: string;
  name: string;
  payout: number;
  category: 'forex' | 'crypto' | 'otc' | 'stocks' | 'commodities';
}

export const SYMBOLS: SymbolDef[] = [
  { id: 'EURUSD', name: 'EUR/USD', payout: 80, category: 'forex' },
  { id: 'GBPUSD', name: 'GBP/USD', payout: 77, category: 'forex' },
  { id: 'USDJPY', name: 'USD/JPY', payout: 86, category: 'forex' },
  { id: 'EURJPY', name: 'EUR/JPY', payout: 80, category: 'forex' },
  { id: 'AUDUSD', name: 'AUD/USD', payout: 79, category: 'forex' },
  { id: 'USDCAD', name: 'USD/CAD', payout: 82, category: 'forex' },
  { id: 'USDCHF', name: 'USD/CHF', payout: 81, category: 'forex' },
  { id: 'NZDUSD', name: 'NZD/USD', payout: 76, category: 'forex' },
  { id: 'EURAUD', name: 'EUR/AUD', payout: 78, category: 'forex' },
  { id: 'GBPJPY', name: 'GBP/JPY', payout: 84, category: 'forex' },
  { id: 'BTCUSD', name: 'BTC/USD', payout: 90, category: 'crypto' },
  { id: 'ETHUSD', name: 'ETH/USD', payout: 88, category: 'crypto' },
  { id: 'SOLUSD', name: 'SOL/USD', payout: 92, category: 'crypto' },
  { id: 'XRPUSD', name: 'XRP/USD', payout: 89, category: 'crypto' },
  { id: 'DOGEUSD', name: 'DOGE/USD', payout: 91, category: 'crypto' },
  { id: 'ADAUSD', name: 'ADA/USD', payout: 87, category: 'crypto' },
  { id: 'AVAXUSD', name: 'AVAX/USD', payout: 93, category: 'crypto' },
  { id: 'LINKUSD', name: 'LINK/USD', payout: 86, category: 'crypto' },
  { id: 'USDBRL_OTC', name: 'USD/BRL (OTC)', payout: 91, category: 'otc' },
  { id: 'USDARS_OTC', name: 'USD/ARS (OTC)', payout: 90, category: 'otc' },
  { id: 'NZDJPY_OTC', name: 'NZD/JPY (OTC)', payout: 81, category: 'otc' },
  { id: 'XAUUSD_OTC', name: 'Gold (OTC)', payout: 85, category: 'otc' },
  { id: 'EURAUD_OTC', name: 'EUR/AUD (OTC)', payout: 83, category: 'otc' },
  { id: 'GBPCAD_OTC', name: 'GBP/CAD (OTC)', payout: 82, category: 'otc' },
  { id: 'AUDCAD_OTC', name: 'AUD/CAD (OTC)', payout: 80, category: 'otc' },
  { id: 'AAPL', name: 'AAPL', payout: 85, category: 'stocks' },
  { id: 'TSLA', name: 'TSLA', payout: 88, category: 'stocks' },
  { id: 'AMZN', name: 'AMZN', payout: 84, category: 'stocks' },
  { id: 'GOOGL', name: 'GOOGL', payout: 83, category: 'stocks' },
  { id: 'MSFT', name: 'MSFT', payout: 82, category: 'stocks' },
  { id: 'NVDA', name: 'NVDA', payout: 90, category: 'stocks' },
  { id: 'META', name: 'META', payout: 86, category: 'stocks' },
  { id: 'XAUUSD', name: 'Gold', payout: 87, category: 'commodities' },
  { id: 'XAGUSD', name: 'Silver', payout: 84, category: 'commodities' },
  { id: 'OILUSD', name: 'Crude Oil', payout: 89, category: 'commodities' },
  { id: 'NATGAS', name: 'Natural Gas', payout: 91, category: 'commodities' },
];

export function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateCandles(count: number, seed: number) {
  const rand = seededRandom(seed);
  const candles = [];
  let price = 1.35947;
  const now = Math.floor(Date.now() / 1000);
  const interval = 60;
  for (let i = 0; i < count; i++) {
    const open = price;
    const drift = (rand() - 0.5) * 0.0002;
    const close = open + drift;
    const high = Math.max(open, close) + rand() * 0.0001;
    const low = Math.min(open, close) - rand() * 0.0001;
    candles.push({
      time: now - (count - i) * interval,
      open,
      high,
      low,
      close,
    });
    price = close;
  }
  return candles;
}

export function generateOtcCandles(count: number, seed: number, basePrice: number = 1.0) {
  const rand = seededRandom(seed);
  const candles = [];
  let price = basePrice;
  const now = Math.floor(Date.now() / 1000);
  const interval = 60;
  let trend = 0;
  for (let i = 0; i < count; i++) {
    trend += (rand() - 0.5) * 0.008;
    trend = Math.max(-0.01, Math.min(0.01, trend));
    const volatility = (rand() * 0.008 + 0.003) * basePrice;
    const open = price;
    const drift = trend + (rand() - 0.5) * volatility;
    const close = open + drift;
    const wickUp = rand() * volatility * 0.8;
    const wickDown = rand() * volatility * 0.8;
    const high = Math.max(open, close) + wickUp;
    const low = Math.min(open, close) - wickDown;
    candles.push({
      time: now - (count - i) * interval,
      open,
      high,
      low,
      close,
    });
    price = close;
  }
  return candles;
}
