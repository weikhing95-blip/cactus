import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { put, del } from '@vercel/blob';

export const maxDuration = 120;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const LANG_LABELS: Record<string, string> = {
  en: 'English',
  ms: 'Bahasa Malaysia',
  id: 'Bahasa Indonesia',
  zh: 'Mandarin Chinese (SEA context)',
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const businessContext = formData.get('businessContext') as string || '';
    const language = formData.get('language') as string || 'en';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Upload to Vercel Blob
    const blob = await put(file.name, file, { access: 'public' });

    let rawTranscript = '';
    try {
      const blobResponse = await fetch(blob.url);
      const audioBuffer = await blobResponse.arrayBuffer();
      const audioFile = new File([audioBuffer], file.name, { type: file.type || 'audio/mpeg' });

      const groqForm = new FormData();
      groqForm.append('file', audioFile);
      groqForm.append('model', 'whisper-large-v3');
      groqForm.append('response_format', 'json');

      const groqResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
        body: groqForm,
      });

      if (!groqResponse.ok) {
        const err = await groqResponse.text();
        throw new Error(`Groq error: ${err}`);
      }

      const groqData = await groqResponse.json();
      rawTranscript = groqData.text || '';
    } finally {
      await del(blob.url);
    }

    if (!rawTranscript) {
      return NextResponse.json({ error: 'Could not extract speech from file.' }, { status: 422 });
    }

    const langLabel = LANG_LABELS[language] || 'English';
    let correctedTranscript = rawTranscript;
    let corrections: Array<{ original: string; corrected: string; reason: string }> = [];

    try {
      const claudeResponse = await client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4096,
        system: `You are an expert transcription editor for ${langLabel} content.
Business context: ${businessContext || 'None provided.'}
Correct the transcript using business context (prices, brand names, technical terms).
Return ONLY valid JSON: { "corrected_transcript": string, "corrections": [{ "original": string, "corrected": string, "reason": string }] }`,
        messages: [{ role: 'user', content: `Correct this transcript:\n\n${rawTranscript}` }],
      });

      const text = claudeResponse.content[0].type === 'text' ? claudeResponse.content[0].text : '';
      const parsed = JSON.parse(text);
      correctedTranscript = parsed.corrected_transcript || rawTranscript;
      corrections = parsed.corrections || [];
    } catch {
      correctedTranscript = rawTranscript;
    }

    const srt = generateSRT(correctedTranscript);

    // Return corrected_transcript mapped to transcript for frontend compatibility
    return NextResponse.json({
      transcript: correctedTranscript,
      raw_transcript: rawTranscript,
      corrections,
      srt,
    });
  } catch (error) {
    console.error('Captions error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}

function generateSRT(transcript: string): string {
  const words = transcript.split(' ');
  const chunkSize = 10;
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(' '));
  }
  return chunks.map((chunk, i) => {
    const start = i * 3;
    const end = start + 3;
    return `${i + 1}\n${fmt(start)} --> ${fmt(end)}\n${chunk}\n`;
  }).join('\n');
}

function fmt(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')},000`;
}
