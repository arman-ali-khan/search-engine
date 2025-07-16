'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { submitWebsite } from '@/lib/crawler'
import { toast } from 'react-hot-toast'
import { Globe, Plus } from 'lucide-react'

const websiteSchema = z.object({
  url: z.string().url('Please enter a valid URL'),
  sitemap_url: z.string().url('Please enter a valid sitemap URL').optional().or(z.literal('')),
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
})

type WebsiteFormData = z.infer<typeof websiteSchema>

interface WebsiteSubmissionFormProps {
  userId: string
  onSuccess?: () => void
}

export function WebsiteSubmissionForm({ userId, onSuccess }: WebsiteSubmissionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<WebsiteFormData>({
    resolver: zodResolver(websiteSchema),
    defaultValues: {
      url: '',
      sitemap_url: '',
      title: '',
      description: '',
    },
  })

  const onSubmit = async (data: WebsiteFormData) => {
    setIsSubmitting(true)
    try {
      await submitWebsite({
        ...data,
        sitemap_url: data.sitemap_url || undefined,
        owner_id: userId,
      })
      
      toast.success('Website submitted successfully! It will be crawled shortly.')
      form.reset()
      onSuccess?.()
    } catch (error) {
      console.error('Error submitting website:', error)
      toast.error('Failed to submit website. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Submit Website for Indexing
        </CardTitle>
        <CardDescription>
          Add your website to our search index. We'll crawl your site and include it in search results.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website URL *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        {...field}
                        placeholder="https://example.com"
                        className="pl-10"
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    The main URL of your website that you want to index.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sitemap_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sitemap URL (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="https://example.com/sitemap.xml"
                    />
                  </FormControl>
                  <FormDescription>
                    URL to your XML sitemap to help us crawl your site more efficiently.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website Title *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="My Awesome Website"
                      maxLength={100}
                    />
                  </FormControl>
                  <FormDescription>
                    The name of your website as it should appear in search results.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="A brief description of what your website is about..."
                      rows={3}
                      maxLength={500}
                    />
                  </FormControl>
                  <FormDescription>
                    A brief description of your website's content and purpose.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Website'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}