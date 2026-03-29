'use client'

import { useState, FormEvent } from 'react'

type Market = 'singapore' | 'malaysia' | 'indonesia'
type Domain = 'marketing' | 'legal' | 'casual'
type Tone = 'professional' | 'casual' | 'playful'

interface LocalizeResult {
  adapted_content: string
  cultural_notes: string[]
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

  const wordCount = countWords(content)
  const overLimit = wordCount > 500

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!content.trim() || overLimit) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/localize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, market, domain, tone }),
      })

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
            Paste your English content, choose your market and tone, and get culturally resonant copy — not just translations.
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
              Your Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your English content here… (e.g. marketing copy, product description, social post)"
              rows={8}
              className={`w-full rounded-xl border px-4 py-3 text-sm text-gray-800 shadow-sm resize-y focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition ${
                overLimit ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
              }`}
            />
            <div className={`flex justify-end mt-1 text-xs ${overLimit ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
              {wordCount} / 500 words
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !content.trim() || overLimit}
            className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 text-white font-semibold text-base shadow-md hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Localizing…
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
