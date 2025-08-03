import type { NextConfig } from 'next'
import { existsSync } from 'fs'
import { join } from 'path'

// CNAME 파일이 있으면 사용자 정의 도메인 사용
const hasCustomDomain = process.env.NEXT_PUBLIC_CUSTOM_DOMAIN === 'true' || 
                       existsSync(join(process.cwd(), 'public', 'CNAME'))

console.log('🔧 Next.js Config - Environment Variables:')
console.log('- NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET')
console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET')

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  
  // GitHub Pages 기본 도메인 사용 시에만 basePath 필요
  // 사용자 정의 도메인(seatassigner.shop) 사용 시 basePath 불필요
  ...(process.env.NODE_ENV === 'production' && !hasCustomDomain && {
    basePath: '/socialingSeatAssigner',
    assetPrefix: '/socialingSeatAssigner'
  }),
  
  // 환경변수 강제 주입 (여러 방법 시도)
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  },
  
  // publicRuntimeConfig 추가 시도
  publicRuntimeConfig: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  
  // 빌드 시 정적 최적화
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js']
  }
}

export default nextConfig