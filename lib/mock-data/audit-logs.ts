export interface MockAuditLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  target: string;
  targetType: 'user' | 'trade' | 'asset' | 'system' | 'finance';
  details: string;
  ip: string;
  timestamp: string;
}

export const mockAuditLogs: MockAuditLog[] = [
  { id: 'log1', adminId: 'admin1', adminName: 'Shawon', action: 'user.ban', target: 'Alex Johnson', targetType: 'user', details: 'Banned user for suspicious trading activity', ip: '192.168.1.10', timestamp: '2026-08-28T12:00:00Z' },
  { id: 'log2', adminId: 'admin1', adminName: 'Shawon', action: 'withdrawal.approve', target: 'Lisa Martinez', targetType: 'finance', details: 'Approved withdrawal of $800 to Visa ****7891', ip: '192.168.1.10', timestamp: '2026-08-28T11:30:00Z' },
  { id: 'log3', adminId: 'admin2', adminName: 'Operator', action: 'asset.update', target: 'GBP/JPY', targetType: 'asset', details: 'Disabled asset - low volume', ip: '10.0.0.55', timestamp: '2026-08-28T10:45:00Z' },
  { id: 'log4', adminId: 'admin1', adminName: 'Shawon', action: 'kyc.reject', target: 'Kevin Lewis', targetType: 'user', details: 'Rejected KYC - blurry document', ip: '192.168.1.10', timestamp: '2026-08-28T09:00:00Z' },
  { id: 'log5', adminId: 'admin2', adminName: 'Operator', action: 'user.balance_adjust', target: 'John Doe', targetType: 'user', details: 'Credited $100 bonus to balance', ip: '10.0.0.55', timestamp: '2026-08-28T08:30:00Z' },
  { id: 'log6', adminId: 'admin1', adminName: 'Shawon', action: 'withdrawal.reject', target: 'Patricia White', targetType: 'finance', details: 'Rejected withdrawal - insufficient verification', ip: '192.168.1.10', timestamp: '2026-08-27T14:00:00Z' },
  { id: 'log7', adminId: 'admin2', adminName: 'Operator', action: 'system.maintenance', target: 'Platform', targetType: 'system', details: 'Scheduled maintenance window 02:00-04:00 UTC', ip: '10.0.0.55', timestamp: '2026-08-27T12:00:00Z' },
  { id: 'log8', adminId: 'admin1', adminName: 'Shawon', action: 'asset.payout_update', target: 'BTC/USD', targetType: 'asset', details: 'Increased payout from 83% to 85%', ip: '192.168.1.10', timestamp: '2026-08-27T10:15:00Z' },
  { id: 'log9', adminId: 'admin2', adminName: 'Operator', action: 'trade.flag', target: 'Trade t15', targetType: 'trade', details: 'Flagged for review - unusual pattern', ip: '10.0.0.55', timestamp: '2026-08-26T16:30:00Z' },
  { id: 'log10', adminId: 'admin1', adminName: 'Shawon', action: 'user.unban', target: 'Daniel Harris', targetType: 'user', details: 'Unbanned user after review', ip: '192.168.1.10', timestamp: '2026-08-26T14:00:00Z' },
];
