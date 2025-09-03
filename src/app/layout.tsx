/**
 * Root Layout Component for Socialing Seat Assigner
 * 
 * 모임 자리 배치 프로그램의 최상위 레이아웃 컴포넌트입니다.
 * Next.js App Router의 루트 레이아웃으로 모든 페이지를 감싸며,
 * 인증 시스템과 기본 스타일을 적용합니다.
 * 
 * 주요 기능:
 * - 전역 CSS 스타일 적용 (globals.css, print.css)
 * - Auth 컴포넌트로 모든 페이지를 감싸 인증 보호
 * - SEO를 위한 메타데이터 설정
 * - 한국어 설정 (lang="ko")
 * 
 * 아키텍처:
 * RootLayout → Auth → Page Components
 */

import './globals.css'
import '../styles/print.css'
import Auth from '@/components/Auth'

export const metadata = {
  title: '모임 자리 배치 프로그램',
  description: '이성 만남과 성별 균형을 고려한 그룹 배치 시스템',
}

/**
 * 루트 레이아웃 컴포넌트
 * 모든 페이지의 기본 구조와 인증을 담당합니다.
 * 
 * @param {Object} props - 컴포넌트 props
 * @param {React.ReactNode} props.children - 하위 페이지 컴포넌트들
 * @returns {JSX.Element} 인증이 적용된 레이아웃
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>
        <Auth>
          {children}
        </Auth>
      </body>
    </html>
  )
}