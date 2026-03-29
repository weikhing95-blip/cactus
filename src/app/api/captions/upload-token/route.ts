import { handleUpload } from '@vercel/blob/client'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json()

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        // Allow uploads up to 500MB for video/audio files
        return {
          allowedContentTypes: [
            'video/mp4',
            'video/quicktime',
            'video/webm',
            'video/x-msvideo',
            'audio/mpeg',
            'audio/mp4',
            'audio/wav',
            'audio/webm',
            'audio/ogg',
            'audio/x-m4a',
            'audio/aac',
          ],
          maximumSizeInBytes: 500 * 1024 * 1024, // 500MB
        }
      },
      onUploadCompleted: async ({ blob }) => {
        console.log('Upload completed:', blob.url)
      },
    })
    return NextResponse.json(jsonResponse)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
