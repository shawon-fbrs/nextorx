# OTC Pairs Management — Industry Standard Plan & Financial Model

## Table of Contents
1. [Industry Standard vs Current State](#industry-standard-vs-current-state)
2. [Proposed Implementation Plan](#proposed-implementation-plan)
3. [Volatility & Spread Explained](#volatility--spread-explained)
4. [House Edge Algorithm](#house-edge-algorithm)
5. [100-User Financial Model](#100-user-financial-model)
6. [Withdrawal Capacity Analysis](#withdrawal-capacity-analysis)
7. [Risk Scenarios](#risk-scenarios)

---

## Industry Standard vs Current State

### What Industry Leaders Do

From researching PocketOption, IQ Option, Quotex, and platform builders (Merehead, Hashcodex):

| Feature | Industry Standard | Our Current State |
|---|---|---|
| **Pair count** | 50-120+ pairs | 23 (hardcoded) |
| **Admin CRUD** | Full add/edit/delete from admin panel | None — code change + seed |
| **Per-pair payout** | Dynamic, adjustable per pair/time/day | Static per pair in seed |
| **Per-pair spread** | Configurable per pair | Default 0.0002, never customized |
| **Per-pair volatility** | Admin slider per pair | Static in seed |
| **Trading hours** | Per-pair (crypto=24/7, forex=follows sessions) | All 24/7, no config |
| **Market hours mode** | Live market data vs OTC mode toggle | Always OTC |
| **Payout time-of-day** | Weekday vs weekend rates | Single static value |
| **Pair categories** | Forex, Crypto, Commodities, Indices, Stocks | 4 categories, no stocks |
| **Pair metadata** | Icon/logo, description, trading session info | Name + category only |
| **Base price source** | Option to sync from real feed | Frozen at seed time |
| **Enable/disable** | Instant toggle from admin | Code change required |
| **Sort order** | Drag-and-drop reordering | Static sortOrder int |

### Key Industry Insight

> *"Admin payout controls (weekday vs. weekend rates per instrument) and withdrawal limit management per payment gateway should be treated as core admin MVP features, not phase-2 additions."* — Merehead (binary options platform builder)

> *"The admin panel must expose granular withdrawal limit controls: minimum and maximum per gateway, commission rates per gateway... This is both a risk management tool and a regulatory requirement."*

> *"A market maker engine solves the weekend dead stop. The admin panel configures the parameters per pair: movement frequency, volatility amplitude, direction bias."*

---

## Proposed Implementation Plan

### Phase 1: Schema Enhancement + Admin CRUD API

**Prisma schema changes to `Pair` model:**

```prisma
model Pair {
  id              String   @id
  name            String   // "EURUSD"
  symbol          String?  // "EUR/USD" (display)
  category        String   // forex, crypto, commodities, indices
  basePrice       Decimal  @db.Decimal(16, 8)
  volatility      Decimal  @db.Decimal(12, 6)
  payoutPercent   Decimal  @db.Decimal(5, 2)   @default(80)
  weekendPayout   Decimal  @db.Decimal(5, 2)   // Different payout on weekends
  spread          Decimal  @db.Decimal(8, 6)   @default(0.0002)
  isActive        Boolean  @default(true)
  isFeatured      Boolean  @default(false)     // Show in top bar
  minTrade        Decimal  @db.Decimal(10, 2)  @default(1)
  maxTrade        Decimal  @db.Decimal(10, 2)  @default(5000)
  maxPayout       Decimal  @db.Decimal(5, 2)   @default(95)
  sortOrder       Int      @default(0)
  description     String?
  tradingHours    String?  @default("24/7")
  tags            String[]                      // ["major", "volatile", "popular"]
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  candles         Candle[]
  trades          Trade[]
  
  @@index([isActive, sortOrder])
  @@index([category])
}
```

**New admin API endpoints:**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/pairs` | List all pairs (with trade counts, volume) |
| POST | `/api/admin/pairs` | Create new pair |
| PUT | `/api/admin/pairs/[id]` | Update pair |
| DELETE | `/api/admin/pairs/[id]` | Delete pair (only if no trades) |
| PUT | `/api/admin/pairs/[id]/toggle` | Quick enable/disable |
| POST | `/api/admin/pairs/reorder` | Bulk reorder (drag-and-drop) |

**Validation rules:**
- Payout range: 50% - 95%
- Max payout must be >= payoutPercent
- Unique pair ID
- Cannot delete pair with active trades (soft delete instead)

---

### Phase 2: Admin UI — Full Pair Management

Replace current read-only OTC page with full CRUD:

**Pair List View:**

| Column | Type | Editable |
|---|---|---|
| Drag handle | Icon | — |
| Name | String | Click to edit |
| Symbol | String | Click to edit |
| Category | Badge | Click to edit |
| Base Price | Number | Click to edit |
| Volatility | Slider | Inline edit |
| Spread | Number | Click to edit |
| Payout (weekday) | % | Click to edit |
| Payout (weekend) | % | Click to edit |
| Status | Toggle | Inline toggle |
| Featured | Toggle | Inline toggle |
| Actions | Buttons | View/Edit/Delete |

**Features:**
- Drag-and-drop reordering (using `@dnd-kit/sortable`)
- Inline editing for quick changes
- Full edit drawer for detailed config
- Search/filter by name, category, status
- Bulk actions: enable/disable, delete
- Stats column: total trades, 24h volume

**Pair Edit Drawer:**

| Tab | Fields |
|---|---|
| Basic | name, symbol, category, description, tags |
| Pricing | basePrice, volatility, spread |
| Payout | payoutPercent, weekendPayout, maxPayout |
| Trading | minTrade, maxTrade, maxDailyVolume |
| Display | sortOrder, isFeatured |

**Add Pair Flow:**
1. Click "Add Pair" button
2. Select category (forex/crypto/commodities/indices)
3. Pre-filled defaults based on category:
   - Forex: volatility=0.5, spread=0.0002, payout=80%
   - Crypto: volatility=2.0, spread=0.001, payout=85%
   - Commodities: volatility=1.0, spread=0.0005, payout=78%
   - Indices: volatility=0.8, spread=0.0003, payout=82%
4. Customize fields
5. Save

---

### Phase 3: OTC Engine Hot-Reload

Add methods to `lib/otc-engine.ts`:

```typescript
async addPair(pairId: string): Promise<void>
// Load from DB, seed 500 candles, start ticking

async removePair(pairId: string): Promise<void>
// Stop ticking, clean up subscribers

async updatePair(pairId: string, changes: Partial<PairConfig>): Promise<void>
// Hot-reload: volatility, payout, spread, isActive

async reorderPairs(pairIds: string[]): Promise<void>
// Update sort order in memory

async toggleFeatured(pairId: string, featured: boolean): Promise<void>
// Toggle featured status
```

**Implementation:**
1. Admin API calls engine methods after DB update
2. Engine updates in-memory `Map<string, PairState>` immediately
3. WebSocket subscribers get new config on next tick
4. No server restart required

---

### Phase 4: Smart Payout System

Industry standard: payout varies by time and conditions.

**Payout rules:**
1. **Weekday/Weekend**: Use `weekendPayout` field (Saturday/Sunday)
2. **Time-of-day**: Optional peak hours adjustment
3. **Volume-based**: High-volume pairs get lower payout (risk management)
4. **Treasury health**: If reserve < threshold, reduce payouts globally

**Implementation in `getPayoutForPair(pairId)`:**
```typescript
function getPayoutForPair(pairId: string, isWeekend: boolean): number {
  const pair = getPair(pairId);
  if (!pair) return 0;
  
  if (isWeekend && pair.weekendPayout) {
    return pair.weekendPayout;
  }
  
  return pair.payoutPercent;
}
```

**Future enhancement (Phase 5):** Payout rules engine with conditions:
```typescript
interface PayoutRule {
  id: string;
  pairId: string | null;     // null = global
  condition: { type: string; operator: string; value: number };
  action: { type: string; value: number };
  priority: number;
  isActive: boolean;
}
```

---

### Phase 5: Seed Script Refactor

**Current:** 23 hardcoded pairs in `scripts/seed.ts`
**New:** 40-50 pairs organized by category

**Forex pairs (20):**
Major: EURUSD, GBPUSD, USDJPY, USDCHF, USDCAD, AUDUSD, NZDUSD
Minor: EURGBP, EURJPY, GBPJPY, AUDJPY, CADJPY, CHFJPY, EURCHF, EURAUD, EURCAD, GBPCAD, GBPAUD, AUDCAD, NZDCAD

**Crypto pairs (10):**
BTCUSD, ETHUSD, BNBUSD, SOLUSD, XRPUSD, DOGEUSD, ADAUSD, DOTUSD, AVAXUSD, MATICUSD

**Commodities pairs (8):**
XAUUSD (Gold), XAGUSD (Silver), USOIL (Crude Oil), XPTUSD (Platinum), XPDUSD (Palladium), NATGAS (Natural Gas), COPPER, WHEAT

**Indices pairs (7):**
SPX500, NAS100, DJ30, UK100, DAX40, NIKKEI225, ASX200

**Total: 45 pairs**

Each with category-appropriate defaults:
- Forex: volatility 0.3-0.8, spread 0.0001-0.0005, payout 78-85%
- Crypto: volatility 1.5-3.0, spread 0.001-0.005, payout 85-92%
- Commodities: volatility 0.5-1.5, spread 0.0003-0.001, payout 75-82%
- Indices: volatility 0.5-1.2, spread 0.0002-0.0008, payout 78-85%

---

### Implementation Order

| Phase | Effort | Dependencies |
|---|---|---|
| 1. Schema + Migration | 1 hour | None |
| 2. Admin CRUD API | 2 hours | Phase 1 |
| 3. Admin UI (list + edit) | 3-4 hours | Phase 2 |
| 4. OTC Engine hot-reload | 1-2 hours | Phase 2 |
| 5. Seed script refactor | 1 hour | Phase 1 |
| 6. Integration testing | 1 hour | All above |

**Total: ~9-11 hours**

---

## Volatility & Spread Explained

### Volatility

**What it controls:** How much the OTC price moves per tick.

In `lib/otc-engine.ts`, the tick calculation is:
```typescript
const change = (Math.random() - 0.5) * pairState.volatility * 0.06;
```

**Interpretation:**

| Volatility | Price Movement | Character |
|---|---|---|
| 0.1 | Very stable, barely moves | Boring, low risk |
| 0.5 | Moderate swings | Balanced |
| 1.0 | Noticeable moves | Active |
| 2.0 | Large swings | Volatile |
| 5.0 | Extreme swings | Wild/Casino-like |

**Impact on platform:**
- **High volatility** = More dramatic price swings = Users feel excitement = More trades = More volume
- **High volatility** = Prices can hit extreme levels = May look unrealistic if too high
- **Low volatility** = Predictable = Users get bored = Less trading

**Recommended ranges for OTC:**
- Forex: 0.3 - 0.8 (stable, familiar)
- Crypto: 1.5 - 3.0 (volatile, exciting)
- Commodities: 0.5 - 1.5 (moderate)
- Indices: 0.5 - 1.2 (moderate)

### Spread

**What it is:** The gap between the entry price and the current market price when a user places a trade.

**Example:**
```
Current price: EURUSD = 1.08500
Spread: 0.0002

User clicks CALL (buy):
  Entry price = 1.08500 + 0.0001 = 1.08510  (slightly higher)
  
User clicks PUT (sell):
  Entry price = 1.08500 - 0.0001 = 1.08490  (slightly lower)
```

**Why spread exists:**
1. **Immediate profit** for the platform (like a casino's rake)
2. **Risk management** - Makes it harder for users to win on small moves
3. **Revenue certainty** - Platform earns regardless of win/loss outcome

**Impact on house edge:**

| Spread | Effect |
|---|---|
| 0.0001 | Very tight, almost no edge from spread |
| 0.0002 | Standard, moderate edge |
| 0.0005 | Wide, noticeable edge |
| 0.001 | Very wide, significant edge |

**Spread + Payout relationship:**
- If payout = 80% and spread = 0.0002, effective house edge increases
- Users need price to move MORE than spread to profit

---

## House Edge Algorithm

### The Core Math

**For a single binary option trade:**
```
User bets: $100
Payout: 80% (if win)
Spread: 0.0002

If user WINS:
  Platform pays: $80 profit
  User receives: $180 ($100 stake + $80 profit)
  Platform net: -$80

If user LOSES:
  Platform keeps: $100
  User receives: $0
  Platform net: +$100
```

**Break-even win rate:**
```
Break-even = 100 / (100 + Payout)
           = 100 / (100 + 80)
           = 100 / 180
           = 55.56%
```

**This means:**
- If users win < 55.56% of trades → Platform profits
- If users win > 55.56% of trades → Platform loses
- If users win exactly 55.56% → Break-even

### Real-World House Edge

**Total house edge = Spread effect + Payout effect + Behavioral effect**

**1. Spread effect (immediate edge):**
```
Spread edge = Spread / Price × 100
Example: 0.0002 / 1.08500 × 100 = 0.018%
```

**2. Payout effect (structural edge):**
```
Payout edge = (100 - Payout) / (100 + Payout) × 100
Example: (100 - 80) / (100 + 80) × 100 = 11.11%
```

**3. Behavioral edge (psychological):**
- Users tend to overtrade
- Users chase losses (martingale behavior)
- Users have poor risk management
- Users trade emotionally

**Combined effective edge:**
```
Total Edge ≈ Payout edge + Spread edge + Behavioral edge
           ≈ 11.11% + 0.02% + 5-15% (behavioral)
           ≈ 16-26%
```

### Platform Profitability Model

**Revenue sources:**
1. **Spread** (per trade)
2. **House edge** (percentage of losing trades)
3. **Volume** (more trades = more revenue)

**Cost sources:**
1. **Winning trades** (payouts)
2. **Withdrawals** (user winnings)
3. **Operations** (server, staff, etc.)

**Profit formula:**
```
Profit = (Total Volume × House Edge) - Withdrawals - Operations
```

---

## 100-User Financial Model

### User Demographics

| User Type | Count | % of Users | Behavior |
|---|---|---|---|
| **Dormant** | 40 | 40% | Registered, deposited once, never traded or traded once |
| **Casual** | 30 | 30% | Trades 1-5 times/week, small amounts |
| **Active** | 20 | 20% | Trades daily, moderate amounts |
| **VIP/Whale** | 5 | 5% | Trades large amounts, high frequency |
| **Winners** | 5 | 5% | Consistently profitable, withdraw regularly |

### Trading Activity Per User Type

| Metric | Dormant | Casual | Active | VIP | Winner |
|---|---|---|---|---|---|
| **Users** | 40 | 30 | 20 | 5 | 5 |
| **Trades/week** | 0 | 10 | 50 | 200 | 100 |
| **Avg trade size** | $0 | $25 | $100 | $500 | $200 |
| **Weekly volume** | $0 | $7,500 | $100,000 | $500,000 | $100,000 |
| **Win rate** | N/A | 48% | 52% | 45% | 65% |
| **Deposit** | $50 | $200 | $1,000 | $10,000 | $2,000 |
| **Withdrawal rate** | 0% | 30% | 50% | 70% | 90% |

### Weekly Volume Breakdown

```
Dormant:    40 users × $0        = $0
Casual:     30 users × $7,500    = $225,000
Active:     20 users × $100,000  = $2,000,000
VIP:         5 users × $500,000  = $2,500,000
Winner:      5 users × $100,000  = $500,000

TOTAL WEEKLY VOLUME: $5,225,000
```

### Revenue Calculation

**Platform has 4 revenue streams:**

#### 1. Spread Revenue (Immediate)
```
Spread = 0.0002 per trade
Average price = 1.08500 (EURUSD)
Spread % = 0.0002 / 1.08500 = 0.0184%

Weekly spread revenue = $5,225,000 × 0.0184% = $961.40
```

#### 2. House Edge Revenue (Structural)
```
Payout = 80%
House edge = (100 - 80) / (100 + 80) = 11.11%

Total losing trades = $5,225,000 × (1 - avg_win_rate)
Average win rate across all users:
  = (30×48% + 20×52% + 5×45% + 5×65%) / 60 active users
  = (14.4 + 10.4 + 2.25 + 3.25) / 60
  = 30.3 / 60
  = 50.5%

Losing trades volume = $5,225,000 × 49.5% = $2,586,375
House edge revenue = $2,586,375 × 11.11% = $287,346
```

#### 3. Spread on Winning Trades (Hidden Edge)
```
Winners need price to move MORE than spread to profit
Many winning trades are barely above spread

Estimated additional edge = 1-2% of winning volume
Winning volume = $5,225,000 × 50.5% = $2,638,625
Additional edge = $2,638,625 × 1.5% = $39,579
```

#### 4. Behavioral Edge (Psychological)
```
Users overtrade after losses (martingale)
Users chase losses with bigger bets
Users don't stop when ahead

Estimated additional edge = 3-5% of volume
Behavioral edge = $5,225,000 × 4% = $209,000
```

**Total Weekly Revenue:**
```
Spread revenue:           $961
House edge revenue:     $287,346
Hidden spread edge:      $39,579
Behavioral edge:        $209,000
─────────────────────────────────
TOTAL:                  $536,886
```

### Corrected Math — Why the Platform is Profitable

**The house edge is applied to ALL trades, not just losing ones.**

**Correct formula:**
```
For every $100 bet:
  - If user wins: Platform pays $80, net = -$80
  - If user loses: Platform keeps $100, net = +$100

Expected value per $100 bet (at 50.5% win rate):
  = (50.5% × -$80) + (49.5% × +$100)
  = -$40.40 + $49.50
  = +$9.10

House edge = $9.10 per $100 = 9.1%
```

**Corrected revenue:**
```
Total volume: $5,225,000
House edge: 9.1%
Gross revenue: $5,225,000 × 9.1% = $475,475

Spread revenue: $961 (additional)
─────────────────────────────────
TOTAL REVENUE: $476,436
```

### Key Insight: Deposit vs Withdrawal Timing

**Users deposit BEFORE trading, withdraw AFTER winning.**

**Weekly cycle:**
```
Monday:    Users deposit $18,000
Monday-    Users trade $5,225,000 volume
Friday:    Platform has gross revenue of $476,436
Friday:    Users request $55,800 in withdrawals
Weekend:   Platform processes withdrawals

Net: $476,436 - $55,800 = $420,636 profit
```

### Weekly Summary

| Metric | Amount |
|---|---|
| **Total users** | 100 |
| **Active traders** | 60 (60%) |
| **Weekly volume** | $5,225,000 |
| **House edge** | 9.1% |
| **Gross revenue** | $476,436 |
| **Withdrawals** | $55,800 |
| **Operations** | $7,000 |
| **Net profit** | $413,636 |
| **Profit margin** | 86.8% |

### Monthly Projection

| Metric | Amount |
|---|---|
| **Monthly volume** | $20,900,000 |
| **Monthly revenue** | $1,905,744 |
| **Monthly withdrawals** | $223,200 |
| **Monthly operations** | $28,000 |
| **Monthly profit** | $1,654,544 |
| **Profit margin** | 86.8% |

### Annual Projection

| Metric | Amount |
|---|---|
| **Annual volume** | $250,800,000 |
| **Annual revenue** | $22,868,928 |
| **Annual withdrawals** | $2,678,400 |
| **Annual operations** | $336,000 |
| **Annual profit** | $19,854,528 |
| **Profit margin** | 86.8% |

---

## Withdrawal Capacity Analysis

### Vault Balance Over Time

```
Week 1:
  Starting balance: $100,000 (seed)
  + Deposits: $18,000
  + Revenue: $476,436
  - Withdrawals: $55,800
  - Operations: $7,000
  Ending balance: $531,636

Week 2:
  Starting: $531,636
  + Deposits: $18,000
  + Revenue: $476,436
  - Withdrawals: $55,800
  - Operations: $7,000
  Ending balance: $963,272

Week 3:
  Starting: $963,272
  + Deposits: $18,000
  + Revenue: $476,436
  - Withdrawals: $55,800
  - Operations: $7,000
  Ending balance: $1,394,908

Week 4:
  Starting: $1,394,908
  + Deposits: $18,000
  + Revenue: $476,436
  - Withdrawals: $55,800
  - Operations: $7,000
  Ending balance: $1,826,544
```

### Withdrawal Capacity Check

```
Week 4 vault balance: $1,826,544
Outstanding liabilities (open trades): ~$500,000
Required reserve (20%): $100,000
Available for withdrawals: $1,226,544

Can cover: $1,226,544 / $55,800 = 22 weeks of withdrawals
```

---

## Risk Scenarios

### Scenario 1: VIP Wins Big
```
VIP wins $500,000 in one week
  - Platform pays: $400,000 (80% payout)
  - Additional withdrawal request: $500,000
  - Total cash out: $500,000 + $55,800 = $555,800

  Weekly profit drops from $413,636 to:
  $476,436 - $555,800 - $7,000 = -$86,364 (LOSS)

  Mitigation: Maximum trade size limits
```

### Scenario 2: All Users Withdraw
```
All users withdraw their balances
  Total user balances: ~$2,000,000
  Vault balance: $1,826,544
  Shortfall: $173,456

  Mitigation: Gradual withdrawal limits
```

### Scenario 3: New Users Stop Depositing
```
Deposits drop to $0/week
  Revenue: $476,436/week
  Withdrawals: $55,800/week
  Net: $420,636/week

  Can sustain for: $1,826,544 / $55,800 = 32.7 weeks
```

---

## Platform Profitability Safeguards

| Safeguard | Purpose | Implementation |
|---|---|---|
| **Minimum payout** | Ensure minimum edge per trade | 50% floor |
| **Maximum payout** | Cap liability per trade | 95% ceiling |
| **Maximum trade size** | Limit single-trade risk | Per-pair maxTrade |
| **Daily volume limit** | Cap total exposure | Per-pair maxDailyVolume |
| **Net exposure limit** | Prevent imbalanced risk | Per-pair exposure limit |
| **Vault reserve ratio** | Ensure withdrawal capacity | 20% minimum reserve |
| **Dynamic payout** | Adjust edge based on conditions | Time/volume/exposure-based |
| **Cool-down periods** | Prevent rapid loss chasing | Mandatory wait between trades |

---

## Summary

| Concept | Definition | Platform Impact |
|---|---|---|
| **Volatility** | Price movement magnitude | Controls excitement/risk perception |
| **Spread** | Entry price gap | Immediate platform revenue |
| **Payout %** | Win reward percentage | Structural house edge |
| **House Edge** | Mathematical advantage | Ensures long-term profitability |
| **Exposure** | Open trade imbalance | Risk management trigger |
| **Vault Reserve** | Cash reserve ratio | Withdrawal capacity保障 |

**The key insight: The platform always profits because the math is structurally in its favor.** Users can win individual trades, but over time, the house edge ensures the platform collects more than it pays out.

### Summary Metrics

| Metric | Value |
|---|---|
| **Break-even win rate** | 55.56% |
| **Actual win rate** | 50.5% |
| **House edge** | 9.1% |
| **Weekly profit per user** | $4,136 |
| **Monthly profit per user** | $16,545 |
| **Annual profit per user** | $198,545 |
| **Withdrawal coverage** | 22+ weeks |
| **Risk level** | LOW |

**The platform is profitable because:**
1. House edge ensures mathematical advantage
2. Most winnings are rebet, not withdrawn
3. Deposits provide fresh capital
4. Behavioral edges add 3-5% additional margin

**Key risk:** VIP players can cause short-term losses, but long-term math favors the platform.

---

## Next Steps

1. **Phase 1**: Schema enhancement + Admin CRUD API
2. **Phase 2**: Admin UI — full pair management
3. **Phase 3**: OTC engine hot-reload
4. **Phase 4**: Smart payout system
5. **Phase 5**: Seed script refactor (40-50 pairs)
6. **Phase 6**: Integration testing

**Total estimated effort: 9-11 hours**
