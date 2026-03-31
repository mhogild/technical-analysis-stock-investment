# Roadmap: Saxo OpenAPI Integration

## Overview
3 phases | 24 requirements | Granularity: coarse

## Phase Summary
| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|-----------------|
| 1 | Auth & Infrastructure | Establish secure OAuth connection to Saxo SIM/Live with encrypted token management | AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, INFRA-01, INFRA-02, INFRA-04, INFRA-05 | 4 |
| 2 | Portfolio Data | Fetch and expose real Saxo account data — positions, balance, performance, and instrument mapping — through backend API | PORT-01, PORT-02, PORT-03, PORT-04, PORT-05, INST-01, INST-02, INST-03, INFRA-03 | 4 |
| 3 | Frontend Integration | Surface Saxo data in the existing UI with TA signals, polling, and connection management | UI-01, UI-02, UI-03, UI-04, UI-05 | 5 |

## Plan Progress

| Phase | Plan | Title | Status |
|-------|------|-------|--------|
| 1 | 01-05 | All plans | Complete (2026-03-29) |
| 2 | 02-01 | Saxo Cache, Pydantic Models, DB Migration | Complete (2026-03-29) |
| 2 | 02-02 | Saxo Instrument Mapper Service | Complete (2026-03-31) |
| 2 | 02-03 | Saxo Portfolio Service | Complete (2026-03-31) |
| 2 | 02-04 | Saxo Portfolio Router | In Progress |
| 3 | 03-xx | Frontend Integration | Not started |

## Phase Details

### Phase 1: Auth & Infrastructure
**Goal:** Establish a secure, end-to-end OAuth 2.0 connection to Saxo SIM with encrypted token storage and a hardened API client.
**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, INFRA-01, INFRA-02, INFRA-04, INFRA-05
**UI hint:** Minimal — settings page entry point only (connect button exists but full UI polish is Phase 3)
**Success criteria:**
1. User clicks "Connect Saxo" in settings, completes the Saxo SIM OAuth consent screen, and is redirected back to the app with a confirmed-connected status.
2. After 20 minutes, the app continues to function without prompting re-authentication (token refresh is working silently).
3. User clicks "Disconnect" and subsequent API calls to Saxo return 401 (tokens revoked and deleted).
4. Concurrent browser tabs do not trigger duplicate token refresh calls (mutex lock observable via backend logs showing a single refresh per expiry window).

### Phase 2: Portfolio Data
**Goal:** Fetch real Saxo account data — positions, balance, performance metrics, and instrument identity — and expose it through typed backend endpoints with caching and instrument mapping.
**Requirements:** PORT-01, PORT-02, PORT-03, PORT-04, PORT-05, INST-01, INST-02, INST-03, INFRA-03
**UI hint:** No — data is validated via API responses and Saxo platform cross-check, not frontend UI
**Success criteria:**
1. Backend `/portfolio/positions` returns positions whose quantities and instruments match what is visible in the Saxo trading platform for the SIM account.
2. Backend `/portfolio/balance` returns a cash balance figure that matches the Saxo platform balance display.
3. A Saxo position in a major-exchange stock (e.g., AAPL on XNAS) resolves to a Yahoo Finance ticker and the mapping is persisted — subsequent calls do not re-query the Saxo reference API for that instrument.
4. A Saxo position in an unrecognised instrument returns a response with `mapped: false` and includes Saxo price and P&L data without crashing.

### Phase 3: Frontend Integration
**Goal:** Render Saxo positions and account data in the existing portfolio and settings UI, enriched with TA signals for mapped instruments and updated via 60-second polling.
**Requirements:** UI-01, UI-02, UI-03, UI-04, UI-05
**UI hint:** Yes
**Success criteria:**
1. Portfolio page shows a "Saxo Positions" tab; clicking it displays the user's real positions with current price and P&L — no page reload required.
2. A mapped Saxo position (e.g., a stock also covered by the TA engine) shows a buy/sell signal badge identical to what appears in the existing manual portfolio view.
3. An unmapped Saxo position shows price and P&L data with a visual indicator making clear that TA signals are unavailable for that instrument.
4. Settings page "Brokerage Connections" section shows a green connected badge when Saxo is linked and a "Disconnect" button that works without a page reload.
5. Without any user interaction, the Saxo positions table refreshes its prices and P&L within 60 seconds of a price change (observable by comparing displayed price to Saxo platform).
