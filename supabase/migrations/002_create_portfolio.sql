-- Portfolio positions
CREATE TABLE IF NOT EXISTS portfolio_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    exchange TEXT NOT NULL DEFAULT '',
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    purchase_price NUMERIC NOT NULL CHECK (purchase_price >= 0),
    purchase_currency TEXT NOT NULL DEFAULT 'USD',
    purchase_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_portfolio_user_id ON portfolio_positions(user_id);
CREATE INDEX idx_portfolio_symbol ON portfolio_positions(symbol);
