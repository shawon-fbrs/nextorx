export interface TreasuryDay {
  date: string;
  opening: number;
  deposits: number;
  withdrawals: number;
  volume: number;
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

export const treasurySnapshot: TreasurySnapshot = {
  totalBalance: 55212,
  userLiabilities: 32100,
  availableReserve: 23112,
  pendingWithdrawals: 4500,
  netAvailable: 18612,
  reservePercent: 41.8,
  dailyDeposits: 1800,
  dailyWithdrawals: 640,
  dailyVolume: 3500,
  dailyRevenue: 476,
  status: 'healthy',
};

export const treasuryHistory: TreasuryDay[] = [
  {
    date: '2026-08-22',
    opening: 20000,
    deposits: 7240,
    withdrawals: 600,
    volume: 12000,
    winnersPayout: 5760,
    losersKeep: 7800,
    revenue: 2040,
    closing: 28680,
    reservePercent: 34.5,
    activeUsers: 750,
    newUsers: 42,
    churnedUsers: 0,
    winRate: 48.0,
    payoutPercent: 80,
    status: 'healthy',
  },
  {
    date: '2026-08-23',
    opening: 28680,
    deposits: 6560,
    withdrawals: 1440,
    volume: 12960,
    winnersPayout: 4976,
    losersKeep: 6768,
    revenue: 1792,
    closing: 35592,
    reservePercent: 36.2,
    activeUsers: 720,
    newUsers: 38,
    churnedUsers: 30,
    winRate: 48.2,
    payoutPercent: 80,
    status: 'healthy',
  },
  {
    date: '2026-08-24',
    opening: 35592,
    deposits: 9240,
    withdrawals: 2500,
    volume: 20400,
    winnersPayout: 7834,
    losersKeep: 10560,
    revenue: 2726,
    closing: 45058,
    reservePercent: 41.2,
    activeUsers: 850,
    newUsers: 52,
    churnedUsers: 22,
    winRate: 48.1,
    payoutPercent: 82,
    status: 'healthy',
  },
  {
    date: '2026-08-25',
    opening: 45058,
    deposits: 4760,
    withdrawals: 6750,
    volume: 9520,
    winnersPayout: 3747,
    losersKeep: 4982,
    revenue: 1235,
    closing: 44303,
    reservePercent: 38.1,
    activeUsers: 680,
    newUsers: 28,
    churnedUsers: 45,
    winRate: 47.8,
    payoutPercent: 78,
    status: 'caution',
  },
  {
    date: '2026-08-26',
    opening: 44303,
    deposits: 8500,
    withdrawals: 3600,
    volume: 15600,
    winnersPayout: 5841,
    losersKeep: 8024,
    revenue: 2183,
    closing: 51386,
    reservePercent: 42.5,
    activeUsers: 780,
    newUsers: 45,
    churnedUsers: 18,
    winRate: 48.3,
    payoutPercent: 80,
    status: 'healthy',
  },
  {
    date: '2026-08-27',
    opening: 51386,
    deposits: 2700,
    withdrawals: 1200,
    volume: 5400,
    winnersPayout: 2074,
    losersKeep: 2764,
    revenue: 690,
    closing: 53576,
    reservePercent: 44.8,
    activeUsers: 450,
    newUsers: 15,
    churnedUsers: 12,
    winRate: 48.0,
    payoutPercent: 80,
    status: 'healthy',
  },
  {
    date: '2026-08-28',
    opening: 53576,
    deposits: 1800,
    withdrawals: 640,
    volume: 3500,
    winnersPayout: 1344,
    losersKeep: 1820,
    revenue: 476,
    closing: 55212,
    reservePercent: 45.6,
    activeUsers: 350,
    newUsers: 10,
    churnedUsers: 8,
    winRate: 48.2,
    payoutPercent: 80,
    status: 'healthy',
  },
];

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
  { id: 'op1', time: '06:00', name: 'Morning Treasury Check', status: 'completed', details: 'Treasury: $55,212 | Reserve: 45.6% | Status: Healthy' },
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
  { date: '2026-08-22', expectedRevenue: 2400, actualRevenue: 2040, variance: -360, variancePercent: -15.0 },
  { date: '2026-08-23', expectedRevenue: 2592, actualRevenue: 1792, variance: -800, variancePercent: -30.9 },
  { date: '2026-08-24', expectedRevenue: 4080, actualRevenue: 2726, variance: -1354, variancePercent: -33.2 },
  { date: '2026-08-25', expectedRevenue: 1904, actualRevenue: 1235, variance: -669, variancePercent: -35.1 },
  { date: '2026-08-26', expectedRevenue: 3120, actualRevenue: 2183, variance: -937, variancePercent: -30.0 },
  { date: '2026-08-27', expectedRevenue: 1080, actualRevenue: 690, variance: -390, variancePercent: -36.1 },
  { date: '2026-08-28', expectedRevenue: 700, actualRevenue: 476, variance: -224, variancePercent: -32.0 },
];
