import { supabase } from './supabase'

// Adult content detection
const detectAdultContent = (url: string, title?: string, content?: string, description?: string): boolean => {
  const adultKeywords = [
    'porn', 'xxx', 'sex', 'adult', 'nude', 'naked', 'erotic', 'nsfw',
    'escort', 'dating', 'hookup', 'cam', 'webcam', 'strip', 'fetish',
    'milf', 'teen', 'mature', 'amateur', 'hardcore', 'softcore'
  ]
  
  const adultDomains = [
    'pornhub', 'xvideos', 'xhamster', 'redtube', 'youporn', 'tube8',
    'spankbang', 'xnxx', 'chaturbate', 'onlyfans', 'manyvids'
  ]
  
  const textToCheck = [url, title, content, description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  
  // Check for adult domains
  if (adultDomains.some(domain => url.toLowerCase().includes(domain))) {
    return true
  }
  
  // Check for adult keywords
  const keywordMatches = adultKeywords.filter(keyword => 
    textToCheck.includes(keyword)
  ).length
  
  // If multiple keywords found, likely adult content
  return keywordMatches >= 2
}

// Fetch and parse robots.txt
const fetchRobotsTxt = async (baseUrl: string): Promise<string[]> => {
  try {
    const robotsUrl = new URL('/robots.txt', baseUrl).toString()
    const response = await fetch(robotsUrl)
    if (!response.ok) return []
    
    const robotsText = await response.text()
    const disallowedPaths: string[] = []
    
    robotsText.split('\n').forEach(line => {
      const trimmed = line.trim().toLowerCase()
      if (trimmed.startsWith('disallow:')) {
        const path = trimmed.substring(9).trim()
        if (path && path !== '/') {
          disallowedPaths.push(path)
        }
      }
    })
    
    return disallowedPaths
  } catch (error) {
    console.error('Error fetching robots.txt:', error)
    return []
  }
}

// Check if URL is allowed by robots.txt
const isAllowedByRobots = (url: string, disallowedPaths: string[]): boolean => {
  const urlPath = new URL(url).pathname
  return !disallowedPaths.some(disallowed => urlPath.startsWith(disallowed))
}

// Fetch and parse sitemap
const fetchSitemap = async (sitemapUrl: string): Promise<string[]> => {
  try {
    const response = await fetch(sitemapUrl)
    if (!response.ok) return []
    
    const sitemapText = await response.text()
    const urls: string[] = []
    
    // Simple XML parsing for <loc> tags
    const locMatches = sitemapText.match(/<loc>(.*?)<\/loc>/g)
    if (locMatches) {
      locMatches.forEach(match => {
        const url = match.replace(/<\/?loc>/g, '').trim()
        if (url) urls.push(url)
      })
    }
    
    return urls
  } catch (error) {
    console.error('Error fetching sitemap:', error)
    return []
  }
}

// Crawl a single page
const crawlPage = async (url: string, websiteId: string): Promise<void> => {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const html = await response.text()
    
    // Simple HTML parsing
    const titleMatch = html.match(/<title>(.*?)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : ''
    
    const metaDescMatch = html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i)
    const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : ''
    
    // Extract text content (remove HTML tags)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 5000) // Limit content length
    
    // Extract images
    const imageMatches = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi) || []
    const images = imageMatches.slice(0, 10).map(img => {
      const srcMatch = img.match(/src=["']([^"']+)["']/)
      const altMatch = img.match(/alt=["']([^"']+)["']/)
      return {
        src: srcMatch ? srcMatch[1] : '',
        alt: altMatch ? altMatch[1] : ''
      }
    })
    
    // Check for adult content
    const isAdultContent = detectAdultContent(url, title, textContent, metaDescription)
    
    if (isAdultContent) {
      console.log(`Skipping adult content: ${url}`)
      return
    }
    
    // Determine page type
    let pageType: 'webpage' | 'image' | 'video' | 'news' = 'webpage'
    if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) pageType = 'image'
    else if (url.match(/\.(mp4|avi|mov|wmv|flv)$/i)) pageType = 'video'
    else if (html.includes('article') || html.includes('news') || title.toLowerCase().includes('news')) pageType = 'news'
    
    // Save to database
    await saveCrawledPage({
      website_id: websiteId,
      url,
      title: title || undefined,
      content: textContent || undefined,
      meta_description: metaDescription || undefined,
      page_type: pageType,
      images: images.length > 0 ? images : undefined
    })
    
  } catch (error) {
    console.error(`Error crawling ${url}:`, error)
    throw error
  }
}

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

// Enhanced crawler function with real crawling capabilities
export async function runCrawler(jobId: string) {
  try {
    await updateCrawlStatus(jobId, 'running')
    
    const { data: job, error } = await supabase
      .from('crawl_queue')
      .select(`
        *,
        websites (
          id,
          url,
          sitemap_url,
          title
        )
      `)
      .eq('id', jobId)
      .single()
    
    if (error) throw error
    
    const website = job.websites
    if (!website) {
      throw new Error('Website not found')
    }
    
    const baseUrl = website.url
    const sitemapUrl = website.sitemap_url
    
    // Check robots.txt
    const disallowedPaths = await fetchRobotsTxt(baseUrl)
    
    // Get URLs to crawl
    let urlsToCrawl: string[] = [baseUrl]
    
    // If sitemap is provided, use it
    if (sitemapUrl) {
      const sitemapUrls = await fetchSitemap(sitemapUrl)
      if (sitemapUrls.length > 0) {
        urlsToCrawl = sitemapUrls.filter(url => isAllowedByRobots(url, disallowedPaths))
      }
    }
    
    // Limit crawling to prevent overload
    urlsToCrawl = urlsToCrawl.slice(0, 50)
    
    // Crawl each URL
    let successCount = 0
    let errorCount = 0
    
    for (const url of urlsToCrawl) {
      try {
        await crawlPage(url, website.id)
        successCount++
        
        // Add delay between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        errorCount++
        console.error(`Failed to crawl ${url}:`, error)
      }
    }
    
    if (errorCount > 0 && successCount === 0) {
      throw new Error(`Failed to crawl any pages. Last error: ${errorCount} failures`)
    }
    
    console.log(`Crawling completed: ${successCount} success, ${errorCount} errors`)
    
    await updateCrawlStatus(jobId, 'completed')
    
    // Update website last crawled time
    await supabase
      .from('websites')
      .update({ last_crawled_at: new Date().toISOString() })
      .eq('id', website.id)
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    await updateCrawlStatus(jobId, 'failed', errorMessage)
    throw error
  }
}