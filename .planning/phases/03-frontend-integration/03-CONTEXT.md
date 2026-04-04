# Phase 3: Frontend Integration - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Render Saxo positions and account data in the existing portfolio and settings UI, enriched with TA signals for mapped instruments and updated via 60-second polling. This is a frontend phase consuming existing backend endpoints (`/api/saxo/portfolio/positions`, `/api/saxo/portfolio/balance`, `/api/saxo/portfolio/performance`, `/api/saxo/auth/status`, `/api/saxo/auth/connect`).

Yahoo Finance replacement (Saxo as sole data source for TA) is deferred — unmapped instruments are a transitional state.

</domain>

<decisions>
## Implementation Decisions

### Tab Structure
- **D-01:** Tabbed view on the portfolio page — two tabs: "Manual Positions" and "Saxo Positions". Each tab has its own summary cards and position table.
- **D-02:** Saxo tab has its own summary cards: Account Value, Cash Balance, Day P&L, Total P&L — populated from `/portfolio/balance` and `/portfolio/performance` endpoints.
- **D-03:** Saxo Positions tab is the default active tab (Saxo is becoming the primary data source per Phase 1 D-01).
- **D-04:** When Saxo is not connected, the Saxo tab shows a friendly connect prompt ("Connect your Saxo account to see your positions") with a button linking to settings.

### Unmapped Instruments
- **D-05:** Unmapped positions (`mapped: false`) display inline in the same table as mapped positions — no separate section.
- **D-06:** Signal column shows a muted dash ("—") instead of a SignalBadge for unmapped positions. Price and P&L from Saxo display normally.
- **D-07:** Unmapped positions are static rows — not clickable/linked to stock detail page (which relies on Yahoo data). This is a transitional state until Yahoo Finance is replaced by Saxo.
- **D-08:** Mapped positions (`mapped: true`) link to the existing stock detail page and show full SignalBadge with TA signals.

### Claude's Discretion
- Settings page "Brokerage Connections" section layout and UX (connect/disconnect flow)
- Connection status badge design and placement
- 60-second polling implementation (silent background refresh)
- Tab component design (existing pattern or new)
- Loading and error states for Saxo data
- Position table column layout and responsive design
- Saxo summary card styling (consistent with existing manual portfolio cards)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 1 & 2 Foundation
- `.planning/phases/01-auth-infrastructure/01-CONTEXT.md` — OAuth architecture, SaxoClient design, token security (D-05 through D-14)
- `.planning/phases/02-portfolio-data/02-CONTEXT.md` — Service architecture, API endpoint design, instrument mapping

### Backend Endpoints (consume these)
- `backend/routers/saxo.py` — All Saxo endpoints: auth/connect, auth/callback, auth/status, portfolio/positions, portfolio/balance, portfolio/performance
- `backend/models/saxo.py` — Pydantic response models (SaxoPositionsResponse, SaxoBalance, SaxoPerformance, SaxoConnectionStatus)

### Existing Frontend Patterns (reuse these)
- `frontend/src/components/portfolio/PortfolioDashboard.tsx` — Current portfolio layout with summary cards + position table
- `frontend/src/components/portfolio/PositionRow.tsx` — Position row component pattern
- `frontend/src/components/ui/SignalBadge.tsx` — TA signal badge (reuse for mapped Saxo positions)
- `frontend/src/components/ui/LoadingSkeleton.tsx` — Loading state pattern
- `frontend/src/components/ui/ErrorMessage.tsx` — Error display pattern
- `frontend/src/hooks/usePortfolio.ts` — Portfolio data hook pattern (reference for new useSaxoPortfolio hook)
- `frontend/src/lib/api.ts` — `fetchJSON<T>` wrapper for backend API calls
- `frontend/src/lib/formatters.ts` — Currency and percentage formatting utilities
- `frontend/src/app/settings/page.tsx` — Settings page (add Brokerage Connections section here)

### Requirements
- `.planning/REQUIREMENTS.md` — UI-01 through UI-05
- `.planning/ROADMAP.md` — Phase 3 success criteria (5 items)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PortfolioDashboard` + `PositionRow`: Existing portfolio layout — Saxo tab can follow the same card + table structure
- `SignalBadge`: Directly reusable for mapped Saxo positions showing TA signals
- `LoadingSkeleton` / `ErrorMessage`: Standard loading and error states
- `usePortfolio` hook: Pattern reference for a new `useSaxoPortfolio` hook (fetch from backend API instead of Supabase)
- `fetchJSON<T>` in `api.ts`: Generic typed fetch wrapper — use for all Saxo API calls from frontend
- `formatCurrency` / `formatPercentage`: Formatting utilities for P&L display
- `useAuth` hook: Auth state for conditional rendering (Saxo connection check)

### Established Patterns
- `"use client"` directive for all interactive components
- Tailwind CSS utility classes for styling (dark mode via `className="dark"` on html)
- Summary cards in 3-column grid (`grid grid-cols-1 sm:grid-cols-3 gap-4`)
- Auth guard pattern: redirect to login if not authenticated
- `Promise.allSettled()` for parallel data fetching in hooks

### Integration Points
- `frontend/src/app/portfolio/page.tsx` — Add tab navigation wrapping `PortfolioDashboard` and new `SaxoPortfolioDashboard`
- `frontend/src/app/settings/page.tsx` — Add "Brokerage Connections" section with connect/disconnect
- `frontend/src/lib/api.ts` — Add Saxo API functions (`getSaxoPositions`, `getSaxoBalance`, `getSaxoPerformance`, `getSaxoStatus`)
- `frontend/src/types/index.ts` — Add Saxo TypeScript types matching backend Pydantic models

</code_context>

<specifics>
## Specific Ideas

- User explicitly wants Yahoo Finance **completely replaced** by Saxo eventually — this phase builds the UI as a transitional step where unmapped instruments show Saxo data without TA signals
- The unmapped state is temporary — once Saxo OHLCV data feeds into pandas-ta (future phase), every position will have signals
- Saxo tab should feel like the "real" portfolio (default tab) with manual positions as secondary

</specifics>

<deferred>
## Deferred Ideas

- **Yahoo Finance replacement** — Replace Yahoo Finance with Saxo OHLCV data (`GET /chart/v3/charts`) as the data source for pandas-ta TA calculations. This eliminates the "unmapped" concept entirely. Suggested as Phase 4 or a new milestone.
- **WebSocket streaming** — Replace 60-second polling with real-time Saxo price streaming (v2, STREAM-01/02/03)
- **Watchlist sync** — Surface Saxo instruments in existing watchlist view (v2, ENH-01)
- **Multi-account selector** — Support multiple Saxo sub-accounts (v2, ENH-02)

</deferred>

---

*Phase: 03-frontend-integration*
*Context gathered: 2026-04-04*
