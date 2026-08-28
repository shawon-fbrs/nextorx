# Nextorx — Binary Options Trading Platform

A full-stack binary options trading platform with a Quotex-style trader frontend and admin console panel.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| UI | React 19, TailwindCSS 4 |
| Charts | Recharts (admin), Lightweight Charts (trader — planned) |
| State | React hooks (useState, useContext) |
| Package Manager | pnpm |

## Project Structure

```
nextorx/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Trader frontend (main trading page)
│   ├── layout.tsx                # Root layout (Roboto font)
│   ├── globals.css               # TailwindCSS v4 theme config
│   ├── components/               # Trader frontend components
│   │   ├── Header.tsx            # Top nav (balance, notifications, level)
│   │   ├── Sidebar.tsx           # Collapsible left sidebar
│   │   ├── AssetTabs.tsx         # Floating asset tabs + add dropdown
│   │   ├── Chart.tsx             # SVG candlestick chart + toolbar + fullscreen
│   │   └── TradingPanel.tsx      # Right panel (trade controls, history)
│   ├── lib/                      # Shared types & utilities
│   │   └── types.ts              # Trade, SymbolDef, Candle, 35 SYMBOLS
│   └── console-panel/            # Admin panel
│       ├── op/page.tsx           # Admin login
│       └── (dashboard)/          # Admin dashboard (with layout)
│           ├── layout.tsx        # Admin layout (sidebar + header)
│           ├── page.tsx          # Dashboard (stats + charts)
│           ├── users/page.tsx    # Users list with data table
│           ├── users/[id]/page.tsx # User detail
│           ├── trades/page.tsx   # Trades (placeholder)
│           ├── finance/page.tsx  # Finance (placeholder)
│           ├── otc/page.tsx      # OTC Pairs (placeholder)
│           ├── reports/page.tsx  # Reports (placeholder)
│           └── settings/page.tsx # Settings (placeholder)
├── components/                   # Shared components
│   └── admin/                    # Admin UI components
│       ├── layout/
│       │   ├── sidebar.tsx       # Admin sidebar navigation
│       │   └── header.tsx        # Admin top header
│       └── ui/                   # Reusable UI primitives
│           ├── button.tsx        # Button (primary/secondary/danger/ghost/outline)
│           ├── input.tsx         # Input with label/error/icon
│           ├── badge.tsx         # Status badges (success/warning/danger/info)
│           ├── card.tsx          # Card container components
│           ├── stats-card.tsx    # Stats card with change indicator
│           ├── data-table.tsx    # Simple data table with pagination
│           ├── dialog.tsx        # Modal dialog
│           ├── dropdown-menu.tsx # Dropdown menu
│           ├── search-input.tsx  # Search input with icon
│           └── file-upload.tsx   # Drag & drop file upload
└── lib/                          # Utilities
    ├── utils.ts                  # cn(), formatCurrency(), etc.
    └── mock-data/
        ├── users.ts              # 20 mock users
        ├── trades.ts             # 15 mock trades
        └── stats.ts              # Dashboard stats & chart data
```

## Clone

```bash
git clone git@github.com:shawon-fbrs/nextorx.git
cd nextorx
```

```bash
# Install dependencies
pnpm install

# Run development server
pnpm run dev

# Build for production
pnpm run build

# Start production server
pnpm start
```

## Routes

### Trader Frontend
- `/` — Main trading page with chart, assets, and trading panel

### Admin Console
- `/console-panel/op` — Admin login (demo: admin@nextorx.com / admin123)
- `/console-panel` — Dashboard with stats and charts
- `/console-panel/users` — User management
- `/console-panel/users/[id]` — User detail view
- `/console-panel/trades` — Trade monitoring (placeholder)
- `/console-panel/finance` — Deposits & withdrawals (placeholder)
- `/console-panel/otc` — OTC pair management (placeholder)
- `/console-panel/reports` — Analytics & reports (placeholder)
- `/console-panel/settings` — Platform settings (placeholder)

## Design System

### Color Theme (Dark — Quotex Style)
```css
--background: #1a1e28
--surface: #242a38
--border: #31394c
--green: #00c365
--red: #ff4954
--blue: #007aff
--orange: #ff8c00
```

### TailwindCSS v4 Theme
Configured in `globals.css` via `@theme inline` block. NOT using `tailwind.config.js`.

### Component Conventions
- All components with React hooks must have `'use client'` directive
- Use `cn()` helper from `@/lib/utils` for conditional classes
- Use `ReactNode` not `JSX.Element` (React 19 / TS5 compatibility)
- No `Math.random()` during render — use `useEffect` + `mounted` state

## Team Ownership

| Area | Owner | Routes |
|------|-------|--------|
| **Admin Console** | Shawon + AI | `/console-panel/*` |
| **Trader Frontend** | Other members | `/` |

## Team Guidelines

### Branch Naming
- `feat/feature-name` — New features
- `fix/bug-description` — Bug fixes
- `refactor/component-name` — Refactoring
- `docs/update-description` — Documentation

### Commit Messages
```
feat: add trade monitoring page
fix: chart toolbar alignment
refactor: extract shared UI components
docs: update README with team guidelines
```

### Development Workflow
1. Pull latest `main`
2. Create feature branch: `git checkout -b feat/your-feature`
3. Make changes, ensure `pnpm run build` passes
4. Commit with clear message
5. Push and create PR to `main`

### Key Rules
- **No comments** in code unless explicitly asked
- **Run `pnpm run build`** before committing — must compile
- **Follow existing patterns** — check neighboring files for conventions
- **No `src/` directory** — all files at root level
- **Use existing UI components** from `components/admin/ui/` before creating new ones

### Adding New Pages
1. Create page file in `app/console-panel/(dashboard)/your-page/page.tsx`
2. Add nav item in `components/admin/layout/sidebar.tsx`
3. Use existing UI components (Card, DataTable, Badge, etc.)
4. Add mock data in `lib/mock-data/` if needed

### Adding New Components
1. Place in `components/admin/ui/` for shared components
2. Follow existing patterns (Button, Input, Card)
3. Use `forwardRef` for form components
4. Export with `export type` for TypeScript types (isolatedModules)

## Placeholder Pages Status

| Page | Status | Priority |
|------|--------|----------|
| Dashboard | ✅ Done | — |
| Users List | ✅ Done | — |
| User Detail | ✅ Done | — |
| Trades | 🔲 Placeholder | High |
| Finance | 🔲 Placeholder | High |
| OTC Pairs | 🔲 Placeholder | Medium |
| Reports | 🔲 Placeholder | Medium |
| Settings | 🔲 Placeholder | Low |
| KYC Workflow | 🔲 To Build | High |
| Audit Logs | 🔲 To Build | Medium |
