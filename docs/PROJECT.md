# NextOrx — Binary Options Trading Platform

> **Version:** 1.0.0  
> **Last Updated:** 2026-08-31  
> **Status:** Frontend Complete, Backend API Operational, Auth Working, RBAC Implemented

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Revenue Model](#2-revenue-model)
3. [OTC Price Engine](#3-otc-price-engine)
4. [User Risk Management](#4-user-risk-management)
5. [Financial System](#5-financial-system)
6. [Target Markets](#6-target-markets)
7. [Technical Architecture](#7-technical-architecture)
8. [Database Schema](#8-database-schema)
9. [API Design](#9-api-design)
10. [Frontend Status](#10-frontend-status)
11. [Deployment](#11-deployment)

---

## 1. Platform Overview

NextOrx is a binary options trading platform where:

- **All pairs are OTC (Over The Counter)** — prices are platform-generated, not from real markets
- **Users trade on price direction** — UP or DOWN within a fixed time
- **Platform controls outcomes** — closing prices are determined by the platform
- **Revenue comes from house edge** — payout is always less than true probability

### Core Components

| Component | Description |
|---|---|
| **Trader Interface** | Chart, trading panel, asset selection, real-time candles |
| **Admin Console** | Finance, treasury, users, trades, OTC management, operations |
| **OTC Price Engine** | Generates realistic candle data with per-user outcome control |
| **Financial System** | Deposits (crypto), withdrawals (tiered), trade settlement |
| **Backend API** | Node.js + PostgreSQL + Redis + WebSocket |

### Trade Mechanics

| Duration | Options |
|---|---|
| Preset | 30s, 1m, 3m, 5m |
| Custom | User can input any duration |
| Direction | UP (Call) or DOWN (Put) |
| Payout | 75%–93% (dynamic based on pair and treasury health) |

---

## 2. Revenue Model

### Formula

```
Revenue = losersKeep - winnersPayout

where:
  losersKeep   = volume × (1 - winRate)
  winnersPayout = volume × winRate × payoutPercent
```

### Example Calculations

| Win Rate | Payout | Volume | Revenue | Margin |
|---|---|---|---|---|
| 48% | 80% | $10,000 | $1,360 | 13.6% |
| 45% | 80% | $10,000 | $1,600 | 16.0% |
| 40% | 80% | $10,000 | $2,800 | 28.0% |
| 52% | 80% | $10,000 | $960 | 9.6% |
| 55% | 80% | $10,000 | $400 | 4.0% |

### Break-Even Point

```
Platform is profitable when: winRate < 1 / (1 + payout%)

At 80% payout: winRate must stay below 55.5%
At 85% payout: winRate must stay below 54.1%
At 90% payout: winRate must stay below 52.6%
```

---

## 3. OTC Price Engine

### Approach: Hybrid (Real Reference + OTC Bias)

All pairs are OTC (platform-generated prices), but we use real market data as a reference to make prices look realistic.

### Candle Generation (Shared Across All Users)

```
1. Fetch real reference price from free API
   - EUR/USD → exchangerate-api.com
   - BTC/USD → coingecko.com API
   - etc.

2. Add platform-controlled offset per candle
   - offset = seeded_random(timestamp + pair_id) × volatility
   - This makes candles look natural

3. Store in candle_history table
   - All users see the same candle history
   - Consistent chart experience
```

### Trade Settlement (Per-User)

```
1. User places trade at candle open_price
   - direction: UP or DOWN
   - amount: $X
   - duration: N seconds

2. At expiry, platform determines closing_price
   - Generate random 50/50 movement from open_price
   - Check user's effective_win_rate
   - If user should WIN → closing_price favors their direction
   - If user should LOSE → closing_price goes against them
   - Apply small random offset for natural look

3. Settle trade
   - Win:  balance += amount × (1 + payout%)
   - Lose: balance -= amount
   - Update user stats
   - Check balance cap
```

### Price Realism

- Candles use real market reference prices (±small offset)
- Volatility proportional to pair's real volatility
- Candle patterns look natural (no obvious manipulation)
- Different users see same candle history on same pair

---

## 4. User Risk Management

### Per-User Effective Win Rate

```
userEffectiveWinRate = baseWinRate × userFactor
```

| User State | Win Rate | Rationale |
|---|---|---|
| New user (first 5 trades) | 55%–60% | Hook them with early wins |
| Net depositor, low balance | 50%–52% | Keep them playing |
| Balance > 3× deposits | 40%–45% | Prevent large withdrawals |
| Attempting withdrawal > deposits | 35%–40% | Protect treasury |
| Whale (high volume, high balance) | 42%–45% | Long-term profitability |
| Bonus balance only | 38%–42% | Bonus not easily converted |

### Balance Cap

```
maxBalance = totalDeposits × balanceMultiplier

balanceMultiplier:
  Day 1–7:    1.5x
  Day 8–30:   2.0x
  Day 31–90:  2.5x
  Day 90+:    3.0x
```

**Example:**
- User deposits $20, Day 5 → maxBalance = $30
- User deposits $20, Day 60 → maxBalance = $50
- User deposits $1000, Day 100 → maxBalance = $3000

### Bet Size Limits

```
maxBetSize = min(
  balance × 10%,        // never bet more than 10% of balance
  dailyBetLimit,        // max per day (e.g. $500)
  progressiveCap        // if lost 3+ in a row, max bet drops 50%
)
```

### Martingale Detection

```
Pattern: bet amounts x, 2x, 4x in consecutive trades
Action:
  1. Flag account
  2. Force flat betting (no escalation)
  3. If flagged 3+ times → reduce effective_win_rate by 5%
```

---

## 5. Financial System

### Deposit Flow

```
1. User initiates crypto deposit (USDT TRC20/ERC20)
2. System generates unique wallet address
3. User sends crypto to address
4. Blockchain confirms (TRC20: ~1min, ERC20: ~3min)
5. System credits user balance
6. Audit log entry created
```

### Withdrawal Flow (Tiered)

```
Tier 1: amount < 20% of treasury
  → Auto-approve
  → Process within 1 hour

Tier 2: amount 20%–40% of treasury
  → Auto-approve if KYC verified
  → Process within 24 hours

Tier 3: amount 40%–60% of treasury
  → Manual review required
  → Process within 72 hours

Tier 4: amount > 60% of treasury
  → Manual review + security check
  → Max $500/day
  → Process within 7 days
```

### Withdrawal Rules

| Rule | Condition | Action |
|---|---|---|
| Small Verified | < $500 AND KYC = approved | Auto-approve |
| Medium Verified | $500–$2000 AND KYC = approved | Manual review |
| Large Request | > $2000 | Manual review + security |
| Unverified User | KYC != approved | Manual review |
| High Reserve Risk | Treasury reserve < 20% | Hold all withdrawals |
| Daily Limit Exceeded | Daily withdrawn > $2000 | Reject |
| Balance Cap Exceeded | Withdrawal > maxWithdrawable | Reject |

### Max Withdrawable Calculation

```
maxWithdrawable = totalDeposits + (totalDeposits × maxProfitPercent)

maxProfitPercent:
  Day 1–30:    20%
  Day 31–90:   30%
  Day 90+:     50%

Example:
  User deposited $20, Day 15
  maxWithdrawable = $20 + ($20 × 20%) = $24
  User can withdraw $24 max, rest stays as trading balance
```

### Treasury Management

```
Reserve Health:
  Healthy:   reserve > 30%
  Caution:   reserve 20%–30%
  Warning:   reserve 10%–20%
  Critical:  reserve < 10%

Dynamic Payout Adjustment:
  Healthy:   payout = 80%–85%
  Caution:   payout = 78%–82%
  Warning:   payout = 72%–78%
  Critical:  payout = 65%–72%

Auto-Rules:
  if reserve < 15%:
    - Reduce ALL payouts by 5%
    - Pause withdrawals > $500
    - Alert admin

  if reserve > 50%:
    - Increase payouts to attract volume
    - Allow larger withdrawals
```

---

## 6. Target Markets

### Primary Markets

| Country | Population | Regulation | Notes |
|---|---|---|---|
| India | 1.4B | SEBI (gray area) | Largest market, crypto preferred |
| Bangladesh | 170M | No specific regulation | Growing crypto adoption |
| Pakistan | 230M | SECP (gray area) | Mobile-first market |
| Nepal | 30M | No specific regulation | Small but growing |

### Secondary Markets

| Country | Population | Regulation |
|---|---|---|
| Sri Lanka | 22M | No specific regulation |
| Myanmar | 55M | No specific regulation |
| Cambodia | 17M | No specific regulation |
| Nepal | 30M | No specific regulation |

### Why Crypto Deposits

- No traditional banking relationships needed
- Faster KYC process
- Cross-border friendly
- Privacy for users
- Lower transaction fees

---

## 7. Technical Architecture

### Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 16 + React | Trader UI + Admin Console |
| Backend | Node.js + Express/Fastify | API server |
| Database | PostgreSQL | Primary data store |
| Cache | Redis | Sessions, rate limiting, live prices |
| WebSocket | Socket.IO / WS | Real-time candle feed |
| Price Feed | Free APIs + OTC engine | Candle generation |

### System Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Trader UI    │  │  Admin UI    │  │  Mobile App  │  │
│  │  (Next.js)    │  │  (Next.js)   │  │  (Future)    │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
└─────────┼──────────────────┼──────────────────┼──────────┘
          │                  │                  │
    ┌─────▼──────────────────▼──────────────────▼─────┐
    │              API GATEWAY (Nginx)                  │
    │         Rate Limiting, SSL, Load Balancing        │
    └─────┬──────────────────┬──────────────────┬─────┘
          │                  │                  │
   ┌──────▼──────┐  ┌───────▼───────┐  ┌──────▼──────┐
   │  AUTH SVC   │  │  TRADE SVC    │  │ FINANCE SVC │
   │             │  │               │  │             │
   │ - Register  │  │ - Place Trade │  │ - Deposit   │
   │ - Login     │  │ - Settle      │  │ - Withdraw  │
   │ - KYC       │  │ - Price Feed  │  │ - Treasury  │
   │ - Sessions  │  │ - Candles     │  │ - P&L       │
   └──────┬──────┘  └───────┬───────┘  └──────┬──────┘
          │                  │                  │
   ┌──────▼──────────────────▼──────────────────▼──────┐
   │                  DATA LAYER                        │
   │  ┌──────────────┐  ┌──────────────┐              │
   │  │  PostgreSQL   │  │    Redis     │              │
   │  │  (Primary)    │  │  (Cache)     │              │
   │  └──────────────┘  └──────────────┘              │
   └───────────────────────────────────────────────────┘
          │
   ┌──────▼──────────────────────────────────────────┐
   │              WEBSOCKET SERVER                     │
   │  - Live candle stream per pair                    │
   │  - Trade status updates                           │
   │  - Price alerts                                   │
   └──────────────────────────────────────────────────┘
```

### Service Responsibilities

| Service | Responsibility | Key Endpoints |
|---|---|---|
| **Auth Service** | Registration, login, JWT, KYC | `/auth/register`, `/auth/login`, `/auth/kyc` |
| **Trade Service** | Place trades, settlement, candles | `/trades`, `/pairs`, `/ws/pairs/:id` |
| **Finance Service** | Deposits, withdrawals, treasury | `/balance`, `/deposit`, `/withdraw` |
| **Admin Service** | User management, analytics | `/admin/*` |
| **Price Service** | OTC candle generation, real-time feed | Internal only |

---

## 8. Database Schema

### Core Tables

```sql
-- ============================================
-- USERS
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    kyc_status VARCHAR(20) DEFAULT 'pending',  -- pending, approved, rejected
    status VARCHAR(20) DEFAULT 'active',        -- active, suspended, banned
    country VARCHAR(2),
    language VARCHAR(10) DEFAULT 'en',
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- USER BALANCES
-- ============================================
CREATE TABLE balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id),
    total_deposits DECIMAL(12,2) DEFAULT 0,
    total_withdrawals DECIMAL(12,2) DEFAULT 0,
    available_balance DECIMAL(12,2) DEFAULT 0,
    bonus_balance DECIMAL(12,2) DEFAULT 0,
    locked_balance DECIMAL(12,2) DEFAULT 0,      -- from active trades
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- USER RISK PROFILES
-- ============================================
CREATE TABLE user_risk_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id),
    effective_win_rate DECIMAL(5,4) DEFAULT 0.4800,
    balance_multiplier DECIMAL(5,2) DEFAULT 1.50,
    bet_limit_daily DECIMAL(10,2) DEFAULT 500.00,
    risk_score INT DEFAULT 0,
    current_loss_streak INT DEFAULT 0,
    max_loss_streak INT DEFAULT 0,
    total_trades INT DEFAULT 0,
    total_wins INT DEFAULT 0,
    flags JSONB DEFAULT '[]',
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- OTC PAIRS
-- ============================================
CREATE TABLE pairs (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(20),          -- forex, crypto, commodities, indices
    base_price DECIMAL(16,8),
    volatility DECIMAL(8,6),
    payout_percent DECIMAL(5,2) DEFAULT 80.00,
    spread DECIMAL(8,6) DEFAULT 0.000200,
    is_active BOOLEAN DEFAULT true,
    min_trade DECIMAL(10,2) DEFAULT 1.00,
    max_trade DECIMAL(10,2) DEFAULT 5000.00,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TRADES
-- ============================================
CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    pair_id VARCHAR(20) REFERENCES pairs(id),
    direction VARCHAR(4) NOT NULL,            -- up, down
    amount DECIMAL(10,2) NOT NULL,
    payout_percent DECIMAL(5,2) NOT NULL,
    duration_seconds INT NOT NULL,
    open_price DECIMAL(16,8) NOT NULL,
    close_price DECIMAL(16,8),
    status VARCHAR(20) DEFAULT 'pending',     -- pending, active, won, lost, cancelled
    profit DECIMAL(10,2),
    settled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- CANDLE HISTORY
-- ============================================
CREATE TABLE candle_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pair_id VARCHAR(20) REFERENCES pairs(id),
    timestamp BIGINT NOT NULL,
    open DECIMAL(16,8) NOT NULL,
    high DECIMAL(16,8) NOT NULL,
    low DECIMAL(16,8) NOT NULL,
    close DECIMAL(16,8) NOT NULL,
    volume BIGINT DEFAULT 0,
    UNIQUE(pair_id, timestamp)
);

CREATE INDEX idx_candle_history_pair_time ON candle_history(pair_id, timestamp DESC);

-- ============================================
-- TRANSACTIONS
-- ============================================
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    type VARCHAR(20) NOT NULL,                -- deposit, withdrawal
    method VARCHAR(50),                       -- crypto (TRC20, ERC20)
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USDT',
    status VARCHAR(20) DEFAULT 'pending',     -- pending, approved, rejected, completed
    wallet_address VARCHAR(255),
    tx_hash VARCHAR(255),
    network VARCHAR(20),                      -- TRC20, ERC20
    notes TEXT,
    processed_by UUID,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TREASURY
-- ============================================
CREATE TABLE treasury (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_balance DECIMAL(12,2) DEFAULT 0,
    user_liabilities DECIMAL(12,2) DEFAULT 0,
    available_reserve DECIMAL(12,2) DEFAULT 0,
    pending_withdrawals DECIMAL(12,2) DEFAULT 0,
    daily_volume DECIMAL(12,2) DEFAULT 0,
    daily_revenue DECIMAL(12,2) DEFAULT 0,
    reserve_percent DECIMAL(5,2) DEFAULT 0,
    payout_rules JSONB DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- PAYOUT RULES
-- ============================================
CREATE TABLE payout_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    condition_type VARCHAR(50),               -- reserve_percent, win_rate, etc.
    condition_operator VARCHAR(10),           -- gt, lt, gte, lte
    condition_value DECIMAL(10,2),
    action VARCHAR(20),                       -- increase, decrease, maintain
    payout_value DECIMAL(5,2),
    priority INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- WITHDRAWAL RULES
-- ============================================
CREATE TABLE withdrawal_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    condition_desc TEXT,
    action VARCHAR(20),                       -- auto_approve, manual_review, reject, hold
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- AUDIT LOG
-- ============================================
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    admin_id UUID,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_log_admin ON audit_log(admin_id, created_at DESC);

-- ============================================
-- ADMIN USERS
-- ============================================
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,                -- superadmin, admin, viewer
    name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- DEVICE FINGERPRINTS (Multi-account detection)
-- ============================================
CREATE TABLE device_fingerprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    fingerprint_hash VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    first_seen_at TIMESTAMP DEFAULT NOW(),
    last_seen_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_fingerprint_hash ON device_fingerprints(fingerprint_hash);
CREATE INDEX idx_fingerprint_ip ON device_fingerprints(ip_address);
```

---

## 9. API Design

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login (returns JWT) |
| POST | `/api/auth/refresh` | Refresh JWT token |
| POST | `/api/auth/kyc/submit` | Submit KYC documents |
| GET | `/api/auth/kyc/status` | Get KYC status |

### Trading

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/pairs` | List all active pairs |
| GET | `/api/pairs/:id` | Get pair details |
| GET | `/api/pairs/:id/candles` | Get historical candles |
| WS | `/ws/pairs/:id` | Live candle stream |
| POST | `/api/trades` | Place a trade |
| GET | `/api/trades` | User's trade history |
| GET | `/api/trades/:id` | Trade detail |
| GET | `/api/trades/active` | User's active trades |

### Finance

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/balance` | Get user balance |
| POST | `/api/deposit/address` | Get deposit wallet address |
| POST | `/api/deposit/confirm` | Confirm deposit (check tx) |
| POST | `/api/withdraw` | Request withdrawal |
| GET | `/api/transactions` | Transaction history |
| GET | `/api/transactions/:id` | Transaction detail |

### Admin

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/treasury` | Treasury snapshot |
| GET | `/api/admin/treasury/history` | Treasury history |
| GET | `/api/admin/users` | User list |
| GET | `/api/admin/users/:id` | User detail |
| PUT | `/api/admin/users/:id/risk` | Update user risk profile |
| PUT | `/api/admin/users/:id/status` | Suspend/ban user |
| GET | `/api/admin/trades` | All trades |
| GET | `/api/admin/finance` | All transactions |
| PUT | `/api/admin/finance/:id/approve` | Approve transaction |
| PUT | `/api/admin/finance/:id/reject` | Reject transaction |
| POST | `/api/admin/payout-rules` | Create payout rule |
| PUT | `/api/admin/payout-rules/:id` | Update payout rule |
| POST | `/api/admin/withdrawal-rules` | Create withdrawal rule |
| GET | `/api/admin/reports/revenue` | Revenue report |
| GET | `/api/admin/reports/users` | User analytics |
| GET | `/api/admin/audit` | Audit log |

### WebSocket Events

```
Server → Client:
  candle:update       New candle for pair
  trade:settled       Trade result
  balance:update      Balance changed
  alert:notification  Admin alert

Client → Server:
  subscribe:pair      Subscribe to pair candles
  unsubscribe:pair    Unsubscribe from pair
```

---

## 10. Frontend Status

### Completed ✅

| Module | Status | Notes |
|---|---|---|
| Landing page | ✅ Done | |
| Login/Register | ✅ Done | Email + Google OAuth + Telegram OIDC |
| Trader interface | ✅ Done | KLineChart integrated |
| Trading panel | ✅ Done | Investment, time, payout, UP/DOWN |
| Asset tabs | ✅ Done | TopBar with dropdown + inline tabs |
| Side toolbar | ✅ Done | Drawing tools, chart type, timeframe, indicators, fullscreen |
| Console — Finance | ✅ Done | Transactions, bulk actions, CSV export |
| Console — Treasury | ✅ Done | Reserve monitoring, payout rules, alerts |
| Console — Users | ✅ Done | User list, balance adjustment, audit notes |
| Console — Audit | ✅ Done | Audit log, CSV export |
| Console — Operations | ✅ Done | Platform health monitoring |
| Console — OTC | ✅ Done | OTC pairs management |
| Console — Trades | ✅ Done | Trade history |
| Console — Reports | ✅ Done | Revenue reports |
| Console — Settings | ✅ Done | Platform settings |
| Console — KYC | ✅ Done | User verification |
| Loading skeletons | ✅ Done | All 11 console pages |
| Global search | ✅ Done | Cmd+K / Ctrl+K |
| Admin roles | ✅ Done | Superadmin/Admin/Viewer |
| Candle data feed | ✅ Done | KLineChart with backward scrolling |
| Auth (Email) | ✅ Done | Sign-up/sign-in via better-auth |
| Auth (Google) | ✅ Done | socialProviders.google config |
| Auth (Telegram) | ✅ Done | genericOAuth with explicit OIDC endpoints |
| RBAC (Proxy) | ✅ Done | Edge proxy role-based route protection |
| RBAC (Server) | ✅ Done | DAL layer + console-panel layout guard |
| Backend API | ✅ Done | 30+ endpoints (auth, trades, admin, finance) |
| OTC Price Engine | ✅ Done | Per-user outcome control |
| Database | ✅ Done | PostgreSQL via Prisma, 16 models |
| Docker | ✅ Done | Dockerfile + .dockerignore |
| Deployment | ✅ Done | Coolify v4, production at nextorx.247play.win |

### Partially Done 🚧

| Module | Status | Notes |
|---|---|---|
| Admin login after DB reset | 🚧 | User created but password sign-in returns 401 |
| Trade execution integration | 🚧 | Frontend panels use mock data, need API wiring |

### Not Started ❌

| Module | Priority | Notes |
|---|---|---|
| Trade execution API wiring | P0 | Frontend trade panel needs to call real /api/trades |
| WebSocket live candle feed | P1 | Currently using mock candle generation in client |
| Deposit crypto integration | P1 | USDT wallet generation (TRC20/ERC20) |
| Withdrawal tiered processing | P1 | Tiered approval flow |
| Martingale detector | P2 | Pattern detection |
| Multi-account detector | P2 | Device fingerprinting |
| Admin real-time dashboard | P3 | Live monitoring |
| Mobile app | P4 | Future |

---

## 11. Deployment

### Infrastructure (Production)

| Service | Provider | Purpose |
|---|---|---|
| VPS | Coolify-managed | Backend + database |
| CDN | Cloudflare | Frontend + DDoS protection |
| Database | PostgreSQL 17 on VPS | Primary data |
| Cache | Redis 7.2 on VPS | Sessions + cache |
| DNS | Cloudflare | Domain: nextorx.247play.win |
| CI/CD | Coolify v4 | Auto-deploy from main branch |

### Environment Variables (Coolify)

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/nextorx

# Auth
BETTER_AUTH_SECRET=your-secret-min-32-chars
BETTER_AUTH_URL=https://nextorx.247play.win

# OAuth
GOOGLE_CLIENT_ID=from-google-cloud
GOOGLE_CLIENT_SECRET=from-google-cloud
TELEGRAM_CLIENT_ID=from-botfather
TELEGRAM_CLIENT_SECRET=from-botfather
TELEGRAM_LOGIN_BOT_TOKEN=from-botfather

# Admin
ADMIN_EMAIL=admin@nextorx.app
ADMIN_PASSWORD=ChangeMe!123456

# Redis
REDIS_URL=redis://localhost:6379
```

---

## Appendix A: OTC Pair List (23 Pairs)

### Forex (10)
| ID | Name | Category | Payout |
|---|---|---|---|
| EURUSD | EUR/USD | forex | 80% |
| GBPUSD | GBP/USD | forex | 77% |
| USDJPY | USD/JPY | forex | 86% |
| EURGBP | EUR/GBP | forex | 80% |
| USDINR | USD/INR | forex | 82% |
| USDBDT | USD/BDT | forex | 80% |
| USDPKR | USD/PKR | forex | 80% |
| USDNPR | USD/NPR | forex | 78% |
| EURJPY | EUR/JPY | forex | 80% |
| GBPJPY | GBP/JPY | forex | 84% |

### Crypto (7)
| ID | Name | Category | Payout |
|---|---|---|---|
| BTCUSD | BTC/USD | crypto | 90% |
| ETHUSD | ETH/USD | crypto | 88% |
| SOLUSD | SOL/USD | crypto | 92% |
| XRPUSD | XRP/USD | crypto | 89% |
| DOGEUSD | DOGE/USD | crypto | 91% |
| ADAUSD | ADA/USD | crypto | 87% |
| BNBUSD | BNB/USD | crypto | 88% |

### Commodities (3)
| ID | Name | Category | Payout |
|---|---|---|---|
| XAUUSD | Gold | commodities | 87% |
| XAGUSD | Silver | commodities | 84% |
| WTIUSD | Crude Oil | commodities | 89% |

### Indices (3)
| ID | Name | Category | Payout |
|---|---|---|---|
| SPX500 | S&P 500 | indices | 85% |
| NIFTY50 | NIFTY 50 | indices | 83% |
| NIKKEI225 | Nikkei 225 | indices | 84% |
