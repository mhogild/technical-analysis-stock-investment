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

# Saxo OpenAPI
SAXO_APP_KEY = os.getenv("SAXO_APP_KEY", "")
SAXO_APP_SECRET = os.getenv("SAXO_APP_SECRET", "")
SAXO_REDIRECT_URI = os.getenv("SAXO_REDIRECT_URI", "http://localhost:8000/api/saxo/auth/callback")
SAXO_ENVIRONMENT = os.getenv("SAXO_ENVIRONMENT", "sim")
SAXO_TOKEN_ENCRYPTION_KEY = os.getenv("SAXO_TOKEN_ENCRYPTION_KEY", "")
SAXO_FRONTEND_REDIRECT_URL = os.getenv("SAXO_FRONTEND_REDIRECT_URL", "http://localhost:3000/settings?saxo=connected")

# Saxo URLs (derived from SAXO_ENVIRONMENT)
SAXO_BASE_URL = (
    "https://gateway.saxobank.com/sim/openapi"
    if SAXO_ENVIRONMENT == "sim"
    else "https://gateway.saxobank.com/openapi"
)
SAXO_AUTH_URL = (
    "https://sim.logonvalidation.net/authorize"
    if SAXO_ENVIRONMENT == "sim"
    else "https://live.logonvalidation.net/authorize"
)
SAXO_TOKEN_URL = (
    "https://sim.logonvalidation.net/token"
    if SAXO_ENVIRONMENT == "sim"
    else "https://live.logonvalidation.net/token"
)

# Saxo cache TTLs (seconds)
CACHE_TTL_SAXO_POSITIONS = 60
CACHE_TTL_SAXO_QUOTES = 15
CACHE_TTL_SAXO_INSTRUMENTS = 86400

# Saxo token refresh settings
SAXO_REFRESH_BUFFER_SECONDS = 300
SAXO_CIRCUIT_BREAKER_LIMIT = 2
