'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
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
        const errorParam = searchParams.get('error')
        const errorCode = searchParams.get('error_code')
        const errorDescription = searchParams.get('error_description')

        if (errorParam) {
          if (process.env.NODE_ENV === 'development') {
            console.log('❌ Auth error detected:', { errorParam, errorCode })
          }
          let errorMessage = '인증 처리 중 오류가 발생했습니다.'
          
          if (errorCode === 'otp_expired') {
            errorMessage = '이메일 링크가 만료되었습니다. 비밀번호 재설정을 다시 요청해주세요.'
          } else if (errorParam === 'access_denied') {
            errorMessage = '접근이 거부되었습니다. 링크가 유효하지 않거나 만료되었습니다.'
          } else if (errorDescription) {
            errorMessage = decodeURIComponent(errorDescription)
          }
          
          setError(errorMessage)
          setTimeout(() => {
            router.push('/')
          }, 8000) // 시간을 좀 더 늘림
          return
        }

        const code = searchParams.get('code')
        const next = searchParams.get('next') ?? '/'
        const type = searchParams.get('type')
        const access_token = searchParams.get('access_token')
        const refresh_token = searchParams.get('refresh_token')

        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 Auth tokens found:', { hasCode: !!code, type, hasTokens: !!(access_token && refresh_token) })
        }

        // 비밀번호 재설정인 경우
        if (type === 'recovery' || (access_token && refresh_token)) {
          if (process.env.NODE_ENV === 'development') {
            console.log('🔄 Redirecting to reset password page')
          }
          const params = new URLSearchParams()
          if (access_token) params.set('access_token', access_token)
          if (refresh_token) params.set('refresh_token', refresh_token)
          
          router.push(`/auth/reset-password?${params.toString()}`)
          return
        }

        if (code) {
          const supabase = createSupabaseClient()
          if (supabase) {
            const { error } = await supabase.auth.exchangeCodeForSession(code)
            
            if (error) {
              console.error('Auth error:', error)
              setError('인증 처리 중 오류가 발생했습니다.')
              setTimeout(() => {
                router.push('/auth/auth-code-error')
              }, 2000)
            } else {
              // 성공적으로 인증됨
              router.push(next)
            }
          } else {
            setError('Supabase 클라이언트를 초기화할 수 없습니다.')
            setTimeout(() => {
              router.push('/auth/auth-code-error')
            }, 2000)
          }
        } else {
          // 코드가 없는 경우
          router.push('/auth/auth-code-error')
        }
      } catch (err) {
        console.error('Auth callback error:', err)
        setError('예상하지 못한 오류가 발생했습니다.')
        setTimeout(() => {
          router.push('/auth/auth-code-error')
        }, 2000)
      } finally {
        setLoading(false)
      }
    }

    handleAuthCallback()
  }, [router, searchParams])

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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-lg shadow-xl p-8">
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">❌</div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">인증 오류</h2>
              <p className="text-red-600 mb-6">{error}</p>
              
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  로그인 페이지로 이동
                </button>
                
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

export default function AuthCallback() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthCallbackContent />
    </Suspense>
  )
} 