# Phase 3: Frontend Integration — Research

**Researched:** 2026-04-04
**Phase:** 03-frontend-integration

## RESEARCH COMPLETE

---

## 1. Current Frontend Architecture

### Portfolio Page (`frontend/src/app/portfolio/page.tsx`)
A thin "use client" page with auth guard (redirects to `/auth/login` if unauthenticated). Currently renders one component:
```
<PortfolioDashboard />
```
No tab structure exists. The page's `<h1>` title ("Portfolio") and the `PortfolioDashboard` are the full content. This is the primary integration point for adding tabs.

### `PortfolioDashboard` (`frontend/src/components/portfolio/PortfolioDashboard.tsx`)
Self-contained component that owns its own data fetching via `usePortfolio()`. Structure:
1. Loading state → `LoadingSkeleton variant="card" count={3}` + `variant="table-row" count={5}`
2. Error state → inline red div (not using `ErrorMessage` component)
3. Summary cards → 3-column grid (`grid grid-cols-1 sm:grid-cols-3 gap-4`) with Total Value, Total Gain/Loss, Holdings count
4. Actions row → "Add Position" button
5. Add Position modal (inline, conditional)
6. Positions table → `PositionRow` per position, or empty state

Column headers: Symbol | Qty | Avg Cost | Price | Gain/Loss | Signal | Actions

### `PositionRow` (`frontend/src/components/portfolio/PositionRow.tsx`)
Props: `{ position: PortfolioPosition; onDelete: (id: string) => void }`
- Symbol cell: `<Link href="/stock/{symbol}">` — always a clickable link for manual positions
- Signal cell: `<SignalBadge signal={...} size="sm" />` if signal exists, else `<span>—</span>` (already handles the null case)
- Gain/Loss: dual-line with amount + percentage

### Settings Page (`frontend/src/app/settings/page.tsx`)
Two-section `<div className="space-y-8">`:
- Section 1: "Base Currency" — `<section>` with `<select>`
- Section 2: "Notifications" — `<section>` with toggle buttons

No "Brokerage Connections" section exists. New section appended before the Save button. The page is already using `"use client"` and `useAuth`.

### Hooks
- `useAuth` — returns `{ user, loading, signOut }`. Auth state from Supabase. No Saxo awareness.
- `usePortfolio` — fetches from Supabase `portfolio_positions`, enriches with `getStockInfo` + `getStockSignal`. Returns state + `addPosition`, `removePosition`, `updatePosition`, `refetch`.
- No existing interval-based polling anywhere in the codebase (`setInterval` / `useInterval` are absent from all hooks and components).

### UI Component Library
No third-party UI library (no Radix, Headless UI, shadcn). All components are hand-rolled Tailwind. Tabs will need to be implemented from scratch using `useState` for active tab tracking.

---

## 2. Backend API Surface (Endpoints to Consume)

All Saxo endpoints require `Authorization: Bearer <supabase-jwt>` in the request header. The backend extracts user identity from the Supabase JWT.

### `GET /api/saxo/auth/status` → `SaxoConnectionStatus`
```typescript
{
  connected: boolean;
  expires_at?: string;         // ISO datetime
  saxo_client_key?: string;
  circuit_breaker_tripped: boolean;
}
```

### `GET /api/saxo/auth/connect` → `SaxoAuthURL`
```typescript
{ auth_url: string }
```
Frontend redirects `window.location.href = auth_url` to start OAuth flow.

### `DELETE /api/saxo/auth/disconnect` → `SaxoDisconnectResponse`
```typescript
{ disconnected: boolean }
```

### `GET /api/saxo/portfolio/positions` → `SaxoPositionsResponse`
```typescript
{
  positions: SaxoPosition[];
  mapped_count: number;
  unmapped_count: number;
}
```
Where `SaxoPosition`:
```typescript
{
  position_id: string;
  uic: number;
  asset_type: string;
  saxo_symbol: string;
  description: string;
  amount: float;
  open_price: float;
  current_price: float;
  profit_loss: float;
  profit_loss_base_currency: float;
  market_value: float;
  currency: string;
  exposure_currency: string;
  value_date?: string;
  yahoo_ticker?: string;    // null if unmapped
  mapped: boolean;          // false = no TA signals available
}
```

### `GET /api/saxo/portfolio/balance` → `SaxoBalance`
```typescript
{
  total_value: float;
  cash_balance: float;
  unrealized_positions_value: float;
  currency: string;
  margin_used: float;
  margin_available: float;
  change_today: float;
}
```

### `GET /api/saxo/portfolio/performance` → `SaxoPerformance`
```typescript
{
  total_value: float;
  cash_balance: float;
  unrealized_positions_value: float;
  change_today: float;
  change_today_percent: float;
  currency: string;
}
```

### Error HTTP status codes from backend
- 401 — Not connected / token expired / circuit breaker tripped (503)
- 429 — Rate limit hit
- 502 — Saxo API error
- 503 — Circuit breaker open

---

## 3. Existing Component Patterns

### Card Pattern (from `PortfolioDashboard`)
```tsx
<div className="rounded-lg border border-gray-200 bg-white p-4">
  <p className="text-sm text-gray-500">{label}</p>
  <p className="text-2xl font-bold text-gray-900">{value}</p>
</div>
```
Grid: `className="grid grid-cols-1 sm:grid-cols-3 gap-4"`
The Saxo summary cards (Account Value, Cash Balance, Day P&L, Total P&L) should use a 4-column variant (`sm:grid-cols-4`) or retain 3-column and move one metric inline.

### Table Pattern
```tsx
<div className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
  <table className="w-full min-w-[600px]">
    <thead className="border-b border-gray-200 bg-gray-50">
      <tr>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">...</th>
      </tr>
    </thead>
    <tbody>...</tbody>
  </table>
</div>
```

### Section Pattern (from `SettingsPage`)
```tsx
<section className="rounded-lg border border-gray-200 bg-white p-6">
  <h2 className="text-lg font-semibold text-gray-900 mb-4">...</h2>
  ...
</section>
```

### Error Pattern
`PortfolioDashboard` uses an inline red div, not `ErrorMessage`. However `ErrorMessage` component exists at `frontend/src/components/ui/ErrorMessage.tsx` and accepts `{ title?, message, retryAction? }`. Using `ErrorMessage` for Saxo errors is consistent and preferred.

### Loading Pattern
`LoadingSkeleton` supports: `"text" | "chart" | "card" | "table-row"`. Card variant renders dark (`bg-slate-800/900`) skeletons — note this is styled for dark mode (the existing portfolio page is light). The table-row variant is also dark-themed. Investigate whether this causes visual inconsistency on the portfolio page.

### Signal Badge
`SignalBadge` accepts `signal: ConsolidatedSignalLevel | IndicatorSignal` and `size?: "sm" | "md" | "lg"`. Already handles all signal types with gradient styling. Directly reusable for mapped positions.

### Auth Pattern
```tsx
const { user, loading } = useAuth();
useEffect(() => {
  if (!loading && !user) router.push("/auth/login");
}, [user, loading, router]);
if (loading) return <LoadingSkeleton />;
if (!user) return null;
```

---

## 4. TypeScript Types Needed

The following types must be added to `frontend/src/types/index.ts`, mirroring the backend Pydantic models exactly:

```typescript
// Saxo Auth & Connection
export interface SaxoConnectionStatus {
  connected: boolean;
  expires_at?: string;
  saxo_client_key?: string;
  circuit_breaker_tripped: boolean;
}

export interface SaxoAuthURL {
  auth_url: string;
}

export interface SaxoDisconnectResponse {
  disconnected: boolean;
}

// Saxo Portfolio
export interface SaxoPosition {
  position_id: string;
  uic: number;
  asset_type: string;
  saxo_symbol: string;
  description: string;
  amount: number;
  open_price: number;
  current_price: number;
  profit_loss: number;
  profit_loss_base_currency: number;
  market_value: number;
  currency: string;
  exposure_currency: string;
  value_date?: string;
  yahoo_ticker?: string;
  mapped: boolean;
}

export interface SaxoPositionsResponse {
  positions: SaxoPosition[];
  mapped_count: number;
  unmapped_count: number;
}

export interface SaxoBalance {
  total_value: number;
  cash_balance: number;
  unrealized_positions_value: number;
  currency: string;
  margin_used: number;
  margin_available: number;
  change_today: number;
}

export interface SaxoPerformance {
  total_value: number;
  cash_balance: number;
  unrealized_positions_value: number;
  change_today: number;
  change_today_percent: number;
  currency: string;
}
```

No new signal types needed — mapped positions reuse `ConsolidatedSignalLevel` from `getStockSignal`.

---

## 5. Tab Implementation Strategy

### No Existing Tab Pattern
There is no tab component in the codebase. No third-party UI library is installed. Tabs must be built from scratch using Tailwind + `useState`.

### Recommended Approach: Inline tab navigation in `portfolio/page.tsx`
Add tab state in the portfolio page, render `PortfolioDashboard` or `SaxoPortfolioDashboard` based on active tab. The page currently delegates all rendering to `PortfolioDashboard` — split this so the page owns tab state and conditionally renders either dashboard.

```tsx
type PortfolioTab = "saxo" | "manual";
const [activeTab, setActiveTab] = useState<PortfolioTab>("saxo"); // D-03: Saxo is default
```

### Tab Bar Pattern (Tailwind, no library)
```tsx
<div className="border-b border-gray-200 mb-6">
  <nav className="-mb-px flex gap-6">
    <button
      onClick={() => setActiveTab("saxo")}
      className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
        activeTab === "saxo"
          ? "border-blue-600 text-blue-600"
          : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      Saxo Positions
    </button>
    <button
      onClick={() => setActiveTab("manual")}
      className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
        activeTab === "manual"
          ? "border-blue-600 text-blue-600"
          : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      Manual Positions
    </button>
  </nav>
</div>
```

This pattern is consistent with how `PortfolioDashboard` is structured (no wrapping layout component) and avoids introducing an abstraction for just two tabs.

---

## 6. Polling Strategy

### Current State
No polling exists in the codebase. All hooks fetch once on mount via `useEffect`. No `setInterval`, `useInterval`, or third-party polling libraries are used.

### Recommended Pattern: `useEffect` with `setInterval` in `useSaxoPortfolio`
The cleanest approach matching the existing hook pattern:

```typescript
const POLL_INTERVAL_MS = 60_000; // 60 seconds per UI-05

useEffect(() => {
  fetchData(); // initial fetch

  const intervalId = setInterval(() => {
    fetchData();
  }, POLL_INTERVAL_MS);

  return () => clearInterval(intervalId); // cleanup on unmount
}, []);
```

### Key considerations
- **Silent refresh**: Do not set `isLoading = true` on poll-triggered refreshes — only on the initial fetch. This prevents the UI flashing a skeleton every 60 seconds.
- **Tab visibility**: Consider `document.addEventListener("visibilitychange")` to pause polling when the tab is hidden — prevents unnecessary API calls when the user is elsewhere. Not strictly required for v1.
- **Stale data indicator**: A "Last updated X seconds ago" indicator gives the user confidence the data is live. Can be derived from a `lastUpdated: Date | null` state field.
- **Only poll when Saxo tab is active**: The interval should only run when the "Saxo Positions" tab is active (unmount `SaxoPortfolioDashboard` when switching to manual, or pass an `isActive` prop to pause polling).
- **Error on poll**: If a poll-triggered fetch fails, preserve the last known data and show a non-blocking toast or badge — do not replace the table with an error message.

---

## 7. Integration Points

### Files to Create (new)
| File | Purpose |
|------|---------|
| `frontend/src/hooks/useSaxoPortfolio.ts` | Hook: fetches positions, balance, performance with 60s polling |
| `frontend/src/components/portfolio/SaxoPortfolioDashboard.tsx` | Saxo tab content: summary cards + position table |
| `frontend/src/components/portfolio/SaxoPositionRow.tsx` | Row component for a `SaxoPosition` |

### Files to Modify
| File | Change |
|------|--------|
| `frontend/src/app/portfolio/page.tsx` | Add tab state, tab nav bar, conditional rendering of `PortfolioDashboard` vs `SaxoPortfolioDashboard` |
| `frontend/src/app/settings/page.tsx` | Add "Brokerage Connections" `<section>` before the Save button |
| `frontend/src/lib/api.ts` | Add `getSaxoStatus`, `getSaxoConnectUrl`, `disconnectSaxo`, `getSaxoPositions`, `getSaxoBalance`, `getSaxoPerformance` — these require an authenticated `fetchJSON` variant |
| `frontend/src/types/index.ts` | Add all Saxo TypeScript interfaces listed in Section 4 |

### Critical API.ts Gap: Authentication Headers
The current `fetchJSON` in `api.ts` does NOT send an `Authorization` header. All Saxo backend endpoints require `Authorization: Bearer <supabase-jwt>`. The backend uses this to extract the user's `user_id`.

Existing hooks that need auth (`usePortfolio`, `useWatchlist`) call `supabase.auth.getSession()` directly and pass the session to Supabase client methods — they do NOT call the FastAPI backend with auth headers.

**The Saxo endpoints are the first backend endpoints that require auth headers.** A new authenticated fetch function is needed:

```typescript
async function fetchJSONAuthenticated<T>(path: string, options?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...options?.headers,
      "Authorization": `Bearer ${session.access_token}`,
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`API error ${res.status}: ${detail}`);
  }
  return res.json();
}
```

This is a significant gap — without it, all Saxo API calls will receive 401 responses.

---

## 8. Risks & Dependencies

### R-01: Authenticated `fetchJSON` is not yet implemented (HIGH)
The current `fetchJSON` in `api.ts` sends no auth headers. Every Saxo endpoint returns 401 without this. Must implement `fetchJSONAuthenticated` (or equivalent) as a prerequisite for all Saxo API calls from the frontend.

### R-02: `LoadingSkeleton` uses dark-mode styles (MEDIUM)
The portfolio page is light-mode (`bg-white`, `border-gray-200`). `LoadingSkeleton` uses `bg-slate-700/800/900` backgrounds — these appear dark-mode styled. Using them as loading skeletons for Saxo cards/rows may create visual inconsistency. Consider passing a `theme` prop or using inline styles for light backgrounds.

### R-03: TA signal enrichment for mapped positions requires a separate API call per position (MEDIUM)
The `/portfolio/positions` endpoint returns `yahoo_ticker` and `mapped: true` for mapped instruments but does NOT return TA signals inline. The existing signal enrichment in `usePortfolio` calls `getStockSignal(symbol)` per position. The same approach must be used in `useSaxoPortfolio` — one `getStockSignal(yahoo_ticker)` call per mapped position, using `Promise.allSettled`. This adds latency and N backend calls.

### R-04: OAuth connect flow requires a redirect (LOW-MEDIUM)
`/api/saxo/auth/connect` returns `{ auth_url }`. Frontend must redirect `window.location.href = auth_url`. After Saxo completes OAuth, the backend callback redirects to `SAXO_FRONTEND_REDIRECT_URL`. The settings page must handle the post-connect state — detect connection on mount and show the connected badge.

### R-05: Circuit breaker state requires distinct UX (LOW)
`SaxoConnectionStatus.circuit_breaker_tripped: true` means re-authentication is needed. The settings page should distinguish between "not connected" (show Connect button) and "circuit breaker tripped" (show "Re-authenticate" with different copy).

### R-06: Unmapped positions with non-USD currencies (LOW)
`SaxoPosition.currency` and `exposure_currency` may differ. `formatCurrency` accepts a `currency` parameter — use `position.currency` for price display. The existing manual portfolio always assumes `purchase_currency`; the Saxo table needs to use Saxo's native currency field.

### R-07: Backend Phase 2 must be fully deployed (DEPENDENCY)
Phase 2 plan `02-04` (the final plan covering the actual `SaxoPortfolioService` routes registered in `main.py`) must be complete and endpoints reachable before any frontend work can be validated.

---

## 9. Requirement Mapping

### UI-01: Portfolio page has "Saxo Positions" tab alongside "Manual Positions"
**Implementation:**
- Modify `frontend/src/app/portfolio/page.tsx`: add `useState<PortfolioTab>` for tab state, add tab nav bar, conditionally render `SaxoPortfolioDashboard` (new) or `PortfolioDashboard` (existing). Default: `"saxo"` (per D-03).
- Create `frontend/src/components/portfolio/SaxoPortfolioDashboard.tsx`: mirrors `PortfolioDashboard` structure — 4 summary cards (Account Value, Cash Balance, Day P&L, Total P&L), then positions table.
- When Saxo is not connected: show friendly prompt with link to Settings (per D-04). Detect via `getSaxoStatus()`.

**Files:** `page.tsx` (modify), `SaxoPortfolioDashboard.tsx` (create)

### UI-02: Settings page has "Brokerage Connections" section with connect/disconnect button
**Implementation:**
- Modify `frontend/src/app/settings/page.tsx`: add a new `<section>` "Brokerage Connections" using same card pattern.
- Section shows current connection status from `getSaxoStatus()`.
- "Connect Saxo Account" button calls `getSaxoConnectUrl()` and redirects to `auth_url`.
- "Disconnect" button calls `disconnectSaxo()` (DELETE) and reloads status.

**Files:** `settings/page.tsx` (modify), `api.ts` (add `getSaxoStatus`, `getSaxoConnectUrl`, `disconnectSaxo`)

### UI-03: Saxo connection status badge visible when connected
**Implementation:**
- In the Settings "Brokerage Connections" section, show a green "Connected" badge (inline `<span>` with green styling) when `status.connected === true`.
- Show "Disconnected" or nothing when not connected.
- Optionally: show `circuit_breaker_tripped` warning with amber/yellow styling and "Re-authenticate" copy.

**Files:** `settings/page.tsx` (modify)

### UI-04: Saxo positions show TA signals for mapped instruments
**Implementation:**
- In `useSaxoPortfolio`, after fetching positions, run `getStockSignal(position.yahoo_ticker)` for all positions where `mapped === true`, using `Promise.allSettled`.
- Enrich each `SaxoPosition` with `signal?: ConsolidatedSignalLevel`.
- `SaxoPositionRow`: if `mapped === true` and signal available, render `<SignalBadge signal={signal} size="sm" />`. If `mapped === false`, render muted dash `<span className="text-xs text-gray-400">—</span>` (per D-06).
- Mapped positions link to `/stock/${yahoo_ticker}` (per D-08). Unmapped are static rows (per D-07).

**Files:** `useSaxoPortfolio.ts` (create), `SaxoPositionRow.tsx` (create), `api.ts` (reuse `getStockSignal`)

### UI-05: Frontend polls backend for Saxo data at 60-second intervals
**Implementation:**
- In `useSaxoPortfolio`, use `setInterval` with 60,000ms in a `useEffect` with cleanup.
- Silent refresh: only set `isLoading = true` on initial mount, not on polling refreshes.
- Track `lastRefreshed: Date | null` state to surface a "Last updated X ago" indicator.
- Clear interval on component unmount (when user switches to Manual tab).

**Files:** `useSaxoPortfolio.ts` (create)

---

## Summary of New Files

| File | Type | Dependency |
|------|------|------------|
| `frontend/src/types/index.ts` | Modify | None |
| `frontend/src/lib/api.ts` | Modify | Supabase session available |
| `frontend/src/hooks/useSaxoPortfolio.ts` | Create | `api.ts` auth changes |
| `frontend/src/components/portfolio/SaxoPortfolioDashboard.tsx` | Create | `useSaxoPortfolio` |
| `frontend/src/components/portfolio/SaxoPositionRow.tsx` | Create | Saxo types |
| `frontend/src/app/portfolio/page.tsx` | Modify | Both dashboard components |
| `frontend/src/app/settings/page.tsx` | Modify | `api.ts` Saxo auth functions |

Build order: types → api.ts auth → hook → components → pages
