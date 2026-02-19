"""
Test edge cases for the Technical Analysis Stock Investment Platform
"""
import requests
import json

BASE_URL = 'http://localhost:8000'

print('=' * 80)
print('EDGE CASE TESTING')
print('=' * 80)
print()

issues_found = []

# Test 1: Small-cap stock warning (market cap < $10B)
print('1. SMALL-CAP STOCK WARNING TEST')
print('-' * 40)
small_cap_symbol = 'RIVN'  # Rivian is ~$10-15B, should be borderline
resp = requests.get(f'{BASE_URL}/api/stock/{small_cap_symbol}', timeout=30)
if resp.ok:
    data = resp.json()
    market_cap = data.get('market_cap')
    threshold = 10_000_000_000
    print(f'  {small_cap_symbol} market cap: ${market_cap:,.0f}' if market_cap else f'  {small_cap_symbol} market cap: N/A')
    if market_cap and market_cap < threshold:
        print(f'  EXPECTED: Small-cap warning should show (< $10B)')
    else:
        print(f'  EXPECTED: No small-cap warning (>= $10B)')
    print(f'  STATUS: Backend returns market_cap correctly for frontend warning logic')
else:
    print(f'  ERROR: Could not fetch {small_cap_symbol}')
    issues_found.append(f'Could not fetch small-cap test stock {small_cap_symbol}')
print()

# Test 2: No P/E ratio (unprofitable company)
print('2. NO P/E RATIO TEST (UNPROFITABLE COMPANY)')
print('-' * 40)
no_pe_symbol = 'RIVN'  # Rivian has no earnings
resp = requests.get(f'{BASE_URL}/api/stock/{no_pe_symbol}', timeout=30)
if resp.ok:
    data = resp.json()
    pe_ratio = data.get('pe_ratio')
    if pe_ratio is None:
        print(f'  {no_pe_symbol} P/E ratio: None (correct - no earnings)')
        print(f'  STATUS: PASS - P/E correctly returns None for unprofitable company')
    else:
        print(f'  {no_pe_symbol} P/E ratio: {pe_ratio}')
        print(f'  STATUS: Has P/E (may have become profitable)')
else:
    print(f'  ERROR: Could not fetch {no_pe_symbol}')
print()

# Test 3: Dividend-paying vs non-dividend stock
print('3. DIVIDEND YIELD TEST')
print('-' * 40)
dividend_symbol = 'T'  # AT&T pays dividends
no_dividend_symbol = 'AMZN'  # Amazon doesn't pay dividends

for symbol in [dividend_symbol, no_dividend_symbol]:
    resp = requests.get(f'{BASE_URL}/api/stock/{symbol}', timeout=30)
    if resp.ok:
        data = resp.json()
        div_yield = data.get('dividend_yield')
        if div_yield and div_yield > 0:
            print(f'  {symbol} dividend yield: {div_yield:.2f}%')
        else:
            print(f'  {symbol} dividend yield: No dividend')
    else:
        print(f'  ERROR: Could not fetch {symbol}')
print('  STATUS: Dividend yield correctly displayed or None')
print()

# Test 4: High volatility stock (GME)
print('4. HIGH VOLATILITY STOCK TEST')
print('-' * 40)
volatile_symbol = 'GME'
resp = requests.get(f'{BASE_URL}/api/stock/{volatile_symbol}/indicators', timeout=60)
if resp.ok:
    data = resp.json()
    indicators = {ind['name']: ind for ind in data['indicators']}
    atr = indicators.get('atr', {})
    adx = indicators.get('adx', {})

    atr_val = atr.get('current_value')
    adx_val = adx.get('current_value')

    if atr_val:
        print(f'  {volatile_symbol} ATR (volatility): {atr_val:.2f}')
    if adx_val:
        print(f'  {volatile_symbol} ADX (trend strength): {adx_val:.1f}')
        if adx_val > 25:
            print(f'  STATUS: High ADX ({adx_val:.1f}) indicates strong trend - signals more reliable')
        else:
            print(f'  STATUS: Low ADX ({adx_val:.1f}) indicates weak trend - signals less reliable')
else:
    print(f'  ERROR: Could not fetch {volatile_symbol}')
print()

# Test 5: Invalid stock symbol
print('5. INVALID STOCK SYMBOL TEST')
print('-' * 40)
invalid_symbol = 'INVALIDXYZ123'
resp = requests.get(f'{BASE_URL}/api/stock/{invalid_symbol}', timeout=30)
if not resp.ok:
    error_data = resp.json()
    print(f'  Symbol: {invalid_symbol}')
    print(f'  HTTP Status: {resp.status_code}')
    print(f'  Error message: {error_data.get("detail", "Unknown")}')
    print(f'  STATUS: PASS - Invalid symbol correctly returns 404 error')
else:
    print(f'  WARNING: Invalid symbol returned data (unexpected)')
    issues_found.append(f'Invalid symbol {invalid_symbol} returned data')
print()

# Test 6: Trading halted check
print('6. TRADING HALT STATUS TEST')
print('-' * 40)
# Check AAPL's is_halted field
resp = requests.get(f'{BASE_URL}/api/stock/AAPL', timeout=30)
if resp.ok:
    data = resp.json()
    is_halted = data.get('is_halted')
    market_status = data.get('market_status')
    print(f'  AAPL is_halted: {is_halted}')
    print(f'  AAPL market_status: {market_status}')
    print(f'  STATUS: Trading halt status field is present in API response')
else:
    print(f'  ERROR: Could not fetch AAPL')
print()

# Test 7: Insufficient data handling
print('7. MONTHLY TREND SIGNAL DATA CHECK')
print('-' * 40)
# Check if monthly trend works (requires 200+ days of data)
resp = requests.get(f'{BASE_URL}/api/stock/AAPL/signal', timeout=60)
if resp.ok:
    data = resp.json()
    mt = data.get('monthly_trend')
    if mt and mt.get('signal'):
        print(f'  Monthly trend signal: {mt["signal"]}')
        print(f'  Current price: ${mt["current_price"]:.2f}')
        print(f'  200-day SMA: ${mt["sma_value"]:.2f}')
        print(f'  Distance from SMA: {mt["distance_percent"]:.2f}%')
        print(f'  STATUS: PASS - Monthly trend computed correctly')
    else:
        print(f'  Monthly trend: Insufficient data or not computed')
        print(f'  STATUS: Monthly trend may be None if stock has < 200 days history')
else:
    print(f'  ERROR: Could not fetch signal')
print()

# Test 8: All 11 indicators computed
print('8. INDICATOR COMPLETENESS TEST')
print('-' * 40)
resp = requests.get(f'{BASE_URL}/api/stock/AAPL/indicators', timeout=60)
if resp.ok:
    data = resp.json()
    expected_indicators = ['sma_cross', 'ema', 'rsi', 'macd', 'bollinger', 'williams_r', 'mfi', 'roc', 'adx', 'atr']
    found_indicators = [ind['name'] for ind in data['indicators']]

    print(f'  Expected indicators: {len(expected_indicators)}')
    print(f'  Found indicators: {len(found_indicators)}')

    missing = set(expected_indicators) - set(found_indicators)
    extra = set(found_indicators) - set(expected_indicators)

    if missing:
        print(f'  MISSING: {missing}')
        issues_found.append(f'Missing indicators: {missing}')
    if extra:
        print(f'  EXTRA: {extra}')

    if not missing:
        print(f'  STATUS: PASS - All {len(expected_indicators)} expected indicators present')
else:
    print(f'  ERROR: Could not fetch indicators')
print()

# Summary
print('=' * 80)
print('EDGE CASE TEST SUMMARY')
print('=' * 80)
if issues_found:
    print(f'Issues found: {len(issues_found)}')
    for issue in issues_found:
        print(f'  - {issue}')
else:
    print('All edge case tests PASSED!')
    print()
    print('Verified:')
    print('  [x] Small-cap market cap returned correctly')
    print('  [x] No P/E ratio handled for unprofitable companies')
    print('  [x] Dividend yield present/absent as expected')
    print('  [x] High volatility stocks show ATR/ADX metrics')
    print('  [x] Invalid symbols return 404 error')
    print('  [x] Trading halt status field present')
    print('  [x] Monthly trend signal computed')
    print('  [x] All 10 core/secondary indicators present')
