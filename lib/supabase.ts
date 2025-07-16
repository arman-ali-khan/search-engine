import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database
export type Database = {
  public: {
    Tables: {
      websites: {
        Row: {
          id: string
          owner_id: string
          url: string
          sitemap_url?: string
          title: string
          description?: string
          verified: boolean
          last_crawled_at?: string
          crawl_frequency?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          url: string
          sitemap_url?: string
          title: string
          description?: string
          verified?: boolean
          last_crawled_at?: string
          crawl_frequency?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          url?: string
          sitemap_url?: string
          title?: string
          description?: string
          verified?: boolean
          last_crawled_at?: string
          crawl_frequency?: string
          updated_at?: string
        }
      }
      pages: {
        Row: {
          id: string
          website_id: string
          url: string
          title?: string
          content?: string
          meta_description?: string
          page_type: 'webpage' | 'image' | 'video' | 'news'
          images?: any
          videos?: any
          structured_data?: any
          indexed_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          website_id: string
          url: string
          title?: string
          content?: string
          meta_description?: string
          page_type?: 'webpage' | 'image' | 'video' | 'news'
          images?: any
          videos?: any
          structured_data?: any
          indexed_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          website_id?: string
          url?: string
          title?: string
          content?: string
          meta_description?: string
          page_type?: 'webpage' | 'image' | 'video' | 'news'
          images?: any
          videos?: any
          structured_data?: any
          indexed_at?: string
          updated_at?: string
        }
      }
      search_logs: {
        Row: {
          id: string
          user_id?: string
          query: string
          search_type: string
          result_count: number
          clicked_result_id?: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          query: string
          search_type?: string
          result_count?: number
          clicked_result_id?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          query?: string
          search_type?: string
          result_count?: number
          clicked_result_id?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          email: string
          role: 'admin' | 'webmaster' | 'user'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          role?: 'admin' | 'webmaster' | 'user'
          created_at?: string
          updated_at?: string
        }
        Update: {
          email?: string
          role?: 'admin' | 'webmaster' | 'user'
          updated_at?: string
        }
      }
    }
  }
}

export type Website = Database['public']['Tables']['websites']['Row']
export type Page = Database['public']['Tables']['pages']['Row']
export type SearchLog = Database['public']['Tables']['search_logs']['Row']
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']