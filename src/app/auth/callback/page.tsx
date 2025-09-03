/**
 * Authentication Callback Handler for OAuth and Password Reset
 * 
 * OAuth 인증과 비밀번호 재설정의 콜백을 처리하는 페이지입니다.
 * Supabase Auth의 다양한 인증 플로우를 통합적으로 처리하며,
 * URL 파라미터를 분석하여 적절한 액션을 수행합니다.
 * 
 * 지원하는 인증 플로우:
 * 1. OAuth 로그인 (Google 등): code 파라미터로 세션 교환
 * 2. 비밀번호 재설정: access_token/refresh_token으로 리디렉션
 * 3. 이메일 확인: 회원가입 후 이메일 링크 클릭
 * 4. 에러 처리: 만료된 링크, 잘못된 코드 등
 * 
 * URL 파라미터 분석:
 * - code: OAuth 인증 코드
 * - access_token, refresh_token: 비밀번호 재설정 토큰
 * - type=recovery: 비밀번호 재설정 모드
 * - error, error_code: 인증 오류 정보
 * - next: 인증 완료 후 리디렉션 경로
 * 
 * 아키텍처:
 * URL → AuthCallback → Supabase Auth → Success/Error Page
 */

'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'

/**
 * 인증 콜백의 메인 컨텐츠 컴포넌트
 * URL 파라미터를 분석하고 적절한 인증 처리를 수행합니다.
 */
function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)      // 인증 처리 로딩 상태
  const [error, setError] = useState<string | null>(null)  // 에러 메시지

  useEffect(() => {
    /**
     * 인증 콜백을 처리하는 메인 핸들러 함수
     * 
     * 처리 순서:
     * 1. Supabase 설정 확인
     * 2. URL 에러 파라미터 검사
     * 3. 인증 타입 분석 (OAuth, 비밀번호 재설정 등)
     * 4. 적절한 처리 수행 및 리디렉션
     */
    const handleAuthCallback = async () => {
      try {
        // Supabase가 설정되지 않은 경우 홈으로 리다이렉트
        if (!isSupabaseConfigured) {
          router.push('/')
          return
        }

        // 개발 환경에서만 디버깅 정보 출력
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 Auth callback processing...')
        }

        // URL에서 에러 파라미터 확인
        // OAuth 프로바이더나 Supabase에서 발생한 에러를 먼저 체크
        const errorParam = searchParams.get('error')
        const errorCode = searchParams.get('error_code')
        const errorDescription = searchParams.get('error_description')

        if (errorParam) {
          if (process.env.NODE_ENV === 'development') {
            console.log('❌ Auth error detected:', { errorParam, errorCode })
          }
          
          // 에러 타입에 따른 사용자 친화적 메시지 생성
          let errorMessage = '인증 처리 중 오류가 발생했습니다.'
          
          if (errorCode === 'otp_expired') {
            errorMessage = '이메일 링크가 만료되었습니다. 비밀번호 재설정을 다시 요청해주세요.'
          } else if (errorParam === 'access_denied') {
            errorMessage = '접근이 거부되었습니다. 링크가 유효하지 않거나 만료되었습니다.'
          } else if (errorDescription) {
            // URL 디코딩하여 원본 에러 메시지 표시
            errorMessage = decodeURIComponent(errorDescription)
          }
          
          setError(errorMessage)
          // 8초 후 홈으로 자동 리디렉션 (사용자가 메시지를 읽을 충분한 시간 제공)
          setTimeout(() => {
            router.push('/')
          }, 8000)
          return
        }

        // URL에서 인증 관련 파라미터 추출
        const code = searchParams.get('code')                    // OAuth 인증 코드
        const next = searchParams.get('next') ?? '/'             // 인증 완료 후 이동할 경로
        const type = searchParams.get('type')                    // 인증 타입 (recovery 등)
        const access_token = searchParams.get('access_token')    // 직접 전달된 액세스 토큰
        const refresh_token = searchParams.get('refresh_token')  // 직접 전달된 리프레시 토큰

        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 Auth tokens found:', { hasCode: !!code, type, hasTokens: !!(access_token && refresh_token) })
        }

        // 비밀번호 재설정 플로우 처리
        // type=recovery이거나 토큰이 직접 전달된 경우
        if (type === 'recovery' || (access_token && refresh_token)) {
          if (process.env.NODE_ENV === 'development') {
            console.log('🔄 Redirecting to reset password page')
          }
          
          // 비밀번호 재설정 페이지로 토큰과 함께 리디렉션
          const params = new URLSearchParams()
          if (access_token) params.set('access_token', access_token)
          if (refresh_token) params.set('refresh_token', refresh_token)
          
          router.push(`/auth/reset-password?${params.toString()}`)
          return
        }

        // OAuth 인증 코드 처리 (일반적인 로그인 플로우)
        if (code) {
          const supabase = createSupabaseClient()
          if (supabase) {
            // OAuth 코드를 세션으로 교환하는 Supabase API 호출
            const { error } = await supabase.auth.exchangeCodeForSession(code)
            
            if (error) {
              console.error('Auth error:', error)
              setError('인증 처리 중 오류가 발생했습니다.')
              // 2초 후 전용 에러 페이지로 리디렉션
              setTimeout(() => {
                router.push('/auth/auth-code-error')
              }, 2000)
            } else {
              // 성공적으로 인증됨 - 원래 요청했던 페이지로 리디렉션
              router.push(next)
            }
          } else {
            // Supabase 클라이언트 초기화 실패
            setError('Supabase 클라이언트를 초기화할 수 없습니다.')
            setTimeout(() => {
              router.push('/auth/auth-code-error')
            }, 2000)
          }
        } else {
          // 필수 파라미터(code)가 없는 경우 - 잘못된 콜백 요청
          router.push('/auth/auth-code-error')
        }
      } catch (err) {
        // 예상치 못한 에러 (네트워크 오류, 런타임 에러 등)
        console.error('Auth callback error:', err)
        setError('예상하지 못한 오류가 발생했습니다.')
        setTimeout(() => {
          router.push('/auth/auth-code-error')
        }, 2000)
      } finally {
        // 처리 완료 후 로딩 상태 해제
        setLoading(false)
      }
    }

    // 컴포넌트 마운트 시 인증 콜백 처리 시작
    handleAuthCallback()
  }, [router, searchParams])

  // 인증 처리 중 로딩 화면
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">인증 처리 중...</h2>
          <p className="text-gray-500">잠시만 기다려주세요.</p>
        </div>
      </div>
    )
  }

  // 인증 오류 발생 시 에러 화면
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-lg shadow-xl p-8">
            <div className="text-center">
              {/* 오류 아이콘 */}
              <div className="text-red-500 text-6xl mb-4">❌</div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">인증 오류</h2>
              <p className="text-red-600 mb-6">{error}</p>
              
              <div className="space-y-3">
                {/* 로그인 페이지로 돌아가기 버튼 */}
                <button
                  onClick={() => router.push('/')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  로그인 페이지로 이동
                </button>
                
                {/* 만료 에러인 경우 추가 안내 메시지 */}
                {error.includes('만료') && (
                  <p className="text-sm text-gray-500">
                    비밀번호 재설정을 다시 요청하려면 로그인 페이지에서 "비밀번호를 잊으셨나요?" 를 클릭하세요.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 인증 성공 화면 (실제로는 리디렉션되므로 잠깐만 보임)
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-green-500 text-6xl mb-4">✅</div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">인증 완료</h2>
        <p className="text-gray-500">메인 페이지로 이동합니다...</p>
      </div>
    </div>
  )
}

/**
 * Suspense 로딩 폴백 컴포넌트
 * Next.js의 useSearchParams를 사용하기 위해 Suspense가 필요하며,
 * 이 컴포넌트는 검색 파라미터 로딩 중에 표시됩니다.
 * 
 * @returns {JSX.Element} 로딩 스피너와 안내 메시지
 */
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">페이지 로딩 중...</h2>
        <p className="text-gray-500">잠시만 기다려주세요.</p>
      </div>
    </div>
  )
}

/**
 * 인증 콜백 메인 컴포넌트
 * Next.js의 Suspense로 감싸서 useSearchParams의 비동기 로딩을 처리합니다.
 * 
 * @returns {JSX.Element} Suspense로 감싸진 인증 콜백 컨텐츠
 */
export default function AuthCallback() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthCallbackContent />
    </Suspense>
  )
} 