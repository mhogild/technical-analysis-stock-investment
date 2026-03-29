-- Saxo instrument mapping: Uic -> Yahoo Finance ticker resolution
-- Used by SaxoInstrumentMapper to persist resolved mappings for reuse

CREATE TABLE IF NOT EXISTS saxo_instrument_map (
    uic             INTEGER NOT NULL,
    asset_type      TEXT NOT NULL,
    saxo_symbol     TEXT NOT NULL,
    saxo_exchange   TEXT,
    yahoo_ticker    TEXT,
    mapped          BOOLEAN NOT NULL DEFAULT FALSE,
    last_verified   TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (uic, asset_type)
);

-- Enable RLS (backend service role bypasses RLS; no user-facing policies needed)
ALTER TABLE saxo_instrument_map ENABLE ROW LEVEL SECURITY;

-- Index for lookups by yahoo_ticker (used when checking reverse mappings)
CREATE INDEX IF NOT EXISTS idx_saxo_instrument_map_yahoo_ticker
    ON saxo_instrument_map (yahoo_ticker)
    WHERE yahoo_ticker IS NOT NULL;
