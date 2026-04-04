# Phase 3: Frontend Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 03-frontend-integration
**Areas discussed:** Tab structure, Unmapped instruments

---

## Tab Structure

### Portfolio layout

| Option | Description | Selected |
|--------|-------------|----------|
| Tabbed view | Two tabs: "Manual Positions" and "Saxo Positions" with own summary cards and position table | ✓ |
| Merged view | Single unified table with all positions, Saxo marked with broker icon | |
| Saxo replaces manual | Remove manual portfolio entirely, show only Saxo positions | |

**User's choice:** Tabbed view
**Notes:** Clean separation, builds on existing PortfolioDashboard

### Saxo summary cards

| Option | Description | Selected |
|--------|-------------|----------|
| Own Saxo summary cards | Account Value, Cash Balance, Day P&L, Total P&L from Saxo endpoints | ✓ |
| Same layout as manual | Reuse same 3 cards populated with Saxo data | |
| You decide | Claude picks best layout | |

**User's choice:** Own Saxo summary cards

### Default tab

| Option | Description | Selected |
|--------|-------------|----------|
| Saxo Positions | Default to Saxo since it's becoming primary data source | ✓ |
| Manual Positions | Keep current experience as default | |
| Last used tab | Remember via localStorage | |

**User's choice:** Saxo Positions

### Empty state (no Saxo connection)

| Option | Description | Selected |
|--------|-------------|----------|
| Connect prompt | Friendly message + button linking to settings | ✓ |
| Hide Saxo tab entirely | Only show tab when connection exists | |
| You decide | Claude picks approach | |

**User's choice:** Connect prompt

---

## Unmapped Instruments

### Scope clarification

User expressed strong preference to **completely replace Yahoo Finance with Saxo** for everything including TA signals. Discussed scope implications:

| Option | Description | Selected |
|--------|-------------|----------|
| Add a Phase 4 | Keep Phase 3 UI-only, add Phase 4 for Yahoo replacement | |
| Expand Phase 3 scope | Fold Yahoo replacement into Phase 3 | |
| Phase 3 UI now, remove Yahoo later | Build UI with transitional unmapped state | ✓ |

**User's choice:** Phase 3 UI now, remove Yahoo later
**Notes:** Unmapped instruments are a transitional state that will go away when Saxo provides all OHLCV data

### Unmapped display

| Option | Description | Selected |
|--------|-------------|----------|
| Inline with dash | Same table, signal column shows "—" for unmapped | ✓ |
| Separate section below | Mapped on top, divider, "Other Instruments" below | |
| You decide | Claude picks simplest approach | |

**User's choice:** Inline with dash

### Unmapped interactivity

| Option | Description | Selected |
|--------|-------------|----------|
| Static rows | No link to stock detail page for unmapped positions | ✓ |
| Link if possible | Link to detail page if partial Yahoo match exists | |
| You decide | Claude picks pragmatic approach | |

**User's choice:** Static rows for now

---

## Claude's Discretion

- Settings page Brokerage Connections section layout
- Connection status badge design
- 60-second polling implementation
- Tab component design
- Loading and error states
- Position table columns and responsive design
- Summary card styling

## Deferred Ideas

- Yahoo Finance replacement with Saxo OHLCV data for TA — suggested as Phase 4 or new milestone
- WebSocket streaming (v2)
- Watchlist sync (v2)
- Multi-account selector (v2)
