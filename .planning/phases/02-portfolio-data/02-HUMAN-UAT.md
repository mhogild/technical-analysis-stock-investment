---
status: partial
phase: 02-portfolio-data
source: [02-VERIFICATION.md]
started: 2026-03-31T19:40:00Z
updated: 2026-03-31T19:40:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Positions match Saxo SIM platform
expected: `GET /api/saxo/portfolio/positions` returns positions whose quantities and instruments match what is visible in the Saxo trading platform for the SIM account.
result: [pending]

### 2. Balance matches Saxo SIM platform
expected: `GET /api/saxo/portfolio/balance` returns a cash balance figure matching the Saxo platform balance display.
result: [pending]

### 3. Instrument mapping persists and caches
expected: A Saxo position in a major-exchange stock (e.g., AAPL on XNAS) resolves to a Yahoo Finance ticker and the mapping is persisted — subsequent calls skip the Saxo reference API.
result: [pending]

### 4. Unmapped instruments handled gracefully
expected: A Saxo position in an unrecognised instrument returns `mapped: false` with Saxo price and P&L data without crashing.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
