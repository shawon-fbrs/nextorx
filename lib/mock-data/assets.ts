export interface MockAsset {
  id: string;
  name: string;
  symbol: string;
  category: 'forex' | 'crypto' | 'commodities' | 'stocks';
  enabled: boolean;
  basePayout: number;
  currentPayout: number;
  minPayout: number;
  maxPayout: number;
  isOtc: boolean;
  spread: number;
  minTrade: number;
  maxTrade: number;
  tradingHours: string;
  description: string;
  dailyVolume: number;
  dailyTrades: number;
  winRate: number;
}

export const mockAssets: MockAsset[] = [
  { id: 'a1', name: 'EUR/USD', symbol: 'EURUSD', category: 'forex', enabled: true, basePayout: 80, currentPayout: 80, minPayout: 65, maxPayout: 88, isOtc: false, spread: 0.0001, minTrade: 1, maxTrade: 5000, tradingHours: 'Mon-Fri 00:00-23:00', description: 'Euro vs US Dollar', dailyVolume: 2200, dailyTrades: 1100, winRate: 48.0 },
  { id: 'a2', name: 'GBP/USD', symbol: 'GBPUSD', category: 'forex', enabled: true, basePayout: 78, currentPayout: 78, minPayout: 65, maxPayout: 86, isOtc: false, spread: 0.0002, minTrade: 1, maxTrade: 5000, tradingHours: 'Mon-Fri 00:00-23:00', description: 'British Pound vs US Dollar', dailyVolume: 1500, dailyTrades: 750, winRate: 47.8 },
  { id: 'a3', name: 'USD/JPY', symbol: 'USDJPY', category: 'forex', enabled: true, basePayout: 79, currentPayout: 79, minPayout: 65, maxPayout: 87, isOtc: false, spread: 0.01, minTrade: 1, maxTrade: 5000, tradingHours: 'Mon-Fri 00:00-23:00', description: 'US Dollar vs Japanese Yen', dailyVolume: 1200, dailyTrades: 600, winRate: 48.5 },
  { id: 'a4', name: 'AUD/USD', symbol: 'AUDUSD', category: 'forex', enabled: true, basePayout: 81, currentPayout: 81, minPayout: 65, maxPayout: 89, isOtc: false, spread: 0.0001, minTrade: 1, maxTrade: 5000, tradingHours: 'Mon-Fri 00:00-23:00', description: 'Australian Dollar vs US Dollar', dailyVolume: 900, dailyTrades: 450, winRate: 48.0 },
  { id: 'a5', name: 'EUR/GBP', symbol: 'EURGBP', category: 'forex', enabled: true, basePayout: 77, currentPayout: 77, minPayout: 65, maxPayout: 85, isOtc: false, spread: 0.0001, minTrade: 1, maxTrade: 5000, tradingHours: 'Mon-Fri 00:00-23:00', description: 'Euro vs British Pound', dailyVolume: 700, dailyTrades: 350, winRate: 47.3 },
  { id: 'a6', name: 'USD/CAD', symbol: 'USDCAD', category: 'forex', enabled: true, basePayout: 80, currentPayout: 80, minPayout: 65, maxPayout: 88, isOtc: false, spread: 0.0002, minTrade: 1, maxTrade: 5000, tradingHours: 'Mon-Fri 00:00-23:00', description: 'US Dollar vs Canadian Dollar', dailyVolume: 600, dailyTrades: 300, winRate: 48.9 },
  { id: 'a7', name: 'GBP/JPY', symbol: 'GBPJPY', category: 'forex', enabled: false, basePayout: 78, currentPayout: 78, minPayout: 65, maxPayout: 86, isOtc: false, spread: 0.02, minTrade: 1, maxTrade: 5000, tradingHours: 'Mon-Fri 00:00-23:00', description: 'British Pound vs Japanese Yen', dailyVolume: 0, dailyTrades: 0, winRate: 0 },
  { id: 'a8', name: 'NZD/USD', symbol: 'NZDUSD', category: 'forex', enabled: true, basePayout: 76, currentPayout: 76, minPayout: 65, maxPayout: 84, isOtc: false, spread: 0.0002, minTrade: 1, maxTrade: 5000, tradingHours: 'Mon-Fri 00:00-23:00', description: 'New Zealand Dollar vs US Dollar', dailyVolume: 400, dailyTrades: 200, winRate: 47.1 },
  { id: 'a9', name: 'BTC/USD', symbol: 'BTCUSD', category: 'crypto', enabled: true, basePayout: 85, currentPayout: 85, minPayout: 70, maxPayout: 92, isOtc: false, spread: 10, minTrade: 1, maxTrade: 10000, tradingHours: '24/7', description: 'Bitcoin vs US Dollar', dailyVolume: 1800, dailyTrades: 360, winRate: 47.9 },
  { id: 'a10', name: 'ETH/USD', symbol: 'ETHUSD', category: 'crypto', enabled: true, basePayout: 84, currentPayout: 84, minPayout: 70, maxPayout: 91, isOtc: false, spread: 2, minTrade: 1, maxTrade: 10000, tradingHours: '24/7', description: 'Ethereum vs US Dollar', dailyVolume: 1100, dailyTrades: 220, winRate: 48.1 },
  { id: 'a11', name: 'XRP/USD', symbol: 'XRPUSD', category: 'crypto', enabled: true, basePayout: 82, currentPayout: 82, minPayout: 68, maxPayout: 90, isOtc: false, spread: 0.001, minTrade: 1, maxTrade: 5000, tradingHours: '24/7', description: 'Ripple vs US Dollar', dailyVolume: 500, dailyTrades: 100, winRate: 48.4 },
  { id: 'a12', name: 'LTC/USD', symbol: 'LTCUSD', category: 'crypto', enabled: false, basePayout: 80, currentPayout: 80, minPayout: 65, maxPayout: 88, isOtc: false, spread: 0.5, minTrade: 1, maxTrade: 5000, tradingHours: '24/7', description: 'Litecoin vs US Dollar', dailyVolume: 0, dailyTrades: 0, winRate: 0 },
  { id: 'a13', name: 'Gold', symbol: 'XAUUSD', category: 'commodities', enabled: true, basePayout: 82, currentPayout: 82, minPayout: 68, maxPayout: 90, isOtc: false, spread: 0.3, minTrade: 1, maxTrade: 10000, tradingHours: 'Mon-Fri 01:00-23:00', description: 'Gold vs US Dollar', dailyVolume: 900, dailyTrades: 180, winRate: 48.5 },
  { id: 'a14', name: 'Silver', symbol: 'XAGUSD', category: 'commodities', enabled: true, basePayout: 79, currentPayout: 79, minPayout: 65, maxPayout: 87, isOtc: false, spread: 0.02, minTrade: 1, maxTrade: 5000, tradingHours: 'Mon-Fri 01:00-23:00', description: 'Silver vs US Dollar', dailyVolume: 300, dailyTrades: 60, winRate: 47.5 },
  { id: 'a15', name: 'Crude Oil', symbol: 'WTI', category: 'commodities', enabled: false, basePayout: 78, currentPayout: 78, minPayout: 65, maxPayout: 86, isOtc: false, spread: 0.1, minTrade: 1, maxTrade: 5000, tradingHours: 'Mon-Fri 01:00-23:00', description: 'West Texas Intermediate Crude', dailyVolume: 0, dailyTrades: 0, winRate: 0 },
  { id: 'a16', name: 'EUR/USD-OTC', symbol: 'EURUSDOTC', category: 'forex', enabled: true, basePayout: 82, currentPayout: 82, minPayout: 68, maxPayout: 90, isOtc: true, spread: 0.0002, minTrade: 1, maxTrade: 5000, tradingHours: 'Sat-Sun 00:00-23:00', description: 'EUR/USD Over The Counter', dailyVolume: 600, dailyTrades: 300, winRate: 48.0 },
  { id: 'a17', name: 'GBP/USD-OTC', symbol: 'GBPUSDOTC', category: 'forex', enabled: true, basePayout: 80, currentPayout: 80, minPayout: 65, maxPayout: 88, isOtc: true, spread: 0.0003, minTrade: 1, maxTrade: 5000, tradingHours: 'Sat-Sun 00:00-23:00', description: 'GBP/USD Over The Counter', dailyVolume: 400, dailyTrades: 200, winRate: 47.9 },
  { id: 'a18', name: 'BTC/USD-OTC', symbol: 'BTCUSDOTC', category: 'crypto', enabled: true, basePayout: 86, currentPayout: 86, minPayout: 72, maxPayout: 93, isOtc: true, spread: 15, minTrade: 1, maxTrade: 10000, tradingHours: 'Sat-Sun 00:00-23:00', description: 'BTC/USD Over The Counter', dailyVolume: 500, dailyTrades: 100, winRate: 48.2 },
  { id: 'a19', name: 'ETH/USD-OTC', symbol: 'ETHUSDOTC', category: 'crypto', enabled: true, basePayout: 85, currentPayout: 85, minPayout: 70, maxPayout: 92, isOtc: true, spread: 3, minTrade: 1, maxTrade: 10000, tradingHours: 'Sat-Sun 00:00-23:00', description: 'ETH/USD Over The Counter', dailyVolume: 300, dailyTrades: 60, winRate: 48.0 },
  { id: 'a20', name: 'Gold-OTC', symbol: 'XAUUSDOTC', category: 'commodities', enabled: true, basePayout: 83, currentPayout: 83, minPayout: 69, maxPayout: 91, isOtc: true, spread: 0.5, minTrade: 1, maxTrade: 10000, tradingHours: 'Sat-Sun 00:00-23:00', description: 'Gold Over The Counter', dailyVolume: 400, dailyTrades: 80, winRate: 48.3 },
];

export function getTotalDailyVolume(): number {
  return mockAssets.filter(a => a.enabled).reduce((sum, a) => sum + a.dailyVolume, 0);
}
