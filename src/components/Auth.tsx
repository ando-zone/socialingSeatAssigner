'use client'

/**
 * Authentication and Authorization Component for Socialing Seat Assigner
 * 
 * 이 컴포넌트는 전체 애플리케이션의 인증 게이트웨이 역할을 합니다.
 * 주요 기능:
 * 1. Supabase 인증 시스템 통합 (이메일/비밀번호, Google OAuth)
 * 2. 자동 모임 동기화 (사용자의 최근 모임 자동 선택)
 * 3. 비밀번호 재설정 기능
 * 4. 인증 상태에 따른 라우팅 제어
 * 5. 환경 설정 검증 및 오류 처리
 * 
 * 아키텍처:
 * - 인증되지 않은 사용자: 로그인/회원가입 폼 표시
 * - 인증된 사용자 + 모임 없음: MeetingSelector 컴포넌트 표시
 * - 인증된 사용자 + 모임 있음: children (메인 앱) 렌더링
 * 
 * 데이터 흐름:
 * Auth.tsx → Supabase Auth → Database.ts → MeetingSelector → Main App
 */

import { useState, useEffect } from 'react'
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'
import { getCurrentMeetingId } from '@/utils/database'
import MeetingSelector from './MeetingSelector'
import type { User } from '@supabase/supabase-js'

/**
 * Auth 컴포넌트의 Props 인터페이스
 * @interface AuthProps
 * @property {React.ReactNode} children - 인증 후 렌더링할 자식 컴포넌트들 (메인 앱)
 */
interface AuthProps {
  children: React.ReactNode
}

/**
 * 메인 인증 컴포넌트
 * 전체 앱을 감싸며 인증 상태와 모임 선택 상태를 관리합니다.
 * 
 * @param {AuthProps} props - children을 포함한 컴포넌트 props
 * @returns {JSX.Element} 인증 상태에 따른 적절한 UI
 */
export default function Auth({ children }: AuthProps) {
  // 인증 상태 관리
  const [user, setUser] = useState<User | null>(null)           // 현재 로그인된 사용자 정보
  const [loading, setLoading] = useState(true)                  // 초기 인증 상태 로딩 중 여부
  
  // 모임 상태 관리
  const [hasMeeting, setHasMeeting] = useState(false)          // 사용자가 모임을 선택했는지 여부
  const [checkingMeeting, setCheckingMeeting] = useState(true) // 모임 상태 확인 중 여부
  
  // 인증 폼 상태
  const [email, setEmail] = useState('')                       // 로그인/회원가입 이메일
  const [password, setPassword] = useState('')                 // 로그인/회원가입 비밀번호
  const [isSignUp, setIsSignUp] = useState(false)             // 회원가입 모드 여부
  const [authLoading, setAuthLoading] = useState(false)       // 인증 요청 진행 중 여부
  const [message, setMessage] = useState('')                   // 사용자에게 표시할 메시지
  
  // 비밀번호 재설정 상태
  const [showForgotPassword, setShowForgotPassword] = useState(false) // 비밀번호 재설정 모달 표시 여부
  const [resetEmail, setResetEmail] = useState('')             // 비밀번호 재설정용 이메일

  // Supabase 클라이언트 초기화
  const supabase = createSupabaseClient()

  // Supabase 환경변수 미설정 시 경고와 함께 앱 실행 (로컬 모드)
  // 이 경우 데이터베이스 없이 LocalStorage만 사용하여 동작
  if (!isSupabaseConfigured) {
    return (
      <div>
        <div className="bg-yellow-50 border-b border-yellow-200">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center space-x-2 text-yellow-800">
              <span>⚠️</span>
              <span className="text-sm">
                <strong>오류:</strong> Supabase가 설정되지 않았습니다. 앱이 정상 작동하지 않습니다.
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

  /**
   * 컴포넌트 마운트 시 인증 상태 초기화 및 상태 변경 리스너 등록
   * 
   * 수행하는 작업:
   * 1. 현재 사용자 인증 상태 확인
   * 2. 인증된 사용자의 모임 상태 자동 확인
   * 3. 인증 상태 변경 시 실시간 업데이트 처리
   * 4. 자동 모임 동기화 (사용자의 최근 모임 자동 선택)
   */
  useEffect(() => {
    /**
     * 현재 사용자 인증 상태를 확인하고 모임 상태를 검증합니다.
     * Supabase에서 사용자 정보를 가져와 전역 상태를 업데이트합니다.
     */
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

    /**
     * 실시간 인증 상태 변경 리스너 등록
     * 로그인, 로그아웃, 세션 만료 등의 이벤트를 감지하여
     * 앱 상태를 실시간으로 업데이트합니다.
     */
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

  /**
   * 사용자의 모임 상태를 확인하고 자동 동기화를 수행합니다.
   * 
   * 자동 동기화 로직:
   * 1. LocalStorage의 현재 모임 ID 확인
   * 2. 사용자의 Supabase 모임 목록 조회
   * 3. 현재 모임이 유효하지 않으면 최근 모임으로 자동 전환
   * 4. 선택된 모임의 데이터를 자동으로 동기화
   * 
   * @param {User} [user] - 인증된 사용자 객체 (선택적)
   */
  const checkMeetingStatus = async (user?: User) => {
    setCheckingMeeting(true)
    
    try {
      // 현재 LocalStorage에 저장된 모임 ID 확인
      let meetingId = getCurrentMeetingId()
      
      // 인증된 사용자 + Supabase 연결 시 스마트 모임 동기화 실행
      // 이 로직은 사용자의 편의성을 위해 최근 모임을 자동으로 선택합니다
      if (user && supabase && isSupabaseConfigured) {
        console.log('🔍 자동 모임 동기화 시작...')
        
        const { getUserMeetings } = await import('@/utils/database')
        const userMeetings = await getUserMeetings(user.id)
        
        if (userMeetings.length > 0) {
          // 현재 LocalStorage의 모임이 사용자 소유 모임인지 검증
          const currentMeetingExists = meetingId && userMeetings.find(m => m.id === meetingId)
          
          if (!currentMeetingExists) {
            // 스마트 모임 선택: 가장 최근에 활동한 모임을 자동 선택
            // updated_at 기준으로 정렬하여 사용자가 마지막으로 작업한 모임을 우선 선택
            const latestMeeting = userMeetings.sort((a, b) => 
              new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            )[0]
            
            console.log('✅ 자동으로 최근 모임 선택:', latestMeeting.name)
            const { setCurrentMeetingId } = await import('@/utils/database')
            setCurrentMeetingId(latestMeeting.id)
            meetingId = latestMeeting.id
            
            // 선택된 모임의 모든 데이터를 병렬로 동기화
            // 이 과정에서 참가자, 그룹 결과, 설정, 탈퇴자 정보를 한 번에 로드
            try {
              const { 
                getParticipants,      // 현재 참가자 목록
                getGroupingResult,    // 최신 그룹 배치 결과
                getGroupSettings,     // 그룹 생성 설정 (성비, 크기 등)
                getExitedParticipants // 중도 탈퇴한 참가자들
              } = await import('@/utils/database')
              
              console.log('📥 모임 데이터 동기화 시작...')
              
              const [participants, groupingResult, groupSettings, exitedParticipants] = await Promise.all([
                getParticipants(),
                getGroupingResult(), 
                getGroupSettings(),
                getExitedParticipants()
              ])
              
              // 동기화 완료 로그 - 개발자 디버깅용
              // 로드된 데이터의 상태를 한눈에 파악할 수 있도록 요약 정보 출력
              console.log('✅ 모임 데이터 로드 완료:', {
                participantCount: participants.length,                                    // 총 참가자 수
                currentRound: groupingResult ? groupingResult.round + 1 : latestMeeting.current_round, // 다음 라운드 번호
                hasGroupSettings: !!groupSettings,                                       // 그룹 설정 존재 여부
                exitedParticipantCount: Object.keys(exitedParticipants).length         // 탈퇴자 수
              })
              
              console.log('🎉 모든 데이터 동기화 완료!')
              
            } catch (syncError) {
              console.warn('⚠️ 데이터 동기화 실패 (모임 선택은 성공):', syncError)
            }
          } else {
            console.log('✅ 기존 모임이 유효함:', meetingId)
          }
        } else {
          console.log('ℹ️ 사용자에게 모임이 없음')
          meetingId = null
        }
      }
      
      setHasMeeting(!!meetingId)
    } catch (error) {
      console.error('모임 상태 확인 중 오류:', error)
      // 에러가 발생해도 기존 로직 유지
      const meetingId = getCurrentMeetingId()
      setHasMeeting(!!meetingId)
    } finally {
      setCheckingMeeting(false)
    }
  }

  /**
   * MeetingSelector에서 모임이 선택되었을 때 호출되는 콜백
   * 모임 선택 완료 후 메인 앱으로 전환하는 역할
   */
  const handleMeetingSelected = () => {
    setHasMeeting(true)
  }

  /**
   * 이메일/비밀번호 인증 처리 함수
   * 로그인 또는 회원가입을 수행하며, 성공 시 자동으로 인증 상태가 업데이트됩니다.
   * 
   * 처리 과정:
   * 1. 폼 검증 및 로딩 상태 설정
   * 2. isSignUp 상태에 따라 가입 또는 로그인 실행
   * 3. 회원가입 시 이메일 확인 요청 메시지 표시
   * 4. 오류 발생 시 사용자 친화적 메시지 표시
   * 
   * @param {React.FormEvent} e - 폼 제출 이벤트
   */
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    
    setAuthLoading(true)
    setMessage('')

    try {
      if (isSignUp) {
        // 새 계정 생성 - 이메일 확인 필요
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        setMessage('가입 확인 이메일을 보냈습니다. 이메일을 확인해 주세요.')
      } else {
        // 기존 계정으로 로그인
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      }
    } catch (error: any) {
      // Supabase 오류를 사용자 친화적 메시지로 변환
      setMessage(error.message)
    } finally {
      setAuthLoading(false)
    }
  }

  /**
   * 로그아웃 처리 함수
   * Supabase 세션을 종료하고 인증 상태 리스너가 자동으로 상태를 업데이트합니다.
   */
  const handleSignOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  }

  /**
   * Google OAuth 로그인 처리 함수
   * 
   * Google 인증 플로우:
   * 1. Google OAuth 제공자로 리디렉션
   * 2. 사용자가 Google에서 인증 완료
   * 3. /auth/callback으로 리디렉션되어 세션 설정
   * 4. 메인 앱으로 자동 전환
   * 
   * 주의: 리디렉션 기반이므로 현재 페이지를 떠나게 됩니다.
   */
  const handleGoogleSignIn = async () => {
    if (!supabase) return
    
    setAuthLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // 인증 완료 후 콜백 URL 설정
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      if (error) throw error
    } catch (error: any) {
      setMessage(error.message)
      setAuthLoading(false)
    }
  }

  /**
   * 비밀번호 재설정 이메일 발송 처리 함수
   * 
   * 비밀번호 재설정 플로우:
   * 1. 사용자가 등록된 이메일 주소 입력
   * 2. Supabase에서 재설정 링크가 포함된 이메일 발송
   * 3. 사용자가 이메일의 링크 클릭 시 /auth/reset-password로 리디렉션
   * 4. 새 비밀번호 설정 완료
   * 
   * @param {React.FormEvent} e - 폼 제출 이벤트
   */
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    
    setAuthLoading(true)
    setMessage('')

    try {
      console.log('🔄 Sending password reset email...')
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        // 비밀번호 재설정 완료 후 리디렉션될 URL
        redirectTo: `${window.location.origin}/auth/reset-password`
      })
      if (error) {
        console.error('❌ Password reset error:', error)
        throw error
      }
      console.log('✅ Password reset email sent successfully')
      setMessage('비밀번호 재설정 링크를 이메일로 보냈습니다. 이메일을 확인해 주세요.')
      setShowForgotPassword(false)  // 모달 닫기
    } catch (error: any) {
      console.error('❌ Password reset failed:', error)
      setMessage(error.message || '비밀번호 재설정 요청 중 오류가 발생했습니다.')
    } finally {
      setAuthLoading(false)
    }
  }

  // 로딩 상태 UI - 인증 상태 확인 중이거나 모임 상태 확인 중일 때 표시
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

  // 미인증 사용자 UI - 로그인/회원가입 폼과 Google OAuth 제공
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-lg shadow-xl p-8">
            {/* 브랜딩 및 앱 소개 섹션 */}
            <div className="text-center mb-8">
              <div className="text-4xl mb-4">🪑</div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                모임 자리 배치 프로그램
              </h1>
              <p className="text-gray-600">
                {isSignUp ? '새 계정을 만들어 시작해보세요' : '로그인하여 계속하세요'}
              </p>
            </div>

            {/* 비밀번호 재설정 모달 - 조건부 렌더링 */}
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

                {/* 성공/오류 메시지 - 메시지 내용에 따라 동적 스타일링 */}
                {message && (
                  <div className={`p-3 rounded-md text-sm ${
                    message.includes('보냈습니다') || message.includes('확인')
                      ? 'bg-green-50 text-green-700 border border-green-200'  // 성공 메시지
                      : 'bg-red-50 text-red-700 border border-red-200'        // 오류 메시지
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
                {/* 메인 인증 폼 - 이메일/비밀번호 로그인 및 회원가입 */}
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

                  {/* 인증 결과 메시지 표시 영역 */}
                  {message && (
                    <div className={`p-3 rounded-md text-sm ${
                      message.includes('확인') 
                        ? 'bg-green-50 text-green-700 border border-green-200'  // 성공 (회원가입 완료)
                        : 'bg-red-50 text-red-700 border border-red-200'        // 오류 (로그인 실패 등)
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

            {/* Google OAuth 인증 섹션 - 비밀번호 재설정 모드가 아닐 때만 표시 */}
            {!showForgotPassword && (
              <>
                {/* 구분선 with "또는" 텍스트 */}
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

                {/* 로그인/회원가입 모드 전환 버튼 */}
                <div className="mt-6 text-center">
                  <button
                    onClick={() => {
                      setIsSignUp(!isSignUp)  // 모드 토글
                      setMessage('')           // 기존 메시지 초기화
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

  // 인증된 사용자의 모임 선택 단계
  // 사용자가 로그인했지만 아직 모임을 선택하지 않은 경우 MeetingSelector 표시
  if (user && !hasMeeting) {
    return <MeetingSelector user={user} onMeetingSelected={handleMeetingSelected} />
  }

  // 메인 앱 렌더링 - 인증 완료 + 모임 선택 완료 상태
  // 상단에 사용자 정보와 네비게이션을 표시하고 하단에 메인 앱 컨텐츠 렌더링
  return (
    <div>
      {/* 상단 네비게이션 바 - 사용자 정보 및 주요 액션 버튼들 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            {/* 사용자 인사말 */}
            <div className="flex items-center space-x-3">
              <div className="text-sm text-gray-600">
                안녕하세요, <span className="font-medium text-gray-800">{user.email}</span>님
              </div>
            </div>
            
            {/* 사용자 액션 버튼들 */}
            <div className="flex items-center space-x-4">
              {/* 모임 변경 버튼 - MeetingSelector로 돌아가기 */}
              <button
                onClick={() => {
                  setHasMeeting(false)
                }}
                className="text-sm text-blue-600 hover:text-blue-700 px-3 py-1 rounded-md hover:bg-blue-50 transition-colors"
              >
                모임 변경
              </button>
              
              {/* 비밀번호 변경 버튼 - 외부 설정 페이지로 리디렉션 */}
              <button
                onClick={() => {
                  window.location.href = '/settings/password'
                }}
                className="text-sm text-green-600 hover:text-green-700 px-3 py-1 rounded-md hover:bg-green-50 transition-colors"
              >
                비밀번호 변경
              </button>
              
              {/* 로그아웃 버튼 */}
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
      
      {/* 메인 애플리케이션 컨텐츠 렌더링 */}
      {children}
    </div>
  )
} 