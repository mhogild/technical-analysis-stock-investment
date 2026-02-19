import requests
import json
from datetime import datetime
from collections import Counter

# Test stocks from the test suite
test_stocks = [
    # US Large-Cap Tech
    ('AAPL', 'Apple Inc.', 'NASDAQ'),
    ('MSFT', 'Microsoft Corporation', 'NASDAQ'),
    ('GOOGL', 'Alphabet Inc.', 'NASDAQ'),
    ('AMZN', 'Amazon.com Inc.', 'NASDAQ'),
    ('NVDA', 'NVIDIA Corporation', 'NASDAQ'),
    # US Large-Cap Diversified
    ('JPM', 'JPMorgan Chase', 'NYSE'),
    ('JNJ', 'Johnson & Johnson', 'NYSE'),
    ('PG', 'Procter & Gamble', 'NYSE'),
    ('XOM', 'Exxon Mobil', 'NYSE'),
    ('KO', 'Coca-Cola', 'NYSE'),
    # Mid-Cap
    ('CRWD', 'CrowdStrike', 'NASDAQ'),
    ('ABNB', 'Airbnb', 'NASDAQ'),
    ('PANW', 'Palo Alto Networks', 'NASDAQ'),
    # Edge Cases
    ('GME', 'GameStop', 'NYSE'),
    ('PLTR', 'Palantir', 'NYSE'),
    ('T', 'AT&T', 'NYSE'),
    ('RIVN', 'Rivian', 'NASDAQ'),
]

BASE_URL = 'http://localhost:8000'
results = []

print(f'Testing {len(test_stocks)} stocks...')
print('=' * 80)

for symbol, name, expected_exchange in test_stocks:
    try:
        # Test stock info
        info_resp = requests.get(f'{BASE_URL}/api/stock/{symbol}', timeout=30)
        info = info_resp.json() if info_resp.ok else None

        # Test signal
        signal_resp = requests.get(f'{BASE_URL}/api/stock/{symbol}/signal', timeout=60)
        signal = signal_resp.json() if signal_resp.ok else None

        if info and signal:
            cons = signal['consolidated']
            mt = signal['monthly_trend']
            print(f'OK {symbol}: {cons["signal"]} (score: {cons["score"]:.3f})')
            print(f'  Price: ${info["current_price"]:.2f} | Monthly: {mt["signal"]}')
            print(f'  ADX: {cons["adx_value"]:.1f} ({cons["adx_confidence"]})')
            print(f'  Buy: {cons["buy_count"]} | Neutral: {cons["neutral_count"]} | Sell: {cons["sell_count"]}')
            results.append({
                'symbol': symbol,
                'name': info.get('name', name),
                'price': info['current_price'],
                'signal': cons['signal'],
                'score': cons['score'],
                'monthly_trend': mt['signal'],
                'adx': cons['adx_value'],
                'adx_confidence': cons['adx_confidence'],
                'status': 'OK'
            })
        else:
            print(f'FAIL {symbol}: Error fetching data')
            results.append({'symbol': symbol, 'status': 'ERROR'})
    except Exception as e:
        print(f'FAIL {symbol}: Exception - {str(e)[:50]}')
        results.append({'symbol': symbol, 'status': f'ERROR: {str(e)[:30]}'})
    print()

# Summary
print('=' * 80)
print('SUMMARY')
print('=' * 80)
ok_count = sum(1 for r in results if r['status'] == 'OK')
print(f'Successful tests: {ok_count}/{len(test_stocks)}')

# Signal distribution
signals = [r['signal'] for r in results if r['status'] == 'OK']
signal_counts = Counter(signals)
print(f'Signal distribution: {dict(signal_counts)}')

# Monthly trend distribution
trends = [r['monthly_trend'] for r in results if r['status'] == 'OK']
trend_counts = Counter(trends)
print(f'Monthly trends: {dict(trend_counts)}')

# Print detailed results table
print()
print('=' * 80)
print('DETAILED RESULTS')
print('=' * 80)
print(f'{"Symbol":<8} {"Price":>10} {"Signal":<12} {"Score":>7} {"Monthly":<10} {"ADX":>6} {"Confidence":<10}')
print('-' * 80)
for r in results:
    if r['status'] == 'OK':
        print(f'{r["symbol"]:<8} ${r["price"]:>8.2f} {r["signal"]:<12} {r["score"]:>7.3f} {r["monthly_trend"]:<10} {r["adx"]:>6.1f} {r["adx_confidence"]:<10}')
