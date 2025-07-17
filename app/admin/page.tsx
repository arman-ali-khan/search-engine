'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/Header'
import { getCurrentUser, User, updateUserRole } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { getCrawlQueue, updateCrawlStatus, runCrawler } from '@/lib/crawler'
import { Shield, Users, Globe, Database, Activity, AlertTriangle, Search, RefreshCw, CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'react-hot-toast'
import Link from 'next/link'

interface AdminStats {
  totalUsers: number
  totalWebsites: number
  totalPages: number
  totalSearches: number
  pendingCrawls: number
}

interface AdminUser {
  id: string
  email: string
  role: 'admin' | 'webmaster' | 'user'
  created_at: string
  website_count: number
}

interface AdminWebsite {
  id: string
  url: string
  title: string
  description: string
  verified: boolean
  last_crawled_at: string
  created_at: string
  owner_email: string
  page_count: number
}

interface CrawlJob {
  id: string
  website_id: string
  url: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  priority: number
  error_message?: string
  started_at?: string
  completed_at?: string
  created_at: string
  website_title: string
  website_url: string
}

interface CrawledPage {
  id: string
  website_id: string
  url: string
  title: string
  content: string
  meta_description: string
  page_type: 'webpage' | 'image' | 'video' | 'news'
  indexed_at: string
  website_title: string
  website_url: string
  is_adult_content: boolean
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [websites, setWebsites] = useState<AdminWebsite[]>([])
  const [crawlJobs, setCrawlJobs] = useState<CrawlJob[]>([])
  const [crawledPages, setCrawledPages] = useState<CrawledPage[]>([])
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalWebsites: 0,
    totalPages: 0,
    totalSearches: 0,
    pendingCrawls: 0
  })
  const [loading, setLoading] = useState(true)
  const [usersLoading, setUsersLoading] = useState(false)
  const [websitesLoading, setWebsitesLoading] = useState(false)
  const [crawlLoading, setCrawlLoading] = useState(false)
  const [pagesLoading, setPagesLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAdultContent, setShowAdultContent] = useState(false)

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (user?.role === 'admin') {
      loadStats()
      loadUsers()
      loadWebsites()
      loadCrawlJobs()
      loadCrawledPages()
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

  const loadStats = async () => {
    try {
      const [usersResult, websitesResult, pagesResult, searchesResult, crawlsResult] = await Promise.all([
        supabase.from('user_profiles').select('id', { count: 'exact' }),
        supabase.from('websites').select('id', { count: 'exact' }),
        supabase.from('pages').select('id', { count: 'exact' }),
        supabase.from('search_logs').select('id', { count: 'exact' }),
        supabase.from('crawl_queue').select('id', { count: 'exact' }).eq('status', 'pending')
      ])

      setStats({
        totalUsers: usersResult.count || 0,
        totalWebsites: websitesResult.count || 0,
        totalPages: pagesResult.count || 0,
        totalSearches: searchesResult.count || 0,
        pendingCrawls: crawlsResult.count || 0
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const loadUsers = async () => {
    setUsersLoading(true)
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          websites!websites_owner_id_fkey(count)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const usersWithCounts = data.map(user => ({
        ...user,
        website_count: user.websites?.[0]?.count || 0
      }))

      setUsers(usersWithCounts as AdminUser[])
    } catch (error) {
      console.error('Error loading users:', error)
      toast.error('Failed to load users')
    } finally {
      setUsersLoading(false)
    }
  }

  const loadWebsites = async () => {
    setWebsitesLoading(true)
    try {
      const { data, error } = await supabase
        .from('websites')
        .select(`
          *,
          user_profiles!websites_owner_id_fkey(email),
          pages(count)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const websitesWithData = data.map(website => ({
        ...website,
        owner_email: website.user_profiles?.email || 'Unknown',
        page_count: website.pages?.[0]?.count || 0
      }))

      setWebsites(websitesWithData as AdminWebsite[])
    } catch (error) {
      console.error('Error loading websites:', error)
      toast.error('Failed to load websites')
    } finally {
      setWebsitesLoading(false)
    }
  }

  const loadCrawlJobs = async () => {
    setCrawlLoading(true)
    try {
      const jobs = await getCrawlQueue()
      const jobsWithWebsiteInfo = jobs.map(job => ({
        ...job,
        website_title: job.websites?.title || 'Unknown',
        website_url: job.websites?.url || job.url
      }))
      setCrawlJobs(jobsWithWebsiteInfo as CrawlJob[])
    } catch (error) {
      console.error('Error loading crawl jobs:', error)
      toast.error('Failed to load crawl jobs')
    } finally {
      setCrawlLoading(false)
    }
  }

  const loadCrawledPages = async () => {
    setPagesLoading(true)
    try {
      const { data, error } = await supabase
        .from('pages')
        .select(`
          *,
          websites!pages_website_id_fkey(title, url)
        `)
        .order('indexed_at', { ascending: false })
        .limit(1000) // Limit to prevent performance issues

      if (error) throw error

      const pagesWithWebsiteInfo = data.map(page => ({
        ...page,
        website_title: page.websites?.title || 'Unknown',
        website_url: page.websites?.url || '',
        is_adult_content: detectAdultContent(page.url, page.title, page.content, page.meta_description)
      }))

      setCrawledPages(pagesWithWebsiteInfo as CrawledPage[])
    } catch (error) {
      console.error('Error loading crawled pages:', error)
      toast.error('Failed to load crawled pages')
    } finally {
      setPagesLoading(false)
    }
  }

  // Simple adult content detection based on keywords and patterns
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

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'webmaster' | 'user') => {
    try {
      await updateUserRole(userId, newRole)
      toast.success('User role updated successfully')
      loadUsers()
    } catch (error) {
      console.error('Error updating user role:', error)
      toast.error('Failed to update user role')
    }
  }

  const handleDeleteWebsite = async (websiteId: string) => {
    if (!confirm('Are you sure you want to delete this website? This will also delete all associated pages.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('websites')
        .delete()
        .eq('id', websiteId)

      if (error) throw error
      
      toast.success('Website deleted successfully')
      loadWebsites()
      loadStats()
    } catch (error) {
      console.error('Error deleting website:', error)
      toast.error('Failed to delete website')
    }
  }

  const handleRunCrawler = async (jobId: string) => {
    try {
      await runCrawler(jobId)
      toast.success('Crawler started successfully')
      loadCrawlJobs()
    } catch (error) {
      console.error('Error running crawler:', error)
      toast.error('Failed to start crawler')
    }
  }

  const handleRetryJob = async (jobId: string) => {
    try {
      await updateCrawlStatus(jobId, 'pending')
      toast.success('Job queued for retry')
      loadCrawlJobs()
    } catch (error) {
      console.error('Error retrying job:', error)
      toast.error('Failed to retry job')
    }
  }

  const handleUpdateCrawlStatus = async (jobId: string, newStatus: 'pending' | 'running' | 'completed' | 'failed') => {
    try {
      await updateCrawlStatus(jobId, newStatus)
      toast.success(`Job status updated to ${newStatus}`)
      loadCrawlJobs()
      loadStats() // Refresh stats as pending crawls count may change
    } catch (error) {
      console.error('Error updating job status:', error)
      toast.error('Failed to update job status')
    }
  }

  const handleToggleWebsiteVerification = async (websiteId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('websites')
        .update({ verified: !currentStatus })
        .eq('id', websiteId)

      if (error) throw error
      
      toast.success(`Website ${!currentStatus ? 'verified' : 'unverified'} successfully`)
      loadWebsites()
      loadStats()
    } catch (error) {
      console.error('Error updating website verification:', error)
      toast.error('Failed to update website verification')
    }
  }

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredWebsites = websites.filter(website => 
    website.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    website.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
    website.owner_email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredCrawlJobs = crawlJobs.filter(job => 
    job.website_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.url.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredCrawledPages = crawledPages.filter(page => {
    const matchesSearch = page.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      page.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      page.website_title.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = showAdultContent || !page.is_adult_content
    
    return matchesSearch && matchesFilter
  })
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
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Admin Dashboard</h1>
            <p className="text-xl text-gray-600 mb-8">
              Please sign in to access the admin dashboard.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/auth/signin">
                <Button>Sign In</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-xl text-gray-600 mb-8">
              You don't have permission to access the admin dashboard.
            </p>
            <Link href="/">
              <Button>Go Home</Button>
            </Link>
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
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="h-8 w-8 text-blue-600" />
              Admin Dashboard
            </h1>
            <p className="text-gray-600 mt-2">Manage users, websites, and system performance</p>
          </div>
          <Badge variant="outline" className="text-sm">
            Admin Access
          </Badge>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Websites</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalWebsites}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Indexed Pages</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPages}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Searches</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSearches}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Crawls</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingCrawls}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users" onClick={loadUsers}>Users</TabsTrigger>
            <TabsTrigger value="websites" onClick={loadWebsites}>Websites</TabsTrigger>
            <TabsTrigger value="crawling" onClick={loadCrawlJobs}>Crawling</TabsTrigger>
            <TabsTrigger value="pages" onClick={loadCrawledPages}>Crawled URLs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-8">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Overview</CardTitle>
                  <CardDescription>
                    Monitor the overall health and performance of the search engine
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">System Status</span>
                      <Badge variant="default" className="bg-green-600">Operational</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Database Status</span>
                      <Badge variant="default" className="bg-green-600">Connected</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Crawler Status</span>
                      <Badge variant="default" className="bg-green-600">Running</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="mt-8">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>User Management</CardTitle>
                      <CardDescription>
                        Manage user accounts and permissions
                      </CardDescription>
                    </div>
                    <Button onClick={loadUsers} disabled={usersLoading}>
                      <RefreshCw className={`h-4 w-4 mr-2 ${usersLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search users by email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  {usersLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Websites</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.email}</TableCell>
                            <TableCell>
                              <Select
                                value={user.role}
                                onValueChange={(value: 'admin' | 'webmaster' | 'user') => 
                                  handleRoleChange(user.id, value)
                                }
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">User</SelectItem>
                                  <SelectItem value="webmaster">Webmaster</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>{user.website_count}</TableCell>
                            <TableCell>
                              {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {user.role}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="websites" className="mt-8">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Website Management</CardTitle>
                      <CardDescription>
                        Monitor and manage all indexed websites
                      </CardDescription>
                    </div>
                    <Button onClick={loadWebsites} disabled={websitesLoading}>
                      <RefreshCw className={`h-4 w-4 mr-2 ${websitesLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search websites by title, URL, or owner..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  {websitesLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Website</TableHead>
                          <TableHead>Owner</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Pages</TableHead>
                          <TableHead>Last Crawled</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredWebsites.map((website) => (
                          <TableRow key={website.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{website.title}</div>
                                <div className="text-sm text-gray-500">
                                  <a 
                                    href={website.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    {website.url}
                                  </a>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{website.owner_email}</TableCell>
                            <TableCell>
                              <Badge variant={website.verified ? "default" : "secondary"}>
                                <button
                                  onClick={() => handleToggleWebsiteVerification(website.id, website.verified)}
                                  className="cursor-pointer hover:opacity-80"
                                >
                                  {website.verified ? "Verified" : "Pending"}
                                </button>
                              </Badge>
                            </TableCell>
                            <TableCell>{website.page_count}</TableCell>
                            <TableCell>
                              {website.last_crawled_at 
                                ? formatDistanceToNow(new Date(website.last_crawled_at), { addSuffix: true })
                                : 'Never'
                              }
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDeleteWebsite(website.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="crawling" className="mt-8">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Crawling Management</CardTitle>
                      <CardDescription>
                        Monitor crawling jobs and system performance
                      </CardDescription>
                    </div>
                    <Button onClick={loadCrawlJobs} disabled={crawlLoading}>
                      <RefreshCw className={`h-4 w-4 mr-2 ${crawlLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search crawl jobs by website or URL..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  {crawlLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Website</TableHead>
                          <TableHead>URL</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCrawlJobs.map((job) => (
                          <>
                            <TableRow key={job.id}>
                              <TableCell className="font-medium">{job.website_title}</TableCell>
                              <TableCell>
                                <a 
                                  href={job.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 text-sm"
                                >
                                  {job.url.length > 50 ? job.url.substring(0, 50) + '...' : job.url}
                                </a>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {job.status === 'pending' && <Clock className="h-4 w-4 text-yellow-500" />}
                                  {job.status === 'running' && <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />}
                                  {job.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                                  {job.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                                  <Select
                                    value={job.status}
                                    onValueChange={(value: 'pending' | 'running' | 'completed' | 'failed') => 
                                      handleUpdateCrawlStatus(job.id, value)
                                    }
                                  >
                                    <SelectTrigger className="w-32">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pending">Pending</SelectItem>
                                      <SelectItem value="running">Running</SelectItem>
                                      <SelectItem value="completed">Completed</SelectItem>
                                      <SelectItem value="failed">Failed</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </TableCell>
                              <TableCell>{job.priority}</TableCell>
                              <TableCell>
                                {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  {job.status === 'pending' && (
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handleRunCrawler(job.id)}
                                    >
                                      <Activity className="h-4 w-4 mr-1" />
                                      Run
                                    </Button>
                                  )}
                                  {job.status === 'failed' && (
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handleRetryJob(job.id)}
                                    >
                                      <RefreshCw className="h-4 w-4 mr-1" />
                                      Retry
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                            {job.error_message && job.status === 'failed' && (
                              <TableRow>
                                <TableCell colSpan={6}>
                                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                                    <p className="text-sm text-red-700">
                                      <strong>Error:</strong> {job.error_message}
                                    </p>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="pages" className="mt-8">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Crawled URLs Management</CardTitle>
                      <CardDescription>
                        Monitor all crawled pages with content filtering
                      </CardDescription>
                    </div>
                    <Button onClick={loadCrawledPages} disabled={pagesLoading}>
                      <RefreshCw className={`h-4 w-4 mr-2 ${pagesLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search pages by title, URL, or website..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="showAdultContent"
                          checked={showAdultContent}
                          onChange={(e) => setShowAdultContent(e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <label htmlFor="showAdultContent" className="text-sm font-medium">
                          Show 18+ content
                        </label>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {filteredCrawledPages.length} pages shown
                      </Badge>
                      {!showAdultContent && (
                        <Badge variant="secondary" className="text-xs">
                          Adult content filtered
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {pagesLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Page Title</TableHead>
                          <TableHead>URL</TableHead>
                          <TableHead>Website</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Content Rating</TableHead>
                          <TableHead>Indexed</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCrawledPages.map((page) => (
                          <TableRow key={page.id}>
                            <TableCell>
                              <div className="max-w-xs">
                                <div className="font-medium truncate">
                                  {page.title || 'Untitled'}
                                </div>
                                {page.meta_description && (
                                  <div className="text-sm text-gray-500 truncate">
                                    {page.meta_description.slice(0, 100)}...
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <a 
                                href={page.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-sm max-w-xs block truncate"
                              >
                                {page.url}
                              </a>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-xs">
                                <div className="font-medium truncate">{page.website_title}</div>
                                <div className="text-sm text-gray-500 truncate">{page.website_url}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {page.page_type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {page.is_adult_content ? (
                                <Badge variant="destructive" className="text-xs">
                                  18+
                                </Badge>
                              ) : (
                                <Badge variant="default" className="text-xs bg-green-600">
                                  Safe
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {formatDistanceToNow(new Date(page.indexed_at), { addSuffix: true })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}