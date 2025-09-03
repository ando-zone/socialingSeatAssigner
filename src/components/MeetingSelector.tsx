/**
 * Meeting Selector Component for Socialing Seat Assigner
 * 
 * 모임 선택 및 관리 인터페이스를 제공하는 컴포넌트입니다.
 * 사용자가 로그인한 후, 메인 앱에 진입하기 전에 표시되며
 * 기존 모임 선택 또는 새 모임 생성을 할 수 있습니다.
 * 
 * 주요 기능:
 * 1. 새 모임 생성 - 모임 이름을 입력하여 새로운 모임 시작
 * 2. 기존 모임 선택 - 사용자의 모임 목록에서 선택
 * 3. 모임 관리 - 이름 변경, 삭제 (완전 삭제 주의)
 * 4. 정렬 기능 - 이름, 생성일, 수정일 기준 정렬
 * 
 * 데이터 흐름:
 * Auth → MeetingSelector → Main App
 * 
 * 사용자 경험:
 * - 직관적인 카드 형태의 모임 선택 UI
 * - 실시간 검색 및 정렬 기능
 * - 위험한 삭제 작업에 대한 명확한 경고
 * - 반응형 디자인 (모바일 대응)
 */

'use client'

import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { getUserMeetings, startNewMeeting, selectMeeting, getCurrentMeetingId, deleteMeeting, updateMeetingName, type Meeting } from '@/utils/database'
import type { User } from '@supabase/supabase-js'

/**
 * MeetingSelector 컴포넌트의 Props 인터페이스
 * @interface MeetingSelectorProps
 * @property {User} user - 인증된 Supabase 사용자 객체
 * @property {() => void} onMeetingSelected - 모임 선택 완료 시 호출될 콜백 함수
 */
interface MeetingSelectorProps {
  user: User
  onMeetingSelected: () => void
}

/**
 * 모임 선택기 메인 컴포넌트
 * 
 * @param {MeetingSelectorProps} props - 컴포넌트 props
 * @param {User} props.user - 인증된 사용자 정보
 * @param {() => void} props.onMeetingSelected - 모임 선택 완료 콜백
 * @returns {JSX.Element} 모임 선택 및 관리 UI
 */
export default function MeetingSelector({ user, onMeetingSelected }: MeetingSelectorProps) {
  // 상태 관리
  const [meetings, setMeetings] = useState<Meeting[]>([])                        // 사용자의 모임 목록
  const [loading, setLoading] = useState(true)                                  // 모임 목록 로딩 상태
  
  // 새 모임 생성 관련 상태
  const [showNewMeetingForm, setShowNewMeetingForm] = useState(false)          // 새 모임 폼 표시 여부
  const [newMeetingName, setNewMeetingName] = useState('')                     // 새 모임 이름 입력값
  const [creatingMeeting, setCreatingMeeting] = useState(false)                // 모임 생성 중 로딩 상태
  
  // 모임 선택 및 편집 관련 상태
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null)  // 현재 선택된 모임 ID
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null)    // 편집 중인 모임 ID
  const [editingName, setEditingName] = useState('')                               // 편집 중인 모임 이름
  
  // 정렬 관련 상태
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'updated_at'>('updated_at')  // 정렬 기준
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')                        // 정렬 순서

  useEffect(() => {
    loadMeetings()
    // 현재 선택된 모임 ID 가져오기
    const currentId = getCurrentMeetingId()
    setSelectedMeetingId(currentId)
  }, [])

  useEffect(() => {
    loadMeetings()
  }, [sortBy, sortOrder])

  const loadMeetings = async () => {
    setLoading(true)
    try {
      const userMeetings = await getUserMeetings(user.id, sortBy, sortOrder)
      setMeetings(userMeetings)
    } catch (error) {
      console.error('모임 목록 로드 중 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateMeeting = async () => {
    if (!newMeetingName.trim()) return
    
    setCreatingMeeting(true)
    try {
      const meetingId = await startNewMeeting(newMeetingName.trim(), user.id)
      if (meetingId) {
        setNewMeetingName('')
        setShowNewMeetingForm(false)
        setSelectedMeetingId(meetingId)
        await loadMeetings()
        onMeetingSelected()
      } else {
        alert('모임 생성 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('모임 생성 중 오류:', error)
      alert('모임 생성 중 오류가 발생했습니다.')
    } finally {
      setCreatingMeeting(false)
    }
  }

  const handleSelectMeeting = async (meetingId: string) => {
    try {
      await selectMeeting(meetingId)
      setSelectedMeetingId(meetingId)
      onMeetingSelected()
    } catch (error) {
      console.error('모임 선택 중 오류:', error)
      alert('모임 선택 중 오류가 발생했습니다.')
    }
  }

  const handleDeleteMeeting = async (meetingId: string, meetingName: string, event: React.MouseEvent) => {
    // 클릭 이벤트 전파 막기 (모임 선택 방지)
    event.stopPropagation()
    
    const confirmMessage = `🗑️ "${meetingName}" 모임을 완전히 삭제하시겠습니까?

⚠️ 다음 데이터가 모두 삭제됩니다:
• 모든 참가자 정보
• 그룹 배치 히스토리
• 스냅샷 백업 데이터
• 모임 설정 정보

이 작업은 되돌릴 수 없습니다!`
    
    if (confirm(confirmMessage)) {
      try {
        const success = await deleteMeeting(meetingId)
        if (success) {
          alert('✅ 모임이 성공적으로 삭제되었습니다.')
          // 삭제된 모임이 현재 선택된 모임이면 선택 해제
          if (selectedMeetingId === meetingId) {
            setSelectedMeetingId(null)
          }
          // 모임 목록 새로고침
          await loadMeetings()
        } else {
          alert('❌ 모임 삭제 중 오류가 발생했습니다.')
        }
      } catch (error) {
        console.error('모임 삭제 중 오류:', error)
        alert('❌ 모임 삭제 중 오류가 발생했습니다.')
      }
    }
  }

  const handleStartEditMeeting = (meetingId: string, currentName: string, event: React.MouseEvent) => {
    // 클릭 이벤트 전파 막기 (모임 선택 방지)
    event.stopPropagation()
    setEditingMeetingId(meetingId)
    setEditingName(currentName)
  }

  const handleCancelEditMeeting = () => {
    setEditingMeetingId(null)
    setEditingName('')
  }

  const handleSaveEditMeeting = async (meetingId: string) => {
    if (!editingName.trim()) {
      alert('모임 이름을 입력해주세요.')
      return
    }

    try {
      const success = await updateMeetingName(meetingId, editingName.trim())
      if (success) {
        setEditingMeetingId(null)
        setEditingName('')
        // 모임 목록 새로고침
        await loadMeetings()
        alert('✅ 모임 이름이 성공적으로 변경되었습니다.')
      } else {
        alert('❌ 모임 이름 변경 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('모임 이름 변경 중 오류:', error)
      alert('❌ 모임 이름 변경 중 오류가 발생했습니다.')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">모임 목록을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">🪑</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            모임 선택
          </h1>
          <p className="text-gray-600">
            기존 모임을 선택하거나 새로운 모임을 만드세요
          </p>
        </div>

        {/* 새 모임 생성 버튼 */}
        <div className="mb-8">
          <button
            onClick={() => setShowNewMeetingForm(!showNewMeetingForm)}
            className="w-full bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white font-medium py-4 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="flex items-center justify-center space-x-3">
              <span className="text-2xl">✨</span>
              <span className="text-lg">새로운 모임 만들기</span>
            </div>
          </button>
        </div>

        {/* 새 모임 생성 폼 */}
        {showNewMeetingForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h3 className="text-lg font-semibold mb-4">새 모임 만들기</h3>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="모임 이름을 입력하세요 (예: 2024년 신년회)"
                value={newMeetingName}
                onChange={(e) => setNewMeetingName(e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleCreateMeeting()}
              />
              <button
                onClick={handleCreateMeeting}
                disabled={!newMeetingName.trim() || creatingMeeting}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-md transition-colors"
              >
                {creatingMeeting ? '생성 중...' : '생성'}
              </button>
              <button
                onClick={() => {
                  setShowNewMeetingForm(false)
                  setNewMeetingName('')
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-md transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* 기존 모임 목록 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              기존 모임 목록 ({meetings.length}개)
            </h3>
            
            {/* 정렬 옵션 */}
            {meetings.length > 0 && (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">정렬:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'name' | 'created_at' | 'updated_at')}
                    className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="name">모임 이름</option>
                    <option value="created_at">생성일</option>
                    <option value="updated_at">최근 업데이트</option>
                  </select>
                </div>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title={sortOrder === 'asc' ? '오름차순' : '내림차순'}
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {sortOrder === 'asc' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                    )}
                  </svg>
                </button>
              </div>
            )}
          </div>
          
          {meetings.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-gray-500 mb-4">아직 생성된 모임이 없습니다.</p>
              <p className="text-sm text-gray-400">
                위의 "새로운 모임 만들기" 버튼을 클릭하여 첫 번째 모임을 만들어보세요!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {meetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                    selectedMeetingId === meeting.id
                      ? 'border-blue-500 bg-blue-50 shadow-lg'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                  onClick={() => handleSelectMeeting(meeting.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    {editingMeetingId === meeting.id ? (
                      // 편집 모드
                      <div className="flex-1 mr-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-800"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveEditMeeting(meeting.id)
                            } else if (e.key === 'Escape') {
                              handleCancelEditMeeting()
                            }
                          }}
                          autoFocus
                        />
                        <div className="flex justify-end space-x-2 mt-2">
                          <button
                            onClick={() => handleSaveEditMeeting(meeting.id)}
                            className="text-green-600 hover:text-green-800 hover:bg-green-50 p-1 rounded transition-colors"
                            title="저장"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={handleCancelEditMeeting}
                            className="text-gray-500 hover:text-gray-700 hover:bg-gray-50 p-1 rounded transition-colors"
                            title="취소"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ) : (
                      // 일반 표시 모드
                      <>
                        <h4 className="font-medium text-gray-800 flex-1 line-clamp-2">
                          {meeting.name}
                        </h4>
                        <div className="flex items-center space-x-1 ml-2">
                          {selectedMeetingId === meeting.id && (
                            <div className="text-blue-500">
                              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                          <button
                            onClick={(e) => handleStartEditMeeting(meeting.id, meeting.name, e)}
                            className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-1 rounded transition-colors"
                            title="이름 편집"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => handleDeleteMeeting(meeting.id, meeting.name, e)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
                            title="모임 삭제"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <span className="mr-2">📅</span>
                      <span>{formatDate(meeting.created_at)}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-2">🔄</span>
                      <span>{formatDate(meeting.updated_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 모임 선택 완료 액션 버튼 - 모임이 선택된 경우에만 표시 */}
        {selectedMeetingId && (
          <div className="mt-8 text-center">
            <button
              onClick={onMeetingSelected}  // Auth.tsx로 선택 완료 알림 전송
              className="bg-green-500 hover:bg-green-600 text-white font-medium py-4 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">🚀</span>
                <span>선택한 모임으로 시작하기</span>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  )
} 