import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@medihelm/auth', '@medihelm/types', '@medihelm/ui'],
}

export default nextConfig
