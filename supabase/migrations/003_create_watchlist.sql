-- Watchlist entries
CREATE TABLE IF NOT EXISTS watchlist_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    exchange TEXT NOT NULL DEFAULT '',
    notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, symbol, exchange)
);

CREATE INDEX idx_watchlist_user_id ON watchlist_entries(user_id);
CREATE INDEX idx_watchlist_symbol ON watchlist_entries(symbol);
