/*
# Fix Search Function to Include indexed_at

## Changes
- Drop existing search_pages function first to avoid return type conflict
- Recreate function with indexed_at field included
- This fixes the date formatting error in the frontend

## Security
- No security changes, only adding missing field to search results
*/

-- Drop the existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS search_pages(text, page_type, integer, integer);

-- Recreate the search_pages function with indexed_at included
CREATE OR REPLACE FUNCTION search_pages(
    search_query text,
    page_type_filter page_type DEFAULT NULL,
    limit_count integer DEFAULT 10,
    offset_count integer DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    website_id uuid,
    url text,
    title text,
    content text,
    meta_description text,
    page_type page_type,
    images jsonb,
    videos jsonb,
    website_title text,
    website_url text,
    indexed_at timestamptz,
    rank real
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.website_id,
        p.url,
        p.title,
        p.content,
        p.meta_description,
        p.page_type,
        p.images,
        p.videos,
        w.title as website_title,
        w.url as website_url,
        p.indexed_at,
        ts_rank(to_tsvector('english', p.title || ' ' || p.content), plainto_tsquery('english', search_query)) as rank
    FROM pages p
    JOIN websites w ON p.website_id = w.id
    WHERE 
        to_tsvector('english', p.title || ' ' || p.content) @@ plainto_tsquery('english', search_query)
        AND (page_type_filter IS NULL OR p.page_type = page_type_filter)
    ORDER BY rank DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;