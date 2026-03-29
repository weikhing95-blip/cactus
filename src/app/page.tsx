'use client'

import { useState, FormEvent, useRef, DragEvent } from 'react'

type Market = 'singapore' | 'malaysia' | 'indonesia'
type Domain = 'marketing' | 'legal' | 'casual'
type Tone = 'professional' | 'casual' | 'playful'

interface LocalizeResult {
  adapted_content: string
  cultural_notes: string[]
  extracted_text?: string
}

const MARKET_LABELS: Record<Market, string> = {
  singapore: '🇸🇬 Singapore (Singlish)',
  malaysia: '🇲🇾 Malaysia (Manglish/Bahasa)',
  indonesia: '🇮🇩 Indonesia (Bahasa Indonesia)',
}

const DOMAIN_LABELS: Record<Domain, string> = {
  marketing: '📣 Marketing',
  legal: '⚖️ Legal',
  casual: '💬 Casual / Social',
}

const TONE_LABELS: Record<Tone, string> = {
  professional: '👔 Professional',
  casual: '😊 Casual',
  playful: '🎉 Playful',
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export default function Home() {
  const [content, setContent] = useState('')
  const [market, setMarket] = useState<Market>('singapore')
  const [domain, setDomain] = useState<Domain>('marketing')
  const [tone, setTone] = useState<Tone>('casual')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<LocalizeResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const wordCount = countWords(content)
  const overLimit = wordCount > 500
  const hasInput = content.trim() || imageFile

  function handleImageFile(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Unsupported file type. Please use JPG, PNG, GIF, or WEBP.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('File too large. Maximum size is 5MB.')
      return
    }
    setError(null)
    setImageFile(file)
    const url = URL.createObjectURL(file)
    setImagePreviewUrl(url)
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleImageFile(file)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleImageFile(file)
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave() {
    setIsDragging(false)
  }

  function removeImage() {
    setImageFile(null)
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    setImagePreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!hasInput || overLimit) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      let res: Response

      if (imageFile) {
        // Use FormData for image upload
        const formData = new FormData()
        formData.append('image', imageFile)
        formData.append('market', market)
        formData.append('domain', domain)
        formData.append('tone', tone)
        if (content.trim()) formData.append('content', content)

        res = await fetch('/api/localize', {
          method: 'POST',
          body: formData,
        })
      } else {
        res = await fetch('/api/localize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, market, domain, tone }),
        })
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Request failed (${res.status})`)
      }

      const data: LocalizeResult = await res.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Header */}
      <header className="border-b border-emerald-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-emerald-700 tracking-tight">
              Cactus 🌵
            </h1>
            <p className="text-sm text-gray-500 -mt-0.5">Where global brands become local.</p>
          </div>
          <div className="hidden sm:flex gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
            🇸🇬 SG · 🇲🇾 MY · 🇮🇩 ID
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        {/* Hero */}
        <div className="text-center mb-10">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-3">
            Speak like a local. <span className="text-emerald-600">Everywhere.</span>
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Paste your English content or upload an image, choose your market and tone, and get culturally resonant copy — not just translations.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Controls row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Target Market
              </label>
              <select
                value={market}
                onChange={(e) => setMarket(e.target.value as Market)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
              >
                {(Object.entries(MARKET_LABELS) as [Market, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Domain
              </label>
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value as Domain)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
              >
                {(Object.entries(DOMAIN_LABELS) as [Domain, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Tone
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as Tone)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
              >
                {(Object.entries(TONE_LABELS) as [Tone, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Textarea */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Your Content <span className="text-gray-400 font-normal">(optional if uploading an image)</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your English content here… (e.g. marketing copy, product description, social post)"
              rows={6}
              className={`w-full rounded-xl border px-4 py-3 text-sm text-gray-800 shadow-sm resize-y focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition ${
                overLimit ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
              }`}
            />
            <div className={`flex justify-end mt-1 text-xs ${overLimit ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
              {wordCount} / 500 words
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Upload an image{' '}
              <span className="text-gray-400 font-normal">(ads, banners, packaging, screenshots)</span>
            </label>

            {!imageFile ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 cursor-pointer transition-all ${
                  isDragging
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/40'
                }`}
              >
                <div className="text-3xl">🖼️</div>
                <div className="text-sm text-gray-600 font-medium">
                  Drop an image here, or <span className="text-emerald-600 underline underline-offset-2">browse</span>
                </div>
                <div className="text-xs text-gray-400">JPG, PNG, GIF, WEBP · Max 5MB</div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES.join(',')}
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="flex items-start gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                {imagePreviewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imagePreviewUrl}
                    alt="Upload preview"
                    className="w-24 h-24 object-cover rounded-lg border border-emerald-200 shadow-sm shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{imageFile.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {(imageFile.size / 1024).toFixed(0)} KB · {imageFile.type.split('/')[1].toUpperCase()}
                  </p>
                  <button
                    type="button"
                    onClick={removeImage}
                    className="mt-2 text-xs text-red-500 hover:text-red-700 underline underline-offset-2"
                  >
                    Remove image
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !hasInput || overLimit}
            className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 text-white font-semibold text-base shadow-md hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                {imageFile ? 'Extracting & Localizing…' : 'Localizing…'}
              </span>
            ) : (
              '🌵 Localize Content'
            )}
          </button>
        </form>

        {/* Error */}
        {error && (
          <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="mt-10 space-y-2">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              ✅ Localized for {MARKET_LABELS[market]}
            </h3>

            {/* Extracted Text (image mode only) */}
            {result.extracted_text && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 shadow-sm p-6 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-blue-700 font-semibold text-sm uppercase tracking-wider">🔍 Extracted Text</span>
                  <span className="text-xs text-blue-500 font-normal">(from image)</span>
                </div>
                <div className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap font-mono bg-white/60 rounded-lg px-4 py-3 border border-blue-100">
                  {result.extracted_text}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Adapted content */}
              <div className="rounded-2xl border border-emerald-200 bg-white shadow-sm p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-emerald-600 font-semibold text-sm uppercase tracking-wider">Adapted Content</span>
                </div>
                <div className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                  {result.adapted_content}
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(result.adapted_content)}
                  className="mt-4 text-xs text-emerald-600 hover:text-emerald-800 underline underline-offset-2"
                >
                  Copy to clipboard
                </button>
              </div>

              {/* Cultural notes */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-amber-700 font-semibold text-sm uppercase tracking-wider">Cultural Notes</span>
                </div>
                {result.cultural_notes.length > 0 ? (
                  <ul className="space-y-2.5">
                    {result.cultural_notes.map((note, i) => (
                      <li key={i} className="flex gap-2 text-sm text-amber-900">
                        <span className="mt-0.5 shrink-0 text-amber-500">•</span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-amber-700">No specific adaptations noted.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-gray-100 py-8 text-center text-xs text-gray-400">
        Cactus 🌵 — Built for SEA. Powered by Claude AI.
      </footer>
    </div>
  )
}
