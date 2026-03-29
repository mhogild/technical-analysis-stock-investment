---
status: partial
phase: 01-auth-infrastructure
source: [01-VERIFICATION.md]
started: 2026-03-29T12:30:00Z
updated: 2026-03-29T12:30:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Connect flow end-to-end
expected: With Saxo SIM credentials set, GET /api/saxo/auth/connect returns auth_url. Completing consent screen triggers callback, stores encrypted tokens, redirects to frontend.
result: [pending]

### 2. Silent token refresh after 20 minutes
expected: When expires_at approaches, backend auto-refreshes tokens without user re-authentication. Logs show refresh, DB updated.
result: [pending]

### 3. Disconnect flow
expected: DELETE /api/saxo/auth/disconnect revokes tokens and deletes DB row. Status returns connected: false.
result: [pending]

### 4. Concurrent refresh mutex
expected: Two simultaneous requests near expiry produce exactly one refresh call, not two. Logs confirm single refresh per window.
result: [pending]

### 5. Circuit breaker trips after 2 failures
expected: After 2 consecutive refresh failures, consecutive_refresh_failures=2 in DB, status shows circuit_breaker_tripped: true.
result: [pending]

### 6. CSRF replay prevention
expected: Replaying a consumed OAuth state returns HTTP 400 "OAuth state not found".
result: [pending]

### 7. Migrations applied to Supabase
expected: Tables saxo_tokens and saxo_oauth_state visible in Supabase Studio, RLS enabled, anon key blocked.
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps
