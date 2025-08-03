'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'

export default function AuthCallback() {
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

        const code = searchParams.get('code')
        const next = searchParams.get('next') ?? '/'

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
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">인증 오류</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <p className="text-gray-500">오류 페이지로 이동합니다...</p>
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