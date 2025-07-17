import { NextRequest, NextResponse } from 'next/server'
import { runCrawler } from '@/lib/crawler'

export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json()
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    await runCrawler(jobId)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Crawler API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}