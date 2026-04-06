# Requirements: Stock Discovery & Market Trends

**Defined:** 2026-04-05
**Core Value:** Discover, analyze, and monitor stocks with evidence-based technical analysis

## v1.1 Requirements

Requirements for milestone v1.1. Each maps to roadmap phases.

### Data Source Evaluation

- [ ] **DATA-01**: User can see a documented comparison of Saxo API vs Yahoo Finance capabilities for discovery features (sector data, volume, screener, rate limits)
- [ ] **DATA-02**: System confirms which data source is used for each feature and closes the pending "replace Yahoo Finance" decision

### Stock Screener

- [ ] **SCRN-01**: User can browse stocks by GICS sector (11 sectors) and drill into sub-industries
- [ ] **SCRN-02**: User can filter screener results by TA signal (buy/sell/hold) using the existing signal engine
- [ ] **SCRN-03**: Screener data is pre-populated via background job (not live yfinance queries) to avoid rate limiting
- [ ] **SCRN-04**: User can click any screener result to navigate to the stock's detail page

### Market Trends

- [ ] **TRND-01**: User can view most traded stocks ranked by dollar volume (shares x price), filtering out low-liquidity noise
- [ ] **TRND-02**: User can view sector performance with daily and YTD returns for all 11 GICS sectors
- [ ] **TRND-03**: User can drill into a sector to see its top-performing stocks
- [x] **TRND-04**: User can see which stocks they've viewed most on the platform (personal activity tracking)
- [x] **TRND-05**: View tracking uses session-scoped deduplication to prevent polling/tab inflation

### Discovery UI

- [ ] **DISC-01**: A unified "Discover" page serves as the entry point for screener, most-traded, sector performance, and most-viewed
- [ ] **DISC-02**: Discover page is accessible from the main navigation

## v2 Requirements

Deferred to future milestone. Tracked but not in current roadmap.

### Screener Enhancements

- **SCRN-05**: User can filter by market cap (small/mid/large/mega)
- **SCRN-06**: User can sort screener results by multiple columns
- **SCRN-07**: User can save screener filter presets

### Trend Enhancements

- **TRND-06**: User can view biggest gainers and losers by percentage change (with minimum market cap filter)
- **TRND-07**: User can view volume spike alerts (stocks trading unusually high vs average)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Replace Yahoo Finance with Saxo for discovery | Research confirmed Saxo lacks screener, sector aggregates, and most-active endpoints |
| Real-time streaming for screener | Polling/background job sufficient; streaming adds complexity for minimal benefit |
| Social/community features (shared watchlists) | Single-user platform; social features add complexity without value |
| Options/derivatives screener | Outside current platform scope |
| Fundamental analysis filters (P/E, revenue) | Focus on technical analysis; fundamentals are a separate feature set |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | 4 | Pending |
| DATA-02 | 4 | Pending |
| TRND-04 | 5, 7, 9 | Complete |
| TRND-05 | 5, 7 | Complete |
| TRND-01 | 6, 9 | Pending |
| TRND-02 | 6, 9 | Pending |
| TRND-03 | 6, 9 | Pending |
| SCRN-01 | 6, 9 | Pending |
| SCRN-02 | 6, 9 | Pending |
| SCRN-03 | 6 | Pending |
| SCRN-04 | 8, 9 | Pending |
| DISC-01 | 8, 9 | Pending |
| DISC-02 | 9 | Pending |

**Coverage:**
- v1.1 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0

---
*Requirements defined: 2026-04-05*
*Last updated: 2026-04-05 — traceability mapped after roadmap creation*
