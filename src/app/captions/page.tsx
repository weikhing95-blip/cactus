'use client'

import { useState, useRef, DragEvent } from 'react'

const ACCEPTED_AUDIO_TYPES = [
  'audio/mpeg',       // .mp3
  'audio/wav',        // .wav
  'audio/x-wav',
  'audio/mp4',        // .m4a
  'audio/x-m4a',
  'audio/webm',       // .webm audio
  'audio/ogg',        // .ogg
  'audio/aac',        // .aac
  'video/mp4',        // .mp4
  'video/webm',       // .webm video
  'video/quicktime',  // .mov
  'video/x-msvideo',  // .avi
]

const ACCEPTED_EXTENSIONS = ['.mp3', '.mp4', '.wav', '.m4a', '.webm', '.ogg', '.mov', '.aac', '.avi']
const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB

const LANGUAGE_OPTIONS = [
  { value: 'en', label: '🇬🇧 English' },
  { value: 'ms', label: '🇲🇾 Bahasa Malaysia' },
  { value: 'id', label: '🇮🇩 Bahasa Indonesia' },
  { value: 'zh', label: '🇨🇳 Mandarin' },
]

interface CorrectionItem {
  original: string
  corrected: string
  reason: string
}

interface CaptionResult {
  transcript: string
  corrections: CorrectionItem[]
  srt: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isVideoFile(file: File): boolean {
  return (
    file.type.startsWith('video/') ||
    file.name.toLowerCase().endsWith('.mp4') ||
    file.name.toLowerCase().endsWith('.mov') ||
    file.name.toLowerCase().endsWith('.webm') ||
    file.name.toLowerCase().endsWith('.avi')
  )
}

export default function CaptionsPage() {
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [businessContext, setBusinessContext] = useState('')
  const [language, setLanguage] = useState('en')
  const [isDragging, setIsDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState<string>('Processing...')
  const [result, setResult] = useState<CaptionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    setError(null)
    setResult(null)

    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    const typeOk = ACCEPTED_AUDIO_TYPES.includes(file.type) || ACCEPTED_EXTENSIONS.includes(ext)

    if (!typeOk) {
      setError(
        `Unsupported file type. Please upload one of: ${ACCEPTED_EXTENSIONS.join(', ')}`
      )
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large (${formatFileSize(file.size)}). Maximum size is 500 MB.`)
      return
    }
    setMediaFile(file)
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  function removeFile() {
    setMediaFile(null)
    setResult(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!mediaFile) return

    setLoading(true)
    setLoadingMessage('Processing...')
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', mediaFile)
      formData.append('businessContext', businessContext)
      formData.append('language', language)
      const response = await fetch('/api/captions', { method: 'POST', body: formData })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Something went wrong')
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const baseName = mediaFile?.name.replace(/\.[^.]+$/, '') || 'captions'

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-800 bg-gray-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <a href="/" className="text-lg font-bold text-green-400 hover:text-green-300">
              🌵 Cactus
            </a>
            <span className="text-gray-600">/</span>
            <span className="text-gray-300">Captions 🎬</span>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <a href="/" className="text-gray-400 hover:text-gray-200">
              Localize
            </a>
            <a href="/captions" className="font-medium text-green-400">
              Captions
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10">
        {/* Hero */}
        <div className="mb-10 text-center">
          <h1 className="mb-3 text-3xl font-bold text-white">Smart Video/Audio Captioning</h1>
          <p className="mx-auto max-w-xl text-gray-400">
            Upload a video or audio file, describe your business context, and get an AI-corrected
            transcript + downloadable SRT caption file. No more{' '}
            <span className="font-mono text-yellow-400">&quot;$32.99&quot;</span> when you said{' '}
            <span className="font-mono text-green-400">&quot;$3,299&quot;</span>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload Zone */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Upload File{' '}
              <span className="text-gray-500">
                (.mp3, .mp4, .wav, .m4a, .webm, .ogg, .mov — up to 500 MB supported)
              </span>
            </label>
            {!mediaFile ? (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 transition-colors ${
                  isDragging
                    ? 'border-green-400 bg-green-400/10'
                    : 'border-gray-700 hover:border-gray-500 hover:bg-gray-900'
                }`}
              >
                <div className="mb-3 text-4xl">🎙️</div>
                <p className="font-medium text-gray-300">Drag & drop or click to upload</p>
                <p className="mt-1 text-sm text-gray-500">Video or audio file — up to 500 MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mp3,.mp4,.wav,.m4a,.webm,.ogg,.mov,.aac,.avi,audio/*,video/*"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-xl border border-gray-700 bg-gray-900 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{isVideoFile(mediaFile) ? '🎬' : '🎵'}</span>
                  <div>
                    <p className="font-medium text-gray-200">{mediaFile.name}</p>
                    <p className="text-sm text-gray-500">{formatFileSize(mediaFile.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="rounded-lg px-3 py-1 text-sm text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Business Context */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Business Context{' '}
              <span className="text-gray-500">(helps AI fix domain-specific mistakes)</span>
            </label>
            <textarea
              value={businessContext}
              onChange={(e) => setBusinessContext(e.target.value)}
              placeholder="e.g. 'Premium tech product review — Apple products, prices typically $999–$3,999. Brand name is Cactus, not Cactis or Catus.'"
              rows={3}
              className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-gray-200 placeholder-gray-600 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>

          {/* Language */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-2.5 text-gray-200 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!mediaFile || loading}
            className="w-full rounded-xl bg-green-500 px-6 py-3 font-semibold text-gray-950 transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                {loadingMessage}
              </span>
            ) : (
              'Generate Captions'
            )}
          </button>
        </form>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-700 bg-red-950/50 px-5 py-4">
            <p className="font-medium text-red-300">⚠️ {error}</p>
            {error.includes('console.groq.com') && (
              <p className="mt-2 text-sm text-red-400">
                <a
                  href="https://console.groq.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-red-200"
                >
                  Get your free Groq API key →
                </a>
              </p>
            )}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="mt-10 space-y-6">
            <h2 className="text-xl font-bold text-white">Results</h2>

            {/* Corrected Transcript */}
            <div className="rounded-xl border border-gray-700 bg-gray-900 p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-gray-200">📝 Corrected Transcript</h3>
                <button
                  onClick={() =>
                    downloadFile(result.transcript, `${baseName}.txt`, 'text/plain')
                  }
                  className="rounded-lg border border-gray-600 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                >
                  ⬇️ Download TXT
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto rounded-lg bg-gray-950 p-4 text-sm leading-relaxed text-gray-300">
                {result.transcript}
              </div>
            </div>

            {/* Changes Made */}
            {result.corrections && result.corrections.length > 0 && (
              <div className="rounded-xl border border-yellow-800 bg-yellow-950/30 p-5">
                <h3 className="mb-3 font-semibold text-yellow-300">
                  ✏️ Changes Made ({result.corrections.length})
                </h3>
                <ul className="space-y-2">
                  {result.corrections.map((c, i) => (
                    <li key={i} className="rounded-lg bg-yellow-950/40 px-4 py-2.5 text-sm">
                      <span className="text-red-400 line-through">{c.original}</span>
                      <span className="mx-2 text-gray-500">→</span>
                      <span className="text-green-400">{c.corrected}</span>
                      <span className="ml-2 text-gray-400">— {c.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.corrections && result.corrections.length === 0 && (
              <div className="rounded-xl border border-gray-700 bg-gray-900 px-5 py-4">
                <p className="text-sm text-gray-400">
                  ✅ No corrections needed — the transcript looks accurate for your context.
                </p>
              </div>
            )}

            {/* Download SRT */}
            <div className="rounded-xl border border-green-800 bg-green-950/30 p-5">
              <h3 className="mb-2 font-semibold text-green-300">🎬 Caption File (SRT)</h3>
              <p className="mb-4 text-sm text-gray-400">
                Import this file into YouTube, Premiere Pro, Final Cut, or any video editor.
              </p>
              <button
                onClick={() =>
                  downloadFile(result.srt, `${baseName}.srt`, 'text/plain')
                }
                className="rounded-xl bg-green-500 px-5 py-2.5 font-semibold text-gray-950 hover:bg-green-400"
              >
                ⬇️ Download SRT
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
