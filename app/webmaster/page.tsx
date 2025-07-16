'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/Header'
import { getCurrentUser, User } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase'
import { Globe, Clock, CheckCircle, XCircle, RefreshCw, BarChart } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

interface WebsiteData {
  id: string
  url: string
  title: string
  description: string
  verified: boolean
  last_crawled_at: string
  created_at: string
  page_count: number
  crawl_status: string
}

export default function WebmasterPage() {
  const [user, setUser] = useState<User | null>(null)
  const [websites, setWebsites] = useState<WebsiteData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadWebsites()
    }
  }, [user])

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      console.error('Error loading user:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadWebsites = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('websites')
        .select(`
          *,
          pages(count)
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const websitesWithCounts = data.map(website => ({
        ...website,
        page_count: website.pages?.[0]?.count || 0,
        crawl_status: website.last_crawled_at ? 'completed' : 'pending'
      }))

      setWebsites(websitesWithCounts as WebsiteData[])
    } catch (error) {
      console.error('Error loading websites:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Webmaster Tools</h1>
            <p className="text-xl text-gray-600 mb-8">
              Please sign in to access your webmaster dashboard.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/auth/signin">
                <Button>Sign In</Button>
              </Link>
              <Link href="/auth/signup">
                <Button variant="outline">Sign Up</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Webmaster Tools</h1>
            <p className="text-gray-600 mt-2">Manage your websites and monitor crawl performance</p>
          </div>
          <Link href="/submit">
            <Button className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Submit Website
            </Button>
          </Link>
        </div>

        <Tabs defaultValue="websites" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="websites">My Websites</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="websites" className="mt-8">
            {websites.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Globe className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No websites submitted yet</h3>
                  <p className="text-gray-600 text-center mb-6">
                    Submit your first website to get started with our search engine.
                  </p>
                  <Link href="/submit">
                    <Button>Submit Your Website</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {websites.map((website) => (
                  <Card key={website.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2">
                            <Globe className="h-5 w-5 text-blue-600" />
                            {website.title}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            <a 
                              href={website.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              {website.url}
                            </a>
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={website.verified ? "default" : "secondary"}>
                            {website.verified ? "Verified" : "Pending"}
                          </Badge>
                          <Badge variant={website.crawl_status === 'completed' ? "default" : "secondary"}>
                            {website.crawl_status === 'completed' ? 'Crawled' : 'Pending'}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2">
                          <BarChart className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            {website.page_count} pages indexed
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            {website.last_crawled_at 
                              ? `Last crawled ${formatDistanceToNow(new Date(website.last_crawled_at), { addSuffix: true })}`
                              : 'Never crawled'
                            }
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">
                            Added {formatDistanceToNow(new Date(website.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      
                      {website.description && (
                        <p className="text-gray-700 mt-4">{website.description}</p>
                      )}
                      
                      <div className="flex gap-2 mt-4">
                        <Button variant="outline" size="sm">
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Re-crawl
                        </Button>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="mt-8">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Search Performance</CardTitle>
                  <CardDescription>How your websites are performing in search results</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <BarChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Analytics coming soon</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-8">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Account Settings</CardTitle>
                  <CardDescription>Manage your webmaster account preferences</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <p className="text-gray-900">{user.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Account Role
                      </label>
                      <Badge variant="outline" className="capitalize">
                        {user.role}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}