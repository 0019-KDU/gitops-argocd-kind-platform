import UrlShortener from '@/components/UrlShortener'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950/30 to-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-sm text-blue-400 mb-6">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            Powered by Redis + Supabase
          </div>
          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
            URL Shortener
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Shorten any link instantly. Built with Base&#8209;58 encoding, Redis caching, and
            real&#8209;time analytics.
          </p>
        </div>

        <UrlShortener />
      </div>
    </main>
  )
}
