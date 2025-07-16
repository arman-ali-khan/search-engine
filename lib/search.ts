import { supabase } from './supabase'

export interface SearchResult {
  id: string
  website_id: string
  url: string
  title: string
  content: string
  meta_description: string
  page_type: 'webpage' | 'image' | 'video' | 'news'
  images: any[]
  videos: any[]
  website_title: string
  website_url: string
  rank: number
}

export interface SearchOptions {
  query: string
  type?: 'all' | 'images' | 'videos' | 'news'
  limit?: number
  offset?: number
}

export async function searchPages(options: SearchOptions): Promise<SearchResult[]> {
  const { query, type = 'all', limit = 10, offset = 0 } = options
  
  let pageTypeFilter = null
  if (type === 'images') pageTypeFilter = 'image'
  else if (type === 'videos') pageTypeFilter = 'video'
  else if (type === 'news') pageTypeFilter = 'news'
  
  const { data, error } = await supabase.rpc('search_pages', {
    search_query: query,
    page_type_filter: pageTypeFilter,
    limit_count: limit,
    offset_count: offset
  })
  
  if (error) throw error
  return data || []
}

export async function logSearch(query: string, searchType: string, resultCount: number, userId?: string) {
  const { error } = await supabase
    .from('search_logs')
    .insert({
      user_id: userId,
      query,
      search_type: searchType,
      result_count: resultCount
    })
  
  if (error) console.error('Failed to log search:', error)
}

export async function generateAISummary(query: string, topResults: SearchResult[]): Promise<string> {
  // This would integrate with OpenAI or similar AI service
  // For now, return a mock summary
  const relevantContent = topResults.slice(0, 3).map(r => r.content).join(' ')
  
  return `Based on the search results for "${query}", here are the key findings: ${relevantContent.slice(0, 200)}...`
}