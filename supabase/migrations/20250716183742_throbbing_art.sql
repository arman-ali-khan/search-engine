/*
# Fix crawl_queue INSERT policy

1. Security Changes
   - Add missing INSERT policy for crawl_queue table
   - Allow website owners to add crawl jobs for their own websites
*/

-- Add missing INSERT policy for crawl_queue
CREATE POLICY "Website owners can add to crawl queue" ON crawl_queue 
    FOR INSERT TO authenticated 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM websites w 
            WHERE w.id = crawl_queue.website_id 
            AND w.owner_id = auth.uid()
        )
    );