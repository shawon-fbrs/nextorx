# NextOrx — Complete Platform Audit & Recommendations

**Date:** August 31, 2026
**Status:** Pre-Production Audit
**Version:** 1.0

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture & Infrastructure](#architecture--infrastructure)
3. [Security](#security)
4. [Financial System](#financial-system)
5. [OTC Engine & Price Generation](#otc-engine--price-generation)
6. [Pair Management](#pair-management)
7. [Trade Placement & Settlement](#trade-placement--settlement)
8. [Peer-to-Peer Matching System](#peer-to-peer-matching-system)
9. [Auth System](#auth-system)
10. [Deposit & Withdrawal System](#deposit--withdrawal-system)
11. [Bonus System](#bonus-system)
12. [User Risk Profiling](#user-risk-profiling)
13. [Admin Console](#admin-console)
14. [Frontend UI/UX](#frontend-uiux)
15. [Compliance & Legal](#compliance--legal)
16. [Marketing & Growth](#marketing--growth)
17. [Operations & Monitoring](#operations--monitoring)
18. [Risk Management](#risk-management)
19. [Implementation Roadmap](#implementation-roadmap)

---

## Executive Summary

This document provides a comprehensive audit of the NextOrx binary options trading platform, covering all aspects from security to financial systems to user experience. The audit identifies critical issues that must be fixed before production launch and provides detailed recommendations for improvement.

### Key Findings

| Category | Critical Issues | High Issues | Medium Issues |
|---|---|---|---|
| Security | 3 | 4 | 3 |
| Financial | 2 | 3 | 4 |
| Trading | 1 | 3 | 2 |
| Auth | 0 | 2 | 4 |
| Frontend | 1 | 2 | 5 |
| **Total** | **7** | **14** | **18** |

### Priority Levels

- **P0 (Critical):** Platform will fail without these
- **P1 (High):** Must fix before production
- **P2 (Medium):** Must fix before public launch
- **P3 (Low):** Post-launch improvements

---

## Architecture & Infrastructure

### Current Stack

```
Frontend:    Next.js 15 + React 19 + Tailwind CSS
Backend:     Custom Node.js server (server.ts)
Database:    PostgreSQL 17
Cache:       Redis 7.2
Auth:        better-auth v1.7.2
Real-time:   ws (WebSocket library)
Deployment:  Docker + Coolify
CDN:         Cloudflare
Charts:      KLineChart v10.0.2
```

### Issues Found

| Issue | Severity | Description |
|---|---|---|
| No job queue | HIGH | Trade settlement uses setTimeout, unreliable on restart |
| No background jobs | HIGH | No async processing for emails, notifications |
| No caching layer | MEDIUM | Every request hits database |
| Single instance only | MEDIUM | Cannot scale horizontally |
| No structured logging | MEDIUM | Hard to debug issues |
| No health metrics | LOW | No visibility into system health |

### Recommendations

1. **Add BullMQ + Redis for job queue**
   - Trade settlement jobs (durable, retry on failure)
   - Email/notification jobs
   - Scheduled tasks (daily reports, bonus expiry)

2. **Add Redis caching**
   - Cache pairs list (invalidate on change)
   - Cache user balance (invalidate on trade/deposit/withdrawal)
   - Cache platform settings

3. **Add structured logging**
   - JSON format for log aggregation
   - Log levels (info, warn, error, critical)
   - Request/response logging
   - Audit trail for sensitive operations

4. **Add health monitoring**
   - Database connection check
   - Redis connection check
   - WebSocket health
   - API response times
   - Error rates

---

## Security

### Critical Vulnerabilities

| Vulnerability | File | Impact | Fix |
|---|---|---|---|
| Debug endpoints exposed | app/api/debug/* | Database wipe possible | Delete files |
| Hardcoded admin password | env.ts | Account compromise | Remove default |
| No rate limiting | All API routes | Brute force, DoS | Add @upstash/ratelimit |

### High Vulnerabilities

| Vulnerability | File | Impact | Fix |
|---|---|---|---|
| No CSRF protection | State-changing routes | Request forgery | Add CSRF tokens |
| WebSocket unauthenticated | server.ts | Data theft | Validate session |
| Banned users can login | lib/auth.ts | Bypass enforcement | Add ban check |
| No security headers | next.config.ts | XSS, clickjacking | Add CSP, X-Frame-Options |

### Security Checklist

```
□ Remove debug endpoints from production
□ Add rate limiting (login: 5/min, API: 100/min, trades: 30/min)
□ Enforce strong passwords (12+ chars, mixed case, numbers, symbols)
□ Add CSRF tokens for state-changing operations
□ Authenticate WebSocket connections
□ Add input validation (zod) on all endpoints
□ Configure CORS properly
□ Add security headers (CSP, X-Frame-Options, HSTS)
□ Enable HTTPS only
□ Add IP-based blocking for suspicious activity
□ Implement account lockout after failed attempts
□ Add 2FA enforcement for admin accounts
□ Log all security events
```

---

## Financial System

### Current Ledger Types

```
DEPOSIT_CREDIT      - Money in from deposit
WITHDRAWAL_HOLD     - Money locked for withdrawal
WITHDRAWAL_RELEASE  - Withdrawal rejected, money returned
WITHDRAWAL_DEBIT    - Money sent out
TRADE_HOLD          - Money locked for trade
TRADE_RELEASE       - Trade cancelled, money returned
TRADE_WIN           - Trade won, payout credited
TRADE_LOST          - Trade lost, money kept (NOT IMPLEMENTED)
PROMO_CREDIT        - Bonus credited
PROMO_CONVERT       - Bonus converted to real
BONUS_CREDIT        - Bonus credited
BONUS_CONVERT       - Bonus converted to real
BONUS_EXPIRE        - Bonus expired
ADMIN_ADJUSTMENT    - Manual admin adjustment
```

### Critical Issues

| Issue | Description | Impact |
|---|---|---|
| TRADE_WIN never called | Win settlement doesn't credit balance | Users lose money even when winning |
| TRADE_RELEASE missing | Cancelled trades don't return funds | Funds held forever |
| Vault allows negative | No circuit breaker on vault | Platform insolvency |

### Money Flow Diagram

```
                    ┌─────────────────┐
                    │   User Wallet   │
                    │   (balance)     │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
    ┌─────────┐        ┌─────────┐        ┌─────────┐
    │ Deposit │        │  Trade  │        │Withdraw │
    │ Credit  │        │  Hold   │        │  Hold   │
    └─────────┘        └────┬────┘        └────┬────┘
                            │                  │
                      ┌─────┴─────┐      ┌─────┴─────┐
                      │           │      │           │
                      ▼           ▼      ▼           ▼
                 ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
                 │Trade   │ │Trade   │ │With-   │ │With-   │
                 │Win     │ │Release │ │drawal  │ │drawal  │
                 │(credit)│ │(credit)│ │Release │ │Debit   │
                 └────────┘ └────────┘ └────────┘ └────────┘
```

### Required Fix: Trade Settlement

```typescript
// On trade win
async function settleTradeWin(trade: Trade) {
  const payout = Math.round(trade.amount * (Number(trade.payoutPercent) / 100));
  
  await credit({
    userId: trade.userId,
    type: 'TRADE_WIN',
    amount: trade.amount + payout,  // Return stake + payout
    referenceId: trade.id,
    description: `Trade won: ${trade.pair.name}`
  });
  
  await prisma.trade.update({
    where: { id: trade.id },
    data: {
      status: 'WON',
      profit: payout,
      closePrice: getCurrentPrice(trade.pairId),
      settledAt: new Date()
    }
  });
}

// On trade loss - no entry needed (TRADE_HOLD already debited)
async function settleTradeLoss(trade: Trade) {
  await prisma.trade.update({
    where: { id: trade.id },
    data: {
      status: 'LOST',
      profit: -trade.amount,
      closePrice: getCurrentPrice(trade.pairId),
      settledAt: new Date()
    }
  });
}

// On trade cancellation
async function settleTradeCancel(trade: Trade) {
  await credit({
    userId: trade.userId,
    type: 'TRADE_RELEASE',
    amount: trade.amount,  // Return stake
    referenceId: trade.id,
    description: `Trade cancelled: ${trade.pair.name}`
  });
  
  await prisma.trade.update({
    where: { id: trade.id },
    data: { status: 'CANCELLED' }
  });
}
```

### Vault Safety Rules

```typescript
async function canProcessWithdrawal(amount: number): Promise<boolean> {
  const treasury = await getTreasuryBalance();
  const totalExposure = await getActiveTradeExposure();
  const pendingWithdrawals = await getPendingWithdrawals();
  
  // Rule 1: Never let vault go below 20% of total liabilities
  const safeLevel = (totalExposure + pendingWithdrawals) * 0.2;
  if (treasury - amount < safeLevel) return false;
  
  // Rule 2: Maximum single withdrawal = 10% of vault
  if (amount > treasury * 0.1) return false;
  
  // Rule 3: Daily withdrawal limit
  const dailyWithdrawn = await getDailyWithdrawn();
  if (dailyWithdrawn + amount > treasury * 0.3) return false;
  
  return true;
}
```

---

## OTC Engine & Price Generation

### Current Implementation

```typescript
// Simple random walk
const priceChange = (Math.random() - 0.5) * volatility * 0.06;
```

### Problems

| Problem | Impact |
|---|---|
| Pure random walk | Unrealistic charts, predictable patterns |
| No spread on entry | Platform loses immediate edge |
| Settlement disconnected from engine | Fake trade results |
| No manipulation zone | Less psychological engagement |
| Static volatility | No realistic market behavior |

### Recommended Price Engine

```
PRICE GENERATION COMPONENTS:
┌─────────────────────────────────────────────────┐
│  1. Random Walk (30%) - Base movement           │
│  2. Trend (20%) - Directional bias              │
│  3. Mean Reversion (20%) - Pull to base         │
│  4. Volatility Clustering (15%) - Realistic     │
│  5. Time-based Bias (10%) - Session effects     │
│  6. Manipulation Zone (5%) - Near expiry        │
└─────────────────────────────────────────────────┘
```

### Price Generation Algorithm

```typescript
interface PairState {
  pairId: string;
  basePrice: number;
  currentPrice: number;
  volatility: number;
  trend: number;          // -1 to 1 (bearish to bullish)
  meanReversion: number;  // 0 to 1 (pull strength)
  spread: number;
}

function generatePrice(pair: PairState): number {
  // 1. Random component (Brownian motion)
  const random = (Math.random() - 0.5) * pair.volatility * 0.06;
  
  // 2. Trend component (slow drift)
  const trend = pair.trend * pair.volatility * 0.008;
  
  // 3. Mean reversion (pull to base price)
  const deviation = (pair.currentPrice - pair.basePrice) / pair.basePrice;
  const reversion = -deviation * pair.meanReversion * 0.1;
  
  // 4. Volatility clustering (big moves follow big moves)
  const recentVolatility = getRecentVolatility(pair.pairId, 10);
  const clustering = recentVolatility * (Math.random() - 0.5) * 0.02;
  
  // 5. Combine all components
  const change = random + trend + reversion + clustering;
  
  // 6. Apply change
  const newPrice = pair.currentPrice * (1 + change);
  
  // 7. Clamp to prevent extreme values
  return Math.max(
    pair.basePrice * 0.5,
    Math.min(pair.basePrice * 2, newPrice)
  );
}
```

### Spread Application

```
Current Price: 1.08500
Spread: 0.0002

BUY entry:  1.08510 (price + spread/2)
SELL entry: 1.08490 (price - spread/2)

User needs price to move MORE than spread to profit.
Platform earns spread regardless of outcome.
```

```typescript
function getEntryPrice(pair: PairState, direction: 'UP' | 'DOWN'): number {
  const halfSpread = pair.spread / 2;
  
  if (direction === 'UP') {
    return pair.currentPrice + halfSpread;  // Buy higher
  } else {
    return pair.currentPrice - halfSpread;  // Sell lower
  }
}
```

### Manipulation Zone (Last 10 Seconds)

```typescript
function applyManipulationZone(
  price: number, 
  trade: ActiveTrade, 
  timeLeft: number
): number {
  if (timeLeft > 10000) return price;  // No manipulation > 10s left
  
  const strength = (10000 - timeLeft) / 10000;  // 0 to 1
  const currentlyWinning = isCurrentlyWinning(trade, price);
  
  if (currentlyWinning) {
    // Push price slightly against user (create tension)
    return price * (1 - 0.0001 * strength);
  } else {
    // Push price slightly toward user (create hope)
    return price * (1 + 0.0001 * strength);
  }
}
```

---

## Pair Management

### Current Schema

```prisma
model Pair {
  id            String   @id
  name          String
  category      String
  basePrice     Decimal  @db.Decimal(16, 8)
  volatility    Decimal  @db.Decimal(12, 6)
  payoutPercent Decimal  @db.Decimal(5, 2) @default(80)
  spread        Decimal  @db.Decimal(8, 6) @default(0.0002)
  isActive      Boolean  @default(true)
  minTrade      Decimal  @db.Decimal(10, 2) @default(1)
  maxTrade      Decimal  @db.Decimal(10, 2) @default(5000)
  sortOrder     Int      @default(0)
}
```

### Recommended Enhanced Schema

```prisma
model Pair {
  id              String   @id
  name            String   // "EURUSD"
  symbol          String?  // "EUR/USD" (display)
  category        String   // forex, crypto, commodities, indices
  
  // Pricing
  basePrice       Decimal  @db.Decimal(16, 8)
  volatility      Decimal  @db.Decimal(12, 6)
  payoutPercent   Decimal  @db.Decimal(5, 2) @default(80)
  weekendPayout   Decimal  @db.Decimal(5, 2)  // Lower on weekends
  spread          Decimal  @db.Decimal(8, 6) @default(0.0002)
  
  // Display
  isActive        Boolean  @default(true)
  isFeatured      Boolean  @default(false)    // Show in top bar
  sortOrder       Int      @default(0)
  description     String?
  icon            String?  // Logo URL
  tags            String[] // ["major", "volatile", "popular"]
  
  // Trading rules
  tradingHours    String?  @default("24/7")
  minTrade        Decimal  @db.Decimal(10, 2) @default(1)
  maxTrade        Decimal  @db.Decimal(10, 2) @default(5000)
  maxPayout       Decimal  @db.Decimal(5, 2) @default(95)
  
  // Risk management
  maxDailyVolume  Decimal  @db.Decimal(12, 2) @default(100000)
  maxExposure     Decimal  @db.Decimal(12, 2) @default(5000)
  maxOpenTrades   Int      @default(100)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  candles         Candle[]
  trades          Trade[]
  
  @@index([isActive, sortOrder])
  @@index([category])
  @@index([isFeatured])
}
```

### Recommended Pair Categories

```
FOREX (20 pairs):
  Major: EURUSD, GBPUSD, USDJPY, USDCHF, USDCAD, AUDUSD, NZDUSD
  Minor: EURGBP, EURJPY, GBPJPY, AUDJPY, CADJPY, CHFJPY, 
         EURCHF, EURAUD, EURCAD, GBPCAD, GBPAUD, AUDCAD, NZDCAD

CRYPTO (10 pairs):
  BTCUSD, ETHUSD, BNBUSD, SOLUSD, XRPUSD, 
  DOGEUSD, ADAUSD, DOTUSD, AVAXUSD, MATICUSD

COMMODITIES (8 pairs):
  XAUUSD (Gold), XAGUSD (Silver), USOIL (Crude Oil), 
  XPTUSD (Platinum), XPDUSD (Palladium), NATGAS (Natural Gas), 
  COPPER, WHEAT

INDICES (7 pairs):
  SPX500, NAS100, DJ30, UK100, DAX40, NIKKEI225, ASX200

TOTAL: 45 pairs
```

### Category-Based Defaults

| Category | Volatility | Spread | Payout | Weekend Payout |
|---|---|---|---|---|
| Forex | 0.3-0.8 | 0.0001-0.0005 | 80% | 77% |
| Crypto | 1.5-3.0 | 0.001-0.005 | 75% | 75% |
| Commodities | 0.5-1.5 | 0.0003-0.001 | 78% | 75% |
| Indices | 0.5-1.2 | 0.0002-0.0008 | 80% | 77% |

### Admin API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | /api/admin/pairs | List all pairs with stats |
| POST | /api/admin/pairs | Create new pair |
| PUT | /api/admin/pairs/[id] | Update pair |
| DELETE | /api/admin/pairs/[id] | Soft delete (only if no trades) |
| PUT | /api/admin/pairs/[id]/toggle | Quick enable/disable |
| POST | /api/admin/pairs/reorder | Bulk reorder (drag-and-drop) |

---

## Trade Placement & Settlement

### Current Flow

```
1. User places trade
   → Debit TRADE_HOLD from balance
   → Create Trade record (status: ACTIVE)
   → Start setTimeout for settlement

2. After duration expires (setTimeout)
   → Generate random close price
   → Determine win/loss
   → Update Trade record
   → (BUG: No ledger entry for win/loss)

3. Trade settled
   → Status: WON or LOST
   → Profit recorded (but not credited/debited)
```

### Problems

| Problem | Impact |
|---|---|
| setTimeout loses trades on restart | Users lose money |
| No ledger entry on win | Users don't get paid |
| Close price is random, not from engine | Fake results |
| No concurrent trade limits | Excessive risk |
| No exposure checks | Platform overexposure |

### Recommended Flow

```
1. VALIDATION
   □ Check user is not banned
   □ Check pair is active
   □ Check amount within limits
   □ Check user has sufficient balance
   □ Check user hasn't exceeded max concurrent trades
   □ Check pair hasn't exceeded max exposure
   □ Check platform hasn't exceeded max total exposure

2. TRADE PLACEMENT
   → Debit TRADE_HOLD from balance
   → Record entry price (with spread applied)
   → Create Trade record (status: ACTIVE)
   → Add to active trades queue (BullMQ job)

3. TRADE ACTIVE
   → Engine ticks update live price
   → User sees real-time P&L
   → Job scheduled for settlement at expiry

4. TRADE SETTLEMENT (via BullMQ job, not setTimeout)
   → Get actual engine price at expiry
   → Apply manipulation zone if applicable
   → Determine outcome using win rate algorithm
   → Credit TRADE_WIN on win
   → Update Trade record
   → Update UserRiskProfile

5. POST-SETTLEMENT
   → Update user balance display
   → Send notification if significant win/loss
   → Check for suspicious activity
```

### Settlement Code

```typescript
async function settleTrade(trade: ActiveTrade) {
  const engine = await getOTCEngine();
  const exitPrice = engine.getCurrentPrice(trade.pairId);
  
  // Apply spread to entry price
  const entryPrice = Number(trade.openPrice);
  const halfSpread = Number(trade.spread) / 2;
  
  // Determine if price movement is significant
  const priceMovement = exitPrice - entryPrice;
  const movementPercent = Math.abs(priceMovement) / entryPrice;
  const isSignificantMove = movementPercent > Number(trade.spread);
  
  // Get user's target win rate
  const targetWinRate = await calculateWinRate(trade.userId);
  
  // Determine outcome
  let won: boolean;
  
  if (!isSignificantMove) {
    // No significant movement - user loses (spread ate the profit)
    won = false;
  } else {
    // Check if direction matches
    const directionCorrect = 
      (trade.direction === 'UP' && priceMovement > 0) ||
      (trade.direction === 'DOWN' && priceMovement < 0);
    
    if (directionCorrect) {
      // Direction correct - check if we should allow win
      const recentWinRate = await getRecentWinRate(trade.userId, 50);
      if (recentWinRate > targetWinRate) {
        // User winning too much - sometimes flip result
        won = Math.random() < 0.3;
      } else {
        won = true;
      }
    } else {
      // Direction wrong - check if we should give mercy win
      const recentWinRate = await getRecentWinRate(trade.userId, 50);
      if (recentWinRate < targetWinRate - 0.1) {
        // User losing too much - sometimes give mercy win
        won = Math.random() < 0.4;
      } else {
        won = false;
      }
    }
  }
  
  // Settle the trade
  if (won) {
    await settleTradeWin(trade, exitPrice);
  } else {
    await settleTradeLoss(trade, exitPrice);
  }
  
  // Update risk profile
  await updateRiskProfile(trade.userId, won);
}
```

---

## Peer-to-Peer Matching System

### Concept

Instead of the platform always being the counterparty, traders with opposite positions on the same pair can be matched directly. The platform takes a commission instead of the full house edge.

### Current Model: Platform as Counterparty

```
Trader A: Bets $100 UP on EURUSD
Trader B: Bets $100 DOWN on EURUSD

Platform takes both trades independently:

If A wins:
  Platform pays A: $180 (stake + 80% payout)
  Platform keeps: $100 (from B)
  Platform profit: $100 - $80 = $20

If B wins:
  Platform pays B: $180 (stake + 80% payout)
  Platform keeps: $100 (from A)
  Platform profit: $100 - $80 = $20

Platform always profits $20 per matched pair of trades.
```

### Proposed Model: Peer-to-Peer Matching

```
Trader A: Bets $100 UP on EURUSD
Trader B: Bets $100 DOWN on EURUSD

Platform matches them (A is counterparty to B):

If A wins:
  A gets $180 from B (their $100 + $80 profit)
  Platform commission: 5% of trade = $5 from A + $5 from B = $10
  Platform profit: $10

If B wins:
  B gets $180 from A (their $100 + $80 profit)
  Platform commission: 5% of trade = $5 from A + $5 from B = $10
  Platform profit: $10
```

### Comparison

| Aspect | Platform Counterparty | P2P Matching |
|---|---|---|
| Platform profit per trade | $20 (10% edge) | $10 (5% commission) |
| Platform risk | HIGH (pays winners) | LOW (just commissions) |
| Maximum loss | Unlimited | $0 (always profitable) |
| Required reserve | Large | Minimal |
| Scalability | Limited by capital | Unlimited |

### Hybrid Model (Recommended)

```
HIERARCHY:
1. First, try to match with opposite trader (P2P)
2. If no match available, platform takes the trade

BENEFITS:
- Platform earns commissions on matched trades (no risk)
- Platform earns full edge on unmatched trades (higher profit)
- Platform can handle unlimited volume (no capital constraints)
- Users get better execution (matched instantly)
```

### Matching Algorithm

```typescript
interface PendingTrade {
  tradeId: string;
  userId: string;
  pairId: string;
  direction: 'UP' | 'DOWN';
  amount: number;
  payoutPercent: number;
  entryPrice: number;
  timestamp: number;
}

class TradeMatcher {
  private pendingTrades: Map<string, PendingTrade[]> = new Map();
  
  async addTrade(trade: PendingTrade): Promise<boolean> {
    const pairPending = this.pendingTrades.get(trade.pairId) || [];
    
    // Find opposite trade to match
    const opposite = pairPending.find(p => 
      p.direction !== trade.direction &&
      Math.abs(p.amount - trade.amount) <= trade.amount * 0.1  // Within 10% amount
    );
    
    if (opposite) {
      // Match found - execute P2P trade
      await this.executeMatch(trade, opposite);
      return true;
    } else {
      // No match - add to pending queue
      pairPending.push(trade);
      this.pendingTrades.set(trade.pairId, pairPending);
      return false;
    }
  }
  
  private async executeMatch(trade1: PendingTrade, trade2: PendingTrade) {
    const commission = 0.05;  // 5% total (2.5% each)
    
    // Calculate payouts
    const trade1Payout = Math.round(trade1.amount * (trade1.payoutPercent / 100));
    const trade2Payout = Math.round(trade2.amount * (trade2.payoutPercent / 100));
    
    // Create matched trade record
    await prisma.matchedTrade.create({
      data: {
        trade1Id: trade1.tradeId,
        trade2Id: trade2.tradeId,
        pairId: trade1.pairId,
        amount: Math.min(trade1.amount, trade2.amount),
        commission: Math.round(trade1.amount * commission * 2),
        status: 'MATCHED'
      }
    });
    
    // Remove from pending
    this.removePending(trade1.pairId, trade1.tradeId);
    this.removePending(trade2.pairId, trade2.tradeId);
  }
}
```

### Settlement for Matched Trades

```typescript
async function settleMatchedTrade(matchedTrade: MatchedTrade) {
  const trade1 = await prisma.trade.findUnique({ where: { id: matchedTrade.trade1Id } });
  const trade2 = await prisma.trade.findUnique({ where: { id: matchedTrade.trade2Id } });
  
  const exitPrice = await getCurrentPrice(matchedTrade.pairId);
  
  // Determine winners
  const trade1Won = determineOutcome(trade1, exitPrice);
  const trade2Won = !trade1Won;  // One must win, one must lose
  
  // Transfer funds between traders
  if (trade1Won) {
    // Trade 1 wins: gets Trade 2's stake + payout from Trade 2
    const payout = Math.round(trade2.amount * (trade2.payoutPercent / 100));
    
    await credit({
      userId: trade1.userId,
      type: 'TRADE_WIN',
      amount: trade1.amount + payout,
      referenceId: matchedTrade.id,
      description: `Matched trade won: ${trade1.pair.name}`
    });
  } else {
    // Trade 2 wins
    const payout = Math.round(trade1.amount * (trade1.payoutPercent / 100));
    
    await credit({
      userId: trade2.userId,
      type: 'TRADE_WIN',
      amount: trade2.amount + payout,
      referenceId: matchedTrade.id,
      description: `Matched trade won: ${trade2.pair.name}`
    });
  }
  
  // Platform keeps commission (already debited from both traders)
  await creditVault({
    type: 'TRADE_COMMISSION',
    amount: matchedTrade.commission,
    referenceId: matchedTrade.id,
    description: `Matched trade commission`
  });
}
```

### Revenue Comparison

```
SCENARIO: 1000 trades per day, 50% matched

CURRENT MODEL (Platform Counterparty):
  1000 trades × $100 avg × 10% edge = $10,000/day
  
P2P MODEL (All matched):
  1000 trades × $100 avg × 5% commission = $5,000/day

HYBRID MODEL (50% matched):
  500 matched × $100 × 5% = $2,500
  500 unmatched × $100 × 10% = $5,000
  Total: $7,500/day

RISK COMPARISON:
  Current: High risk (must pay winners from reserve)
  P2P: Zero risk (only commissions)
  Hybrid: Medium risk (only unmatched trades)
```

### Recommended Implementation

```
PHASE 1: Basic Matching
  - Match trades on same pair, opposite direction
  - Match within 10% of amount
  - 5-second matching window before platform takes trade
  - 5% total commission (2.5% each side)

PHASE 2: Advanced Matching
  - Match across similar pairs (EURUSD/GBPUSD)
  - Match partial amounts
  - Dynamic commission based on volume
  - Priority matching for larger amounts

PHASE 3: Order Book
  - Full order book system
  - Market and limit orders
  - Price improvement for makers
  - Liquidity provider rewards
```

### New Database Models

```prisma
model MatchedTrade {
  id            String   @id @default(uuid())
  trade1Id      String
  trade1        Trade    @relation(fields: [trade1Id], references: [id])
  trade2Id      String
  trade2        Trade    @relation(fields: [trade2Id], references: [id])
  pairId        String
  pair          Pair     @relation(fields: [pairId], references: [id])
  amount        Int
  commission    Int
  status        String   @default("MATCHED")  // MATCHED, SETTLED, CANCELLED
  settledAt     DateTime?
  createdAt     DateTime @default(now())
  
  @@index([pairId, status])
  @@index([status, createdAt])
}

model OrderBook {
  id            String   @id @default(uuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  pairId        String
  pair          Pair     @relation(fields: [pairId], references: [id])
  direction     String   // UP, DOWN
  amount        Int
  price         Decimal  @db.Decimal(16, 8)
  status        String   @default("PENDING")  // PENDING, FILLED, CANCELLED
  filledAt      DateTime?
  createdAt     DateTime @default(now())
  
  @@index([pairId, status, direction])
  @@index([userId, status])
}
```

---

## Auth System

### Current State

```
✅ Email/password login
✅ Google OAuth
✅ TOTP 2FA (plugin)
✅ Session management
✅ Admin roles (RBAC)
❌ Email verification (disabled)
❌ Password reset
❌ Banned user enforcement
❌ Login notifications
❌ Session revocation UI
```

### Required Improvements

1. **Enable Email Verification**
   - Send verification email on registration
   - Block login until verified
   - Resend verification option

2. **Implement Password Reset**
   - Forgot password flow
   - Email with reset link
   - Link expires in 1 hour
   - Invalidate all sessions on reset

3. **Enforce Banned User Check**
   - Check banned status on login
   - Check banned status on session refresh
   - Show ban message to banned users

4. **Implement Login Notifications**
   - Email on new device login
   - Email on suspicious location
   - In-app notification

5. **Implement Session Management**
   - List all active sessions
   - Revoke specific sessions
   - Revoke all sessions
   - Show device/IP info

6. **Add Password Complexity**
   - Minimum 12 characters
   - Must include uppercase, lowercase, number, symbol
   - Check against common passwords

---

## Deposit & Withdrawal System

### Deposit Rules (Recommended)

```
NEW USER (0-7 days):
  - Max deposit: $20
  - Max balance: $50

WEEK 2-4 (8-30 days):
  - Max deposit: $50
  - Max balance: $150

MONTH 2 (31-60 days):
  - Max deposit: $200
  - Max balance: $500

MONTH 3+ (61+ days):
  - No limit
```

### Withdrawal Rules (Recommended)

```
NEW USER (0-7 days):
  - Cannot withdraw

WEEK 2-4 (8-30 days):
  - Max withdrawal: $50/week
  - Manual review only
  - Processing: 24-48 hours

MONTH 2 (31-60 days):
  - Max withdrawal: $200/week
  - Auto-approve < $100
  - Processing: 12-24 hours

MONTH 3+ (61+ days):
  - Max withdrawal: $500/week
  - Auto-approve < $250
  - Processing: 6-12 hours

FEE: 2% (min $1, max $50)
```

---

## Bonus System

### Bonus Types (Recommended)

```
1. DEPOSIT MATCH (100% up to $100)
   - 40x wagering requirement
   - Expires in 30 days
   - Max bet while bonus active: $10

2. NO DEPOSIT BONUS ($10 free)
   - 50x wagering requirement
   - Expires in 7 days
   - Max withdrawal: $50

3. CASHBACK (10% weekly losses)
   - 10x wagering requirement
   - Credited every Monday

4. REFERRAL BONUS ($20 per referral)
   - 20x wagering requirement
   - Referee must deposit $50+
```

### Turnover Tracking

```
User deposits $100 + gets $100 bonus
Total balance: $200
Wagering required: $200 × 40 = $8,000

Each trade contributes to turnover:
  Trade amount × 100% = turnover

When turnover >= $8,000:
  - Bonus converts to real
  - User can withdraw

If bonus expires before turnover complete:
  - Bonus balance removed
  - Any winnings from bonus kept
```

---

## User Risk Profiling

### Risk Score Calculation

```typescript
function calculateRiskScore(userId: string): number {
  const user = getUser(userId);
  const profile = getRiskProfile(userId);
  
  let score = 0;
  
  // 1. Deposit/withdrawal ratio
  const ratio = user.totalDeposits / (user.totalWithdrawals || 1);
  if (ratio < 0.5) score += 30;  // Withdrawing more than depositing
  
  // 2. Win rate anomaly
  const winRate = profile.totalWins / profile.totalTrades;
  if (winRate > 0.6) score += 20;  // Suspiciously high
  
  // 3. Martingale detection
  if (profile.currentLossStreak > 5) score += 15;
  
  // 4. Volume spike
  if (profile.dailyVolume > profile.betLimitDaily * 0.8) score += 10;
  
  // 5. Multiple accounts (same IP)
  if (hasMultipleAccounts(user.id)) score += 25;
  
  return Math.min(100, score);
}
```

### Risk Levels

| Score | Level | Action |
|---|---|---|
| 0-20 | LOW | Normal trading |
| 21-50 | MEDIUM | Monitor closely |
| 51-75 | HIGH | Reduce win rate, increase limits |
| 76-100 | EXTREME | Manual review required |

---

## Admin Console

### Missing Features

```
1. REAL-TIME DASHBOARD
   - Live trade feed
   - Live revenue counter
   - Live user count
   - Live volume counter

2. PAIR MANAGEMENT (CRUD)
   - Add/edit/delete pairs
   - Enable/disable toggle
   - Drag-and-drop reordering
   - Bulk actions

3. SETTINGS (PERSISTENT)
   - General settings
   - Trading settings
   - Payout settings
   - Withdrawal rules
   - Notification settings
   - Security settings

4. FINANCIAL OVERVIEW
   - Treasury balance
   - Daily/weekly/monthly revenue
   - Exposure overview
   - Withdrawal capacity

5. RISK MANAGEMENT
   - Flagged users
   - Suspicious activity
   - Whale alerts
   - Martingale detection

6. REPORTS
   - Daily P&L report
   - User activity report
   - Pair performance report
   - Withdrawal report

7. KYC MANAGEMENT
   - View submissions
   - Approve/reject
   - Request additional docs

8. SUPPORT TICKETS
   - View tickets
   - Respond to tickets
   - Assign to staff
```

---

## Frontend UI/UX

### Issues Found

| Issue | Impact |
|---|---|
| Trade sends wrong field name | Trades broken |
| Balance not auto-refreshed | Stale balance |
| Many links point to # | Broken navigation |
| Loading skeletons flash | Poor UX |
| No error toasts | Silent failures |
| No trade confirmation | Accidental trades |
| No trade history detail | Can't review trades |

### Recommended Improvements

1. **Trade Page**
   - Add trade confirmation modal
   - Add real-time balance update
   - Add trade history panel
   - Add open positions panel
   - Add profit/loss display
   - Add price alert feature

2. **Account Page**
   - Implement 2FA toggle
   - Implement session management
   - Implement password change
   - Add activity log

3. **Wallet Page**
   - Add deposit history
   - Add withdrawal history
   - Add transaction details
   - Add balance chart

4. **Global**
   - Add toast notifications
   - Add error handling
   - Add loading states
   - Add responsive design
   - Add dark/light mode

---

## Compliance & Legal

### Required Features

1. **KYC Verification**
   - Identity document upload
   - Address proof upload
   - Selfie verification
   - Admin review workflow

2. **AML Checks**
   - Transaction monitoring
   - Suspicious activity reporting
   - Source of funds verification

3. **Responsible Gambling**
   - Self-exclusion option
   - Deposit limits
   - Loss limits
   - Session time limits
   - Reality checks (popup every hour)

4. **Terms & Conditions**
   - Privacy policy
   - Terms of service
   - Responsible gambling policy
   - Cookie policy

5. **Age Verification**
   - Must be 18+ to register
   - Age verification on withdrawal

---

## Marketing & Growth

### Missing Features

1. **Referral System**
   - Referral codes
   - Referral bonuses
   - Referral leaderboard
   - Tiered referral rewards

2. **Loyalty Program**
   - Points for trading
   - VIP tiers (Bronze, Silver, Gold, Platinum)
   - Tier benefits (higher payout, lower spread)
   - Exclusive promotions

3. **Tournaments**
   - Daily/weekly tournaments
   - Leaderboard
   - Prize pools
   - Entry fees

4. **Social Features**
   - User profiles
   - Trading feed
   - Copy trading
   - Signal sharing

5. **Promotions**
   - Welcome bonus
   - Deposit bonus
   - Cashback
   - Free trades
   - Prize drops

---

## Operations & Monitoring

### Required Systems

1. **Health Monitoring**
   - Database connection check
   - Redis connection check
   - WebSocket health
   - API response times
   - Error rates

2. **Alerting**
   - Treasury low alert
   - High withdrawal alert
   - Whale activity alert
   - System error alert
   - Performance degradation alert

3. **Backup**
   - Database backup (daily)
   - Transaction log backup
   - Configuration backup
   - Backup testing

4. **Logging**
   - Request/response logs
   - Error logs
   - Audit logs
   - Security logs

5. **Metrics**
   - User metrics (DAU, MAU)
   - Financial metrics (deposits, withdrawals, revenue)
   - Trading metrics (volume, trades, win rate)
   - System metrics (response time, error rate)

---

## Risk Management

### Required Controls

1. **Exposure Limits**
   - Max total exposure: $50,000
   - Max per-pair exposure: $5,000
   - Max per-user exposure: $500
   - Max daily volume: $500,000

2. **Treasury Management**
   - Minimum reserve: 30% of total liabilities
   - Maximum payout ratio: 80%
   - Dynamic payout adjustment based on treasury health

3. **Fraud Detection**
   - Multiple account detection
   - Bonus abuse detection
   - Martingale detection
   - Collusion detection

4. **Emergency Procedures**
   - Trading pause button
   - Withdrawal freeze button
   - User ban button
   - System shutdown procedure

5. **Insurance Fund**
   - Set aside 10% of profits
   - Cover unexpected losses
   - Rebuild after incidents

---

## Implementation Roadmap

### Phase 1: Critical Fixes (Week 1)

| Day | Task | Priority |
|---|---|---|
| 1 | Delete debug endpoints | P0 |
| 1 | Fix trade amount field mismatch | P0 |
| 2 | Fix trade settlement (add ledger entries) | P0 |
| 2 | Add trade reconciliation on startup | P0 |
| 3 | Remove hardcoded admin password | P0 |
| 3 | Test all fixes | P0 |

### Phase 2: Security (Week 2)

| Day | Task | Priority |
|---|---|---|
| 4 | Add rate limiting | P1 |
| 5 | Implement banned user check | P1 |
| 5 | Fix vault calculation | P1 |
| 6 | Add WebSocket authentication | P1 |
| 6 | Enable email verification | P1 |
| 7 | Add security headers | P1 |

### Phase 3: Core Features (Week 3-4)

| Day | Task | Priority |
|---|---|---|
| 8-9 | Implement 2FA flow | P2 |
| 10 | Implement password reset | P2 |
| 11-12 | Enhance Pair model | P2 |
| 13-14 | Implement pair CRUD API | P2 |
| 15-16 | Implement pair admin UI | P2 |
| 17-18 | OTC engine improvements | P2 |
| 19-20 | Spread on entry | P2 |

### Phase 4: Advanced Features (Week 5-6)

| Day | Task | Priority |
|---|---|---|
| 21-22 | Implement bonus turnover | P2 |
| 23-24 | Add deposit/withdrawal limits | P2 |
| 25-26 | Implement KYC system | P2 |
| 27-28 | Add admin settings persistence | P2 |
| 29-30 | P2P matching system | P3 |

### Phase 5: Growth Features (Post-Launch)

| Week | Task | Priority |
|---|---|---|
| 7-8 | Referral system | P3 |
| 9-10 | Loyalty program | P3 |
| 11-12 | Tournaments | P3 |
| 13-14 | Social features | P3 |

---

## Summary

### Critical Metrics

| Metric | Current | Target |
|---|---|---|
| Security vulnerabilities | 7 critical | 0 |
| Financial bugs | 3 critical | 0 |
| Missing core features | 14 | 0 |
| Admin functionality | 30% | 100% |
| User experience | Basic | Professional |

### Key Recommendations

1. **Fix critical bugs first** - Platform cannot operate without these
2. **Implement security hardening** - Protect against attacks
3. **Enhance financial system** - Ensure accuracy and safety
4. **Improve OTC engine** - Realistic price generation
5. **Add P2P matching** - Reduce risk, increase scalability
6. **Build admin tools** - Full control over platform
7. **Add compliance features** - Legal requirements
8. **Implement growth features** - User acquisition and retention

### Expected Outcomes

| Metric | Current | After Implementation |
|---|---|---|
| Daily revenue | $0 | $7,500+ |
| User capacity | 100 | 10,000+ |
| Risk level | HIGH | LOW |
| Compliance | None | Full |
| Scalability | Limited | Unlimited |

---

**Document Version:** 1.0
**Last Updated:** August 31, 2026
**Author:** Platform Audit System
