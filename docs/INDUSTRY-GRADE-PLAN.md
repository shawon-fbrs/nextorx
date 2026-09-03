# Nextorx — Industry-Grade Implementation Plan

**Version:** 1.0
**Date:** 2026-09-03
**Status:** Active
**Target:** Full industry-grade binary options trading platform

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Audit](#2-current-state-audit)
3. [Target Architecture](#3-target-architecture)
4. [Implementation Phases](#4-implementation-phases)
5. [Technical Specifications](#5-technical-specifications)
6. [Security Requirements](#6-security-requirements)
7. [Compliance Requirements](#7-compliance-requirements)
8. [Infrastructure Requirements](#8-infrastructure-requirements)
9. [Quality Standards](#9-quality-standards)
10. [Team Guidelines](#10-team-guidelines)
11. [Success Metrics](#11-success-metrics)
12. [Risk Management](#12-risk-management)

---

## 1. Executive Summary

### Vision

Build a fully regulated, bank-grade binary options trading platform that meets industry standards for security, compliance, fairness, and reliability. The platform must handle real money, real users, and real regulatory scrutiny.

### Current State Rating: 2.5/10

The platform has a solid architectural foundation (Prisma schema, better-auth, RBAC, OTC engine, ledger system) but most features are broken or non-functional when a real user tries to use them. The admin panel has the best implementation. The trader-facing side is largely non-functional.

### Target State Rating: 9.5/10

A production-ready platform with:
- Realistic OTC price generation (not random)
- Reliable trade settlement (not setTimeout)
- Bank-grade financial system (double-entry ledger)
- Full compliance (KYC/AML, responsible gambling)
- Enterprise infrastructure (monitoring, auto-scaling, disaster recovery)

### Timeline: 34 Weeks (8 Months)

### Investment: ~$400k-700k (development + infrastructure)

---

## 2. Current State Audit

### 2.1 What Works

| Component | Status | Notes |
|-----------|--------|-------|
| Prisma Schema | ✅ Good | Well-designed models, proper relations |
| better-auth Integration | ✅ Good | Email/password, Google OAuth, 2FA |
| RBAC System | ✅ Good | Server-side permission checks work |
| Admin Dashboard | ✅ Good | Real stats, real charts |
| Admin Users Page | ✅ Good | Lists real users |
| Admin Trades Page | ✅ Good | Lists real trades |
| Admin Finance Page | ⚠️ Partial | Deposit verify works, no withdrawal UI |
| Admin OTC Pairs | ✅ Good | Full CRUD works |
| Ledger System | ⚠️ Partial | Basic but functional |
| Vault System | ⚠️ Partial | Basic but functional |

### 2.2 What's Broken

| Component | Issue | Severity | Files |
|-----------|-------|----------|-------|
| Chart | Fetches from `/api/pairs/` (doesn't exist) | CRITICAL | `Chart.tsx:183` |
| 2FA Toggle | Calls `/api/auth/2fa/toggle` (doesn't exist) | CRITICAL | `account/page.tsx:51,140` |
| Deposits | Calls admin-only endpoint | CRITICAL | `more/deposit/page.tsx:34` |
| Withdrawals | Calls admin-only endpoint | CRITICAL | `more/withdraw/page.tsx:31` |
| OAuth | Bypasses email verification + 2FA | CRITICAL | `login/page.tsx:70-79` |
| Settings | Never calls API | CRITICAL | `settings/page.tsx` |
| Treasury | Data shape mismatch | CRITICAL | `treasury/page.tsx` |
| Trade Settlement | Uses setTimeout | CRITICAL | `trades/route.ts:84` |
| Trade Atomicity | Not in transaction | CRITICAL | `trades/route.ts:63-82` |
| WebSocket | No authentication | CRITICAL | `server.ts:27` |
| Verify Email | No auth required | CRITICAL | `verify-email/route.ts:6` |
| Login Security | Dead code (never imported) | HIGH | `lib/login-security.ts` |
| Route Protection | No middleware.ts | HIGH | MISSING |
| Ban Button | No onClick handler | HIGH | `users/[id]/page.tsx:129` |
| User Detail | Fetches ALL users then filters | HIGH | `users/[id]/page.tsx:52-61` |
| Bet Limit | Never enforced | HIGH | `trades/route.ts` |
| Delete Account | Not in transaction | HIGH | `delete-account/route.ts:73-97` |
| Demo Balance | Bypasses ledger | HIGH | `demo-balance/route.ts:58-60` |
| OTC Engine | Fails on empty DB | HIGH | `otc-engine.ts:52-56` |
| Smart Payout | Not implemented | HIGH | `otc-engine.ts` |
| Max Payout | Not enforced | HIGH | `trades/route.ts` |
| KYC Page | Unimplemented | HIGH | `kyc/page.tsx` |
| Support Form | Simulated | HIGH | `support/page.tsx:101-108` |

### 2.3 What's Missing

| Feature | Status | Priority |
|---------|--------|----------|
| Real OTC market maker | ❌ | Critical |
| Proper trade settlement | ❌ | Critical |
| Payment gateway integration | ❌ | Critical |
| KYC/AML verification | ❌ | Critical |
| Rate limiting | ❌ | Critical |
| Monitoring & alerting | ❌ | High |
| Database backups | ❌ | High |
| Multi-currency support | ❌ | High |
| Responsible gambling | ❌ | High |
| Mobile PWA | ❌ | Medium |
| Social trading | ❌ | Medium |
| Tournaments (real) | ❌ | Medium |

---

## 3. Target Architecture

### 3.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CDN / WAF (Cloudflare)                   │
│                    DDoS Protection, Bot Detection               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                     Load Balancer (AWS ALB)                      │
│                   TLS 1.3 Termination, Health Checks            │
└──────────────────────────┬──────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
┌─────────▼────────┐ ┌────▼──────┐ ┌───────▼────────┐
│   App Server 1   │ │ App Srv 2 │ │   App Server N │
│    (Next.js)     │ │ (Next.js) │ │    (Next.js)   │
│  Trade Engine    │ │ Settlement│ │   API Routes    │
└─────────┬────────┘ └────┬──────┘ └───────┬────────┘
          │                │                │
          └────────────────┼────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
┌─────────▼────────┐ ┌────▼──────┐ ┌───────▼────────┐
│   PostgreSQL     │ │   Redis   │ │     S3         │
│   (Primary)      │ │  (Cache)  │ │   (Files)      │
│   Financial Data │ │  Sessions │ │  KYC Documents │
└─────────┬────────┘ └────┬──────┘ └────────────────┘
          │                │
┌─────────▼────────┐ ┌────▼──────┐
│   PostgreSQL     │ │   Redis   │
│   (Replica)      │ │  (PubSub) │
│   Read Queries   │ │ WebSocket │
└──────────────────┘ └───────────┘
```

### 3.2 Trading Engine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Market Maker Engine                    │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Price     │  │  Volatility │  │   Spread    │    │
│  │  Generator  │  │   Engine    │  │  Calculator │    │
│  │ (O-U Process)│  │  (GARCH)   │  │             │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
│         │                │                │            │
│         └────────────────┼────────────────┘            │
│                          │                             │
│  ┌───────────────────────▼───────────────────────┐    │
│  │              Session Manager                  │    │
│  │  (London, NY, Asian, Overlap)                 │    │
│  └───────────────────────┬───────────────────────┘    │
│                          │                             │
│  ┌───────────────────────▼───────────────────────┐    │
│  │           Correlation Engine                  │    │
│  │  (EURUSD ↔ GBPUSD, etc.)                      │    │
│  └───────────────────────┬───────────────────────┘    │
│                          │                             │
│  ┌───────────────────────▼───────────────────────┐    │
│  │              Payout Calculator                │    │
│  │  (Weekend, Time-of-day, Volume, Vault Health) │    │
│  └───────────────────────┬───────────────────────┘    │
│                          │                             │
│  ┌───────────────────────▼───────────────────────┐    │
│  │           Risk Management                     │    │
│  │  (Exposure Limits, Circuit Breakers)          │    │
│  └───────────────────────┬───────────────────────┘    │
│                          │                             │
└──────────────────────────┼─────────────────────────────┘
                           │
                    Price Ticks (200ms)
                           │
                    ┌──────▼──────┐
                    │  WebSocket  │
                    │  Broadcast  │
                    └─────────────┘
```

### 3.3 Trade Settlement Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Trade Creation Flow                    │
│                                                         │
│  User Request → Validate → Snapshot Price → Create Hold │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              $transaction                       │   │
│  │  1. Create Trade (status: ACTIVE)               │   │
│  │  2. Debit Balance (TRADE_HOLD)                  │   │
│  │  3. Record Price Snapshot                       │   │
│  │  4. Create Ledger Entry                         │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
                           │
                    Active Trade
                           │
┌──────────────────────────▼─────────────────────────────┐
│                   Settlement Worker                     │
│                   (Runs every 1 second)                 │
│                                                         │
│  1. Find trades WHERE settleAt <= NOW                   │
│  2. Get current price from OTC engine                   │
│  3. Determine win/loss from REAL price movement         │
│  4. Settle atomically:                                  │
│     ┌─────────────────────────────────────────────┐    │
│     │              $transaction                   │    │
│     │  - Release hold (TRADE_RELEASE)             │    │
│     │  - Credit if won (TRADE_WIN)                │    │
│     │  - Update trade status                      │    │
│     │  - Record close price                       │    │
│     │  - Create ledger entry                      │    │
│     └─────────────────────────────────────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3.4 Financial System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Double-Entry Ledger                    │
│                                                         │
│  Every financial movement has TWO entries:              │
│  - DEBIT (money leaves)                                │
│  - CREDIT (money arrives)                              │
│                                                         │
│  Ledger Chain (Tamper-Evident):                        │
│  ┌─────┐    ┌─────┐    ┌─────┐    ┌─────┐            │
│  │Entry│───▶│Entry│───▶│Entry│───▶│Entry│            │
│  │  1  │    │  2  │    │  3  │    │  4  │            │
│  └─────┘    └─────┘    └─────┘    └─────┘            │
│     │          │          │          │                  │
│  checksum   checksum   checksum   checksum             │
│     │          │          │          │                  │
│  SHA-256(    SHA-256(   SHA-256(   SHA-256(           │
│  genesis +   entry1 +   entry2 +   entry3 +           │
│  type +      type +     type +     type +             │
│  amount +    amount +    amount +    amount            │
│  direction)  direction)  direction)  direction)       │
│                                                         │
└─────────────────────────────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │   Vault     │
                    │  Manager    │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼─────┐ ┌───▼────┐ ┌────▼────┐
        │  Reserve  │ │ Payout │ │ Revenue │
        │  Manager  │ │ Engine │ │ Tracker │
        └───────────┘ └────────┘ └─────────┘
```

---

## 4. Implementation Phases

### Phase 1: Foundation Repair (Weeks 1-3)

**Goal:** Make the current platform actually work.

#### Week 1: Critical Path Fixes

| Task | Files | Effort | Impact |
|------|-------|--------|--------|
| Fix Chart API path `/api/pairs/` → `/api/market/pairs/` | `Chart.tsx:183` | 10 min | Chart shows data |
| Fix 2FA toggle path `/api/auth/2fa/toggle` → `/api/auth/2fa` | `account/page.tsx:51,140` | 10 min | 2FA management works |
| Create public `/api/trade/payment-methods` endpoint | New route file | 30 min | Deposits/withdrawals work |
| Fix Google OAuth redirect to check emailVerified + 2FA | `login/page.tsx:70-79` | 1 hour | OAuth doesn't bypass security |
| Wrap trade creation + debit in `$transaction` | `trades/route.ts:63-82` | 2 hours | No orphaned trades |
| Fix demo balance PATCH to use ledger | `demo-balance/route.ts:58-60` | 1 hour | Audit trail |
| Wire Settings page to real API | `settings/page.tsx` | 3 hours | Settings persist |
| Fix Treasury data shape mismatch | `treasury/page.tsx` + API | 2 hours | Treasury displays correctly |

#### Week 2: Trade Engine Foundation

| Task | Files | Effort | Impact |
|------|-------|--------|--------|
| Create `lib/trade-settlement.ts` — background worker | New file | 4 hours | Trades settle reliably |
| Replace setTimeout with database polling | `trades/route.ts:84` | 3 hours | Survives server restart |
| Add price snapshot to every trade | `trades/route.ts` | 2 hours | Audit trail for outcomes |
| Enforce `maxPayout` from pair config | `trades/route.ts` | 1 hour | Risk management |
| Enforce `betLimitDaily` from UserRiskProfile | `trades/route.ts` | 2 hours | Daily loss limits |
| Add trade duration validation (30s-3600s) | `trades/route.ts` | 30 min | Prevent abuse |
| Add duplicate trade prevention (debounce) | `trades/route.ts` | 1 hour | Prevent rapid submissions |

#### Week 3: Security Hardening

| Task | Files | Effort | Impact |
|------|-------|--------|--------|
| Add rate limiting middleware | `middleware.ts` | 4 hours | DDoS protection |
| Add WebSocket authentication | `server.ts:27` | 3 hours | Only authorized users |
| Wrap account deletion in `$transaction` | `delete-account/route.ts:73-97` | 2 hours | No partial deletions |
| Add audit logging to financial operations | Various API routes | 4 hours | Full audit trail |
| Fix email verification — add rate limiting | `verify-email/route.ts:6` | 1 hour | Prevent brute-force |
| Add constant-time comparison for codes | `verification.ts:68` | 1 hour | Timing attack prevention |

**Phase 1 Deliverable:** Platform works end-to-end, trades settle correctly, no broken paths, basic security.

---

### Phase 2: Real Trading Engine (Weeks 4-8)

**Goal:** Replace the toy OTC engine with a proper market maker.

#### Week 4-5: OTC Engine v2

| Task | Files | Effort | Impact |
|------|-------|--------|--------|
| Create `lib/market-maker.ts` — new engine | New file | 8 hours | Realistic price generation |
| Implement Ornstein-Uhlenbeck mean reversion | `market-maker.ts` | 4 hours | Prices oscillate realistically |
| Implement GARCH volatility clustering | `market-maker.ts` | 4 hours | Volatility follows patterns |
| Implement fat-tail distribution | `market-maker.ts` | 2 hours | Extreme moves happen |
| Add session-based volatility (London/NY/Asian) | `market-maker.ts` | 3 hours | Time-of-day behavior |
| Add admin-configurable parameters per pair | Schema + API | 4 hours | Control over each pair |
| Add direction bias control (bull/bear) | `market-maker.ts` | 2 hours | Admin controls |

#### Week 6-7: Settlement Engine v2

| Task | Files | Effort | Impact |
|------|-------|--------|--------|
| Create `lib/settlement-worker.ts` — background process | New file | 6 hours | Reliable trade settlement |
| Implement price snapshot at settlement time | `settlement-worker.ts` | 3 hours | Verifiable outcomes |
| Add settlement queue with retry logic | `settlement-worker.ts` | 4 hours | Handles failures gracefully |
| Add settlement monitoring/alerting | `settlement-worker.ts` | 2 hours | Know when things break |
| Implement provably fair verification | New endpoint | 4 hours | Users can verify outcomes |
| Add trade outcome history with chart data | New endpoint | 3 hours | Users see past trades |

#### Week 8: Smart Payout System

| Task | Files | Effort | Impact |
|------|-------|--------|--------|
| Implement `getPayoutForPair(pairId, context)` | `otc-engine.ts` | 3 hours | Dynamic payouts |
| Add weekend payout logic | `getPayoutForPair` | 1 hour | Lower payouts on weekends |
| Add time-of-day payout adjustment | `getPayoutForPair` | 1 hour | Peak hours = lower payout |
| Add volume-based payout adjustment | `getPayoutForPair` | 2 hours | High volume = lower payout |
| Add vault health check → payout reduction | `getPayoutForPair` | 2 hours | Emergency payout control |
| Add admin payout override per pair | API + UI | 2 hours | Manual control |

**Phase 2 Deliverable:** Realistic OTC prices, reliable settlement, dynamic payouts, provably fair.

---

### Phase 3: Financial Infrastructure (Weeks 9-14)

**Goal:** Bank-grade financial system.

#### Week 9-10: Double-Entry Ledger

| Task | Files | Effort | Impact |
|------|-------|--------|--------|
| Refactor ledger to use checksum chain | `ledger.ts` | 6 hours | Tamper-evident |
| Add `direction` field (DEBIT/CREDIT) to ledger | Schema migration | 3 hours | Proper accounting |
| Add ledger verification endpoint | New endpoint | 4 hours | Can verify integrity |
| Refactor all financial operations to use new ledger | Various | 8 hours | Consistent accounting |

#### Week 11-12: Vault Management

| Task | Files | Effort | Impact |
|------|-------|--------|--------|
| Create `lib/vault.ts` — proper vault management | Refactor | 6 hours | Financial control |
| Add vault health monitoring | `vault.ts` | 4 hours | Real-time health checks |
| Add vault reserve ratio enforcement | `vault.ts` | 3 hours | Can't overdraw |
| Add treasury dashboard with real metrics | Admin page | 4 hours | Financial visibility |
| Add daily P&L reports | New endpoint | 3 hours | Business intelligence |

#### Week 13-14: Multi-Currency

| Task | Files | Effort | Impact |
|------|-------|--------|--------|
| Add currency model to schema | Schema | 2 hours | Support multiple currencies |
| Add exchange rate API integration | New service | 4 hours | Real-time rates |
| Refactor balance to support multiple currencies | Schema + API | 8 hours | Users can hold BTC, ETH |
| Add crypto deposit/withdrawal | New endpoints | 8 hours | Crypto payments |

**Phase 3 Deliverable:** Proper accounting, vault management, multi-currency support.

---

### Phase 4: Compliance & Security (Weeks 15-20)

**Goal:** Meet regulatory requirements.

#### Week 15-16: KYC/AML

| Task | Files | Effort | Impact |
|------|-------|--------|--------|
| Integrate KYC provider (Sumsub recommended) | New service | 8 hours | Identity verification |
| Implement KYC tier system | Schema + API | 4 hours | Tiered limits |
| Add AML screening (PEP, sanctions) | New service | 6 hours | Compliance |
| Add source of funds verification | New endpoint | 4 hours | High-tier KYC |
| Add KYC status to admin panel | Admin page | 3 hours | Admin visibility |

#### Week 17-18: Responsible Gambling

| Task | Files | Effort | Impact |
|------|-------|--------|--------|
| Implement self-exclusion | Schema + API | 6 hours | User can ban themselves |
| Implement deposit limits | Schema + API | 4 hours | Prevent overspending |
| Implement loss limits | Schema + API | 3 hours | Protect users |
| Implement reality check (pop-up) | Frontend | 4 hours | Awareness |
| Implement cool-down period | API | 3 hours | Prevent chase losses |
| Add responsible gambling settings | Frontend | 3 hours | User control |

#### Week 19-20: Data Protection

| Task | Files | Effort | Impact |
|------|-------|--------|--------|
| Implement data export (GDPR) | New endpoint | 4 hours | User right |
| Implement account deletion with retention | `delete-account/route.ts` | 4 hours | GDPR compliance |
| Add data retention policies | New service | 3 hours | Automatic cleanup |
| Add privacy policy page | Frontend | 2 hours | Legal requirement |
| Add cookie consent | Frontend | 2 hours | GDPR requirement |

**Phase 4 Deliverable:** KYC/AML system, responsible gambling, GDPR compliance.

---

### Phase 5: Admin & Operations (Weeks 21-26)

**Goal:** Full admin control and operational infrastructure.

#### Week 21-22: Admin Panel Completion

| Task | Files | Effort | Impact |
|------|-------|--------|--------|
| Fix admin user detail (Ban button, trade filter) | `users/[id]/page.tsx` | 4 hours | Admin can manage users |
| Add withdrawal UI to Finance page | `finance/page.tsx` | 4 hours | Admin can process withdrawals |
| Add KYC approval/rejection UI | New admin page | 6 hours | Admin can review KYC |
| Add payment method management UI | New admin page | 6 hours | Admin can manage payments |
| Add promo code management UI | New admin page | 4 hours | Admin can manage promos |
| Add trade cancellation UI | `trades/page.tsx` | 3 hours | Admin can cancel trades |
| Add real-time health dashboard | `operations/page.tsx` | 4 hours | Real health checks |

#### Week 23-24: Monitoring & Alerting

| Task | Files | Effort | Impact |
|------|-------|--------|--------|
| Integrate Sentry for error tracking | Config | 3 hours | Error visibility |
| Add Prometheus metrics endpoint | New endpoint | 4 hours | Performance monitoring |
| Set up Grafana dashboards | Infrastructure | 6 hours | Visual monitoring |
| Add alerting rules (PagerDuty/Slack) | Infrastructure | 4 hours | Know when things break |
| Add structured logging | Various | 4 hours | Debug issues |
| Add APM monitoring | Infrastructure | 3 hours | Performance visibility |

#### Week 25-26: Backup & Deployment

| Task | Files | Effort | Impact |
|------|-------|--------|--------|
| Set up automated database backups | Infrastructure | 4 hours | Data safety |
| Set up point-in-time recovery | Infrastructure | 4 hours | Recovery capability |
| Set up staging environment | Infrastructure | 6 hours | Test before production |
| Set up CI/CD pipeline | Infrastructure | 6 hours | Automated deployment |
| Set up load testing | Infrastructure | 4 hours | Performance baseline |
| Set up security scanning | Infrastructure | 3 hours | Vulnerability detection |

**Phase 5 Deliverable:** Complete admin panel, monitoring, automated deployment.

---

### Phase 6: Scale & Polish (Weeks 27-34)

**Goal:** Prepare for growth and add competitive features.

#### Week 27-28: Infrastructure Scaling

| Task | Files | Effort | Impact |
|------|-------|--------|--------|
| Add Redis for session cache | Infrastructure | 4 hours | Faster auth |
| Add Redis PubSub for WebSocket | `server.ts` | 6 hours | Multi-server WebSocket |
| Add PostgreSQL read replicas | Infrastructure | 4 hours | Read scaling |
| Add CDN for static assets | Infrastructure | 3 hours | Faster loading |
| Add auto-scaling group | Infrastructure | 6 hours | Handle traffic spikes |
| Load test at 10,000 users | Testing | 6 hours | Performance baseline |

#### Week 29-30: Mobile & UX

| Task | Files | Effort | Impact |
|------|-------|--------|--------|
| Convert to PWA | `manifest.json` + SW | 6 hours | Mobile install |
| Optimize mobile trade UI | `TradingPanel.tsx` | 8 hours | Mobile trading |
| Add push notifications | New service | 6 hours | Trade alerts |
| Add offline support | Service Worker | 4 hours | Works offline |
| Add gesture support | Frontend | 4 hours | Mobile UX |

#### Week 31-32: Competitive Features

| Task | Files | Effort | Impact |
|------|-------|--------|--------|
| Add social trading | New module | 12 hours | Competitive feature |
| Add real tournaments | New module | 10 hours | Engagement |
| Add advanced charting | `Chart.tsx` | 8 hours | Professional feel |
| Add economic calendar | New page | 4 hours | Information |
| Add trading signals | New module | 6 hours | User value |
| Add leaderboard | New page | 3 hours | Competition |

#### Week 33-34: Final Polish

| Task | Files | Effort | Impact |
|------|-------|--------|--------|
| Security audit (penetration testing) | External | 8 hours | Find vulnerabilities |
| Performance optimization | Various | 6 hours | Faster everything |
| Accessibility audit (WCAG 2.1) | Frontend | 4 hours | Legal compliance |
| Documentation | Docs | 8 hours | User support |
| Load test at 100,000 users | Testing | 6 hours | Scale confidence |

**Phase 6 Deliverable:** Scalable, mobile-ready, feature-complete platform.

---

## 5. Technical Specifications

### 5.1 OTC Engine — Market Maker

#### Price Generation: Ornstein-Uhlenbeck Process

```typescript
// lib/market-maker.ts

interface MarketMakerConfig {
  // Mean reversion
  theta: number;        // Reversion speed (0.01-0.5)
  mu: number;           // Long-term mean (usually current price)
  sigma: number;        // Base volatility
  
  // Spread
  baseSpread: number;   // Minimum spread (e.g., 0.0002)
  spreadMultiplier: number; // How spread widens in volatile periods
  
  // Direction bias
  bullBias: number;     // -0.1 to 0.1 (positive = more ups)
  
  // Session behavior
  sessionMultipliers: Record<string, number>;
}

function generatePrice(
  currentPrice: number,
  config: MarketMakerConfig,
  sessionVolatility: number,
  dt: number = 1 / 86400 // 1 second in day fraction
): number {
  // Ornstein-Uhlenbeck process
  const dW = normalRandom(); // Standard normal random variable
  const drift = config.theta * (config.mu - currentPrice) * dt;
  const diffusion = config.sigma * sessionVolatility * Math.sqrt(dt) * dW;
  const bias = config.bullBias * dt;
  
  const newPrice = currentPrice + drift + diffusion + bias;
  
  // Ensure price stays positive
  return Math.max(0.00000001, newPrice);
}
```

#### Volatility: GARCH(1,1) Model

```typescript
interface GARCHParams {
  omega: number;   // Constant (0.00001)
  alpha: number;   // ARCH coefficient (0.05-0.15)
  beta: number;    // GARCH coefficient (0.80-0.90)
  // Constraint: alpha + beta < 1
}

function nextVolatility(
  currentVol: number,
  lastReturn: number,
  params: GARCHParams
): number {
  const variance = params.omega 
    + params.alpha * lastReturn * lastReturn 
    + params.beta * currentVol * currentVol;
  
  return Math.sqrt(variance);
}
```

#### Session-Based Behavior

```typescript
function getSessionMultiplier(pairId: string, utcHour: number): number {
  // Forex sessions (UTC)
  const sessions = {
    asian: { start: 0, end: 7, multiplier: 0.6 },
    london: { start: 7, end: 16, multiplier: 1.2 },
    ny: { start: 12, end: 21, multiplier: 1.0 },
    overlap: { start: 12, end: 16, multiplier: 1.5 }, // London-NY overlap
    offHours: { start: 21, end: 24, multiplier: 0.4 },
  };
  
  // Crypto is 24/7 but has its own patterns
  if (pairId.includes('USD')) {
    // Check if it's crypto
    const cryptoPairs = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ADA', 'BNB'];
    if (cryptoPairs.some(p => pairId.startsWith(p))) {
      return 1.0; // Crypto has more uniform volatility
    }
  }
  
  for (const [name, session] of Object.entries(sessions)) {
    if (utcHour >= session.start && utcHour < session.end) {
      return session.multiplier;
    }
  }
  
  return 0.5; // Default
}
```

### 5.2 Trade Settlement Worker

```typescript
// lib/settlement-worker.ts

import { prisma } from './db';
import { getOTCEngine } from './otc-engine';
import { credit, releaseHold } from './ledger';

const SETTLEMENT_INTERVAL_MS = 1000; // Check every second
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

export class SettlementWorker {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  
  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), SETTLEMENT_INTERVAL_MS);
    console.log('[Settlement] Worker started');
  }
  
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log('[Settlement] Worker stopped');
  }
  
  private async tick() {
    if (this.isRunning) return; // Prevent overlapping runs
    this.isRunning = true;
    
    try {
      const engine = await getOTCEngine();
      
      // Find trades ready to settle
      const pendingTrades = await prisma.trade.findMany({
        where: {
          status: 'ACTIVE',
          settleAt: { lte: new Date() },
        },
        orderBy: { settleAt: 'asc' },
        take: 100, // Process in batches
      });
      
      for (const trade of pendingTrades) {
        await this.settleTrade(trade, engine);
      }
    } catch (error) {
      console.error('[Settlement] Tick error:', error);
    } finally {
      this.isRunning = false;
    }
  }
  
  private async settleTrade(trade: Trade, engine: OTCEngine) {
    const closePrice = engine.getCurrentPrice(trade.pairId);
    if (!closePrice) {
      console.warn(`[Settlement] No price for ${trade.pairId}, skipping`);
      return;
    }
    
    // Determine win/loss from REAL price movement
    const priceMovedUp = closePrice > Number(trade.openPrice);
    const won = (trade.direction === 'UP' && priceMovedUp) || 
                (trade.direction === 'DOWN' && !priceMovedUp);
    
    const payout = won 
      ? Math.round(Number(trade.amount) * Number(trade.payoutPercent) / 100)
      : 0;
    
    const profit = won ? payout - Number(trade.amount) : -Number(trade.amount);
    
    // Settle atomically
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await prisma.$transaction(async (tx) => {
          // Release the hold
          await releaseHold(tx, trade.userId, trade.id, won ? 'TRADE_WIN' : 'TRADE_LOSS');
          
          // Credit if won
          if (won) {
            await credit(tx, trade.userId, Number(trade.amount) + payout, 'TRADE_WIN', trade.id);
          }
          
          // Update trade record
          await tx.trade.update({
            where: { id: trade.id },
            data: {
              closePrice,
              status: won ? 'WON' : 'LOST',
              profit,
              settledAt: new Date(),
            },
          });
        });
        
        console.log(`[Settlement] Trade ${trade.id} settled: ${won ? 'WIN' : 'LOSS'}`);
        return; // Success
      } catch (error) {
        console.error(`[Settlement] Attempt ${attempt + 1} failed for trade ${trade.id}:`, error);
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
        }
      }
    }
    
    // All retries failed — mark for manual review
    console.error(`[Settlement] CRITICAL: Failed to settle trade ${trade.id} after ${MAX_RETRIES} attempts`);
  }
}
```

### 5.3 Double-Entry Ledger

```typescript
// lib/ledger.ts

import { createHash } from 'crypto';
import { prisma } from './db';

type LedgerDirection = 'DEBIT' | 'CREDIT';

interface NewLedgerEntry {
  userId: string;
  type: string;
  amount: number;
  direction: LedgerDirection;
  referenceId: string;
  description?: string;
}

async function createLedgerEntry(
  tx: PrismaTransactionClient,
  entry: NewLedgerEntry
) {
  // Get previous entry for chain
  const previousEntry = await tx.ledgerEntry.findFirst({
    where: { userId: entry.userId },
    orderBy: { createdAt: 'desc' },
  });
  
  // Calculate checksum
  const checksum = createHash('sha256')
    .update(`${previousEntry?.checksum || 'genesis'}${entry.type}${entry.amount}${entry.direction}`)
    .digest('hex');
  
  // Get current balance
  const user = await tx.user.findUnique({ where: { id: entry.userId } });
  const currentBalance = user?.balance || 0;
  
  // Calculate new balance
  const newBalance = entry.direction === 'CREDIT' 
    ? currentBalance + entry.amount 
    : currentBalance - entry.amount;
  
  // Create entry
  const ledgerEntry = await tx.ledgerEntry.create({
    data: {
      userId: entry.userId,
      type: entry.type as any,
      amount: entry.amount,
      balanceAfter: newBalance,
      referenceId: entry.referenceId,
      description: entry.description,
      createdAt: new Date(),
    },
  });
  
  // Update user balance
  await tx.user.update({
    where: { id: entry.userId },
    data: { balance: newBalance },
  });
  
  return { ledgerEntry, newBalance };
}

export async function credit(
  tx: PrismaTransactionClient,
  userId: string,
  amount: number,
  type: string,
  referenceId: string,
  description?: string
) {
  return createLedgerEntry(tx, {
    userId,
    type,
    amount: Math.round(amount),
    direction: 'CREDIT',
    referenceId,
    description,
  });
}

export async function debit(
  tx: PrismaTransactionClient,
  userId: string,
  amount: number,
  type: string,
  referenceId: string,
  description?: string
) {
  return createLedgerEntry(tx, {
    userId,
    type,
    amount: Math.round(amount),
    direction: 'DEBIT',
    referenceId,
    description,
  });
}

export async function releaseHold(
  tx: PrismaTransactionClient,
  userId: string,
  tradeId: string,
  type: string
) {
  // Find the original hold
  const hold = await tx.ledgerEntry.findFirst({
    where: {
      userId,
      referenceId: tradeId,
      type: 'TRADE_HOLD',
    },
  });
  
  if (!hold) {
    throw new Error(`No hold found for trade ${tradeId}`);
  }
  
  // Release it
  return createLedgerEntry(tx, {
    userId,
    type,
    amount: hold.amount,
    direction: 'CREDIT',
    referenceId: tradeId,
    description: `Released hold for trade ${tradeId}`,
  });
}

// Verify ledger integrity
export async function verifyLedgerIntegrity(userId: string): Promise<boolean> {
  const entries = await prisma.ledgerEntry.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
  
  let runningBalance = 0;
  let previousChecksum = 'genesis';
  
  for (const entry of entries) {
    // Verify checksum chain
    const expectedChecksum = createHash('sha256')
      .update(`${previousChecksum}${entry.type}${entry.amount}${entry.direction === 'CREDIT' ? 'CREDIT' : 'DEBIT'}`)
      .digest('hex');
    
    if (entry.checksum !== expectedChecksum) {
      console.error(`[Ledger] Checksum mismatch at entry ${entry.id}`);
      return false;
    }
    
    // Verify balance
    if (entry.direction === 'CREDIT') {
      runningBalance += entry.amount;
    } else {
      runningBalance -= entry.amount;
    }
    
    if (entry.balanceAfter !== runningBalance) {
      console.error(`[Ledger] Balance mismatch at entry ${entry.id}`);
      return false;
    }
    
    previousChecksum = entry.checksum;
  }
  
  return true;
}
```

### 5.4 Smart Payout System

```typescript
// lib/payout.ts

import { prisma } from './db';
import { getVaultHealth } from './vault';

interface PayoutContext {
  isWeekend: boolean;
  utcHour: number;
  vaultHealth: 'healthy' | 'warning' | 'critical';
  todayVolume: number;
  maxDailyVolume: number;
}

export async function getPayoutForPair(
  pairId: string,
  context?: PayoutContext
): Promise<number> {
  const pair = await prisma.pair.findUnique({ where: { id: pairId } });
  if (!pair) return 0;
  
  let basePayout = Number(pair.payoutPercent);
  
  // Get context if not provided
  if (!context) {
    const now = new Date();
    const health = await getVaultHealth();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const todayVolume = await prisma.trade.aggregate({
      where: {
        pairId,
        createdAt: { gte: todayStart },
      },
      _sum: { amount: true },
    });
    
    context = {
      isWeekend: now.getDay() === 0 || now.getDay() === 6,
      utcHour: now.getUTCHours(),
      vaultHealth: health.healthStatus,
      todayVolume: Number(todayVolume._sum.amount || 0),
      maxDailyVolume: Number(pair.maxDailyVolume || 500000),
    };
  }
  
  // 1. Weekend adjustment
  if (context.isWeekend && pair.weekendPayout) {
    basePayout = Number(pair.weekendPayout);
  }
  
  // 2. Time-of-day adjustment (peak hours = lower payout)
  const peakHours = [8, 9, 10, 14, 15, 16, 17, 20, 21]; // London + NY overlap
  if (peakHours.includes(context.utcHour)) {
    basePayout -= 2;
  }
  
  // 3. Vault health adjustment
  if (context.vaultHealth === 'critical') {
    basePayout -= 5;
  } else if (context.vaultHealth === 'warning') {
    basePayout -= 2;
  }
  
  // 4. Volume-based adjustment
  const volumeRatio = context.todayVolume / context.maxDailyVolume;
  if (volumeRatio > 0.8) {
    basePayout -= 3;
  } else if (volumeRatio > 0.5) {
    basePayout -= 1;
  }
  
  // Clamp to limits
  return Math.max(50, Math.min(95, basePayout));
}
```

### 5.5 Rate Limiting

```typescript
// middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// In-memory rate limiter (use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  'POST /api/auth/login': { max: 5, windowMs: 15 * 60 * 1000 }, // 5 per 15min
  'POST /api/auth/register': { max: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
  'POST /api/trade/trades': { max: 10, windowMs: 60 * 1000 }, // 10 per minute
  'POST /api/trade/withdraw': { max: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
  'POST /api/auth/verify-email': { max: 3, windowMs: 5 * 60 * 1000 }, // 3 per 5min
};

function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0] || 
         request.headers.get('x-real-ip') || 
         'unknown';
}

function checkRateLimit(key: string, limit: { max: number; windowMs: number }): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + limit.windowMs });
    return true;
  }
  
  if (entry.count >= limit.max) {
    return false;
  }
  
  entry.count++;
  return true;
}

export function middleware(request: NextRequest) {
  const ip = getClientIP(request);
  const method = request.method;
  const pathname = request.nextUrl.pathname;
  
  // Check rate limit
  const rateLimitKey = `${method} ${pathname}`;
  const rateLimit = RATE_LIMITS[rateLimitKey];
  
  if (rateLimit) {
    const key = `${ip}:${rateLimitKey}`;
    if (!checkRateLimit(key, rateLimit)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }
  }
  
  // ... rest of middleware
}
```

---

## 6. Security Requirements

### 6.1 Authentication

| Requirement | Implementation |
|-------------|----------------|
| Password minimum 12 characters | better-auth `minPasswordLength: 12` |
| Password complexity (uppercase, lowercase, number, special) | Server-side validation in `lib/password.ts` |
| Bcrypt rounds >= 12 | better-auth default |
| Session timeout 30 minutes | better-auth `cookieCache.maxAge` |
| Maximum 3 concurrent sessions | Session management in better-auth |
| 2FA for withdrawals | Enforce in trade/withdraw route |
| Account lockout after 5 failed attempts | `lib/login-security.ts` (must be wired) |

### 6.2 API Security

| Requirement | Implementation |
|-------------|----------------|
| Rate limiting per endpoint | `middleware.ts` rate limiter |
| Input validation (Zod) | All POST/PUT endpoints |
| SQL injection prevention | Prisma ORM (parameterized queries) |
| XSS prevention | React auto-escaping + CSP headers |
| CSRF protection | SameSite cookies + CSRF token |
| CORS configuration | `lib/auth.ts` trusted origins |

### 6.3 Data Security

| Requirement | Implementation |
|-------------|----------------|
| Passwords: bcrypt hash, never plaintext | better-auth |
| TOTP secrets: encrypted at rest | Application-level encryption |
| KYC documents: encrypted storage | S3 server-side encryption |
| Database: TDE (Transparent Data Encryption) | Cloud provider |
| Backups: encrypted with separate key | AWS KMS |
| TLS 1.3 only | Load balancer configuration |

### 6.4 Audit Trail

| Requirement | Implementation |
|-------------|----------------|
| All financial operations logged | `lib/audit.ts` |
| Ledger entries with checksum chain | `lib/ledger.ts` |
| Admin actions logged | `logAudit()` in all admin routes |
| Immutable audit logs | Append-only, no updates/deletes |
| IP address capture | Request headers |

---

## 7. Compliance Requirements

### 7.1 Licensing

| Jurisdiction | Regulator | Capital Requirement | Timeline |
|-------------|-----------|---------------------|----------|
| Cyprus | CySEC | €200,000 | 6-12 months |
| Vanuatu | VFSC | $50,000 | 3-6 months |
| St. Vincent | FSA | $10,000 | 2-4 months |
| Mauritius | FSC | $25,000 | 4-6 months |

**Recommendation:** Start with Vanuatu or St. Vincent for faster launch, then apply for CySEC for EU market access.

### 7.2 KYC/AML

| Tier | Requirements | Limits |
|------|--------------|--------|
| Tier 0 | Email only | $1,000 deposit, $500 withdrawal |
| Tier 1 | Email + Phone | $10,000 deposit, $5,000 withdrawal |
| Tier 2 | Government ID + Selfie | $100,000 deposit, $50,000 withdrawal |
| Tier 3 | Proof of Address + Source of Funds | Unlimited |

### 7.3 Responsible Gambling

| Feature | Implementation |
|---------|----------------|
| Self-exclusion | 24h, 7d, 30d, 90d, 6mo, 1y, permanent |
| Deposit limits | Daily, weekly, monthly |
| Loss limits | Daily, weekly, monthly |
| Reality check | Pop-up every 1 hour of trading |
| Cool-down period | 7-day waiting period for limit increases |
| Age verification | Part of KYC Tier 1 |

### 7.4 Data Protection (GDPR)

| Right | Implementation |
|-------|----------------|
| Right to access | Data export endpoint |
| Right to erasure | Account deletion with retention |
| Right to rectification | Profile update endpoint |
| Right to portability | JSON/CSV export |
| Data retention | 7 years for financial, 2 years for marketing |

---

## 8. Infrastructure Requirements

### 8.1 Production Environment

| Component | Specification |
|-----------|---------------|
| App Servers | AWS EC2 t3.large (2 vCPU, 8GB RAM) |
| Database | AWS RDS PostgreSQL db.r6g.large (2 vCPU, 16GB RAM) |
| Cache | AWS ElastiCache Redis cache.r6g.large |
| Storage | AWS S3 for files, EBS for database |
| CDN | Cloudflare Pro |
| Load Balancer | AWS ALB |
| DNS | Cloudflare |

### 8.2 Scaling Strategy

| Users | Servers | Database | Cost/Month |
|-------|---------|----------|------------|
| 0-1,000 | 2 | Single RDS | $500-1,000 |
| 1,000-10,000 | 3-5 | RDS + Read Replica | $2,000-5,000 |
| 10,000-100,000 | 5-10 | RDS Cluster | $10,000-30,000 |
| 100,000+ | 10-20 | Multi-region | $30,000-100,000 |

### 8.3 Monitoring Stack

| Tool | Purpose |
|------|---------|
| Sentry | Error tracking |
| Prometheus + Grafana | Metrics and dashboards |
| PagerDuty | Alerting |
| Datadog | APM (optional) |
| Cloudflare Analytics | Traffic and security |

### 8.4 Backup Strategy

| Backup Type | Frequency | Retention |
|-------------|-----------|-----------|
| Full database | Daily at 03:00 UTC | 30 days |
| Incremental | Hourly | 72 hours |
| WAL archive | Continuous | 7 days |
| Cross-region | Continuous | 30 days |

---

## 9. Quality Standards

### 9.1 Code Quality

| Standard | Requirement |
|----------|-------------|
| TypeScript | Strict mode, no `any` types |
| Linting | ESLint with no warnings |
| Formatting | Prettier with consistent config |
| Comments | No comments (self-documenting code) |
| Naming | camelCase for variables, PascalCase for types |
| File structure | One component per file |

### 9.2 Testing

| Type | Coverage Target | Tools |
|------|-----------------|-------|
| Unit tests | 80% | Jest |
| Integration tests | 70% | Jest + Supertest |
| E2E tests | Critical paths | Playwright |
| Load tests | 10,000 users | k6 |
| Security tests | OWASP Top 10 | OWASP ZAP |

### 9.3 Performance

| Metric | Target |
|--------|--------|
| API response time (p95) | < 200ms |
| WebSocket tick latency | < 50ms |
| Page load time (p95) | < 2 seconds |
| Time to interactive | < 3 seconds |
| Trade settlement latency | < 1 second |
| Database query time (p95) | < 50ms |

### 9.4 Reliability

| Metric | Target |
|--------|--------|
| Uptime | 99.9% |
| Mean time to recovery (MTTR) | < 4 hours |
| Mean time between failures (MTBF) | > 30 days |
| Data loss tolerance | 0 (financial), < 1 hour (analytics) |

---

## 10. Team Guidelines

### 10.1 Development Workflow

1. **Branch strategy:** GitFlow (main, develop, feature/*, release/*, hotfix/*)
2. **Commit messages:** Conventional Commits (feat:, fix:, chore:, docs:)
3. **PR requirements:** 1 approval, all checks pass, no `any` types
4. **Code review:** Focus on security, performance, correctness
5. **Deployment:** CI/CD pipeline, staging → production

### 10.2 Communication

| Channel | Purpose |
|---------|---------|
| GitHub Issues | Task tracking |
| GitHub Discussions | Architecture decisions |
| Slack/Teams | Daily communication |
| Weekly sync | Progress updates |
| Monthly review | Phase completion |

### 10.3 Documentation

| Document | Location | Update Frequency |
|----------|----------|------------------|
| Architecture | `docs/ARCHITECTURE.md` | On major changes |
| API docs | Auto-generated from code | Every PR |
| Deployment | `docs/DEPLOYMENT.md` | On infrastructure changes |
| Runbook | `docs/RUNBOOK.md` | On incidents |

### 10.4 Onboarding

New team members should:
1. Read this document
2. Read `docs/PROJECT.md`
3. Set up local development environment
4. Complete a starter task
5. Shadow a senior developer for 1 week

---

## 11. Success Metrics

### 11.1 Technical Metrics

| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| Uptime | Unknown | 99.9% | Monitoring tools |
| API Response Time | Unknown | < 200ms | APM |
| Error Rate | Unknown | < 0.1% | Sentry |
| Test Coverage | 0% | 80% | Jest coverage |
| Security Incidents | Unknown | 0 | Security audit |

### 11.2 Business Metrics

| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| Active Users | 0 | 1,000 | Analytics |
| Daily Volume | $0 | $100,000 | Database |
| Revenue | $0 | $10,000/day | Ledger |
| User Satisfaction | N/A | > 4.5/5 | NPS surveys |
| Support Tickets | N/A | < 10/day | Ticketing system |

### 11.3 Compliance Metrics

| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| KYC Completion Rate | 0% | > 80% | KYC system |
| AML Alerts | N/A | < 1% of users | AML screening |
| Responsible Gambling Features | 0/5 | 5/5 | Feature checklist |
| Data Protection Compliance | 0% | 100% | Audit |

---

## 12. Risk Management

### 12.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Trade engine bugs | Medium | High | Extensive testing, gradual rollout |
| Database corruption | Low | Critical | Automated backups, point-in-time recovery |
| Security breach | Low | Critical | Security audit, bug bounty program |
| Performance issues | Medium | Medium | Load testing, auto-scaling |
| Third-party failures | Medium | High | Multiple providers, fallbacks |

### 12.2 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| License rejection | Medium | Critical | Start application early, hire consultant |
| Regulatory changes | Low | High | Monitor regulations, flexible architecture |
| Competition | High | Medium | Focus on UX, unique features |
| User fraud | Medium | High | KYC/AML, velocity checks |
| Payment gateway issues | Medium | High | Multiple providers, crypto backup |

### 12.3 Operational Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Key person dependency | High | High | Documentation, cross-training |
| Scope creep | High | Medium | Strict phase gates, MVP mindset |
| Budget overrun | Medium | Medium | Regular reviews, contingency fund |
| Timeline delays | High | Medium | Buffer time, prioritize critical path |

---

## Appendix A: File Structure

```
nextorx/
├── app/
│   ├── (admin)/              # Admin panel
│   │   └── console-panel/
│   │       ├── (dashboard)/  # Admin pages
│   │       └── layout.tsx    # Admin layout with auth guard
│   ├── (marketing)/          # Public pages
│   │   ├── login/
│   │   ├── register/
│   │   └── ...
│   ├── (trader)/             # Trader pages
│   │   ├── trade/
│   │   ├── account/
│   │   └── ...
│   ├── api/                  # API routes
│   │   ├── admin/            # Admin APIs
│   │   ├── auth/             # Auth APIs
│   │   ├── market/           # Public market data
│   │   └── trade/            # Trading APIs
│   └── components/           # Shared components
├── lib/                      # Core libraries
│   ├── auth.ts               # better-auth config
│   ├── rbac.ts               # Role-based access control
│   ├── ledger.ts             # Double-entry ledger
│   ├── market-maker.ts       # OTC engine v2 (NEW)
│   ├── settlement-worker.ts  # Trade settlement (NEW)
│   ├── payout.ts             # Smart payout system (NEW)
│   ├── vault.ts              # Vault management (NEW)
│   └── ...
├── prisma/
│   └── schema.prisma         # Database schema
├── docs/                     # Documentation
│   ├── INDUSTRY-GRADE-PLAN.md
│   ├── PROJECT.md
│   └── ...
├── scripts/                  # Scripts
│   └── seed.ts
└── server.ts                 # Custom server (WebSocket)
```

## Appendix B: API Endpoints

### Auth APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | Public | Register new user |
| POST | `/api/auth/login` | Public | Login |
| POST | `/api/auth/logout` | Auth | Logout |
| POST | `/api/auth/forgot-password` | Public | Request password reset |
| POST | `/api/auth/reset-password` | Public | Reset password with token |
| POST | `/api/auth/send-verification` | Public | Send verification email |
| POST | `/api/auth/verify-email` | Public | Verify email with code |
| POST | `/api/auth/change-password` | Auth | Change password |
| POST | `/api/auth/delete-account` | Auth | Delete account |
| GET | `/api/auth/2fa` | Auth | Get 2FA status |
| POST | `/api/auth/2fa` | Auth | Enable/disable 2FA |

### Trade APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/trade/balance` | Auth | Get user balance |
| POST | `/api/trade/demo-balance` | Auth | Credit demo balance |
| PATCH | `/api/trade/demo-balance` | Auth | Adjust demo balance |
| POST | `/api/trade/trades` | Auth | Create trade |
| GET | `/api/trade/trades` | Auth | Get user trades |
| POST | `/api/trade/deposit` | Auth | Request deposit |
| POST | `/api/trade/withdraw` | Auth | Request withdrawal |
| GET | `/api/trade/payment-methods` | Public | Get payment methods |

### Market APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/market/pairs` | Public | Get active pairs |
| GET | `/api/market/pairs/[id]` | Public | Get pair details |
| GET | `/api/market/pairs/[id]/candles` | Public | Get pair candles |

### Admin APIs

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/admin/stats` | user:list | Get platform stats |
| GET | `/api/admin/users` | user:list | List users |
| POST | `/api/admin/users` | user:update | User actions (ban, role, balance) |
| GET | `/api/admin/trades` | trade:list | List trades |
| GET | `/api/admin/treasury` | deposit:list | Treasury snapshot |
| GET | `/api/admin/finance` | deposit:list | Financial overview |
| GET | `/api/admin/deposits` | deposit:list | List deposits |
| POST | `/api/admin/deposits` | deposit:verify | Verify/reject deposit |
| GET | `/api/admin/withdrawals` | withdrawal:list | List withdrawals |
| POST | `/api/admin/withdrawals` | withdrawal:approve | Approve/reject withdrawal |
| GET | `/api/admin/settings` | settings:read | Get settings |
| PUT | `/api/admin/settings` | settings:manage | Update settings |
| GET | `/api/admin/pairs` | pair:list | List pairs |
| POST | `/api/admin/pairs` | pair:create | Create pair |
| PUT | `/api/admin/pairs/[id]` | pair:update | Update pair |
| DELETE | `/api/admin/pairs/[id]` | pair:delete | Delete pair |
| PUT | `/api/admin/pairs/[id]/toggle` | pair:update | Toggle pair active |
| POST | `/api/admin/pairs/reorder` | pair:update | Reorder pairs |
| GET | `/api/admin/promos` | promo:read | List promos |
| POST | `/api/admin/promos` | promo:manage | Create/update promo |
| GET | `/api/admin/payment-methods` | payment:list | List payment methods |
| POST | `/api/admin/payment-methods` | payment:manage | Create/update payment method |
| GET | `/api/admin/audit` | audit:read | List audit logs |

## Appendix C: Database Schema (Key Models)

```prisma
// User model
model User {
  id                String    @id @default(uuid())
  email             String    @unique
  emailVerified     Boolean   @default(false)
  name              String
  role              String    @default("player")
  balance           Int       @default(0)  // cents
  bonusBalance      Int       @default(0)
  twoFactorEnabled  Boolean   @default(false)
  banned            Boolean?  @default(false)
  kycStatus         String    @default("NOT_SUBMITTED")
  // ... other fields
}

// Pair model
model Pair {
  id              String   @id
  name            String
  symbol          String?
  category        String   // forex, crypto, commodities, indices
  basePrice       Decimal  @db.Decimal(16, 8)
  volatility      Decimal  @db.Decimal(12, 6)
  payoutPercent   Decimal  @db.Decimal(5, 2) @default(80)
  weekendPayout   Decimal? @db.Decimal(5, 2)
  spread          Decimal  @db.Decimal(8, 6) @default(0.0002)
  isActive        Boolean  @default(true)
  isFeatured      Boolean  @default(false)
  minTrade        Decimal  @db.Decimal(10, 2) @default(1)
  maxTrade        Decimal  @db.Decimal(10, 2) @default(5000)
  maxPayout       Decimal? @db.Decimal(5, 2) @default(95)
  maxDailyVolume  Int?
  // ... other fields
}

// Trade model
model Trade {
  id              String        @id @default(uuid())
  userId          String
  pairId          String
  direction       TradeDirection
  amount          Int           // cents
  payoutPercent   Decimal       @db.Decimal(5, 2)
  durationSeconds Int
  openPrice       Decimal       @db.Decimal(16, 8)
  closePrice      Decimal?      @db.Decimal(16, 8)
  status          TradeStatus   @default(PENDING)
  profit          Int?
  settledAt       DateTime?
  createdAt       DateTime      @default(now())
  // ... relations
}

// LedgerEntry model
model LedgerEntry {
  id                String    @id @default(uuid())
  userId            String
  type              LedgerType
  amount            Int       // cents
  balanceAfter      Int       // running balance
  referenceId       String
  description       String?
  checksum          String?   // SHA-256 for integrity
  createdAt         DateTime  @default(now())
  // ... relations
}
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-09-03 | System | Initial document |

---

**This document is the single source of truth for the Nextorx industry-grade implementation. All team members must read and understand it before starting work.**

**Last Updated:** 2026-09-03
**Next Review:** Weekly during implementation
