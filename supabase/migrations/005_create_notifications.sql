-- User notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    exchange TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL CHECK (type IN ('consolidated_change', 'indicator_crossing')),
    previous_signal TEXT NOT NULL,
    new_signal TEXT NOT NULL,
    explanation TEXT NOT NULL DEFAULT '',
    channel TEXT NOT NULL CHECK (channel IN ('email', 'inapp')) DEFAULT 'inapp',
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'read')) DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id, status);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
