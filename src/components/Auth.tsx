'use client'

import { useState, useEffect } from 'react'
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'
import { getCurrentMeetingId } from '@/utils/database'
import MeetingSelector from './MeetingSelector'
import type { User } from '@supabase/supabase-js'

interface AuthProps {
  children: React.ReactNode
}

export default function Auth({ children }: AuthProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasMeeting, setHasMeeting] = useState(false)
  const [checkingMeeting, setCheckingMeeting] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')

  const supabase = createSupabaseClient()

  // Supabase가 설정되지 않은 경우 바로 children 렌더링
  if (!isSupabaseConfigured) {
    return (
      <div>
        <div className="bg-yellow-50 border-b border-yellow-200">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center space-x-2 text-yellow-800">
              <span>⚠️</span>
              <span className="text-sm">
                <strong>개발 모드:</strong> Supabase가 설정되지 않았습니다. localStorage를 사용합니다.
              </span>
            </div>
          </div>
        </div>
        {children}
      </div>
    )
  }

  if (!supabase) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-red-800 mb-4">
            설정 오류
          </h1>
          <p className="text-red-600 mb-6">
            Supabase 환경변수가 올바르게 설정되지 않았습니다.
          </p>
          <div className="text-left bg-gray-100 p-4 rounded-md max-w-md">
            <p className="text-sm text-gray-700 mb-2">다음 환경변수를 설정해주세요:</p>
            <code className="text-xs">
              NEXT_PUBLIC_SUPABASE_URL<br/>
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </code>
          </div>
        </div>
      </div>
    )
  }

  useEffect(() => {
    // 현재 사용자 상태 확인
    const getUser = async () => {
      if (!supabase) return
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
      
      if (user) {
        checkMeetingStatus(user)
      }
    }

    getUser()

    // 인증 상태 변경 리스너
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event: any, session: any) => {
          setUser(session?.user ?? null)
          setLoading(false)
          
          if (session?.user) {
            checkMeetingStatus(session.user)
          } else {
            setHasMeeting(false)
            setCheckingMeeting(false)
          }
        }
      )

      return () => subscription.unsubscribe()
    }
  }, [supabase])

  const checkMeetingStatus = async (user?: User) => {
    setCheckingMeeting(true)
    
    try {
      // 현재 저장된 모임 ID 확인
      let meetingId = getCurrentMeetingId()
      
      // 사용자가 있고 Supabase가 설정된 경우에도 항상 모임 선택 화면을 표시
      // 기존의 자동 모임 선택 로직을 제거하여 사용자가 직접 선택하도록 함
      if (user && supabase && isSupabaseConfigured) {
        console.log('🔍 사용자 로그인 확인됨, 모임 선택 화면으로 이동')
        
        // 기존 모임 ID가 있는지만 확인하고, 자동 선택은 하지 않음
        if (meetingId) {
          const { getUserMeetings } = await import('@/utils/database')
          const userMeetings = await getUserMeetings(user.id)
          
          // 현재 모임이 사용자의 모임 목록에 있는지 확인
          const currentMeetingExists = userMeetings.find(m => m.id === meetingId)
          
          if (!currentMeetingExists) {
            // 현재 모임이 유효하지 않으면 제거
            console.log('⚠️ 기존 모임이 유효하지 않음, 모임 선택 필요')
            const { setCurrentMeetingId } = await import('@/utils/database')
            setCurrentMeetingId('')
            meetingId = null
          } else {
            console.log('✅ 기존 모임이 유효함, 하지만 모임 선택 화면을 표시')
            // 유효한 모임이 있어도 사용자가 다시 선택할 수 있도록 함
            meetingId = null
          }
        }
      }
      
      // 항상 모임 선택 화면을 표시하도록 false로 설정
      setHasMeeting(false)
    } catch (error) {
      console.error('모임 상태 확인 중 오류:', error)
      // 에러가 발생해도 모임 선택 화면을 표시
      setHasMeeting(false)
    } finally {
      setCheckingMeeting(false)
    }
  }

  const handleMeetingSelected = () => {
    setHasMeeting(true)
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    
    setAuthLoading(true)
    setMessage('')

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        setMessage('가입 확인 이메일을 보냈습니다. 이메일을 확인해 주세요.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      }
    } catch (error: any) {
      setMessage(error.message)
    } finally {
      setAuthLoading(false)
    }
  }

  const handleSignOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  }

  const handleGoogleSignIn = async () => {
    if (!supabase) return
    
    setAuthLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      if (error) throw error
    } catch (error: any) {
      setMessage(error.message)
      setAuthLoading(false)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    
    setAuthLoading(true)
    setMessage('')

    try {
      console.log('🔄 Sending password reset email...')
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })
      if (error) {
        console.error('❌ Password reset error:', error)
        throw error
      }
      console.log('✅ Password reset email sent successfully')
      setMessage('비밀번호 재설정 링크를 이메일로 보냈습니다. 이메일을 확인해 주세요.')
      setShowForgotPassword(false)
    } catch (error: any) {
      console.error('❌ Password reset failed:', error)
      setMessage(error.message || '비밀번호 재설정 요청 중 오류가 발생했습니다.')
    } finally {
      setAuthLoading(false)
    }
  }

  if (loading || checkingMeeting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-lg shadow-xl p-8">
            {/* 로고 및 제목 */}
            <div className="text-center mb-8">
              <div className="text-4xl mb-4">🪑</div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                모임 자리 배치 프로그램
              </h1>
              <p className="text-gray-600">
                {isSignUp ? '새 계정을 만들어 시작해보세요' : '로그인하여 계속하세요'}
              </p>
            </div>

            {/* 비밀번호 찾기 모달 */}
            {showForgotPassword ? (
              <form onSubmit={handlePasswordReset} className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-4">비밀번호 재설정</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    가입하신 이메일 주소를 입력하면 비밀번호 재설정 링크를 보내드립니다.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    이메일
                  </label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="your@email.com"
                  />
                </div>

                {message && (
                  <div className={`p-3 rounded-md text-sm ${
                    message.includes('보냈습니다') || message.includes('확인')
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {message}
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
                  >
                    {authLoading ? '처리 중...' : '재설정 링크 보내기'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false)
                      setMessage('')
                      setResetEmail('')
                    }}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors"
                  >
                    취소
                  </button>
                </div>
              </form>
            ) : (
              <>
                {/* 인증 폼 */}
                <form onSubmit={handleAuth} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      이메일
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="your@email.com"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        비밀번호
                      </label>
                      {!isSignUp && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowForgotPassword(true)
                            setMessage('')
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          비밀번호를 잊으셨나요?
                        </button>
                      )}
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="••••••••"
                    />
                  </div>

                  {message && (
                    <div className={`p-3 rounded-md text-sm ${
                      message.includes('확인') 
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {message}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-md transition-colors"
                  >
                    {authLoading 
                      ? '처리 중...' 
                      : isSignUp 
                        ? '회원가입' 
                        : '로그인'
                    }
                  </button>
                </form>
              </>
            )}

            {/* 구글 로그인 */}
            {!showForgotPassword && (
              <>
                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">또는</span>
                    </div>
                  </div>

                  <button
                    onClick={handleGoogleSignIn}
                    disabled={authLoading}
                    className="mt-4 w-full bg-white hover:bg-gray-50 text-gray-700 font-medium py-3 px-4 rounded-md border border-gray-300 transition-colors flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Google로 계속하기
                  </button>
                </div>

                {/* 회원가입/로그인 전환 */}
                <div className="mt-6 text-center">
                  <button
                    onClick={() => {
                      setIsSignUp(!isSignUp)
                      setMessage('')
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    {isSignUp 
                      ? '이미 계정이 있으신가요? 로그인하기' 
                      : '계정이 없으신가요? 회원가입하기'
                    }
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 사용자가 로그인했지만 모임을 선택하지 않은 경우
  if (user && !hasMeeting) {
    return <MeetingSelector user={user} onMeetingSelected={handleMeetingSelected} />
  }

  return (
    <div>
      {/* 사용자 정보 표시 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="text-sm text-gray-600">
                안녕하세요, <span className="font-medium text-gray-800">{user.email}</span>님
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  setHasMeeting(false)
                }}
                className="text-sm text-blue-600 hover:text-blue-700 px-3 py-1 rounded-md hover:bg-blue-50 transition-colors"
              >
                모임 변경
              </button>
              <button
                onClick={() => {
                  window.location.href = '/settings/password'
                }}
                className="text-sm text-green-600 hover:text-green-700 px-3 py-1 rounded-md hover:bg-green-50 transition-colors"
              >
                비밀번호 변경
              </button>
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded-md hover:bg-gray-100 transition-colors"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </div>
      {children}
    </div>
  )
} 