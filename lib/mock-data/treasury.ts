export interface TreasuryDay {
  date: string;
  opening: number;
  deposits: number;
  withdrawals: number;
  volume: number;
  winnersStake: number;
  losersStake: number;
  winnersPayout: number;
  losersKeep: number;
  revenue: number;
  closing: number;
  reservePercent: number;
  activeUsers: number;
  newUsers: number;
  churnedUsers: number;
  winRate: number;
  payoutPercent: number;
  status: 'healthy' | 'caution' | 'warning' | 'critical';
}

export interface TreasurySnapshot {
  totalBalance: number;
  userLiabilities: number;
  availableReserve: number;
  pendingWithdrawals: number;
  netAvailable: number;
  reservePercent: number;
  dailyDeposits: number;
  dailyWithdrawals: number;
  dailyVolume: number;
  dailyRevenue: number;
  status: 'healthy' | 'caution' | 'warning' | 'critical';
}

function calcRevenue(volume: number, payout: number, winRate: number): number {
  const lossRate = 1 - winRate;
  const losersKeep = volume * lossRate;
  const winnersStake = volume * winRate;
  const winnersPayout = winnersStake * payout;
  return losersKeep - winnersPayout;
}

function calcReserve(total: number, liabilities: number, pending: number): number {
  const available = total - liabilities - pending;
  return available > 0 ? (available / total) * 100 : 0;
}

export const treasuryHistory: TreasuryDay[] = [
  {
    date: '2026-08-22',
    opening: 20000,
    deposits: 7240,
    withdrawals: 600,
    volume: 10200,
    winnersStake: 4896,
    losersStake: 5304,
    winnersPayout: 3917,
    losersKeep: 5304,
    revenue: 1387,
    closing: 27987,
    reservePercent: 34.5,
    activeUsers: 750,
    newUsers: 42,
    churnedUsers: 0,
    winRate: 0.48,
    payoutPercent: 0.80,
    status: 'healthy',
  },
  {
    date: '2026-08-23',
    opening: 27987,
    deposits: 6560,
    withdrawals: 1440,
    volume: 11000,
    winnersStake: 5280,
    losersStake: 5720,
    winnersPayout: 4224,
    losersKeep: 5720,
    revenue: 1496,
    closing: 34603,
    reservePercent: 36.2,
    activeUsers: 720,
    newUsers: 38,
    churnedUsers: 30,
    winRate: 0.48,
    payoutPercent: 0.80,
    status: 'healthy',
  },
  {
    date: '2026-08-24',
    opening: 34603,
    deposits: 9240,
    withdrawals: 2500,
    volume: 17500,
    winnersStake: 8400,
    losersStake: 9100,
    winnersPayout: 6720,
    losersKeep: 9100,
    revenue: 2380,
    closing: 43723,
    reservePercent: 41.2,
    activeUsers: 850,
    newUsers: 52,
    churnedUsers: 22,
    winRate: 0.48,
    payoutPercent: 0.82,
    status: 'healthy',
  },
  {
    date: '2026-08-25',
    opening: 43723,
    deposits: 4760,
    withdrawals: 6750,
    volume: 7800,
    winnersStake: 3744,
    losersStake: 4056,
    winnersPayout: 2924,
    losersKeep: 4056,
    revenue: 1132,
    closing: 42865,
    reservePercent: 38.1,
    activeUsers: 680,
    newUsers: 28,
    churnedUsers: 45,
    winRate: 0.48,
    payoutPercent: 0.78,
    status: 'caution',
  },
  {
    date: '2026-08-26',
    opening: 42865,
    deposits: 8500,
    withdrawals: 3600,
    volume: 13000,
    winnersStake: 6240,
    losersStake: 6760,
    winnersPayout: 4867,
    losersKeep: 6760,
    revenue: 1893,
    closing: 49658,
    reservePercent: 42.5,
    activeUsers: 780,
    newUsers: 45,
    churnedUsers: 18,
    winRate: 0.48,
    payoutPercent: 0.80,
    status: 'healthy',
  },
  {
    date: '2026-08-27',
    opening: 49658,
    deposits: 2700,
    withdrawals: 1200,
    volume: 4200,
    winnersStake: 2016,
    losersStake: 2184,
    winnersPayout: 1613,
    losersKeep: 2184,
    revenue: 571,
    closing: 51729,
    reservePercent: 44.8,
    activeUsers: 450,
    newUsers: 15,
    churnedUsers: 12,
    winRate: 0.48,
    payoutPercent: 0.80,
    status: 'healthy',
  },
  {
    date: '2026-08-28',
    opening: 51729,
    deposits: 1800,
    withdrawals: 640,
    volume: 2800,
    winnersStake: 1344,
    losersStake: 1456,
    winnersPayout: 1075,
    losersKeep: 1456,
    revenue: 381,
    closing: 53270,
    reservePercent: 45.6,
    activeUsers: 350,
    newUsers: 10,
    churnedUsers: 8,
    winRate: 0.48,
    payoutPercent: 0.80,
    status: 'healthy',
  },
];

export const treasurySnapshot: TreasurySnapshot = {
  totalBalance: 53270,
  userLiabilities: 28900,
  availableReserve: 24370,
  pendingWithdrawals: 4500,
  netAvailable: 19870,
  reservePercent: 45.6,
  dailyDeposits: 1800,
  dailyWithdrawals: 640,
  dailyVolume: 2800,
  dailyRevenue: 381,
  status: 'healthy',
};

export interface PayoutRule {
  id: string;
  condition: string;
  threshold: number;
  action: 'increase' | 'decrease' | 'maintain';
  payoutValue: number;
  enabled: boolean;
}

export const payoutRules: PayoutRule[] = [
  { id: 'r1', condition: 'reserve > 40%', threshold: 40, action: 'increase', payoutValue: 85, enabled: true },
  { id: 'r2', condition: 'reserve > 30%', threshold: 30, action: 'increase', payoutValue: 82, enabled: true },
  { id: 'r3', condition: 'reserve < 20%', threshold: 20, action: 'decrease', payoutValue: 75, enabled: true },
  { id: 'r4', condition: 'reserve < 10%', threshold: 10, action: 'decrease', payoutValue: 65, enabled: true },
  { id: 'r5', condition: 'withdrawal/deposit > 100%', threshold: 100, action: 'decrease', payoutValue: 78, enabled: true },
  { id: 'r6', condition: 'win rate < 46%', threshold: 46, action: 'decrease', payoutValue: 76, enabled: true },
];

export interface WithdrawalRule {
  id: string;
  name: string;
  condition: string;
  action: 'auto_approve' | 'manual_review' | 'reject' | 'hold';
  enabled: boolean;
}

export const withdrawalRules: WithdrawalRule[] = [
  { id: 'w1', name: 'Small Verified', condition: 'amount < $500 AND kyc = approved', action: 'auto_approve', enabled: true },
  { id: 'w2', name: 'Medium Verified', condition: 'amount $500-$2000 AND kyc = approved', action: 'manual_review', enabled: true },
  { id: 'w3', name: 'Large Request', condition: 'amount > $2000', action: 'manual_review', enabled: true },
  { id: 'w4', name: 'Unverified User', condition: 'kyc != approved', action: 'manual_review', enabled: true },
  { id: 'w5', name: 'High Reserve Risk', condition: 'reserve < 20%', action: 'hold', enabled: true },
  { id: 'w6', name: 'Daily Limit Exceeded', condition: 'daily_withdrawn > $2000', action: 'reject', enabled: true },
];

export interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  action?: string;
}

export const alerts: Alert[] = [
  { id: 'a1', type: 'warning', title: 'High Withdrawal Day', message: 'Withdrawals ($6,750) exceed deposits ($4,760) by 142%', timestamp: '2026-08-25T14:30:00Z', read: false },
  { id: 'a2', type: 'info', title: 'Payout Adjusted', message: 'Payout reduced to 78% due to high withdrawal ratio', timestamp: '2026-08-25T14:31:00Z', read: false },
  { id: 'a3', type: 'info', title: 'Treasury Recovered', message: 'Reserve back to 42.5% — payout restored to 80%', timestamp: '2026-08-26T06:00:00Z', read: true },
  { id: 'a4', type: 'critical', title: 'Large Withdrawal Request', message: 'Karen Young requested $4,000 withdrawal — requires security review', timestamp: '2026-08-28T09:15:00Z', read: false },
  { id: 'a5', type: 'warning', title: 'Win Rate Dropping', message: 'Win rate at 47.8% — below 48% threshold', timestamp: '2026-08-25T20:00:00Z', read: true },
];

export interface DailyOperation {
  id: string;
  time: string;
  name: string;
  status: 'completed' | 'pending' | 'failed';
  details: string;
}

export const dailyOperations: DailyOperation[] = [
  { id: 'op1', time: '06:00', name: 'Morning Treasury Check', status: 'completed', details: 'Treasury: $53,270 | Reserve: 45.6% | Status: Healthy' },
  { id: 'op2', time: '06:05', name: 'Payout Calculation', status: 'completed', details: 'Payout set to 80% — reserve > 30%' },
  { id: 'op3', time: '08:00', name: 'Withdrawal Queue Review', status: 'completed', details: '12 auto-approved, 3 pending manual review' },
  { id: 'op4', time: '08:15', name: 'Large Deposit Check', status: 'completed', details: 'No deposits > $500 today' },
  { id: 'op5', time: '12:00', name: 'Midday Volume Check', status: 'completed', details: 'Volume: $2,100 | On track for daily target' },
  { id: 'op6', time: '18:00', name: 'Evening Review', status: 'pending', details: 'Scheduled for 18:00' },
  { id: 'op7', time: '22:00', name: 'Night Close', status: 'pending', details: 'Scheduled for 22:00' },
];

export interface UserRisk {
  userId: string;
  userName: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  flags: string[];
  totalVolume: number;
  totalDeposits: number;
  totalWithdrawals: number;
  lastActivity: string;
}

export const userRisks: UserRisk[] = [
  { userId: '5', userName: 'Alex Johnson', riskScore: 85, riskLevel: 'critical', flags: ['Banned user', 'KYC rejected', 'Multiple accounts suspected'], totalVolume: 23456, totalDeposits: 1000, totalWithdrawals: 500, lastActivity: '2026-08-20' },
  { userId: '15', userName: 'Daniel Harris', riskScore: 72, riskLevel: 'high', flags: ['Currently blocked', 'Low win rate 43.5%', 'High volume relative to deposits'], totalVolume: 2345, totalDeposits: 100, totalWithdrawals: 0, lastActivity: '2026-08-22' },
  { userId: '20', userName: 'Karen Young', riskScore: 45, riskLevel: 'medium', flags: ['Large balance', 'Frequent withdrawals'], totalVolume: 189012, totalDeposits: 12000, totalWithdrawals: 6000, lastActivity: '2026-08-28' },
  { userId: '7', userName: 'Chris Brown', riskScore: 35, riskLevel: 'medium', flags: ['KYC pending', 'New account'], totalVolume: 1234, totalDeposits: 200, totalWithdrawals: 0, lastActivity: '2026-08-28' },
  { userId: '3', userName: 'Mike Wilson', riskScore: 30, riskLevel: 'low', flags: ['KYC pending'], totalVolume: 5678, totalDeposits: 500, totalWithdrawals: 0, lastActivity: '2026-08-27' },
  { userId: '11', userName: 'Robert Taylor', riskScore: 20, riskLevel: 'low', flags: ['High volume player'], totalVolume: 234567, totalDeposits: 20000, totalWithdrawals: 12000, lastActivity: '2026-08-28' },
];

export interface PnLRecord {
  date: string;
  expectedRevenue: number;
  actualRevenue: number;
  variance: number;
  variancePercent: number;
}

export const pnlHistory: PnLRecord[] = [
  { date: '2026-08-22', expectedRevenue: 2040, actualRevenue: 1387, variance: -653, variancePercent: -32.0 },
  { date: '2026-08-23', expectedRevenue: 2200, actualRevenue: 1496, variance: -704, variancePercent: -32.0 },
  { date: '2026-08-24', expectedRevenue: 3500, actualRevenue: 2380, variance: -1120, variancePercent: -32.0 },
  { date: '2026-08-25', expectedRevenue: 1560, actualRevenue: 1132, variance: -428, variancePercent: -27.4 },
  { date: '2026-08-26', expectedRevenue: 2600, actualRevenue: 1893, variance: -707, variancePercent: -27.2 },
  { date: '2026-08-27', expectedRevenue: 840, actualRevenue: 571, variance: -269, variancePercent: -32.0 },
  { date: '2026-08-28', expectedRevenue: 560, actualRevenue: 381, variance: -179, variancePercent: -32.0 },
];

export function calcDailyRevenue(volume: number, payoutPercent: number): number {
  const lossRate = 0.52;
  const winRate = 0.48;
  const losersKeep = volume * lossRate;
  const winnersStake = volume * winRate;
  const winnersPayout = winnersStake * payoutPercent;
  return losersKeep - winnersPayout;
}

export function calcTreasuryClosing(
  opening: number,
  deposits: number,
  withdrawals: number,
  volume: number,
  payoutPercent: number
): { closing: number; revenue: number } {
  const revenue = calcDailyRevenue(volume, payoutPercent);
  const closing = opening + deposits - withdrawals + revenue;
  return { closing, revenue };
}
