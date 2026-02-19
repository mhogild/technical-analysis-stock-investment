"""
Validate that signal logic matches documented rules in expected-behaviors.md
"""
import requests
import json

BASE_URL = 'http://localhost:8000'

# Test a few stocks to validate signal rules
test_symbols = ['AAPL', 'NVDA', 'XOM', 'CRWD', 'GME']

print('=' * 80)
print('SIGNAL LOGIC VALIDATION')
print('=' * 80)
print()

all_validations = []

for symbol in test_symbols:
    print(f'Validating {symbol}...')
    print('-' * 40)

    # Get indicators
    indicators_resp = requests.get(f'{BASE_URL}/api/stock/{symbol}/indicators', timeout=60)
    if not indicators_resp.ok:
        print(f'  ERROR: Could not fetch indicators')
        continue

    data = indicators_resp.json()
    indicators = {ind['name']: ind for ind in data['indicators']}

    validations = []

    # RSI validation: <30 = Buy, >70 = Sell, else Neutral
    rsi = indicators.get('rsi', {})
    rsi_val = rsi.get('current_value')
    rsi_signal = rsi.get('signal')
    if rsi_val is not None:
        expected = 'Buy' if rsi_val < 30 else ('Sell' if rsi_val > 70 else 'Neutral')
        valid = rsi_signal == expected
        validations.append(('RSI', rsi_val, rsi_signal, expected, valid))
        status = 'OK' if valid else 'FAIL'
        print(f'  RSI: {rsi_val:.1f} -> {rsi_signal} (expected: {expected}) [{status}]')

    # Williams %R: <-80 = Buy, >-20 = Sell, else Neutral
    wr = indicators.get('williams_r', {})
    wr_val = wr.get('current_value')
    wr_signal = wr.get('signal')
    if wr_val is not None:
        expected = 'Buy' if wr_val < -80 else ('Sell' if wr_val > -20 else 'Neutral')
        valid = wr_signal == expected
        validations.append(('Williams %R', wr_val, wr_signal, expected, valid))
        status = 'OK' if valid else 'FAIL'
        print(f'  Williams %R: {wr_val:.1f} -> {wr_signal} (expected: {expected}) [{status}]')

    # MFI: <20 = Buy, >80 = Sell, else Neutral
    mfi = indicators.get('mfi', {})
    mfi_val = mfi.get('current_value')
    mfi_signal = mfi.get('signal')
    if mfi_val is not None:
        expected = 'Buy' if mfi_val < 20 else ('Sell' if mfi_val > 80 else 'Neutral')
        valid = mfi_signal == expected
        validations.append(('MFI', mfi_val, mfi_signal, expected, valid))
        status = 'OK' if valid else 'FAIL'
        print(f'  MFI: {mfi_val:.1f} -> {mfi_signal} (expected: {expected}) [{status}]')

    # ROC: >0 = Buy, <0 = Sell, =0 = Neutral
    roc = indicators.get('roc', {})
    roc_val = roc.get('current_value')
    roc_signal = roc.get('signal')
    if roc_val is not None:
        expected = 'Buy' if roc_val > 0 else ('Sell' if roc_val < 0 else 'Neutral')
        valid = roc_signal == expected
        validations.append(('ROC', roc_val, roc_signal, expected, valid))
        status = 'OK' if valid else 'FAIL'
        print(f'  ROC: {roc_val:.2f} -> {roc_signal} (expected: {expected}) [{status}]')

    # ADX confidence: >25 = high, 20-25 = moderate, <20 = low
    adx = indicators.get('adx', {})
    adx_val = adx.get('current_value')
    if adx_val is not None:
        expected_conf = 'high' if adx_val > 25 else ('moderate' if adx_val > 20 else 'low')
        # ADX doesn't have buy/sell signal, it modifies confidence
        print(f'  ADX: {adx_val:.1f} -> confidence should be {expected_conf}')

    all_validations.extend(validations)
    print()

# Summary
print('=' * 80)
print('SIGNAL VALIDATION SUMMARY')
print('=' * 80)
total = len(all_validations)
passed = sum(1 for v in all_validations if v[4])
print(f'Total validations: {total}')
print(f'Passed: {passed}')
print(f'Failed: {total - passed}')

if total - passed > 0:
    print()
    print('FAILED VALIDATIONS:')
    for indicator, value, actual, expected, valid in all_validations:
        if not valid:
            print(f'  {indicator}: value={value:.2f}, got={actual}, expected={expected}')
else:
    print()
    print('All signal logic validations PASSED!')

# Test consolidated signal calculation
print()
print('=' * 80)
print('CONSOLIDATED SIGNAL VALIDATION')
print('=' * 80)

# Get signal endpoint and verify score mapping
for symbol in ['AAPL', 'XOM']:
    signal_resp = requests.get(f'{BASE_URL}/api/stock/{symbol}/signal', timeout=60)
    if signal_resp.ok:
        data = signal_resp.json()
        cons = data['consolidated']
        score = cons['score']
        signal = cons['signal']

        # Verify score -> signal mapping
        if score >= 0.6:
            expected_signal = 'Strong Buy'
        elif score >= 0.2:
            expected_signal = 'Buy'
        elif score > -0.2:
            expected_signal = 'Hold'
        elif score > -0.6:
            expected_signal = 'Sell'
        else:
            expected_signal = 'Strong Sell'

        valid = signal == expected_signal
        status = 'OK' if valid else 'FAIL'
        print(f'{symbol}: score={score:.3f} -> {signal} (expected: {expected_signal}) [{status}]')

        # Verify ADX confidence
        adx_val = cons['adx_value']
        adx_conf = cons['adx_confidence']
        expected_conf = 'high' if adx_val > 25 else ('moderate' if adx_val > 20 else 'low')
        conf_valid = adx_conf == expected_conf
        conf_status = 'OK' if conf_valid else 'FAIL'
        print(f'  ADX confidence: {adx_val:.1f} -> {adx_conf} (expected: {expected_conf}) [{conf_status}]')
