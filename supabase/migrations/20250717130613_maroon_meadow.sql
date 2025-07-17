/*
# Fix Search Logs RLS Policy - Final Fix

## Changes
- Drop all existing search_logs policies
- Create a single unified policy that works for both authenticated and anonymous users
- Allow authenticated users to log with their user_id
- Allow anonymous users to log with null user_id

## Security
- Maintains data integrity by ensuring proper user_id handling
- Allows search functionality for all users (authenticated and anonymous)
*/

-- Drop all existing search logs policies to start fresh
DROP POLICY IF EXISTS "Users can view own search logs" ON search_logs;
DROP POLICY IF EXISTS "Users can create search logs" ON search_logs;
DROP POLICY IF EXISTS "Authenticated users can create search logs" ON search_logs;
DROP POLICY IF EXISTS "Anonymous users can create search logs" ON search_logs;
DROP POLICY IF EXISTS "Allow search log creation" ON search_logs;

-- Create view policy for authenticated users
CREATE POLICY "Users can view own search logs" ON search_logs
    FOR SELECT TO authenticated 
    USING (auth.uid() = user_id);

-- Create unified insert policy that works for both authenticated and anonymous users
CREATE POLICY "Allow search logging for all users" ON search_logs
    FOR INSERT TO public 
    WITH CHECK (
        -- Authenticated users can log with their user_id
        (auth.role() = 'authenticated' AND auth.uid() = user_id) OR 
        -- Anonymous users can log with null user_id
        (auth.role() = 'anon' AND user_id IS NULL)
    );