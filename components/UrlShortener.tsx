'use client'

import { useState, useEffect, useCallback } from 'react'
import UrlTable from './UrlTable'

type ShortenResult = {
  shortUrl: string
  shortCode: string
  originalUrl: string
  expiresAt: string | null
  createdAt: string
}

type ErrorKey = 'not_found' | 'deactivated' | 'expired'
const ERROR_MESSAGES: Record<ErrorKey, string> = {
  not_found: 'That short link does not exist.',
  deactivated: 'That short link has been deactivated.',
  expired: 'That short link has expired.',
}

export default function UrlShortener() {
  const [url, setUrl] = useState('')
  const [alias, setAlias] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ShortenResult | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [redirectError, setRedirectError] = useState('')

  // Show redirect error from query param (set by [shortCode]/route.ts)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const errKey = params.get('error') as ErrorKey | null
    if (errKey && ERROR_MESSAGES[errKey]) {
      setRedirectError(ERROR_MESSAGES[errKey])
      // Clean up the URL
      window.history.replaceState({}, '', '/')
    }
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setResult(null)
    setLoading(true)

    try {
      const res = await fetch('/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalUrl: url,
          customAlias: alias || undefined,
          expiresAt: expiresAt || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        return
      }

      setResult(data)
      setUrl('')
      setAlias('')
      setExpiresAt('')
      setShowAdvanced(false)
      setRefreshKey((k) => k + 1)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }, [url, alias, expiresAt])

  const handleCopy = useCallback(async () => {
    if (!result) return
    await navigator.clipboard.writeText(result.shortUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [result])

  const minExpiry = new Date(Date.now() + 60_000).toISOString().slice(0, 16)

  return (
    <div className="space-y-6">
      {/* Redirect error banner */}
      {redirectError && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <span className="text-sm">{redirectError}</span>
          <button
            onClick={() => setRedirectError('')}
            className="ml-auto text-red-400/60 hover:text-red-400 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Shorten form */}
      <div className="glass rounded-2xl p-6 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-long-url.com/goes/here"
              required
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white
                         placeholder-gray-500 focus:outline-none focus:border-blue-500/60
                         focus:ring-1 focus:ring-blue-500/30 transition"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50
                         disabled:cursor-not-allowed rounded-xl font-semibold text-white
                         transition-all duration-150 active:scale-95 whitespace-nowrap"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Shortening…
                </span>
              ) : 'Shorten URL'}
            </button>
          </div>

          {/* Advanced options toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
              fill="currentColor" viewBox="0 0 20 20"
            >
              <path fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd" />
            </svg>
            Advanced options
          </button>

          {showAdvanced && (
            <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">Custom alias (optional)</label>
                <input
                  type="text"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="my-custom-link"
                  maxLength={11}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white
                             placeholder-gray-600 text-sm focus:outline-none focus:border-blue-500/60
                             focus:ring-1 focus:ring-blue-500/30 transition"
                />
                <p className="text-xs text-gray-600">Letters, numbers, - and _ only · max 11 chars</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">Expiry date (optional)</label>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  min={minExpiry}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white
                             text-sm focus:outline-none focus:border-blue-500/60
                             focus:ring-1 focus:ring-blue-500/30 transition
                             [color-scheme:dark]"
                />
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </p>
          )}
        </form>
      </div>

      {/* Result card */}
      {result && (
        <div className="glass rounded-2xl p-5 border-blue-500/20 animate-in fade-in duration-300">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1 min-w-0">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Short URL</p>
              <a
                href={result.shortUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 font-semibold text-lg break-all transition-colors"
              >
                {result.shortUrl}
              </a>
              <p className="text-xs text-gray-600 break-all">{result.originalUrl}</p>
              {result.expiresAt && (
                <p className="text-xs text-amber-500/80">
                  Expires {new Date(result.expiresAt).toLocaleString()}
                </p>
              )}
            </div>
            <button
              onClick={handleCopy}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
                ${copied
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
                }`}
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <UrlTable refreshKey={refreshKey} />
    </div>
  )
}
