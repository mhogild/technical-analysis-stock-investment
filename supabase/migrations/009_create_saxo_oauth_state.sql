-- Saxo OAuth CSRF state parameter storage

CREATE TABLE IF NOT EXISTS saxo_oauth_state (
    state       TEXT PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_saxo_oauth_state_expires_at ON saxo_oauth_state(expires_at);

ALTER TABLE saxo_oauth_state ENABLE ROW LEVEL SECURITY;

-- Backend accesses via service role key which bypasses RLS.
-- No user-facing RLS policies needed; frontend never queries this table.
