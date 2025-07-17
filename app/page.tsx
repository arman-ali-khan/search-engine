'use client'

import { useState } from 'react'
import { useEffect } from 'react'
import { SearchBox } from '@/components/SearchBox'
import { SearchResults } from '@/components/SearchResults'
import { Header } from '@/components/Header'
import { getCurrentUser } from '@/lib/auth'
import { Search } from 'lucide-react'

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await getCurrentUser()
        setUserId(user?.id || null)
      } catch (error) {
        // User not authenticated, keep userId as null
        setUserId(null)
      }
    }
    loadUser()
  }, [])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setHasSearched(true)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {!hasSearched ? (
          // Homepage with centered search
          <div className="flex flex-col items-center justify-center min-h-[80vh]">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Search className="h-12 w-12 text-blue-600" />
                <h1 className="text-6xl font-bold text-gray-900">SearchEngine</h1>
              </div>
              <p className="text-xl text-gray-600 max-w-2xl">
                Discover the web with AI-powered search. Find websites, images, videos, and news all in one place.
              </p>
            </div>
            
            <div className="w-full max-w-2xl">
              <SearchBox
                onSearch={handleSearch}
                placeholder="Search the web..."
                className="w-full"
              />
            </div>
            
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500 mb-4">
                Want to add your website to our index?
              </p>
              <a
                href="/submit"
                className="inline-flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-800 transition-colors"
              >
                Submit your website
              </a>
            </div>
          </div>
        ) : (
          // Search results page
          <div className="py-8">
            <div className="mb-8">
              <SearchBox
                onSearch={handleSearch}
                placeholder="Search the web..."
                className="max-w-2xl"
              />
            </div>
            
            <SearchResults query={searchQuery} userId={userId} />
          </div>
        )}
      </main>
    </div>
  )
}