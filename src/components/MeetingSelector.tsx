'use client'

import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { getUserMeetings, startNewMeeting, selectMeeting, getCurrentMeetingId, type Meeting } from '@/utils/database'
import type { User } from '@supabase/supabase-js'

interface MeetingSelectorProps {
  user: User
  onMeetingSelected: () => void
}

export default function MeetingSelector({ user, onMeetingSelected }: MeetingSelectorProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewMeetingForm, setShowNewMeetingForm] = useState(false)
  const [newMeetingName, setNewMeetingName] = useState('')
  const [creatingMeeting, setCreatingMeeting] = useState(false)
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null)

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
          <h3 className="text-lg font-semibold mb-4">
            기존 모임 목록 ({meetings.length}개)
          </h3>
          
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
                    <h4 className="font-medium text-gray-800 flex-1 line-clamp-2">
                      {meeting.name}
                    </h4>
                    {selectedMeetingId === meeting.id && (
                      <div className="text-blue-500 ml-2">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <span className="mr-2">🎯</span>
                      <span>{meeting.current_round}라운드</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-2">📅</span>
                      <span>{formatDate(meeting.updated_at)}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <div className="text-xs text-gray-500">
                      마지막 업데이트: {formatDate(meeting.updated_at)}
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