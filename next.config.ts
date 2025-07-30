import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // 사용자 정의 도메인(seatassigner.shop) 사용 시 basePath와 assetPrefix 불필요
}

export default nextConfig