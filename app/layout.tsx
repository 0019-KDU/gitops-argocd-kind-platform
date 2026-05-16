import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'URL Shortener',
  description: 'High-performance URL shortener powered by Next.js, Redis, and Supabase',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  )
}
