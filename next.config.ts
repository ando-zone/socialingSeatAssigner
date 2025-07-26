import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // GitHub Pages를 위한 basePath 설정 (repository 이름에 맞게 수정)
  basePath: process.env.NODE_ENV === 'production' ? '/socialingSeatAssigner' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/socialingSeatAssigner/' : '',
}

export default nextConfig