import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

// Increase body size limit to 30MB and timeout to 60s for audio uploads
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface WhisperSegment {
  id: number
  start: number
  end: number
  text: string
}

interface WhisperResponse {
  text: string
  segments?: WhisperSegment[]
  error?: { message: string }
}

interface CorrectionItem {
  original: string
  corrected: string
  reason: string
}

interface ClaudeResponse {
  corrected_transcript: string
  segments: { start: number; end: number; text: string }[]
  corrections: CorrectionItem[]
}

function formatSrtTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.round((seconds % 1) * 1000)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`
}

function generateSrt(segments: { start: number; end: number; text: string }[]): string {
  return segments
    .map((seg, idx) => {
      return `${idx + 1}\n${formatSrtTime(seg.start)} --> ${formatSrtTime(seg.end)}\n${seg.text.trim()}\n`
    })
    .join('\n')
}

export async function POST(req: NextRequest) {
  // Check GROQ API key
  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey || groqKey === 'your_groq_api_key_here' || groqKey.trim() === '') {
    return NextResponse.json(
      {
        error:
          'Please add your free Groq API key to enable transcription. Get one free at console.groq.com, then add GROQ_API_KEY to your .env.local file.',
      },
      { status: 400 }
    )
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 })
  }

  const audioFile = formData.get('audio') as File | null
  const businessContext = (formData.get('businessContext') as string) || ''
  const language = (formData.get('language') as string) || 'en'

  if (!audioFile) {
    return NextResponse.json({ error: 'No audio file provided.' }, { status: 400 })
  }

  // Step 1: Groq Whisper transcription
  let transcription: WhisperResponse
  try {
    const groqForm = new FormData()
    groqForm.append('file', audioFile, audioFile.name || 'audio.webm')
    groqForm.append('model', 'whisper-large-v3')
    groqForm.append('language', language)
    groqForm.append('response_format', 'verbose_json')

    const groqResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqKey}`,
      },
      body: groqForm,
    })

    transcription = await groqResponse.json()

    if (!groqResponse.ok) {
      const errMsg = transcription?.error?.message || 'Groq transcription failed.'
      return NextResponse.json({ error: `Transcription error: ${errMsg}` }, { status: 502 })
    }
  } catch (err) {
    console.error('Groq transcription error:', err)
    return NextResponse.json(
      { error: 'Failed to connect to Groq transcription service. Please try again.' },
      { status: 502 }
    )
  }

  const rawTranscript = transcription.text || ''
  const rawSegments: WhisperSegment[] = transcription.segments || []

  // Step 2: Claude correction
  let correctedTranscript = rawTranscript
  let correctedSegments = rawSegments.map((s) => ({ start: s.start, end: s.end, text: s.text }))
  let corrections: CorrectionItem[] = []

  const contextNote = businessContext
    ? `Business context: ${businessContext}`
    : 'No specific business context provided.'

  const segmentsJson = JSON.stringify(
    rawSegments.map((s) => ({ start: s.start, end: s.end, text: s.text }))
  )

  try {
    const claudeResponse = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4096,
      system: `You are an expert transcript editor. You will receive a raw transcript (with timestamps) and business context. 
Identify and correct errors caused by the transcription model misinterpreting domain-specific terms, prices, brand names, product names, or technical vocabulary.
Common errors: prices like "$32.99" that should be "$3,299", brand names spelled wrong, industry jargon misheard.
Return ONLY valid JSON with no markdown fences, no explanation outside the JSON:
{
  "corrected_transcript": "full corrected text as a single string",
  "segments": [{"start": 0.0, "end": 4.5, "text": "corrected segment text"}],
  "corrections": [{"original": "what whisper said", "corrected": "what it should be", "reason": "why this was wrong"}]
}
If no corrections are needed, return the original text unchanged and an empty corrections array.`,
      messages: [
        {
          role: 'user',
          content: `${contextNote}\n\nRaw transcript:\n${rawTranscript}\n\nTimestamped segments:\n${segmentsJson}`,
        },
      ],
    })

    const rawContent = claudeResponse.content[0]
    if (rawContent.type === 'text') {
      let jsonText = rawContent.text.trim()
      // Strip markdown fences if present
      jsonText = jsonText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
      const parsed: ClaudeResponse = JSON.parse(jsonText)
      correctedTranscript = parsed.corrected_transcript || rawTranscript
      correctedSegments =
        parsed.segments?.length > 0
          ? parsed.segments
          : rawSegments.map((s) => ({ start: s.start, end: s.end, text: s.text }))
      corrections = parsed.corrections || []
    }
  } catch (err) {
    console.error('Claude correction error:', err)
    // Fall back to raw transcript — don't fail the whole request
    corrections = []
  }

  // Step 3: Generate SRT
  const srt = generateSrt(correctedSegments)

  return NextResponse.json({
    transcript: correctedTranscript,
    corrections,
    srt,
  })
}
