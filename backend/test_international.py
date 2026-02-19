import requests
import json
from collections import Counter

# International stocks
intl_stocks = [
    # European
    ('NOVO-B.CO', 'Novo Nordisk', 'OMX Copenhagen'),
    ('ASML.AS', 'ASML Holding', 'Euronext Amsterdam'),
    ('SAP.DE', 'SAP SE', 'Deutsche Borse'),
    ('SHEL.L', 'Shell plc', 'London Stock Exchange'),
    ('MC.PA', 'LVMH', 'Euronext Paris'),
    # Asian
    ('7203.T', 'Toyota Motor', 'Tokyo Stock Exchange'),
    ('9988.HK', 'Alibaba Group', 'Hong Kong Exchange'),
    ('005930.KS', 'Samsung Electronics', 'Korea Exchange'),
]

BASE_URL = 'http://localhost:8000'
results = []

print(f'Testing {len(intl_stocks)} international stocks...')
print('=' * 80)

for symbol, name, exchange in intl_stocks:
    try:
        # Test stock info
        info_resp = requests.get(f'{BASE_URL}/api/stock/{symbol}', timeout=60)
        info = info_resp.json() if info_resp.ok else None

        # Test signal
        signal_resp = requests.get(f'{BASE_URL}/api/stock/{symbol}/signal', timeout=90)
        signal = signal_resp.json() if signal_resp.ok else None

        if info and signal:
            cons = signal['consolidated']
            mt = signal['monthly_trend']
            currency = info.get('currency', 'USD')
            print(f'OK {symbol}: {cons["signal"]} (score: {cons["score"]:.3f})')
            print(f'  Price: {currency} {info["current_price"]:.2f} | Exchange: {info.get("exchange", "N/A")}')
            print(f'  Monthly: {mt["signal"]} | ADX: {cons["adx_value"]:.1f} ({cons["adx_confidence"]})')
            results.append({
                'symbol': symbol,
                'name': info.get('name', name),
                'price': info['current_price'],
                'currency': currency,
                'exchange': info.get('exchange', 'N/A'),
                'signal': cons['signal'],
                'score': cons['score'],
                'monthly_trend': mt['signal'],
                'adx': cons['adx_value'],
                'status': 'OK'
            })
        else:
            error_detail = info_resp.json().get('detail', 'Unknown') if not info_resp.ok else signal_resp.json().get('detail', 'Unknown')
            print(f'FAIL {symbol}: {error_detail[:60]}')
            results.append({'symbol': symbol, 'status': f'ERROR: {error_detail[:30]}'})
    except Exception as e:
        print(f'FAIL {symbol}: Exception - {str(e)[:50]}')
        results.append({'symbol': symbol, 'status': f'ERROR: {str(e)[:30]}'})
    print()

# Summary
print('=' * 80)
print('INTERNATIONAL STOCKS SUMMARY')
print('=' * 80)
ok_count = sum(1 for r in results if r['status'] == 'OK')
print(f'Successful tests: {ok_count}/{len(intl_stocks)}')

if ok_count > 0:
    signals = [r['signal'] for r in results if r['status'] == 'OK']
    signal_counts = Counter(signals)
    print(f'Signal distribution: {dict(signal_counts)}')

    # Print results
    print()
    print(f'{"Symbol":<12} {"Exchange":<15} {"Currency":<6} {"Price":>12} {"Signal":<10}')
    print('-' * 65)
    for r in results:
        if r['status'] == 'OK':
            print(f'{r["symbol"]:<12} {r["exchange"]:<15} {r["currency"]:<6} {r["price"]:>12.2f} {r["signal"]:<10}')
