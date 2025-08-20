'use client'

import { useState } from 'react'
import type { Participant } from '@/utils/grouping'

interface GroupCardProps {
  group: {
    id: number
    members: Participant[]
    newMeetingsCount: number
  }
  checkInStatus: { [participantId: string]: boolean }
  isViewingPastRound?: boolean
  isMobile: boolean
  selectedParticipant: string | null
  swapSelectedParticipant: { id: string, groupId: number } | null
  editingParticipant: string | null
  editForm: {
    name: string
    gender: 'male' | 'female'
    mbti: 'extrovert' | 'introvert'
  }
  showAddForm: number | null
  newParticipant: {
    name: string
    gender: 'male' | 'female'
    mbti: 'extrovert' | 'introvert'
  }
  // Event handlers
  onToggleCheckIn: (participantId: string) => void
  onStartEditParticipant: (participantId: string) => void
  onDeleteParticipant: (participantId: string) => void
  onParticipantClick: (participantId: string, groupId: number) => void
  onDragStart: (participantId: string, groupId: number) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (participantId: string, groupId: number) => void
  onSaveEditParticipant: () => void
  onCancelEditParticipant: () => void
  onEditFormChange: (field: keyof typeof editForm, value: string) => void
  onAddParticipantToGroup: (groupId: number) => void
  onCancelAddForm: () => void
  onNewParticipantChange: (field: keyof typeof newParticipant, value: string) => void
  onSetShowAddForm: (groupId: number) => void
  // Helper functions
  getCurrentRoundMeetings: (participantId: string) => string[]
  getPreviousRoundsMeetings: (participantId: string) => string[]
}

export default function GroupCard({
  group,
  checkInStatus,
  isViewingPastRound = false,
  isMobile,
  selectedParticipant,
  swapSelectedParticipant,
  editingParticipant,
  editForm,
  showAddForm,
  newParticipant,
  onToggleCheckIn,
  onStartEditParticipant,
  onDeleteParticipant,
  onParticipantClick,
  onDragStart,
  onDragOver,
  onDrop,
  onSaveEditParticipant,
  onCancelEditParticipant,
  onEditFormChange,
  onAddParticipantToGroup,
  onCancelAddForm,
  onNewParticipantChange,
  onSetShowAddForm,
  getCurrentRoundMeetings,
  getPreviousRoundsMeetings
}: GroupCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-gray-800">
            그룹 {group.id}
          </h3>
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
            {group.members.length}명
          </span>
          {group.newMeetingsCount > 0 && (
            <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
              신규 만남: {group.newMeetingsCount}쌍
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {group.members.map((member) => {
          const isCheckedIn = checkInStatus[member.id] || false
          const isSelected = selectedParticipant === member.id
          const isSwapTarget = swapSelectedParticipant && swapSelectedParticipant.id === member.id
          
          return (
            <div key={member.id} className="border rounded-lg">
              {editingParticipant === member.id ? (
                // 편집 모드
                <div className="p-3 bg-yellow-50">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => onEditFormChange('name', e.target.value)}
                      className="border rounded px-2 py-1 text-sm"
                      placeholder="이름"
                    />
                    <select
                      value={editForm.gender}
                      onChange={(e) => onEditFormChange('gender', e.target.value as 'male' | 'female')}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      <option value="male">남성</option>
                      <option value="female">여성</option>
                    </select>
                    <select
                      value={editForm.mbti}
                      onChange={(e) => onEditFormChange('mbti', e.target.value as 'extrovert' | 'introvert')}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      <option value="extrovert">외향형</option>
                      <option value="introvert">내향형</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={onSaveEditParticipant}
                      className="text-sm bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
                    >
                      저장
                    </button>
                    <button
                      onClick={onCancelEditParticipant}
                      className="text-sm bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                // 일반 모드
                <div className="flex items-center justify-between p-2">
                  <div 
                    draggable={!isMobile && !swapSelectedParticipant && !isViewingPastRound}
                    onDragStart={!isMobile && !swapSelectedParticipant && !isViewingPastRound ? () => onDragStart(member.id, group.id) : undefined}
                    onDragOver={!isMobile && !isViewingPastRound ? onDragOver : undefined}
                    onDrop={!isMobile && !isViewingPastRound ? () => onDrop(member.id, group.id) : undefined}
                    onClick={isMobile && !swapSelectedParticipant && !isViewingPastRound ? () => onParticipantClick(member.id, group.id) : undefined}
                    className={`flex-1 ${
                      isViewingPastRound 
                        ? 'cursor-default' 
                        : !swapSelectedParticipant ? (isMobile ? 'cursor-pointer' : 'cursor-move') : 'cursor-default'
                    }`}
                    title={
                      isViewingPastRound ? '과거 라운드 - 편집 불가' :
                      isSelected ? '선택됨 - 다시 터치하면 선택 취소' :
                      isSwapTarget ? `${member.name}과 위치 바꾸기` :
                      !swapSelectedParticipant && isMobile ? '터치해서 선택' :
                      '드래그해서 다른 사람과 위치 바꾸기'
                    }
                  >
                    <div className={`p-2 rounded ${
                      isSelected ? 'bg-blue-200 border-2 border-blue-400' :
                      isSwapTarget ? 'bg-orange-200 border-2 border-orange-400' :
                      isCheckedIn ? 'bg-green-100 border-l-4 border-green-500' : 'bg-gray-50'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{member.name}</div>
                          <div className="text-xs text-gray-600">
                            {member.gender === 'male' ? '남성' : '여성'} • {' '}
                            {member.mbti === 'extrovert' ? 'E' : 'I'} • {' '}
                            체크인: {isCheckedIn ? '✅' : '⏳'}
                          </div>
                        </div>
                        
                        {!isSelected && !isSwapTarget && (
                          <div className="flex gap-1">
                            <button
                              disabled={isViewingPastRound}
                              onClick={(e) => {
                                e.stopPropagation()
                                onToggleCheckIn(member.id)
                              }}
                              className={`text-sm px-2 py-1 rounded transition-colors ${
                                isViewingPastRound 
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                  : isCheckedIn 
                                  ? 'text-red-600 hover:text-red-800 hover:bg-red-100' 
                                  : 'text-green-600 hover:text-green-800 hover:bg-green-100'
                              }`}
                              title={isCheckedIn ? '입장 취소' : '입장 체크'}
                            >
                              {isCheckedIn ? '❌' : '✅'}
                            </button>
                            <button
                              disabled={isViewingPastRound}
                              onClick={() => onStartEditParticipant(member.id)}
                              className={`text-xs px-1 py-1 rounded transition-colors ${
                                isViewingPastRound 
                                  ? 'text-gray-400 cursor-not-allowed' 
                                  : 'text-purple-500 hover:text-purple-700 hover:bg-purple-100'
                              }`}
                              title="참가자 정보 수정"
                            >
                              ✏️
                            </button>
                            <button
                              disabled={isViewingPastRound}
                              onClick={() => onDeleteParticipant(member.id)}
                              className={`text-xs px-1 py-1 rounded transition-colors ${
                                isViewingPastRound 
                                  ? 'text-gray-400 cursor-not-allowed' 
                                  : 'text-red-500 hover:text-red-700 hover:bg-red-100'
                              }`}
                              title="참가자 삭제"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 만남 정보 표시 */}
                      <div className="mt-2 text-xs">
                        {(() => {
                          const previousMeetings = getPreviousRoundsMeetings(member.id)
                          const currentRoundMeetings = getCurrentRoundMeetings(member.id)
                          const newInCurrentRound = currentRoundMeetings.filter(meetingId => 
                            !previousMeetings.includes(meetingId)
                          ).length

                          return (
                            <div className="space-y-1">
                              <div className="text-gray-600">
                                <span className="font-medium">전체 만남:</span> {previousMeetings.length}명
                              </div>
                              {newInCurrentRound > 0 && (
                                <div className="text-green-600">
                                  <span className="font-medium">새로운 만남:</span> {newInCurrentRound}명
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* 참가자 추가 폼 */}
        <div className="border-t pt-3">
          {showAddForm === group.id ? (
            <div className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="이름"
                  value={newParticipant.name}
                  onChange={(e) => onNewParticipantChange('name', e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                />
                <select
                  value={newParticipant.gender}
                  onChange={(e) => onNewParticipantChange('gender', e.target.value as 'male' | 'female')}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="male">남성</option>
                  <option value="female">여성</option>
                </select>
                <select
                  value={newParticipant.mbti}
                  onChange={(e) => onNewParticipantChange('mbti', e.target.value as 'extrovert' | 'introvert')}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="extrovert">외향형</option>
                  <option value="introvert">내향형</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onAddParticipantToGroup(group.id)}
                  className="text-sm bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
                >
                  추가
                </button>
                <button
                  onClick={onCancelAddForm}
                  className="text-sm bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded"
                >
                  취소
                </button>
              </div>
            </div>
          ) : !isViewingPastRound ? (
            <button
              onClick={() => onSetShowAddForm(group.id)}
              className="w-full p-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
            >
              <div className="flex items-center justify-center">
                <span className="text-lg mr-1">+</span>
                <span className="text-sm">참가자 추가</span>
              </div>
            </button>
          ) : null}
        </div>

        {/* 새로운 만남 표시 */}
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-green-600">
            새로운 만남: {group.newMeetingsCount}쌍
          </div>
        </div>
      </div>
    </div>
  )
}