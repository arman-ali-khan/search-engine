/*
# Fix Search Logs RLS Policy

## Changes
- Update search logs policies to allow anonymous users to log searches
- Allow authenticated users to log searches with their user_id
- Allow anonymous users to log searches with null user_id

## Security
- Maintains data integrity by ensuring users can only log with their own ID or null
- Prevents unauthorized access to other users' search logs
*/

-- Drop existing search logs policies
DROP POLICY IF EXISTS "Users can view own search logs" ON search_logs;
DROP POLICY IF EXISTS "Users can create search logs" ON search_logs;

-- Create new policies that support both authenticated and anonymous users
CREATE POLICY "Users can view own search logs" ON search_logs
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create search logs" ON search_logs
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anonymous users can create search logs" ON search_logs
    FOR INSERT TO anon WITH CHECK (user_id IS NULL);