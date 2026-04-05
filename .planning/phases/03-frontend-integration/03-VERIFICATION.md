---
status: human_needed
phase: 03-frontend-integration
date: 2026-04-05
---

## Phase Goal

Render Saxo positions and account data in the existing portfolio and settings UI, enriched with TA signals for mapped instruments and updated via 60-second polling.

## Success Criteria Verification

### 1. Portfolio page shows a "Saxo Positions" tab; clicking it displays the user's real positions with current price and P&L — no page reload required.
**Status:** PASS
**Evidence:**
- `frontend/src/app/portfolio/page.tsx` implements tab navigation with `useState<PortfolioTab>("saxo")` defaulting to the Saxo tab.
- Two `<button>` elements toggle `activeTab` between `"saxo"` and `"manual"` — no page navigation, pure React state.
- When `activeTab === "saxo"` and Saxo is connected, `<SaxoPortfolioDashboard />` is rendered, which shows a positions table with `current_price` and `profit_loss` columns via `SaxoPositionRow`.
- `SaxoPortfolioDashboard` displays 4 summary cards (Account Value, Cash Balance, Day P&L, Total P&L) and a 7-column positions table.
**Notes:** The tab switch is in-memory React state; no `router.push` or page reload occurs.

---

### 2. A mapped Saxo position (e.g., a stock also covered by the TA engine) shows a buy/sell signal badge identical to what appears in the existing manual portfolio view.
**Status:** PASS
**Evidence:**
- `useSaxoPortfolio.ts` (line 77–89) enriches each position where `pos.mapped && pos.yahoo_ticker` by calling `getStockSignal(pos.yahoo_ticker)` and attaching `signalData.consolidated.signal` as `SaxoPositionEnriched.signal`.
- `SaxoPositionRow.tsx` (lines 63–65) renders `<SignalBadge signal={position.signal} size="sm" />` when `position.mapped && position.signal` — the same `SignalBadge` component used in the manual portfolio view.
**Notes:** The signal is sourced from the identical backend endpoint (`/api/stock/{symbol}/signal`) and rendered with the same component, so visual parity is structural. The `size="sm"` prop is consistent with the manual portfolio.

---

### 3. An unmapped Saxo position shows price and P&L data with a visual indicator making clear that TA signals are unavailable for that instrument.
**Status:** PASS
**Evidence:**
- `SaxoPositionRow.tsx` (lines 66–73): when `!position.mapped || !position.signal`, renders a `<span>` with the em-dash `—` and `title="TA signals unavailable — instrument not mapped to Yahoo Finance"`.
- The span uses `text-xs text-gray-400` styling, visually distinct from a signal badge.
- Price (`current_price`) and P&L (`profit_loss_base_currency`, percentage) are always rendered regardless of mapped status (lines 44–60).
**Notes:** Tooltip text is present via the `title` attribute, which is accessible on hover in desktop browsers. No persistent visible label beyond the dash; the intent is conveyed via tooltip only.

---

### 4. Settings page "Brokerage Connections" section shows a green connected badge when Saxo is linked and a "Disconnect" button that works without a page reload.
**Status:** PASS
**Evidence:**
- `frontend/src/app/settings/page.tsx` (lines 257–333) contains a "Brokerage Connections" `<section>`.
- When `saxoStatus?.connected` is true, renders a green pill badge (`bg-green-100 text-green-700` with a green dot) labeled "Connected" (lines 275–279).
- A "Disconnect" button calls `handleSaxoDisconnect()` (lines 95–105), which calls `disconnectSaxo()` (DELETE API), then updates local state `setSaxoStatus({ connected: false, circuit_breaker_tripped: false })` in-place — no page reload.
- Three states are rendered: green "Connected", amber "Re-authentication required" (circuit breaker), gray "Not connected".
**Notes:** Disconnect flow updates React state directly without `router.push` or `window.location.reload`. Works without a page reload as required.

---

### 5. Without any user interaction, the Saxo positions table refreshes its prices and P&L within 60 seconds of a price change (observable by comparing displayed price to Saxo platform).
**Status:** HUMAN_NEEDED
**Evidence (code):**
- `useSaxoPortfolio.ts` (lines 115–121): `useEffect` calls `fetchData()` on mount, then `setInterval(fetchData, POLL_INTERVAL_MS)` with `POLL_INTERVAL_MS = 60_000` (line 15). The interval is cleared on unmount via `clearInterval`.
- `fetchData` calls `getSaxoPositions()`, `getSaxoBalance()`, `getSaxoPerformance()` in parallel via `Promise.allSettled`, then re-enriches signals and updates React state — causing a re-render with fresh prices.
- Silent polling: `isInitialLoad` ref (not state) prevents `isLoading` from flickering during polls; poll failures set `pollError` (non-blocking amber banner) rather than replacing the UI.
**Why human verification is needed:** The 60-second interval is correctly implemented in code, but the actual timing behavior can only be confirmed at runtime against a live Saxo backend. A backend that is not connected, returns stale data, or whose cache TTL is longer than 60s would undermine the observable end-to-end freshness. Code correctness is verified; functional correctness requires live testing.

---

## Requirement Coverage

| Req ID | Description | Status | Evidence |
|--------|-------------|--------|----------|
| UI-01 | Portfolio page has "Saxo Positions" tab alongside existing "Manual Positions" | Covered | `portfolio/page.tsx`: two tab buttons, `activeTab` state, conditional render of `SaxoPortfolioDashboard` vs `PortfolioDashboard` |
| UI-02 | Settings page has "Brokerage Connections" section with connect/disconnect button | Covered | `settings/page.tsx` lines 257–333: section with connect/disconnect/reconnect buttons |
| UI-03 | Saxo connection status badge visible when connected | Covered | `settings/page.tsx` lines 275–279: green pill badge; `portfolio/page.tsx` lines 52, 91–92: `saxoConnected` guard before rendering dashboard |
| UI-04 | Saxo positions show existing TA signals for mapped instruments | Covered | `useSaxoPortfolio.ts` signal enrichment + `SaxoPositionRow.tsx` `<SignalBadge>` render |
| UI-05 | Frontend polls backend for Saxo data at 60-second intervals | Covered (code) | `useSaxoPortfolio.ts`: `setInterval(fetchData, 60_000)` with silent poll pattern; runtime confirmation human-needed |

## Human Verification Items

1. **60-second polling end-to-end (Criterion 5 / UI-05):** With a live Saxo SIM or Live environment connected, observe the positions table update within 60 seconds of a price change in the Saxo platform. Confirm that `lastUpdatedText` (bottom-right) advances and displayed prices change without any manual interaction.

2. **Disconnect without page reload (Criterion 4):** Click "Disconnect" and verify the badge transitions from "Connected" (green) to "Not connected" (gray) in the same page render, with no browser navigation event.

3. **Signal badge visual parity (Criterion 2):** Compare a mapped Saxo position's `SignalBadge` with the same ticker's badge in the Manual Positions tab or watchlist — confirm they are visually identical.

4. **Unmapped tooltip accessibility (Criterion 3):** Hover over the `—` dash in the Signal column for an unmapped position and confirm the tooltip "TA signals unavailable — instrument not mapped to Yahoo Finance" appears.

5. **TypeScript compile check:** Run `npx tsc --noEmit` from `frontend/` with `node_modules` installed to confirm zero new type errors in the added files (`types/index.ts`, `api.ts`, `useSaxoPortfolio.ts`, `SaxoPositionRow.tsx`, `SaxoPortfolioDashboard.tsx`, `portfolio/page.tsx`, `settings/page.tsx`).

## Summary

All five success criteria are implemented in code and all five requirement IDs (UI-01 through UI-05) are covered. The implementations are structurally correct:

- The portfolio page tab navigation is pure React state with no page reload.
- Signal enrichment reuses the existing `getStockSignal` API function and `SignalBadge` component, ensuring visual parity with the manual portfolio.
- Unmapped positions show price/P&L with a tooltipped dash indicating signal unavailability.
- The Settings page Brokerage Connections section implements three connection states with in-place disconnect.
- The `useSaxoPortfolio` hook sets a `setInterval` at exactly 60,000 ms with silent polling (no loading flicker on polls) and a non-blocking amber banner for poll failures.

The overall status is `human_needed` rather than `passed` because Criterion 5 (60-second live price refresh) can only be confirmed against a running Saxo backend — the code is correct but runtime behavior depends on backend connectivity and cache TTL alignment. All other criteria can be considered code-verified.
