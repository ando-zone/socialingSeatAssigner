'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 Reset password page loading...')
        }
        
        if (!isSupabaseConfigured) {
          console.log('❌ Supabase not configured')
          router.push('/')
          return
        }

        const supabase = createSupabaseClient()
        if (!supabase) {
          console.log('❌ Failed to create Supabase client')
          setError('Supabase 클라이언트를 초기화할 수 없습니다.')
          return
        }

        // 개발 환경에서만 디버깅 정보 출력
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 Reset password page initialized')
        }

        // URL fragment에서 토큰 확인 (Supabase는 종종 fragment에 토큰을 넣음)
        const hash = window.location.hash.substring(1)
        const hashParams = new URLSearchParams(hash)
        
        let access_token = searchParams.get('access_token') || hashParams.get('access_token')
        let refresh_token = searchParams.get('refresh_token') || hashParams.get('refresh_token')
        const type = searchParams.get('type') || hashParams.get('type')
        const error = searchParams.get('error') || hashParams.get('error')

        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 Auth status:', { 
            hasAccessToken: !!access_token, 
            hasRefreshToken: !!refresh_token, 
            type,
            hasError: !!error 
          })
        }

        // 에러가 있는 경우
        if (error) {
          if (process.env.NODE_ENV === 'development') {
            console.log('❌ URL contains error')
          }
          setError('링크가 유효하지 않거나 만료되었습니다.')
          return
        }

        // 토큰이 있는 경우 세션 설정
        if (access_token && refresh_token) {
          if (process.env.NODE_ENV === 'development') {
            console.log('🔄 Setting session with tokens')
          }
          const { error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token
          })

          if (sessionError) {
            console.error('❌ Session error:', sessionError)
            setError('세션 설정 중 오류가 발생했습니다: ' + sessionError.message)
            return
          }
        }

        // 현재 사용자 확인
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError) {
          console.error('❌ User error:', userError)
          setError('사용자 정보를 가져올 수 없습니다: ' + userError.message)
          return
        }

        if (!user) {
          if (process.env.NODE_ENV === 'development') {
            console.log('❌ No authenticated user')
          }
          setError('인증되지 않은 사용자입니다. 비밀번호 재설정 링크를 다시 확인해주세요.')
          return
        }

        if (process.env.NODE_ENV === 'development') {
          console.log('✅ User authenticated')
        }
        setLoading(false)
      } catch (err) {
        console.error('Reset password check error:', err)
        setError('예상하지 못한 오류가 발생했습니다: ' + (err as Error).message)
      }
    }

    checkAuth()
  }, [router, searchParams])

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const supabase = createSupabaseClient()
      if (!supabase) {
        setError('Supabase 클라이언트를 초기화할 수 없습니다.')
        return
      }

      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      setSuccess(true)
      setTimeout(() => {
        router.push('/')
      }, 3000)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">인증 확인 중...</h2>
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
              <h2 className="text-xl font-semibold text-gray-700 mb-2">오류 발생</h2>
              <p className="text-red-600 mb-6">{error}</p>
              <button
                onClick={() => router.push('/')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                메인 페이지로 이동
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-lg shadow-xl p-8">
            <div className="text-center">
              <div className="text-green-500 text-6xl mb-4">✅</div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">비밀번호 변경 완료</h2>
              <p className="text-gray-500 mb-4">새 비밀번호로 변경되었습니다.</p>
              <p className="text-sm text-gray-400">잠시 후 메인 페이지로 이동합니다...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="text-4xl mb-4">🔑</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              새 비밀번호 설정
            </h1>
            <p className="text-gray-600">
              새로운 비밀번호를 입력해주세요
            </p>
          </div>

          <form onSubmit={handlePasswordUpdate} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                새 비밀번호
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호 확인
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                minLength={6}
              />
            </div>

            {error && (
              <div className="p-3 rounded-md text-sm bg-red-50 text-red-700 border border-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-md transition-colors"
            >
              {isSubmitting ? '처리 중...' : '비밀번호 변경'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/')}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              취소
            </button>
          </div>
        </div>
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

export default function ResetPassword() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResetPasswordContent />
    </Suspense>
  )
}