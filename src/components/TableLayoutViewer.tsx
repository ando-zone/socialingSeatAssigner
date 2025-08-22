'use client'

import React, { useState, useEffect } from 'react'
import type { Group, Participant } from '@/utils/grouping'
import TableLayoutUpload from './TableLayoutUpload'

interface TableLayoutViewerProps {
  groups: Group[]
  participants: Participant[]
  checkInStatus: {[participantId: string]: boolean}
  onToggleCheckIn: (participantId: string) => void
  onResetAllCheckIn?: () => Promise<void>
  onPrint?: () => void
  isEditMode?: boolean
}

export default function TableLayoutViewer({
  groups,
  participants,
  checkInStatus,
  onToggleCheckIn,
  onResetAllCheckIn,
  onPrint,
  isEditMode = false
}: TableLayoutViewerProps) {
  const [tableLayoutUrl, setTableLayoutUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 통계 계산
  const totalParticipants = participants.length
  const checkedInCount = Object.values(checkInStatus).filter(Boolean).length
  const checkInRate = totalParticipants > 0 ? Math.round((checkedInCount / totalParticipants) * 100) : 0

  // 테이블 레이아웃 이미지 로드
  useEffect(() => {
    const loadTableLayout = async () => {
      try {
        const { getTableLayoutUrl } = await import('@/utils/database')
        const url = await getTableLayoutUrl()
        setTableLayoutUrl(url)
      } catch (error) {
        console.error('테이블 레이아웃 로드 실패:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadTableLayout()
  }, [])

  // 이미지 업로드 핸들러
  const handleImageUpload = async (file: File): Promise<boolean> => {
    try {
      const { uploadTableLayout } = await import('@/utils/database')
      const url = await uploadTableLayout(file)
      if (url) {
        setTableLayoutUrl(url)
        return true
      }
      return false
    } catch (error) {
      console.error('이미지 업로드 실패:', error)
      return false
    }
  }

  // 이미지 삭제 핸들러
  const handleImageDelete = async (): Promise<boolean> => {
    try {
      const { deleteTableLayout } = await import('@/utils/database')
      const success = await deleteTableLayout()
      if (success) {
        setTableLayoutUrl(null)
      }
      return success
    } catch (error) {
      console.error('이미지 삭제 실패:', error)
      return false
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-8">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-500">테이블 배치도를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 상단 통계 및 버튼 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">🪑 좌석 배치도</h2>
            <p className="text-gray-600">참가자들이 자리를 찾을 수 있도록 도와주세요</p>
          </div>
          
          <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-3">
            {onResetAllCheckIn && (
              <button
                onClick={onResetAllCheckIn}
                className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                🔄 전체 초기화
              </button>
            )}
            {onPrint && (
              <button
                onClick={onPrint}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                🖨️ 인쇄
              </button>
            )}
          </div>
        </div>

        {/* 입장 현황 */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-emerald-600 text-sm font-medium">총 참가자</div>
              <div className="text-2xl font-bold text-emerald-800">{totalParticipants}명</div>
            </div>
            <div>
              <div className="text-emerald-600 text-sm font-medium">입장 완료</div>
              <div className="text-2xl font-bold text-emerald-700">{checkedInCount}명</div>
            </div>
            <div>
              <div className="text-gray-600 text-sm font-medium">미입장</div>
              <div className="text-2xl font-bold text-gray-700">{totalParticipants - checkedInCount}명</div>
            </div>
            <div>
              <div className="text-blue-600 text-sm font-medium">진행률</div>
              <div className="text-2xl font-bold text-blue-700">{checkInRate}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* 테이블 배치도 이미지 또는 업로드 */}
      {isEditMode ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <TableLayoutUpload
            currentImageUrl={tableLayoutUrl}
            onImageUpload={handleImageUpload}
            onImageDelete={handleImageDelete}
          />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6">
          {tableLayoutUrl ? (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">테이블 배치도</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <img
                  src={tableLayoutUrl}
                  alt="테이블 배치도"
                  className="w-full h-auto"
                  onError={() => console.error('테이블 배치도 이미지 로드 실패')}
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏗️</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                테이블 배치도가 설정되지 않았습니다
              </h3>
              <p className="text-gray-500 mb-4">
                관리자가 테이블 배치도를 업로드하면 여기에 표시됩니다.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 참가자 테이블 찾기 미니 시트 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">📋 참가자 테이블 찾기</h2>
        </div>

        <div className="space-y-4">
          {groups.filter(group => group.members.length > 0).map((group) => (
            <div key={group.id} className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
                <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm mr-3">
                  그룹 {group.id}
                </span>
                <span className="text-gray-500 text-sm">({group.members.length}명)</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {group.members.map((member) => {
                  const isCheckedIn = checkInStatus[member.id] || false
                  
                  return (
                    <button
                      key={member.id}
                      onClick={() => onToggleCheckIn(member.id)}
                      className={`p-3 rounded-lg text-left transition-all duration-200 transform hover:scale-105 ${
                        isCheckedIn
                          ? 'bg-green-100 border-2 border-green-400 text-green-800 shadow-md'
                          : 'bg-gray-50 border-2 border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{member.name}</div>
                          <div className="text-sm opacity-75">
                            {member.gender === 'male' ? '👨 남성' : '👩 여성'} · {member.mbti === 'extrovert' ? 'E' : 'I'}
                          </div>
                        </div>
                        <div className="text-xl">
                          {isCheckedIn ? '✅' : '⭕'}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}