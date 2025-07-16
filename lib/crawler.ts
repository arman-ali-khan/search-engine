import { supabase } from './supabase'

export interface CrawlJob {
  id: string
  website_id: string
  url: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  priority: number
  error_message?: string
  started_at?: string
  completed_at?: string
  created_at: string
}

export async function submitWebsite(data: {
  url: string
  sitemap_url?: string
  title: string
  description?: string
  owner_id: string
}) {
  const { data: website, error } = await supabase
    .from('websites')
    .insert(data)
    .select()
    .single()
  
  if (error) throw error
  
  // Add to crawl queue
  await supabase
    .from('crawl_queue')
    .insert({
      website_id: website.id,
      url: data.url,
      priority: 1
    })
  
  return website
}

export async function getCrawlQueue(status?: string) {
  let query = supabase
    .from('crawl_queue')
    .select(`
      *,
      websites (
        title,
        url,
        owner_id
      )
    `)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
  
  if (status) {
    query = query.eq('status', status)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function updateCrawlStatus(jobId: string, status: 'running' | 'completed' | 'failed', errorMessage?: string) {
  const updates: any = { status }
  
  if (status === 'running') {
    updates.started_at = new Date().toISOString()
  } else if (status === 'completed' || status === 'failed') {
    updates.completed_at = new Date().toISOString()
  }
  
  if (errorMessage) {
    updates.error_message = errorMessage
  }
  
  const { error } = await supabase
    .from('crawl_queue')
    .update(updates)
    .eq('id', jobId)
  
  if (error) throw error
}

export async function saveCrawledPage(data: {
  website_id: string
  url: string
  title?: string
  content?: string
  meta_description?: string
  page_type?: 'webpage' | 'image' | 'video' | 'news'
  images?: any[]
  videos?: any[]
  structured_data?: any
}) {
  const { error } = await supabase
    .from('pages')
    .upsert(data, {
      onConflict: 'url'
    })
  
  if (error) throw error
}

// Mock crawler function - in production, this would be a more sophisticated crawler
export async function runCrawler(jobId: string) {
  try {
    await updateCrawlStatus(jobId, 'running')
    
    const { data: job, error } = await supabase
      .from('crawl_queue')
      .select(`
        *,
        websites (*)
      `)
      .eq('id', jobId)
      .single()
    
    if (error) throw error
    
    // Simulate crawling
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Mock crawled data
    await saveCrawledPage({
      website_id: job.website_id,
      url: job.url,
      title: `Page from ${job.url}`,
      content: `This is the content from ${job.url}. It contains relevant information about the website.`,
      meta_description: `Meta description for ${job.url}`,
      page_type: 'webpage'
    })
    
    await updateCrawlStatus(jobId, 'completed')
    
    // Update website last crawled time
    await supabase
      .from('websites')
      .update({ last_crawled_at: new Date().toISOString() })
      .eq('id', job.website_id)
    
  } catch (error) {
    await updateCrawlStatus(jobId, 'failed', error instanceof Error ? error.message : 'Unknown error')
  }
}