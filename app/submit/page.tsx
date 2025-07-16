'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/Header'
import { WebsiteSubmissionForm } from '@/components/WebsiteSubmissionForm'
import { getCurrentUser, User } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Globe, Search, Zap } from 'lucide-react'
import Link from 'next/link'

export default function SubmitPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUser()
  }, [])

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
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Submit Your Website</h1>
            <p className="text-xl text-gray-600 mb-8">
              Please sign in to submit your website for indexing.
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
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Submit Your Website</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Get your website indexed in our search engine and make it discoverable to millions of users.
          </p>
        </div>

        {/* Benefits Section */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <Card className="text-center">
            <CardHeader>
              <Globe className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>Global Reach</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Make your website discoverable to users worldwide through our search engine.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Search className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <CardTitle>AI-Powered Search</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Benefit from AI-enhanced search results that better understand and present your content.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Zap className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <CardTitle>Fast Indexing</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Our advanced crawling system quickly indexes your content and keeps it up to date.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Submission Form */}
        <WebsiteSubmissionForm 
          userId={user.id} 
          onSuccess={() => {
            // Could redirect to webmaster tools or show success message
          }}
        />

        {/* Additional Information */}
        <div className="mt-12 bg-blue-50 rounded-lg p-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">What happens next?</h3>
          <div className="space-y-3 text-gray-700">
            <p className="flex items-start gap-2">
              <span className="font-medium text-blue-600">1.</span>
              Your website will be added to our crawl queue and processed within 24 hours.
            </p>
            <p className="flex items-start gap-2">
              <span className="font-medium text-blue-600">2.</span>
              We'll crawl your site following your robots.txt and sitemap guidelines.
            </p>
            <p className="flex items-start gap-2">
              <span className="font-medium text-blue-600">3.</span>
              Your pages will appear in search results once indexed and processed.
            </p>
            <p className="flex items-start gap-2">
              <span className="font-medium text-blue-600">4.</span>
              Use our Webmaster Tools to monitor crawl status and performance.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}