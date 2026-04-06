-- Stock view counts for personal activity tracking (TRND-04, TRND-05)
-- Tracks how many times each user has viewed a stock's detail page.
-- user_id is required for RLS (personal data, user-scoped).
-- UNIQUE(user_id, symbol) enables upsert-on-conflict in the view tracking API.

CREATE TABLE IF NOT EXISTS stock_view_counts (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    symbol         TEXT NOT NULL,
    view_count     INTEGER NOT NULL DEFAULT 0,
    last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, symbol)
);

CREATE INDEX IF NOT EXISTS idx_stock_view_counts_user_id ON stock_view_counts(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_view_counts_symbol ON stock_view_counts(symbol);

-- Row Level Security: user-scoped (matches portfolio/watchlist pattern)
ALTER TABLE stock_view_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stock views"
    ON stock_view_counts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stock views"
    ON stock_view_counts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stock views"
    ON stock_view_counts FOR UPDATE
    USING (auth.uid() = user_id);
