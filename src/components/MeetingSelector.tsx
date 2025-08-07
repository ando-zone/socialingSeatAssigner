'use client'

import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { getUserMeetings, startNewMeeting, selectMeeting, getCurrentMeetingId, deleteMeeting, type Meeting } from '@/utils/database'
import { dataService } from '@/utils/data-service'
import type { User } from '@supabase/supabase-js'

interface MeetingSelectorProps {
  user: User
  onMeetingSelected: () => void
}

type SortOption = 'created_asc' | 'created_desc' | 'name_asc' | 'name_desc' | 'updated_desc'

export default function MeetingSelector({ user, onMeetingSelected }: MeetingSelectorProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewMeetingForm, setShowNewMeetingForm] = useState(false)
  const [newMeetingName, setNewMeetingName] = useState('')
  const [creatingMeeting, setCreatingMeeting] = useState(false)
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('updated_desc')
  const [deletingMeetingId, setDeletingMeetingId] = useState<string | null>(null)

  useEffect(() => {
    loadMeetings()
    // 현재 선택된 모임 ID 가져오기
    const currentId = getCurrentMeetingId()
    setSelectedMeetingId(currentId)
  }, [])

  const loadMeetings = async () => {
    setLoading(true)
    try {
      const userMeetings = await getUserMeetings(user.id)
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

  const handleDeleteMeeting = async (meetingId: string, meetingName: string) => {
    const confirmMessage = `⚠️ 모임 삭제 확인

🗑️ 삭제할 모임: "${meetingName}"

다음 데이터가 영구적으로 삭제됩니다:
• 모든 참가자 정보
• 그룹 배치 기록
• 스냅샷 백업
• 모임 설정

❌ 이 작업은 되돌릴 수 없습니다!

정말로 삭제하시겠습니까?`

    if (!confirm(confirmMessage)) return

    const secondConfirmMessage = `🚨 최종 확인

"${meetingName}" 모임을 정말로 삭제하시겠습니까?

이 작업은 되돌릴 수 없습니다!`

    if (!confirm(secondConfirmMessage)) return

    setDeletingMeetingId(meetingId)
    try {
      const success = await deleteMeeting(meetingId, user.id)
      if (success) {
        // 데이터베이스에서 해당 모임 데이터 삭제
        await dataService.clearAll()
        
        // 현재 선택된 모임이 삭제된 모임이면 선택 해제
        if (selectedMeetingId === meetingId) {
          setSelectedMeetingId(null)
        }
        
        // 모임 목록 새로고침
        await loadMeetings()
        alert('✅ 모임이 성공적으로 삭제되었습니다.')
      } else {
        alert('❌ 모임 삭제 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('모임 삭제 중 오류:', error)
      alert('❌ 모임 삭제 중 오류가 발생했습니다.')
    } finally {
      setDeletingMeetingId(null)
    }
  }

  // 모임 정렬 함수
  const sortMeetings = (meetings: Meeting[], sortOption: SortOption): Meeting[] => {
    const sorted = [...meetings]
    
    switch (sortOption) {
      case 'created_asc':
        return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      case 'created_desc':
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      case 'name_asc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
      case 'name_desc':
        return sorted.sort((a, b) => b.name.localeCompare(a.name, 'ko'))
      case 'updated_desc':
      default:
        return sorted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
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
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              기존 모임 목록 ({meetings.length}개)
            </h3>
            
            {/* 정렬 옵션 */}
            {meetings.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">정렬:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="updated_desc">최근 업데이트순</option>
                  <option value="created_desc">최신 생성순</option>
                  <option value="created_asc">오래된 생성순</option>
                  <option value="name_asc">이름 오름차순</option>
                  <option value="name_desc">이름 내림차순</option>
                </select>
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
              {sortMeetings(meetings, sortBy).map((meeting) => (
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
                    <h4 className="font-medium text-gray-800 flex-1 line-clamp-2 pr-2">
                      {meeting.name}
                    </h4>
                    <div className="flex items-center space-x-2">
                      {/* 삭제 버튼 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteMeeting(meeting.id, meeting.name)
                        }}
                        disabled={deletingMeetingId === meeting.id}
                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                        title="모임 삭제"
                      >
                        {deletingMeetingId === meeting.id ? (
                          <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                      
                      {/* 선택 표시 */}
                      {selectedMeetingId === meeting.id && (
                        <div className="text-blue-500">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <span className="mr-2">📅</span>
                      <span>생성: {formatDate(meeting.created_at)}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <div className="text-xs text-gray-500">
                      {meeting.created_at === meeting.updated_at 
                        ? `생성: ${formatDate(meeting.created_at)}`
                        : `최근 업데이트: ${formatDate(meeting.updated_at)}`
                      }
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 선택 완료 버튼 */}
        {selectedMeetingId && (
          <div className="mt-8 text-center">
            <button
              onClick={onMeetingSelected}
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