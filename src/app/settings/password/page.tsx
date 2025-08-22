'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'

function ChangePasswordContent() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 Password change page loading...')
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

        // 현재 사용자 확인
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError) {
          console.error('❌ User error:', userError)
          setError('사용자 정보를 가져올 수 없습니다.')
          return
        }

        if (!user) {
          if (process.env.NODE_ENV === 'development') {
            console.log('❌ No authenticated user')
          }
          router.push('/')
          return
        }

        if (process.env.NODE_ENV === 'development') {
          console.log('✅ User authenticated')
        }
        setUser(user)
        setLoading(false)
      } catch (err) {
        console.error('Password change check error:', err)
        setError('예상하지 못한 오류가 발생했습니다.')
      }
    }

    checkAuth()
  }, [router])

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다.')
      return
    }

    if (newPassword.length < 6) {
      setError('새 비밀번호는 6자 이상이어야 합니다.')
      return
    }

    if (currentPassword === newPassword) {
      setError('현재 비밀번호와 새 비밀번호가 동일합니다.')
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

      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Attempting to change password...')
      }

      // 현재 비밀번호로 재인증 (보안상 권장)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      })

      if (signInError) {
        console.error('❌ Current password verification failed:', signInError)
        setError('현재 비밀번호가 올바르지 않습니다.')
        return
      }

      // 새 비밀번호로 업데이트
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) {
        console.error('❌ Password update failed:', updateError)
        throw updateError
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Password updated successfully')
      }
      setSuccess(true)
      
      // 3초 후 메인 페이지로 이동
      setTimeout(() => {
        router.push('/')
      }, 3000)
    } catch (error: any) {
      console.error('❌ Password change error:', error)
      setError(error.message || '비밀번호 변경 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">로딩 중...</h2>
          <p className="text-gray-500">잠시만 기다려주세요.</p>
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
          {/* 헤더 */}
          <div className="text-center mb-8">
            <div className="text-4xl mb-4">🔐</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              비밀번호 변경
            </h1>
            <p className="text-gray-600">
              현재 비밀번호를 입력하고 새 비밀번호를 설정하세요
            </p>
            <div className="mt-2 text-sm text-gray-500">
              로그인된 계정: <span className="font-medium">{user?.email}</span>
            </div>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                현재 비밀번호
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="현재 비밀번호를 입력하세요"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                새 비밀번호
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="새 비밀번호 (6자 이상)"
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                새 비밀번호 확인
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="새 비밀번호를 다시 입력하세요"
                minLength={6}
              />
            </div>

            {error && (
              <div className="p-3 rounded-md text-sm bg-red-50 text-red-700 border border-red-200">
                {error}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-md transition-colors"
              >
                {isSubmitting ? '변경 중...' : '비밀번호 변경'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/')}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-3 px-4 rounded-md transition-colors"
              >
                취소
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              보안을 위해 현재 비밀번호를 확인한 후 변경됩니다.
            </p>
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

export default function ChangePassword() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ChangePasswordContent />
    </Suspense>
  )
}