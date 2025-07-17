/*
# Fix Search Logs RLS Policy

## Changes
- Create a unified RLS policy that allows both authenticated and anonymous users to log searches
- Authenticated users can log with their user_id
- Anonymous users can log with null user_id

## Security
- Maintains data integrity by ensuring proper user_id handling
- Allows search functionality for all users
*/

-- Drop existing search logs policies
DROP POLICY IF EXISTS "Users can view own search logs" ON search_logs;
DROP POLICY IF EXISTS "Authenticated users can create search logs" ON search_logs;
DROP POLICY IF EXISTS "Anonymous users can create search logs" ON search_logs;

-- Create new unified policies
CREATE POLICY "Users can view own search logs" ON search_logs
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow search log creation" ON search_logs
    FOR INSERT TO public WITH CHECK (
        (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR 
        (auth.uid() IS NULL AND user_id IS NULL)
    );