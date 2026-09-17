# Trading Engine

## Overview

NextOrx uses an OTC (Over The Counter) price engine that generates synthetic price data. All pairs are platform-generated — prices are not sourced from real markets.

## OTC Price Engine (`lib/otc-engine.ts`)

### How It Works

1. **Deterministic Generation**: Prices are generated using a seeded random walk algorithm
2. **Shared History**: All users see the same candles and prices
3. **Realistic Patterns**: Volatility, spread, and regime multipliers create realistic price action
4. **Verifiable**: Daily seeds can be verified for fairness

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Tick** | 1-second price update |
| **Candle** | Aggregated ticks (1s, 1m, 5m, etc.) |
| **Regime** | Time-based volatility multiplier |
| **Spread** | Bid-ask spread applied to price |
| **Volatility** | Price movement amplitude |

### Price Generation Flow

```
1. Engine starts with base price
2. Every 100ms: generate new tick
3. Apply regime multiplier (time-of-day)
4. Apply volatility factor
5. Apply spread
6. Store candle data
7. Broadcast to subscribed clients
```

## Candle Generation

### Timeframes

| Timeframe | Description |
|-----------|-------------|
| 1s | Real-time ticks |
| 1m | 1-minute candles |
| 5m | 5-minute candles |
| 15m | 15-minute candles |
| 1h | 1-hour candles |

### Candle Lifecycle

```
Open → Ticks accumulate → Close → New candle opens
```

When a candle closes:
1. Final price recorded
2. `candle:close` message broadcast
3. New candle opens at close price

## Trade Lifecycle

### States

```
ACTIVE → SETTLED (WON or LOST)
```

### Trade Flow

1. **Placement**
   - User selects pair, direction (UP/DOWN), amount, duration
   - Open price captured from current engine price
   - Trade stored with `ACTIVE` status

2. **Active**
   - Trade timer counts down
   - Real-time PnL displayed to user
   - Price continues to tick

3. **Settlement**
   - Timer expires
   - Settlement worker picks up expired trades
   - Close price determined by engine
   - Compare open vs close price:
     - UP trade: close > open → WON
     - DOWN trade: close < open → WON
     - Otherwise → LOST

4. **Payout**
   - WON: credit (amount × payoutPercent) to balance
   - LOST: stake kept by platform
   - Ledger entry created

### Settlement Worker (`lib/settlement-worker.ts`)

- Polls for expired ACTIVE trades every 1 second
- Processes trades in batches of 100
- Handles edge cases (missing prices, DB errors)
- Can be paused/resumed by admin

## Vault and Payout System

### Vault (`lib/vault.ts`)

Tracks platform financial health:

| Metric | Description |
|--------|-------------|
| `activeExposure` | Total amount in active trades |
| `availableReserve` | Funds available for payouts |
| `reservePercent` | Reserve as % of total balance |
| `coverageWeeks` | Weeks of reserve coverage |

### Payout Calculation (`lib/payout.ts`)

Dynamic payout based on:
- Base payout percent (configured per pair)
- Current exposure (high exposure = lower payout)
- Reserve health (low reserve = lower payout)
- Time-of-day adjustments

```
finalPayout = basePayout × exposureFactor × reserveFactor
```

### Double-Entry Ledger (`lib/ledger.ts`)

Every financial operation creates ledger entries:
- Trade placement (debit balance)
- Trade win (credit balance)
- Deposit (credit balance)
- Withdrawal (debit balance)
- Admin adjustment (credit/debit)

## Verification System

### Provably Fair

Users can verify:
1. **Seed Hash** (`/api/market/seed/hash`): SHA-256 hash of daily seed
2. **Seed Reveal** (`/api/market/seed/reveal`): Actual seed after day ends
3. **Regime Multipliers** (`/api/market/verify/regime`): Volatility schedule
4. **Download** (`/api/market/verify/download`): Full verification data

### Verification Flow

```
1. Before day starts: hash of seed published
2. During day: prices generated using seed
3. After day ends: seed revealed
4. Users can verify: hash(revealed_seed) === published_hash
```

## WebSocket Protocol

### Price Streaming

1. Client subscribes to pair
2. Server sends `snapshot` with current state
3. Server streams `tick` messages (every 100ms)
4. Server sends `candle:close` when candle completes
5. Client unsubscribes when switching pairs

### Message Formats

```json
// Subscribe
{ "type": "subscribe", "pairId": "EURUSD" }

// Snapshot
{ "type": "snapshot", "pairId": "EURUSD", "price": 1.1620, "candle": {...} }

// Tick
{ "type": "tick", "pairId": "EURUSD", "price": 1.1621, "timestamp": 1234567890 }

// Candle Close
{ "type": "candle:close", "pairId": "EURUSD", "candle": { "open": 1.1620, "close": 1.1625, ... } }
```

## Pair Management

### Admin Controls

- Create/edit/delete pairs
- Toggle active/inactive status
- Adjust payout percentages
- Set volatility and spread
- Configure trading hours

### Pair Categories

| Category | Examples |
|----------|----------|
| Forex Majors | EURUSD, GBPUSD, USDJPY |
| Forex Exotics | USDMXN, USDZAR, USDTRY |
| Crypto | BTCUSD, ETHUSD, SOLUSD |
| Commodities | XAUUSD, XAGUSD, USOIL |
| Stocks | AAPL, MSFT, TSLA |
