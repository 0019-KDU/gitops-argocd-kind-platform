'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Url } from '@/lib/supabase'

type ApiResponse = {
  urls: Url[]
  total: number
  page: number
  totalPages: number
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function truncate(str: string, max = 50) {
  return str.length > max ? str.slice(0, max) + '…' : str
}

export default function UrlTable({ refreshKey }: { refreshKey: number }) {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [deletingCode, setDeletingCode] = useState<string | null>(null)

  const fetchUrls = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/urls?page=${p}&limit=8`)
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUrls(page)
  }, [fetchUrls, page, refreshKey])

  const handleDelete = useCallback(async (shortCode: string) => {
    if (!confirm(`Deactivate /${shortCode}? This cannot be undone.`)) return
    setDeletingCode(shortCode)
    try {
      await fetch(`/api/urls/${shortCode}`, { method: 'DELETE' })
      fetchUrls(page)
    } finally {
      setDeletingCode(null)
    }
  }, [fetchUrls, page])

  const copyToClipboard = useCallback(async (shortCode: string) => {
    await navigator.clipboard.writeText(`${BASE_URL}/${shortCode}`)
  }, [])

  if (loading && !data) {
    return (
      <div className="glass rounded-2xl p-8 text-center text-gray-600 animate-pulse">
        Loading URLs…
      </div>
    )
  }

  if (!data || data.urls.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <div className="text-4xl mb-3">🔗</div>
        <p className="text-gray-500">No URLs shortened yet. Paste a link above to get started.</p>
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <h2 className="font-semibold text-white">Recent links</h2>
        <span className="text-sm text-gray-500">{data.total} total</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-600 uppercase tracking-wider border-b border-white/5">
              <th className="px-6 py-3 font-medium">Short link</th>
              <th className="px-6 py-3 font-medium">Original URL</th>
              <th className="px-6 py-3 font-medium text-right">Clicks</th>
              <th className="px-6 py-3 font-medium">Created</th>
              <th className="px-6 py-3 font-medium">Expires</th>
              <th className="px-6 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data.urls.map((u) => (
              <tr key={u.id} className="group hover:bg-white/3 transition-colors">
                {/* Short code */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <a
                      href={`${BASE_URL}/${u.short_code}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 font-mono font-medium transition-colors"
                    >
                      /{u.short_code}
                    </a>
                    <button
                      onClick={() => copyToClipboard(u.short_code)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-gray-400"
                      title="Copy short URL"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </td>

                {/* Original URL */}
                <td className="px-6 py-4 max-w-xs">
                  <a
                    href={u.original_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={u.original_url}
                    className="text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    {truncate(u.original_url)}
                  </a>
                </td>

                {/* Clicks */}
                <td className="px-6 py-4 text-right">
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold tabular-nums">
                    {u.click_count.toLocaleString()}
                  </span>
                </td>

                {/* Created */}
                <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                  {formatDate(u.created_at)}
                </td>

                {/* Expires */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {u.expires_at ? (
                    <span className={
                      new Date(u.expires_at) < new Date()
                        ? 'text-red-400 text-xs'
                        : 'text-amber-400/80 text-xs'
                    }>
                      {new Date(u.expires_at) < new Date() ? 'Expired' : formatDate(u.expires_at)}
                    </span>
                  ) : (
                    <span className="text-gray-700 text-xs">Never</span>
                  )}
                </td>

                {/* Delete */}
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleDelete(u.short_code)}
                    disabled={deletingCode === u.short_code}
                    className="opacity-0 group-hover:opacity-100 transition-opacity
                               text-gray-700 hover:text-red-400 disabled:opacity-50 transition-colors"
                    title="Deactivate link"
                  >
                    {deletingCode === u.short_code ? (
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
          <span className="text-xs text-gray-600">
            Page {data.page} of {data.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10
                         hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
              className="px-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10
                         hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
