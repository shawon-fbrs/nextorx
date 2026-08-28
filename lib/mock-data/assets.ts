export interface MockAsset {
  id: string;
  name: string;
  symbol: string;
  category: 'forex' | 'crypto' | 'commodities' | 'stocks';
  enabled: boolean;
  payoutPercent: number;
  isOtc: boolean;
  spread: number;
  minTrade: number;
  maxTrade: number;
  tradingHours: string;
  description: string;
}

export const mockAssets: MockAsset[] = [
  { id: 'a1', name: 'EUR/USD', symbol: 'EURUSD', category: 'forex', enabled: true, payoutPercent: 80, isOtc: false, spread: 0.0001, minTrade: 1, maxTrade: 5000, tradingHours: 'Mon-Fri 00:00-23:00', description: 'Euro vs US Dollar' },
  { id: 'a2', name: 'GBP/USD', symbol: 'GBPUSD', category: 'forex', enabled: true, payoutPercent: 78, isOtc: false, spread: 0.0002, minTrade: 1, maxTrade: 5000, tradingHours: 'Mon-Fri 00:00-23:00', description: 'British Pound vs US Dollar' },
  { id: 'a3', name: 'USD/JPY', symbol: 'USDJPY', category: 'forex', enabled: true, payoutPercent: 79, isOtc: false, spread: 0.01, minTrade: 1, maxTrade: 5000, tradingHours: 'Mon-Fri 00:00-23:00', description: 'US Dollar vs Japanese Yen' },
  { id: 'a4', name: 'AUD/USD', symbol: 'AUDUSD', category: 'forex', enabled: true, payoutPercent: 81, isOtc: false, spread: 0.0001, minTrade: 1, maxTrade: 5000, tradingHours: 'Mon-Fri 00:00-23:00', description: 'Australian Dollar vs US Dollar' },
  { id: 'a5', name: 'EUR/GBP', symbol: 'EURGBP', category: 'forex', enabled: true, payoutPercent: 77, isOtc: false, spread: 0.0001, minTrade: 1, maxTrade: 5000, tradingHours: 'Mon-Fri 00:00-23:00', description: 'Euro vs British Pound' },
  { id: 'a6', name: 'USD/CAD', symbol: 'USDCAD', category: 'forex', enabled: true, payoutPercent: 80, isOtc: false, spread: 0.0002, minTrade: 1, maxTrade: 5000, tradingHours: 'Mon-Fri 00:00-23:00', description: 'US Dollar vs Canadian Dollar' },
  { id: 'a7', name: 'GBP/JPY', symbol: 'GBPJPY', category: 'forex', enabled: false, payoutPercent: 78, isOtc: false, spread: 0.02, minTrade: 1, maxTrade: 5000, tradingHours: 'Mon-Fri 00:00-23:00', description: 'British Pound vs Japanese Yen' },
  { id: 'a8', name: 'NZD/USD', symbol: 'NZDUSD', category: 'forex', enabled: true, payoutPercent: 76, isOtc: false, spread: 0.0002, minTrade: 1, maxTrade: 5000, tradingHours: 'Mon-Fri 00:00-23:00', description: 'New Zealand Dollar vs US Dollar' },
  { id: 'a9', name: 'BTC/USD', symbol: 'BTCUSD', category: 'crypto', enabled: true, payoutPercent: 85, isOtc: false, spread: 10, minTrade: 1, maxTrade: 10000, tradingHours: '24/7', description: 'Bitcoin vs US Dollar' },
  { id: 'a10', name: 'ETH/USD', symbol: 'ETHUSD', category: 'crypto', enabled: true, payoutPercent: 84, isOtc: false, spread: 2, minTrade: 1, maxTrade: 10000, tradingHours: '24/7', description: 'Ethereum vs US Dollar' },
  { id: 'a11', name: 'XRP/USD', symbol: 'XRPUSD', category: 'crypto', enabled: true, payoutPercent: 82, isOtc: false, spread: 0.001, minTrade: 1, maxTrade: 5000, tradingHours: '24/7', description: 'Ripple vs US Dollar' },
  { id: 'a12', name: 'LTC/USD', symbol: 'LTCUSD', category: 'crypto', enabled: false, payoutPercent: 80, isOtc: false, spread: 0.5, minTrade: 1, maxTrade: 5000, tradingHours: '24/7', description: 'Litecoin vs US Dollar' },
  { id: 'a13', name: 'Gold', symbol: 'XAUUSD', category: 'commodities', enabled: true, payoutPercent: 82, isOtc: false, spread: 0.3, minTrade: 1, maxTrade: 10000, tradingHours: 'Mon-Fri 01:00-23:00', description: 'Gold vs US Dollar' },
  { id: 'a14', name: 'Silver', symbol: 'XAGUSD', category: 'commodities', enabled: true, payoutPercent: 79, isOtc: false, spread: 0.02, minTrade: 1, maxTrade: 5000, tradingHours: 'Mon-Fri 01:00-23:00', description: 'Silver vs US Dollar' },
  { id: 'a15', name: 'Crude Oil', symbol: 'WTI', category: 'commodities', enabled: false, payoutPercent: 78, isOtc: false, spread: 0.1, minTrade: 1, maxTrade: 5000, tradingHours: 'Mon-Fri 01:00-23:00', description: 'West Texas Intermediate Crude' },
  { id: 'a16', name: 'EUR/USD-OTC', symbol: 'EURUSDOTC', category: 'forex', enabled: true, payoutPercent: 82, isOtc: true, spread: 0.0002, minTrade: 1, maxTrade: 5000, tradingHours: 'Sat-Sun 00:00-23:00', description: 'EUR/USD Over The Counter' },
  { id: 'a17', name: 'GBP/USD-OTC', symbol: 'GBPUSDOTC', category: 'forex', enabled: true, payoutPercent: 80, isOtc: true, spread: 0.0003, minTrade: 1, maxTrade: 5000, tradingHours: 'Sat-Sun 00:00-23:00', description: 'GBP/USD Over The Counter' },
  { id: 'a18', name: 'BTC/USD-OTC', symbol: 'BTCUSDOTC', category: 'crypto', enabled: true, payoutPercent: 86, isOtc: true, spread: 15, minTrade: 1, maxTrade: 10000, tradingHours: 'Sat-Sun 00:00-23:00', description: 'BTC/USD Over The Counter' },
  { id: 'a19', name: 'ETH/USD-OTC', symbol: 'ETHUSDOTC', category: 'crypto', enabled: true, payoutPercent: 85, isOtc: true, spread: 3, minTrade: 1, maxTrade: 10000, tradingHours: 'Sat-Sun 00:00-23:00', description: 'ETH/USD Over The Counter' },
  { id: 'a20', name: 'Gold-OTC', symbol: 'XAUUSDOTC', category: 'commodities', enabled: true, payoutPercent: 83, isOtc: true, spread: 0.5, minTrade: 1, maxTrade: 10000, tradingHours: 'Sat-Sun 00:00-23:00', description: 'Gold Over The Counter' },
];
