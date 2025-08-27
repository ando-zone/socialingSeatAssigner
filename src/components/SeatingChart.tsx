'use client'

import React from 'react'
import type { Group, Participant } from '@/utils/grouping'


interface SeatingChartProps {
  groups: Group[]
  participants: Participant[]
  checkInStatus: {[participantId: string]: boolean}
  onToggleCheckIn: (participantId: string) => void
  onResetAllCheckIn?: () => Promise<void>
  onPrint?: () => void
}

export default function SeatingChart({ groups, participants, checkInStatus, onToggleCheckIn, onResetAllCheckIn, onPrint }: SeatingChartProps) {

  // 체크인 통계 계산
  const totalParticipants = participants.length
  const checkedInCount = Object.values(checkInStatus).filter(Boolean).length
  const checkInRate = totalParticipants > 0 ? Math.round((checkedInCount / totalParticipants) * 100) : 0

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">좌석 배치도</h2>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-emerald-500 rounded-full"></div>
              <span className="text-sm text-gray-600">
                입장 완료: <strong className="text-emerald-700">{checkedInCount}명</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
              <span className="text-sm text-gray-600">
                미입장: <strong className="text-gray-700">{totalParticipants - checkedInCount}명</strong>
              </span>
            </div>
            <div className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-medium">
              진행률: {checkInRate}%
            </div>
          </div>
        </div>
        <button
          onClick={onPrint}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a1 1 0 001-1v-4a1 1 0 00-1-1H9a1 1 0 00-1 1v4a1 1 0 001 1zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          배치도 출력
        </button>
      </div>


      {/* 테이블별 상세 정보 */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((group) => {
          // 남녀 분리하고 가나다순 정렬
          const maleMembers = group.members
            .filter(member => member.gender === 'male')
            .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
          
          const femaleMembers = group.members
            .filter(member => member.gender === 'female')
            .sort((a, b) => a.name.localeCompare(b.name, 'ko'))

          return (
            <div key={group.id} className="bg-white rounded-lg p-4 border border-gray-200 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-800">테이블 {group.id}</h3>
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {group.members.length}명
                </span>
              </div>
              
              <div className="space-y-3">
                {/* 남성 섹션 */}
                {maleMembers.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="font-medium text-blue-700 text-sm">남성 {maleMembers.length}명</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {maleMembers.map((member) => (
                        <span 
                          key={member.id} 
                          className="bg-blue-50 text-blue-800 px-4 py-2 rounded-full text-base font-semibold"
                        >
                          {member.name}{member.age ? ` (${member.age})` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 여성 섹션 */}
                {femaleMembers.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
                      <span className="font-medium text-pink-700 text-sm">여성 {femaleMembers.length}명</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {femaleMembers.map((member) => (
                        <span 
                          key={member.id} 
                          className="bg-pink-50 text-pink-800 px-4 py-2 rounded-full text-base font-semibold"
                        >
                          {member.name}{member.age ? ` (${member.age})` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 참가자 테이블 찾기 미니 시트 */}
      <div className="mt-12 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border-2 border-blue-200">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 p-2 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">📋 참가자 테이블 찾기</h2>
          </div>
          {onResetAllCheckIn && participants.length > 0 && (
            <button
              onClick={onResetAllCheckIn}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              title="모든 입장 체크 초기화"
            >
              🔄 체크인 초기화
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 남성 참가자 목록 */}
          {(() => {
            const allMaleMembers = groups
              .flatMap(group => 
                group.members
                  .filter(member => member.gender === 'male')
                  .map(member => ({ ...member, tableId: group.id }))
              )
              .sort((a, b) => a.name.localeCompare(b.name, 'ko'))

            return allMaleMembers.length > 0 && (
              <div className="bg-white rounded-lg p-4 shadow-md">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                  <h3 className="text-xl font-bold text-blue-700">👨 남성 ({allMaleMembers.length}명)</h3>
                </div>
                <div className="space-y-2">
                  {allMaleMembers.map((member, index) => {
                    const isCheckedIn = checkInStatus[member.id] || false
                    return (
                      <div 
                        key={member.id} 
                        className={`flex items-center justify-between py-3 px-4 rounded-lg transition-all duration-200 ${
                          isCheckedIn 
                            ? 'bg-green-100 border-2 border-green-300 shadow-md' 
                            : 'bg-blue-50 hover:bg-blue-100 border border-blue-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-blue-600 font-medium w-6 text-center">
                            {index + 1}
                          </span>
                          <span className={`text-lg font-semibold ${
                            isCheckedIn ? 'text-green-800' : 'text-gray-800'
                          }`}>
                            {isCheckedIn && <span className="mr-2">✅</span>}
                            {member.name}{member.age ? ` (${member.age}세)` : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onToggleCheckIn(member.id)}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                              isCheckedIn
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                            title={isCheckedIn ? '입장 취소' : '입장 체크'}
                          >
                            {isCheckedIn ? '📤 취소' : '📥 체크'}
                          </button>
                          <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                            테이블 {member.tableId}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {/* 여성 참가자 목록 */}
          {(() => {
            const allFemaleMembers = groups
              .flatMap(group => 
                group.members
                  .filter(member => member.gender === 'female')
                  .map(member => ({ ...member, tableId: group.id }))
              )
              .sort((a, b) => a.name.localeCompare(b.name, 'ko'))

            return allFemaleMembers.length > 0 && (
              <div className="bg-white rounded-lg p-4 shadow-md">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-4 h-4 bg-pink-500 rounded-full"></div>
                  <h3 className="text-xl font-bold text-pink-700">👩 여성 ({allFemaleMembers.length}명)</h3>
                </div>
                <div className="space-y-2">
                  {allFemaleMembers.map((member, index) => {
                    const isCheckedIn = checkInStatus[member.id] || false
                    return (
                      <div 
                        key={member.id} 
                        className={`flex items-center justify-between py-3 px-4 rounded-lg transition-all duration-200 ${
                          isCheckedIn 
                            ? 'bg-green-100 border-2 border-green-300 shadow-md' 
                            : 'bg-pink-50 hover:bg-pink-100 border border-pink-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-pink-600 font-medium w-6 text-center">
                            {index + 1}
                          </span>
                          <span className={`text-lg font-semibold ${
                            isCheckedIn ? 'text-green-800' : 'text-gray-800'
                          }`}>
                            {isCheckedIn && <span className="mr-2">✅</span>}
                            {member.name}{member.age ? ` (${member.age}세)` : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onToggleCheckIn(member.id)}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                              isCheckedIn
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                            title={isCheckedIn ? '입장 취소' : '입장 체크'}
                          >
                            {isCheckedIn ? '📤 취소' : '📥 체크'}
                          </button>
                          <div className="bg-pink-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                            테이블 {member.tableId}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </div>

        {/* 사용 안내 */}
        <div className="mt-6 p-4 bg-blue-100 bg-opacity-50 rounded-lg">
          <div className="flex items-center gap-2 text-blue-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">💡 사용법:</span>
          </div>
          <div className="text-blue-600 text-sm mt-2 ml-7 space-y-1">
            <p>• 가나다순으로 정렬되어 있어 이름으로 쉽게 찾을 수 있습니다</p>
            <p>• 각 이름 옆의 배지에서 테이블 번호를 확인하세요</p>
            <p>• <strong>📥 체크</strong> 버튼을 클릭하여 참가자 입장을 체크할 수 있습니다</p>
            <p>• 입장 완료된 참가자는 <strong className="text-green-700">초록색</strong>으로 표시되며, 좌석배치도에서도 구분됩니다</p>
          </div>
        </div>
      </div>
    </div>
  )
}