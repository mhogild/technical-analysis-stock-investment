-- Saxo Bank OAuth token storage (encrypted at rest)

CREATE TABLE IF NOT EXISTS saxo_tokens (
    id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                       UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token                  TEXT NOT NULL,
    refresh_token                 TEXT NOT NULL,
    token_type                    TEXT NOT NULL DEFAULT 'Bearer',
    expires_at                    TIMESTAMPTZ NOT NULL,
    refresh_expires_at            TIMESTAMPTZ,
    saxo_client_key               TEXT,
    consecutive_refresh_failures  INTEGER NOT NULL DEFAULT 0,
    created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE saxo_tokens ENABLE ROW LEVEL SECURITY;

-- Backend accesses via service role key which bypasses RLS.
-- No user-facing RLS policies needed; frontend never queries this table.
