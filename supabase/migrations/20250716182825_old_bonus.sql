/*
# Search Engine Database Schema

## 1. New Tables
- `websites` - Stores submitted websites with metadata
- `pages` - Individual crawled pages with content
- `search_logs` - Search query analytics
- `crawl_queue` - Background crawling jobs
- `ai_summaries` - Cached AI-generated summaries

## 2. Security
- Enable RLS on all tables
- Add policies for authenticated users and role-based access
- Webmaster can only access their own websites
- Admin can access all data

## 3. Features
- Full-text search capabilities
- Vector embeddings for AI search
- Crawling job management
- User role management
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'webmaster', 'user');
CREATE TYPE crawl_status AS ENUM ('pending', 'running', 'completed', 'failed');
CREATE TYPE page_type AS ENUM ('webpage', 'image', 'video', 'news');

-- Websites table
CREATE TABLE IF NOT EXISTS websites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    url text NOT NULL,
    sitemap_url text,
    title text NOT NULL,
    description text,
    verified boolean DEFAULT false,
    last_crawled_at timestamptz,
    crawl_frequency interval DEFAULT '1 day',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Pages table
CREATE TABLE IF NOT EXISTS pages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id uuid REFERENCES websites(id) ON DELETE CASCADE,
    url text NOT NULL UNIQUE,
    title text,
    content text,
    meta_description text,
    page_type page_type DEFAULT 'webpage',
    images jsonb DEFAULT '[]',
    videos jsonb DEFAULT '[]',
    structured_data jsonb DEFAULT '{}',
    content_vector vector(1536), -- For AI embeddings
    indexed_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Search logs table
CREATE TABLE IF NOT EXISTS search_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    query text NOT NULL,
    search_type text DEFAULT 'all',
    result_count integer DEFAULT 0,
    clicked_result_id uuid REFERENCES pages(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now()
);

-- Crawl queue table
CREATE TABLE IF NOT EXISTS crawl_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id uuid REFERENCES websites(id) ON DELETE CASCADE,
    url text NOT NULL,
    status crawl_status DEFAULT 'pending',
    priority integer DEFAULT 1,
    error_message text,
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- AI summaries table
CREATE TABLE IF NOT EXISTS ai_summaries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    query text NOT NULL,
    summary text NOT NULL,
    source_page_ids uuid[] DEFAULT '{}',
    model_used text DEFAULT 'gpt-3.5-turbo',
    created_at timestamptz DEFAULT now(),
    expires_at timestamptz DEFAULT (now() + interval '1 hour')
);

-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    role user_role DEFAULT 'user',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pages_content_search ON pages USING gin(to_tsvector('english', title || ' ' || content));
CREATE INDEX IF NOT EXISTS idx_pages_website_id ON pages(website_id);
CREATE INDEX IF NOT EXISTS idx_pages_url ON pages(url);
CREATE INDEX IF NOT EXISTS idx_pages_type ON pages(page_type);
CREATE INDEX IF NOT EXISTS idx_websites_owner_id ON websites(owner_id);
CREATE INDEX IF NOT EXISTS idx_search_logs_query ON search_logs(query);
CREATE INDEX IF NOT EXISTS idx_search_logs_created_at ON search_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_crawl_queue_status ON crawl_queue(status);

-- Enable Row Level Security
ALTER TABLE websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Websites policies
CREATE POLICY "Users can view all websites" ON websites
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create websites" ON websites
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own websites" ON websites
    FOR UPDATE TO authenticated USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own websites" ON websites
    FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- Pages policies
CREATE POLICY "Anyone can view pages" ON pages
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can manage pages" ON pages
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM websites w 
            WHERE w.id = pages.website_id 
            AND w.owner_id = auth.uid()
        ) OR 
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.id = auth.uid() 
            AND up.role = 'admin'
        )
    );

-- Search logs policies
CREATE POLICY "Users can view own search logs" ON search_logs
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create search logs" ON search_logs
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Crawl queue policies
CREATE POLICY "Website owners can view crawl queue" ON crawl_queue
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM websites w 
            WHERE w.id = crawl_queue.website_id 
            AND w.owner_id = auth.uid()
        ) OR 
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.id = auth.uid() 
            AND up.role = 'admin'
        )
    );

-- AI summaries policies
CREATE POLICY "Users can view AI summaries" ON ai_summaries
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can manage AI summaries" ON ai_summaries
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.id = auth.uid() 
            AND up.role IN ('admin', 'webmaster')
        )
    );

-- User profiles policies
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can create own profile" ON user_profiles
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Functions for search
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

-- Function to auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, role)
    VALUES (new.id, new.email, 'user');
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();