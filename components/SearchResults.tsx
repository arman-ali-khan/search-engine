'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SearchResult, searchPages, logSearch, generateAISummary } from '@/lib/search'
import { Globe, Image, Video, Newspaper, ExternalLink, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface SearchResultsProps {
  query: string
  userId?: string
}

export function SearchResults({ query, userId }: SearchResultsProps) {
  const [results, setResults] = useState<SearchResult[]>([])
  const [imageResults, setImageResults] = useState<SearchResult[]>([])
  const [videoResults, setVideoResults] = useState<SearchResult[]>([])
  const [newsResults, setNewsResults] = useState<SearchResult[]>([])
  const [aiSummary, setAiSummary] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    if (query) {
      performSearch()
    }
  }, [query])

  const performSearch = async () => {
    setLoading(true)
    try {
      // Search all content
      const allResults = await searchPages({ query, type: 'all', limit: 20 })
      setResults(allResults)
      
      // Search specific types
      const [images, videos, news] = await Promise.all([
        searchPages({ query, type: 'images', limit: 10 }),
        searchPages({ query, type: 'videos', limit: 10 }),
        searchPages({ query, type: 'news', limit: 10 })
      ])
      
      setImageResults(images)
      setVideoResults(videos)
      setNewsResults(news)
      
      // Generate AI summary
      if (allResults.length > 0) {
        const summary = await generateAISummary(query, allResults)
        setAiSummary(summary)
      }
      
      // Log search
      await logSearch(query, 'all', allResults.length, userId)
      
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  const ResultCard = ({ result }: { result: SearchResult }) => (
    <Card className="mb-4 hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg text-blue-600 hover:text-blue-800 cursor-pointer">
              <a href={result.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                {result.title}
                <ExternalLink className="h-4 w-4" />
              </a>
            </CardTitle>
            <CardDescription className="text-green-600 text-sm mt-1">
              {result.website_url}
            </CardDescription>
          </div>
          <Badge variant="outline" className="ml-2">
            {result.page_type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700 mb-2">
          {result.meta_description || result.content?.slice(0, 200) + '...'}
        </p>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Globe className="h-4 w-4" />
            {result.website_title}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {formatDistanceToNow(new Date(result.indexed_at), { addSuffix: true })}
          </span>
        </div>
        
        {result.images && result.images.length > 0 && (
          <div className="mt-3 flex gap-2">
            {result.images.slice(0, 3).map((img: any, idx: number) => (
              <img
                key={idx}
                src={img.src || img}
                alt={img.alt || ''}
                className="w-16 h-16 object-cover rounded border"
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* AI Summary */}
      {aiSummary && (
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">AI</span>
              </div>
              AI Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{aiSummary}</p>
          </CardContent>
        </Card>
      )}

      {/* Search Results Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            All ({results.length})
          </TabsTrigger>
          <TabsTrigger value="images" className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            Images ({imageResults.length})
          </TabsTrigger>
          <TabsTrigger value="videos" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            Videos ({videoResults.length})
          </TabsTrigger>
          <TabsTrigger value="news" className="flex items-center gap-2">
            <Newspaper className="h-4 w-4" />
            News ({newsResults.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {results.length > 0 ? (
            <div>
              {results.map((result) => (
                <ResultCard key={result.id} result={result} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No results found for "{query}"</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="images" className="mt-6">
          {imageResults.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {imageResults.map((result) => (
                <Card key={result.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-square bg-gray-100 flex items-center justify-center">
                    <Image className="h-12 w-12 text-gray-400" />
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-medium text-sm truncate">{result.title}</h3>
                    <p className="text-xs text-gray-500 truncate">{result.website_title}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No images found for "{query}"</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="videos" className="mt-6">
          {videoResults.length > 0 ? (
            <div className="space-y-4">
              {videoResults.map((result) => (
                <Card key={result.id} className="flex hover:shadow-lg transition-shadow">
                  <div className="w-48 h-32 bg-gray-100 flex items-center justify-center">
                    <Video className="h-12 w-12 text-gray-400" />
                  </div>
                  <CardContent className="flex-1 p-4">
                    <h3 className="font-medium text-lg text-blue-600 hover:text-blue-800">
                      <a href={result.url} target="_blank" rel="noopener noreferrer">
                        {result.title}
                      </a>
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">{result.website_title}</p>
                    <p className="text-gray-700 mt-2">{result.meta_description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No videos found for "{query}"</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="news" className="mt-6">
          {newsResults.length > 0 ? (
            <div className="space-y-4">
              {newsResults.map((result) => (
                <Card key={result.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg text-blue-600 hover:text-blue-800">
                      <a href={result.url} target="_blank" rel="noopener noreferrer">
                        {result.title}
                      </a>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4">
                      <span className="text-green-600">{result.website_title}</span>
                      <span className="text-gray-500">
                        {formatDistanceToNow(new Date(result.indexed_at), { addSuffix: true })}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">{result.meta_description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No news found for "{query}"</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}