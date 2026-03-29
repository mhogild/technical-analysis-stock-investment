# Phase 2: Portfolio Data - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-29
**Phase:** 02-portfolio-data
**Areas discussed:** Service architecture, API endpoint design

---

## Service Architecture

### Q1: How should the Saxo portfolio backend be organized?

| Option | Description | Selected |
|--------|-------------|----------|
| Single service (Recommended) | One SaxoPortfolioService class handling positions, balance, and performance. Keeps Saxo-specific logic centralized. | ✓ |
| Separate services per domain | SaxoPositionsService, SaxoBalanceService, SaxoPerformanceService. More granular but more files. | |
| Extend existing DataFetcher | Add Saxo methods to the existing DataFetcher service. Mixes Yahoo and Saxo concerns. | |

**User's choice:** Single service (Recommended)
**Notes:** None

### Q2: How should the Saxo bootstrap sequence work?

| Option | Description | Selected |
|--------|-------------|----------|
| Lazy bootstrap on first call (Recommended) | First portfolio request triggers client info + account list fetch, cached for 24h. | ✓ |
| Explicit bootstrap endpoint | Separate /api/saxo/bootstrap that frontend calls after OAuth connect. | |
| Bootstrap on OAuth callback | Fetch client info immediately during the OAuth callback flow. | |

**User's choice:** Lazy bootstrap on first call (Recommended)
**Notes:** None

### Q3: Instrument mapping — internal mapper or inline?

| Option | Description | Selected |
|--------|-------------|----------|
| Internal mapper module (Recommended) | Separate InstrumentMapper called by SaxoPortfolioService. | |
| Inline in service | Mapping logic lives directly in service methods. | |
| You decide | Let Claude choose the cleanest approach. | ✓ |

**User's choice:** You decide
**Notes:** Delegated to Claude's discretion

### Q4: Account selection — default only or store all?

| Option | Description | Selected |
|--------|-------------|----------|
| Default account only (Recommended) | Always use the first/default account from Saxo client info. | |
| Store all, use default | Cache all account IDs but always use the default. | |
| You decide | Let Claude choose the pragmatic approach. | ✓ |

**User's choice:** You decide
**Notes:** Delegated to Claude's discretion

---

## API Endpoint Design

### Q1: How should portfolio data endpoints be structured?

| Option | Description | Selected |
|--------|-------------|----------|
| Separate endpoints (Recommended) | GET /positions, /balance, /performance — each returns focused data. | ✓ |
| Single merged endpoint | GET /portfolio — returns everything in one response. | |
| Hybrid: overview + detail | GET /portfolio (summary) and GET /positions (full list). | |

**User's choice:** Separate endpoints (Recommended)
**Notes:** None

### Q2: API namespace — existing saxo router or new?

| Option | Description | Selected |
|--------|-------------|----------|
| /api/saxo/portfolio/* (Recommended) | Extends existing saxo router. All Saxo routes in one place. | |
| New /api/portfolio/saxo/* | Nested under portfolio domain. Groups by feature. | |
| You decide | Let Claude choose the cleanest namespace. | ✓ |

**User's choice:** You decide
**Notes:** Delegated to Claude's discretion

### Q3: How should unmapped instruments be represented?

| Option | Description | Selected |
|--------|-------------|----------|
| Same list, mapped flag (Recommended) | All positions in one array with mapped: true/false and yahoo_ticker: string/null. | ✓ |
| Separate arrays | mapped_positions[] and unmapped_positions[]. | |
| Exclude unmapped | Only return positions that resolve to Yahoo tickers. | |

**User's choice:** Same list, mapped flag (Recommended)
**Notes:** None

### Q4: TA signal enrichment — inline or separate fetches?

| Option | Description | Selected |
|--------|-------------|----------|
| Separate signal fetches (Recommended) | Positions endpoint returns Saxo data + mapping info only. Frontend fetches signals separately. | |
| Inline signals in response | Positions endpoint enriches each position with latest TA signal. | |
| You decide | Let Claude choose based on existing architecture. | ✓ |

**User's choice:** You decide
**Notes:** Delegated to Claude's discretion

---

## Claude's Discretion

- Instrument mapping architecture (internal module vs inline)
- Account selection strategy (default only vs store all)
- API namespace choice
- TA signal enrichment approach (inline vs separate)
- Caching strategy (not discussed — full discretion)

## Deferred Ideas

- No scope creep during discussion — all topics stayed within phase boundary
