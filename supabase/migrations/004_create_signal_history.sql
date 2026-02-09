-- Signal history for change detection
CREATE TABLE IF NOT EXISTS signal_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL,
    exchange TEXT NOT NULL DEFAULT '',
    date DATE NOT NULL,
    consolidated_signal TEXT NOT NULL,
    consolidated_score NUMERIC NOT NULL,
    indicator_signals JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_signal_history_symbol_date ON signal_history(symbol, date DESC);
CREATE UNIQUE INDEX idx_signal_history_unique ON signal_history(symbol, exchange, date);
