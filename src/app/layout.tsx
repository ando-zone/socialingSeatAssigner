import './globals.css'

export const metadata = {
  title: '썸친사 자리 배치 프로그램',
  description: '이성 만남과 성별 균형을 고려한 그룹 배치 시스템',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}