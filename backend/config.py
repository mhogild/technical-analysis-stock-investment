import os
from dotenv import load_dotenv

load_dotenv()

# Indicator Parameters
SMA_SHORT = 50
SMA_LONG = 200
EMA_SHORT = 12
EMA_LONG = 26
RSI_PERIOD = 14
MACD_FAST = 12
MACD_SLOW = 26
MACD_SIGNAL = 9
BB_PERIOD = 20
BB_STD = 2
WILLIAMS_PERIOD = 14
MFI_PERIOD = 14
ROC_PERIOD = 9
ADX_PERIOD = 14
ATR_PERIOD = 14
MONTHLY_SMA_PERIOD = 200  # ~10 months of trading days

# Cache TTL (seconds)
CACHE_TTL_PRICE = 4 * 60 * 60       # 4 hours for price data
CACHE_TTL_INFO = 24 * 60 * 60       # 24 hours for company info
CACHE_TTL_INDICATORS = 4 * 60 * 60  # 4 hours for computed indicators

# API Settings
MAX_SEARCH_RESULTS = 20
SMALL_CAP_THRESHOLD = 10_000_000_000  # $10B — below this, show reliability warning

# Signal Weights (evidence-based)
WEIGHT_MOMENTUM = 0.35    # Williams %R, RSI, MFI
WEIGHT_TREND = 0.35       # SMA cross, EMA, MACD
WEIGHT_VOLATILITY = 0.15  # Bollinger Bands
WEIGHT_VOLUME = 0.15      # ROC, VWAP

# ADX Confidence Thresholds
ADX_STRONG_TREND = 25
ADX_MODERATE_TREND = 20

# Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# SMTP
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
