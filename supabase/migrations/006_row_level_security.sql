-- Enable Row Level Security on all user-facing tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only read/write their own profile
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Portfolio: users can only CRUD their own positions
CREATE POLICY "Users can view own portfolio"
    ON portfolio_positions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own portfolio"
    ON portfolio_positions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolio"
    ON portfolio_positions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own portfolio"
    ON portfolio_positions FOR DELETE
    USING (auth.uid() = user_id);

-- Watchlist: users can only CRUD their own entries
CREATE POLICY "Users can view own watchlist"
    ON watchlist_entries FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watchlist"
    ON watchlist_entries FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watchlist"
    ON watchlist_entries FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlist"
    ON watchlist_entries FOR DELETE
    USING (auth.uid() = user_id);

-- Notifications: users can only view/update their own
CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- Signal history is readable by all (public data)
-- No RLS needed since it's not user-specific data
