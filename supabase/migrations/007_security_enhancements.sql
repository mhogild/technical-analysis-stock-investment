-- Enhanced security features for user accounts

-- Add security columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS two_factor_secret_encrypted TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMPTZ;

-- User sessions table for tracking active sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 minutes'),
    ip_address TEXT,
    user_agent TEXT,
    is_revoked BOOLEAN NOT NULL DEFAULT false
);

-- Index for efficient session lookups
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Login audit table for security monitoring
CREATE TABLE IF NOT EXISTS login_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    success BOOLEAN NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient audit lookups
CREATE INDEX IF NOT EXISTS idx_login_audit_user_id ON login_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_login_audit_email ON login_audit(email);
CREATE INDEX IF NOT EXISTS idx_login_audit_created_at ON login_audit(created_at);

-- Enable RLS on new tables
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_audit ENABLE ROW LEVEL SECURITY;

-- User sessions: users can only view their own sessions
CREATE POLICY "Users can view own sessions"
    ON user_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
    ON user_sessions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
    ON user_sessions FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
    ON user_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Login audit: users can only view their own audit logs
CREATE POLICY "Users can view own login audit"
    ON login_audit FOR SELECT
    USING (auth.uid() = user_id);

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions
    WHERE expires_at < now() OR is_revoked = true;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record login attempt
CREATE OR REPLACE FUNCTION record_login_attempt(
    p_email TEXT,
    p_success BOOLEAN,
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_failure_reason TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get user ID if exists
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;

    -- Record the attempt
    INSERT INTO login_audit (user_id, email, success, ip_address, user_agent, failure_reason)
    VALUES (v_user_id, p_email, p_success, p_ip_address, p_user_agent, p_failure_reason);

    -- Update failed login count if applicable
    IF NOT p_success AND v_user_id IS NOT NULL THEN
        UPDATE profiles
        SET failed_login_attempts = failed_login_attempts + 1,
            locked_until = CASE
                WHEN failed_login_attempts >= 4 THEN now() + INTERVAL '15 minutes'
                ELSE locked_until
            END
        WHERE id = v_user_id;
    ELSIF p_success AND v_user_id IS NOT NULL THEN
        -- Reset failed attempts on successful login
        UPDATE profiles
        SET failed_login_attempts = 0, locked_until = NULL
        WHERE id = v_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if account is locked
CREATE OR REPLACE FUNCTION is_account_locked(p_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_locked_until TIMESTAMPTZ;
BEGIN
    SELECT p.locked_until INTO v_locked_until
    FROM profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE u.email = p_email;

    IF v_locked_until IS NOT NULL AND v_locked_until > now() THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update session activity (extend expiry on activity)
CREATE OR REPLACE FUNCTION update_session_activity(p_session_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE user_sessions
    SET last_active_at = now(),
        expires_at = now() + INTERVAL '30 minutes'
    WHERE id = p_session_id
      AND user_id = auth.uid()
      AND NOT is_revoked
      AND expires_at > now();

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
