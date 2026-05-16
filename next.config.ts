import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Produces a minimal self-contained server — required for Docker standalone builds
  output: 'standalone',
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
}

export default nextConfig
