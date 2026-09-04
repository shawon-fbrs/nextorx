# Nextorx — Industry-Grade Implementation Plan

**Version:** 2.0
**Date:** 2026-09-04
**Status:** Active — supersedes v1.0
**Strategy:** Two-track — Launch in 8 months, harden to industry-grade in parallel (18 months total)

---

## Table of Contents

1. [Honest Reassessment of v1.0](#1-honest-reassessment-of-v10)
2. [Maturity Model](#2-maturity-model)
3. [Executive Summary — Two-Track Strategy](#3-executive-summary--two-track-strategy)
4. [Current State (Summary)](#4-current-state-summary)
5. [Track A — Production-Ready Launch (Months 1-8)](#5-track-a--production-ready-launch-months-1-8)
6. [Track B — Harden to Industry-Grade (Months 1-18)](#6-track-b--harden-to-industry-grade-months-1-18)
7. [Target Architecture v2](#7-target-architecture-v2)
8. [Technical Specification Deltas](#8-technical-specification-deltas)
9. [Compliance Path](#9-compliance-path)
10. [Security Requirements (Split by Track)](#10-security-requirements-split-by-track)
11. [Infrastructure Requirements (Split by Track)](#11-infrastructure-requirements-split-by-track)
12. [Quality Gates](#12-quality-gates)
13. [Team, Budget, Ownership](#13-team-budget-ownership)
14. [Success Metrics](#14-success-metrics)
15. [Risk Management](#15-risk-management)
16. [Decision Log](#16-decision-log)

Related docs: `OTC-PAIR-MANAGEMENT-PLAN.md`, `COMPLETE-PLATFORM-AUDIT.md`, `PROJECT.md`, `AUTH-IMPROVEMENT-PLAN.md`

---

## 1. Honest Reassessment of v1.0

v1.0 of this plan (34 weeks, "9.5/10 industry-grade") was overstated. It is accurately rated:

| Plan | Rating | What it actually delivers |
|------|--------|---------------------------|
| v1.0 as written | **7/10 — production-ready first launch** | Working product, basic security, manual ops |
| True industry-grade | **9.5/10** | Calibrated quant engine, durable settlement, audited security, licensed compliance, multi-region ops |

Why v1.0 falls short of industry-grade:

1. **OTC engine is uncalibrated.** O-U + GARCH formulas without parameter estimation from real tick data is "looks realistic", not "statistically valid". Industry platforms spend 3-6 months with a quant calibrating against 10 years of data + backtests + KS/ADF tests.
2. **Settlement worker is still fragile.** A `setInterval` poller dies on restart and loses in-flight trades. Industry-grade is a persistent job queue (BullMQ + Redis) with dead-letter queue, retries, reconciliation.
3. **Ledger has no reconciliation pipeline.** Checksum chain is necessary but not sufficient. Industry-grade reconciles hourly automatically and pages on a $0.01 mismatch.
4. **Security stops at basics.** Rate limiting + auth is anti-script-kiddie, not anti-fraud-ring. Missing: third-party pentest, WAF tuning, bug bounty, SOC 2.
5. **Compliance lists features, not a program.** Real compliance = legal counsel + compliance officer + license + regulator reporting + ongoing monitoring.
6. **Timeline ignores legal/quant lead times.** License applications (3-12 months) and quant calibration (3-6 months) cannot be compressed into dev sprints.

**Correction adopted in v2.0:** Track A ships a production-ready product in 8 months. Track B hardens it to industry-grade over 18 months, running in parallel from day one.

---

## 2. Maturity Model

Use this scale in all status updates. No more "industry-grade" without a level number.

| Level | Name | Definition | Example |
|-------|------|------------|---------|
| L1 | Prototype | Works on localhost, no auth, no money | Demo |
| L2 | Current state | Real stack, most user paths broken (we are here) | **2.5/10** |
| L3 | Production-ready launch | End-to-end works, basic security, manual ops, single region | **7/10 — Track A target** |
| L4 | Hardened | Durable jobs, monitored, audited once, licensed in 1 jurisdiction | 8.5/10 |
| L5 | Industry-grade | Calibrated engine, zero-loss settlement, SOC 2, multi-region, 99.9% SLA | **9.5/10 — Track B target** |

Rules:
- Never claim L5 without passing the Industry-Grade Gate (Section 12).
- Launch requires passing the Launch Gate (Section 12), which is L3.
- Investor updates must state current level explicitly.

---

## 3. Executive Summary — Two-Track Strategy

### Vision (unchanged)

Build a regulated, bank-grade binary options platform. Get to revenue fast without lying about readiness.

### The two tracks

```
Month:  1   2   3   4   5   6   7   8           12          18
        |---|---|---|---|---|---|---|-------------|------------|
Track A ████████████████████████████████████████
        A1  A2      A3          A4          A5          A6
        Fix Engine  Finance   Comply-min  Admin/Ops   Scale-min
                                         LAUNCH ─────▶
Track B ████████████████████████████████████████████████████████████
        B1 quant ──────────────────────▶
        B2 settlement ──────────▶
        B3 security ────────────────────────▶
        B4 compliance ───────────────────────────────────▶
        B5 ops/SRE ────────────────────▶
                                                     L5 ─▶
```

- **Track A (Months 1-8):** Ship L3. OTC-only trading, manual finance ops, minimum compliance to operate under Vanuatu/St. Vincent, single region. Budget: $200k-300k.
- **Track B (Months 1-18):** Harden to L5 in parallel. Quant calibration, BullMQ settlement, pentest + SOC 2, full license, multi-region + DR. Budget: additional $250k-400k.
- **Total: 18 months, $450k-700k** for true L5. Track A is cash-flow positive early to fund Track B.

### Non-goals for Track A (explicit)

- No calibrated quant engine (uses sensible hand-tuned params, documented as uncalibrated).
- No P2P matching / order book (platform is counterparty; exposure caps contain risk).
- No multi-region / auto-failover.
- No SOC 2, no bug bounty.
- No CySEC license (Vanuatu/St. Vincent first).

---

## 4. Current State (Summary)

Full audit lives in `COMPLETE-PLATFORM-AUDIT.md` and `OTC-PAIR-MANAGEMENT-PLAN.md`. Summary:

**Works:** Prisma schema, better-auth + 2FA, RBAC, admin dashboard/users/trades, OTC pair CRUD (just shipped), basic ledger/vault.

**Broken (must fix in Track A):** Chart API path, 2FA toggle path, deposit/withdraw user endpoints, OAuth verification bypass, settings persistence, treasury shape, setTimeout settlement, non-atomic trade creation, unauthenticated WebSocket, dead login-security module, missing middleware, unenforced limits, ledger-bypassing demo balance, empty-DB OTC crash.

**Missing (split):** Track A adds minimum KYC, manual finance review, rate limiting, monitoring basics. Track B adds calibration, BullMQ, pentest, full KYC/AML provider, responsible-gambling suite, multi-region.

Current level: **L2 (2.5/10).**

---

## 5. Track A — Production-Ready Launch (Months 1-8)

Goal: L3. Every user path works, money is safe under normal conditions, ops can run the business manually.

### A1: Foundation Repair (Weeks 1-3)

Same as v1.0 Phase 1. No changes except explicit acceptance: all P0 audit items closed.

- Fix Chart `/api/pairs/` → `/api/market/pairs`, 2FA toggle path, public payment-methods endpoint.
- OAuth must check `emailVerified` + 2FA before session issue.
- Trade creation + debit in `$transaction`. Demo balance via ledger. Account deletion in `$transaction`.
- `middleware.ts` rate limiting. WebSocket session check. Verify-email rate limit + constant-time compare.
- OTC engine must boot with zero pairs (empty state, no crash).
- Exit criteria: happy-path E2E (register → verify → deposit → trade → settle → withdraw request → admin approve) passes on staging.

### A2: Trading Engine — Sensible Defaults (Weeks 4-8)

Ship the v1.0 O-U/GARCH/smart-payout code **labeled uncalibrated**:

- `lib/market-maker.ts` with hand-tuned per-category defaults (forex 0.3-0.8, crypto 1.5-3.0, etc.).
- Document params as `UNCALIBRATED — Track B will fit via MLE` in code + admin UI tooltip.
- DB-polling settlement worker (1s tick, batch 100, 3 retries) as stepping stone to BullMQ. Add startup reconciliation: on boot, settle any `ACTIVE` trades past `settleAt`.
- Price snapshot on open + close on every trade. Enforce `maxPayout`, `betLimitDaily`, duration 30s-3600s, idempotency key against double-submit.
- Smart payout: weekend rate + peak-hour −2 + vault-health adjustment + volume adjustment, clamped 50-95.
- Exit criteria: 10k trades on staging settle with zero orphans across 3 forced restarts.

### A3: Financial Infrastructure — Manual-Grade (Weeks 9-14)

- Double-entry ledger with checksum chain (v1.0 spec). All money movement via `credit`/`debit`/`releaseHold`.
- Vault with 20% reserve rule enforced in code: block withdrawals/payout increases that breach it.
- Multi-currency **deferred to Track B** unless a provider is already signed. Track A supports USD base + crypto deposits via one provider only.
- Daily P&L report endpoint + treasury dashboard showing: balance, exposure, pending withdrawals, reserve ratio, withdrawal coverage (weeks).
- Exit criteria: ledger integrity check passes on 1M-row staging dataset; manual withdrawal flow completes in <24h.

### A4: Minimum Compliance (Weeks 15-20, scoped down)

Track A ships the minimum to operate + open Track B license application in week 1:

- KYC Tiers 0-1 only: email + phone + ID upload stored encrypted, manual admin approve/reject. Tiers 2-3 and provider integration (Sumsub) are Track B.
- Responsible gambling minimum: self-exclusion (24h-6mo), daily deposit limit, session timer. Loss limits + reality checks + cool-down are Track B.
- GDPR minimum: data export endpoint, account deletion with 7-yr financial retention note, privacy policy + cookie consent.
- License application for Vanuatu or St. Vincent filed by end of month 2 (Track B owns follow-through).
- Exit criteria: counsel confirms Track A feature set is operable under target jurisdiction with disclosures shown.

### A5: Admin + Ops Minimum (Weeks 21-26)

- Finish admin gaps: user detail ban button, withdrawal review UI, KYC review UI, payment-method UI, trade cancel, settings persistence, health endpoint (`/api/health`: db, ws, engine, settlement backlog).
- Monitoring minimum: Sentry + structured JSON logs + uptime check + treasury-low and settlement-backlog alerts (Slack/email). Prometheus/Grafana/PagerDuty are Track B.
- Backups: daily full + hourly WAL, tested restore monthly. Cross-region + PITR drills are Track B.
- CI/CD: staging → production pipeline, migration gate, smoke tests.
- Exit criteria: runbook covers top 10 incidents; restore test succeeds; deploy takes <15 min with rollback.

### A6: Scale Minimum + Launch (Weeks 27-34)

- Redis for sessions/pair cache, single-region read replica, CDN for static, PWA basics. Redis PubSub multi-server WS and auto-scaling are Track B (Track A runs max 2 app servers with sticky WS documented as limitation).
- Load test to 10k concurrent users; fix p95 API <200ms, settlement lag <2s.
- Competitive features deferred: social trading, real tournaments, signals are post-L3 roadmap, not launch blockers.
- **Launch Gate (Section 12) must pass before public traffic.**

---

## 6. Track B — Harden to Industry-Grade (Months 1-18)

Five workstreams, each with owner, deliverable, and done-definition. Start all in month 1-2; they finish at different times.

### B1: Quantitative Research (Months 1-9) — Owner: Quant / Data

Problem: Track A engine is hand-tuned. L5 requires calibrated, validated, regulator-explainable pricing.

Deliverables:
1. Tick dataset: 10yr forex majors, 5yr crypto/commodities/indices (licensed vendor).
2. Parameter estimation: MLE fit of O-U theta/mu/sigma + GARCH omega/alpha/beta per pair category + session multipliers per venue hour.
3. Validation suite: KS test vs real returns, ADF stationarity, volatility-clustering check, spread-impact test. Must run in CI on engine changes.
4. Calibration report: methodology + params + test results, versioned per engine release (regulator artifact).
5. Admin exposure: per-pair calibrated params locked behind `risk:calibrate` permission; changes require report version bump.

Done when: engine passes validation suite + report signed off + params deployed behind feature flag with rollback.

Cost: $50k-100k (data license + quant contract).

### B2: Durable Settlement (Months 2-6) — Owner: Backend

Problem: polling worker loses jobs on crash. L5 requires guaranteed exactly-once settlement.

Deliverables:
1. BullMQ + Redis: `settle-trade` jobs with persistence, exponential backoff, dead-letter queue.
2. Exactly-once: job id = trade id, DB unique constraint on settlement, idempotent handler.
3. Hourly auto-reconciliation: compare open trades vs engine clock, alert + auto-heal; daily ledger-vs-trades reconciliation report.
4. Circuit breaker: auto-pause new trades if backlog > N or lag > S seconds; auto-resume with admin override logged.
5. Manual review dashboard for DLQ with retry/void actions (all audited).

Done when: chaos test (kill server mid-settlement × 10) yields zero lost/double-settled trades.

Cost: $20k-30k.

### B3: Security Hardening (Months 2-12) — Owner: Security

Deliverables:
1. OWASP Top 10 pentest by third party (pre-launch + annually). All criticals fixed before L5 sign-off.
2. WAF + bot management tuned (Cloudflare Pro → Business/Enterprise as volume grows).
3. WS message signing + replay protection; secrets in vault (not env files); key rotation runbook.
4. SOC 2 Type I (L5 requirement), Type II roadmap.
5. Bug bounty (post-launch, scoped) + disclosure policy.

Done when: pentest clean (no critical/high open) + SOC 2 Type I report issued.

Cost: $30k-50k + SOC 2 audit fees.

### B4: Compliance Program (Months 1-18) — Owner: Compliance + Counsel

Deliverables:
1. License: Vanuatu/St. Vincent grant (months 3-6), CySEC application started month 6+ (6-12mo track).
2. KYC/AML provider (Sumsub/Jumio): tiers 0-3, PEP/sanctions screening, source-of-funds, ongoing monitoring, SAR workflow.
3. Responsible gambling full suite: loss limits, reality checks, cool-down enforcement, activity statements, regulator reports.
4. Data protection: DPA chain, DPO, retention automation, breach notification drill.
5. Policy docs versioned: terms, privacy, RG policy, AML manual.

Done when: license granted in 1 jurisdiction + provider live + counsel signs L5 compliance memo.

Cost: $100k-300k depending on jurisdiction (see Section 9).

### B5: Operations / SRE (Months 3-14) — Owner: Platform

Deliverables:
1. Multi-region active-passive (DB + app), RPO ≤ 1h financial / RTO ≤ 4h.
2. Redis PubSub WS fan-out (no sticky sessions), autoscaling on CPU + WS connections + settlement lag.
3. Prometheus + Grafana + PagerDuty with SLOs: 99.9% uptime, p95 API <200ms, settlement lag <1s.
4. Load test to 100k concurrent; capacity model per 10k users with cost table.
5. Incident program: on-call rotation, blameless postmortems, quarterly DR drill.

Done when: DR drill passes + 100k load test passes + 90-day SLO burn within budget.

Cost: $30k-50k + infra uplift.

---

## 7. Target Architecture v2

Track A (L3, single region):

```
Cloudflare → ALB → Next.js ×2 (sticky WS) → PostgreSQL (1 primary + 1 replica)
                                              → Redis (sessions/cache)
                                              → S3 (KYC docs, encrypted)
Settlement: in-app poller (1s) + startup reconciliation
Monitoring: Sentry + logs + uptime + Slack alerts
```

Track B upgrades to L5 (diff only):

```
- Sticky WS → Redis PubSub fan-out (any server serves any client)
- Poller → BullMQ durable queue + DLQ + reconciliation jobs
- Single region → active-passive multi-region, automated failover drill
- Logs → Prometheus/Grafana/PagerDuty + SLO dashboards
- Manual backups → PITR + cross-region + quarterly DR test
- Env secrets → vault with rotation
```

Rule: every Track A shortcut must have a Track B ticket filed before launch, linked in code comment (`TRACK-B: <id>`).

---

## 8. Technical Specification Deltas

v1.0 specs for market-maker, settlement worker, ledger, payout, rate limiting are adopted for Track A with these corrections:

1. **Market maker:** add `calibrationVersion` + `uncalibrated: true` flag to every pair config. Validation suite (B1) blocks promotion to calibrated.
2. **Settlement:** Track A poller must include startup reconciliation + backlog metric + pause switch. Replaceable by BullMQ handler with identical function signature (design for swap).
3. **Ledger:** add `reversalOfId` nullable field for error correction (append-only reversals, never updates). Hourly integrity job is Track B; Track A runs it daily via cron.
4. **Payout:** cap weekend/peak/volume adjustments so combined reduction ≤ 10 points; log every adjustment with reason (auditable).
5. **Rate limiting:** move from in-memory Map to Redis in A6 (multi-server correctness). Ship in-memory only if single-server flag is on, with warning banner in admin.

---

## 9. Compliance Path

| Jurisdiction | Regulator | Capital | Timeline | Role in plan |
|-------------|-----------|---------|----------|--------------|
| St. Vincent | FSA | ~$10k | 2-4 mo | Fastest launch cover |
| Vanuatu | VFSC | ~$50k | 3-6 mo | **Recommended Track A license** |
| Mauritius | FSC | ~$25k | 4-6 mo | Alternative |
| Cyprus | CySEC | ~€200k | 6-12 mo | **Track B EU target** |

Track A: file Vanuatu (or St. Vincent if speed critical) by end of month 2. Operate with disclosures + Tier 0-1 KYC + RG minimum.
Track B: engage counsel month 1, run full KYC/AML provider + RG suite, start CySEC month 6+.

KYC tiers (unchanged from v1.0): T0 email ($1k/$500), T1 +phone ($10k/$5k), T2 +ID/selfie ($100k/$50k), T3 +PoA/SoF (unlimited). Tiers 2-3 provider-verified in Track B.

---

## 10. Security Requirements (Split by Track)

Track A must-ship: 12+ char passwords, bcrypt, 30-min session, 2FA for withdrawals + admins, login lockout (wire `lib/login-security.ts`), Zod on all mutations, Prisma-only queries, CSP + HSTS + X-Frame-Options, SameSite cookies, CORS allowlist, rate limits (login 5/15min, register 3/hr, trades 10/min, withdraw 3/hr, verify 3/5min), WS session check, audit log on all financial + admin actions, no debug endpoints, no default secrets.

Track B adds: pentest clean, WAF/bot tuning, WS signing, vault secrets + rotation, immutable SIEM audit copy, SOC 2 Type I, bug bounty.

---

## 11. Infrastructure Requirements (Split by Track)

Track A: 2× t3.large app, RDS db.r6g.large + replica, ElastiCache large, S3 + Cloudflare Pro, ALB, daily full + hourly WAL backups, staging env, CI/CD. Cost: $0.5k-1k/mo (0-1k users) → $2k-5k/mo (1-10k).

Track B: multi-region passive, PubSub WS, autoscaling, PITR + cross-region + DR drills, full observability. Cost: $10k-30k/mo (10-100k) → $30k-100k/mo (100k+). Capacity model required before crossing each band.

---

## 12. Quality Gates

### Launch Gate (L3 — must pass for public traffic)

- [ ] Zero P0 audit items open; pentest-lite (automated ZAP, no criticals).
- [ ] E2E happy path green on staging + 10k-trade restart test with zero orphans.
- [ ] Ledger integrity check green on staging dataset.
- [ ] Reserve rule enforced in code + tested (withdrawal blocked when breach).
- [ ] Rate limits + WS auth + audit logging verified.
- [ ] Backup restore drill succeeded within RTO.
- [ ] Counsel written confirmation for target jurisdiction.
- [ ] Runbook + on-call + rollback tested.
- [ ] All Track A shortcuts have Track B tickets.

### Industry-Grade Gate (L5 — must pass to claim industry-grade)

- [ ] B1 validation suite green + calibration report signed.
- [ ] B2 chaos tests green (10 kills, zero loss/double-settle) + reconciliation 30 days clean.
- [ ] Third-party pentest: zero critical/high open + SOC 2 Type I issued.
- [ ] License granted + KYC/AML provider live + RG suite verified + DPO appointed.
- [ ] DR drill passed + 100k load test passed + 90-day SLOs met (99.9%).
- [ ] Bug bounty live ≥ 90 days with triage SLA met.

---

## 13. Team, Budget, Ownership

### Recommended staffing

| Role | Track A | Track B add |
|------|---------|-------------|
| Full-stack (Next.js/Prisma) | 2-3 | — |
| Backend (settlement/ledger) | 1 | +1 (jobs/infra) |
| Frontend (trader UX) | 1 | — |
| Quant | — | 1 contract (B1) |
| Security | part-time review | 1 + external pentest |
| Compliance/counsel | part-time | 1 officer + law firm |
| DevOps/SRE | 1 part-time | 1 |
| QA | 1 | + automation |

### Budget

| Item | Track A (8 mo) | Track B (to mo 18) |
|------|----------------|---------------------|
| Engineering | $150k-200k | $80k-120k |
| Quant + data | — | $50k-100k |
| Security + SOC 2 | $5k-10k | $30k-50k |
| License + counsel | $10k-20k (filing) | $100k-300k |
| Infra | $5k-15k | $30k-80k |
| **Total** | **$200k-300k** | **+$250k-400k → $450k-700k combined** |

Fund Track B from Track A revenue: at 100 active users the desk model projects ~$430k/week net of processing (see `OTC-PAIR-MANAGEMENT-PLAN.md` with cost corrections in team discussion 2026-09-04). Even at 10% of projection, payback is within one quarter post-launch.

### RACI (abridged)

| Decision | Responsible | Accountable | Consulted | Informed |
|----------|-------------|-------------|-----------|----------|
| Launch go/no-go | Eng lead | Founder | Counsel | All |
| Payout param change | Risk | Founder | Quant (B) | Support |
| License jurisdiction | Counsel | Founder | Finance | All |
| Security exception | Security | Founder | Eng | All |
| L5 claim | Eng + Compliance | Founder | Auditor | Investors |

---

## 14. Success Metrics

Track A (L3) targets at 90 days post-launch: uptime ≥ 99.5%, p95 API <300ms, settlement lag p95 <2s, zero lost trades, error rate <0.5%, test coverage ≥ 60% critical paths, withdrawal SLA <24h, support <20 tickets/day @1k users.

L5 targets: uptime 99.9%, p95 API <200ms, WS tick <50ms, settlement lag p95 <1s, error rate <0.1%, coverage ≥ 80% unit / 70% integration + critical E2E, zero critical/high pentest findings, 100% RG/KYC feature checklist, NPS > 4.5.

Business/compliance metrics unchanged from v1.0 except margins: report **60-80% net of processing/chargebacks/compliance**, not 86.8% gross.

---

## 15. Risk Management

Top risks added for two-track:

| Risk | Track | Mitigation |
|------|-------|------------|
| Track A shortcuts become permanent | Both | `TRACK-B` code tags + gate item + monthly debt review |
| Quant data delayed | B1 | Start procurement week 1; hand-tuned fallback documented |
| License delayed | B4 | File early; St. Vincent fallback; geo-fence unlicensed traffic |
| Settlement loss before BullMQ | A2/B2 | Startup reconciliation + backlog alert + pause switch; prioritize B2 |
| VIP drain before exposure caps tuned | A2/A3 | Conservative per-pair exposure + daily volume caps at launch |
| Key-person dependency | Both | Docs + cross-training + onboarding checklist (Section 10 of v1.0 retained in team handbook) |

Technical/business/operational risk tables from v1.0 remain valid and are not duplicated here.

---

## 16. Decision Log

| Date | Decision | Rationale | Owner |
|------|----------|-----------|-------|
| 2026-09-04 | Adopt two-track (v2.0 supersedes v1.0) | v1.0 overstated readiness; need honest L3→L5 path | Founder |
| 2026-09-04 | Launch OTC-only, platform as counterparty | P2P/order book deferred; exposure caps contain risk | Founder |
| 2026-09-04 | Vanuatu first, CySEC later | Speed to revenue + EU optionality | Counsel |
| 2026-09-04 | Report 60-80% net margins, not 86.8% | v1.0 model omitted processing/chargebacks/compliance | Finance |
| 2026-09-04 | Pairs are admin-created, no auto-seed | Owner directive; seed keeps category defaults only | Eng |
| TBD | Quant vendor selection | — | Quant |
| TBD | KYC provider (Sumsub vs Jumio) | — | Compliance |
| TBD | Launch go/no-go | Requires Launch Gate pass | Founder |

---

## Appendix — Retained from v1.0

File structure, API endpoint inventory, key Prisma models, code-quality/testing/performance standards, team workflow/communication/docs/onboarding from v1.0 remain in force except where this document overrides timeline, staffing, or scope. Do not re-introduce removed scope (P2P, tournaments, social) as launch blockers without a new decision-log entry.

---

**Document History**

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-09-03 | Initial 34-week single-track plan |
| 2.0 | 2026-09-04 | Honest reassessment; L1-L5 maturity model; two-track A (L3 launch, 8mo) + B (L5 harden, 18mo); gates; corrected margins; RACI; decision log |

**Single source of truth for Nextorx execution. All members read before starting work. Review weekly.**
