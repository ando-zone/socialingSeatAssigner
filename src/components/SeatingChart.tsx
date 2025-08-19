'use client'

import React from 'react'
import type { Group, Participant } from '@/utils/grouping'

interface SeatPosition {
  x: number
  y: number
  angle: number
  side: 'top' | 'bottom' | 'left' | 'right'
}

interface TableLayout {
  id: number
  x: number
  y: number
  width: number
  height: number
  seats: SeatPosition[]
}

interface SeatingChartProps {
  groups: Group[]
  participants: Participant[]
  checkInStatus: {[participantId: string]: boolean}
  onToggleCheckIn: (participantId: string) => void
  onPrint?: () => void
}

export default function SeatingChart({ groups, participants, checkInStatus, onToggleCheckIn, onPrint }: SeatingChartProps) {
  // 테이블당 최대 좌석 수 (사각 테이블 기준)
  const SEATS_PER_TABLE = 8
  const TABLE_WIDTH = 200
  const TABLE_HEIGHT = 120
  const MARGIN = 100
  const SEAT_SIZE = 40

  // 그룹 크기에 따른 좌석 배치 생성
  const generateSeatPositions = (memberCount: number): SeatPosition[] => {
    const seats: SeatPosition[] = []
    
    if (memberCount <= 2) {
      // 2명: 위아래
      seats.push({ x: TABLE_WIDTH / 2, y: -SEAT_SIZE / 2, angle: 0, side: 'top' })
      if (memberCount > 1) {
        seats.push({ x: TABLE_WIDTH / 2, y: TABLE_HEIGHT + SEAT_SIZE / 2, angle: 180, side: 'bottom' })
      }
    } else if (memberCount <= 4) {
      // 4명: 상하좌우
      seats.push({ x: TABLE_WIDTH / 2, y: -SEAT_SIZE / 2, angle: 0, side: 'top' })
      seats.push({ x: TABLE_WIDTH / 2, y: TABLE_HEIGHT + SEAT_SIZE / 2, angle: 180, side: 'bottom' })
      if (memberCount > 2) {
        seats.push({ x: -SEAT_SIZE / 2, y: TABLE_HEIGHT / 2, angle: 90, side: 'left' })
      }
      if (memberCount > 3) {
        seats.push({ x: TABLE_WIDTH + SEAT_SIZE / 2, y: TABLE_HEIGHT / 2, angle: -90, side: 'right' })
      }
    } else if (memberCount <= 6) {
      // 6명: 위2, 아래2, 좌우1씩
      seats.push({ x: TABLE_WIDTH * 0.3, y: -SEAT_SIZE / 2, angle: 0, side: 'top' })
      seats.push({ x: TABLE_WIDTH * 0.7, y: -SEAT_SIZE / 2, angle: 0, side: 'top' })
      seats.push({ x: TABLE_WIDTH * 0.3, y: TABLE_HEIGHT + SEAT_SIZE / 2, angle: 180, side: 'bottom' })
      seats.push({ x: TABLE_WIDTH * 0.7, y: TABLE_HEIGHT + SEAT_SIZE / 2, angle: 180, side: 'bottom' })
      if (memberCount > 4) {
        seats.push({ x: -SEAT_SIZE / 2, y: TABLE_HEIGHT / 2, angle: 90, side: 'left' })
      }
      if (memberCount > 5) {
        seats.push({ x: TABLE_WIDTH + SEAT_SIZE / 2, y: TABLE_HEIGHT / 2, angle: -90, side: 'right' })
      }
    } else {
      // 8명: 위3, 아래3, 좌우1씩
      seats.push({ x: TABLE_WIDTH * 0.2, y: -SEAT_SIZE / 2, angle: 0, side: 'top' })
      seats.push({ x: TABLE_WIDTH * 0.5, y: -SEAT_SIZE / 2, angle: 0, side: 'top' })
      seats.push({ x: TABLE_WIDTH * 0.8, y: -SEAT_SIZE / 2, angle: 0, side: 'top' })
      seats.push({ x: TABLE_WIDTH * 0.2, y: TABLE_HEIGHT + SEAT_SIZE / 2, angle: 180, side: 'bottom' })
      seats.push({ x: TABLE_WIDTH * 0.5, y: TABLE_HEIGHT + SEAT_SIZE / 2, angle: 180, side: 'bottom' })
      seats.push({ x: TABLE_WIDTH * 0.8, y: TABLE_HEIGHT + SEAT_SIZE / 2, angle: 180, side: 'bottom' })
      if (memberCount > 6) {
        seats.push({ x: -SEAT_SIZE / 2, y: TABLE_HEIGHT / 2, angle: 90, side: 'left' })
      }
      if (memberCount > 7) {
        seats.push({ x: TABLE_WIDTH + SEAT_SIZE / 2, y: TABLE_HEIGHT / 2, angle: -90, side: 'right' })
      }
    }
    
    return seats.slice(0, memberCount)
  }

  // 테이블 레이아웃 계산
  const calculateTableLayouts = (): TableLayout[] => {
    const layouts: TableLayout[] = []
    const tablesPerRow = Math.ceil(Math.sqrt(groups.length))
    
    groups.forEach((group, index) => {
      const row = Math.floor(index / tablesPerRow)
      const col = index % tablesPerRow
      
      const x = col * (TABLE_WIDTH + MARGIN * 2) + MARGIN
      const y = row * (TABLE_HEIGHT + MARGIN * 2) + MARGIN
      
      layouts.push({
        id: group.id,
        x,
        y,
        width: TABLE_WIDTH,
        height: TABLE_HEIGHT,
        seats: generateSeatPositions(group.members.length)
      })
    })
    
    return layouts
  }

  const tableLayouts = calculateTableLayouts()
  
  // 전체 캔버스 크기 계산
  const canvasWidth = Math.max(...tableLayouts.map(t => t.x + t.width)) + MARGIN
  const canvasHeight = Math.max(...tableLayouts.map(t => t.y + t.height)) + MARGIN

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

      <div className="bg-white border-2 border-gray-200 rounded-lg p-6 shadow-lg">
        <svg
          width={canvasWidth}
          height={canvasHeight}
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
          className="w-full h-auto border border-gray-100"
          style={{ minHeight: '600px' }}
        >
          {/* 배경 그리드 (건축 도면 스타일) */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" strokeWidth="0.5"/>
            </pattern>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="2" stdDeviation="3" floodColor="#00000020"/>
            </filter>
          </defs>
          
          <rect width={canvasWidth} height={canvasHeight} fill="url(#grid)" />

          {/* 테이블과 좌석 렌더링 */}
          {tableLayouts.map((table) => {
            const group = groups.find(g => g.id === table.id)
            if (!group) return null

            return (
              <g key={table.id} transform={`translate(${table.x}, ${table.y})`}>
                {/* 테이블 */}
                <rect
                  x={0}
                  y={0}
                  width={table.width}
                  height={table.height}
                  fill="#8B4513"
                  stroke="#654321"
                  strokeWidth="2"
                  rx="8"
                  filter="url(#shadow)"
                />
                
                {/* 테이블 질감 (목재 느낌) */}
                <rect
                  x={8}
                  y={8}
                  width={table.width - 16}
                  height={table.height - 16}
                  fill="#A0522D"
                  rx="4"
                  opacity="0.3"
                />

                {/* 테이블 번호 */}
                <text
                  x={table.width / 2}
                  y={table.height / 2 - 5}
                  textAnchor="middle"
                  className="text-sm font-bold fill-white"
                  style={{ fontSize: '14px' }}
                >
                  Table {group.id}
                </text>
                
                {/* 그룹 정보 */}
                <text
                  x={table.width / 2}
                  y={table.height / 2 + 10}
                  textAnchor="middle"
                  className="text-xs fill-white opacity-80"
                  style={{ fontSize: '10px' }}
                >
                  {group.members.length}명
                </text>

                {/* 좌석과 참가자 */}
                {table.seats.map((seat, seatIndex) => {
                  const member = group.members[seatIndex]
                  if (!member) return null
                  
                  const isCheckedIn = checkInStatus[member.id] || false
                  const baseColor = member.gender === 'male' ? '#3B82F6' : '#EC4899'
                  const strokeColor = member.gender === 'male' ? '#1D4ED8' : '#BE185D'
                  const checkedInColor = '#059669' // 체크인된 경우 초록색
                  const checkedInStroke = '#047857'

                  return (
                    <g key={seatIndex} transform={`translate(${seat.x}, ${seat.y})`}>
                      {/* 의자 */}
                      <rect
                        x={-SEAT_SIZE / 2}
                        y={-SEAT_SIZE / 2}
                        width={SEAT_SIZE}
                        height={SEAT_SIZE}
                        fill={isCheckedIn ? checkedInColor : baseColor}
                        stroke={isCheckedIn ? checkedInStroke : strokeColor}
                        strokeWidth={isCheckedIn ? "3" : "2"}
                        rx="6"
                        filter="url(#shadow)"
                      />
                      
                      {/* 체크인 표시 - 체크인된 경우 외곽 테두리 추가 */}
                      {isCheckedIn && (
                        <rect
                          x={-SEAT_SIZE / 2 - 2}
                          y={-SEAT_SIZE / 2 - 2}
                          width={SEAT_SIZE + 4}
                          height={SEAT_SIZE + 4}
                          fill="none"
                          stroke="#10B981"
                          strokeWidth="2"
                          strokeDasharray="4,2"
                          rx="8"
                          opacity="0.8"
                        />
                      )}
                      
                      {/* 의자 등받이 */}
                      {seat.side === 'top' && (
                        <rect x={-SEAT_SIZE / 2 + 4} y={-SEAT_SIZE / 2 - 8} width={SEAT_SIZE - 8} height="6" 
                              fill={isCheckedIn ? checkedInStroke : (member.gender === 'male' ? '#1D4ED8' : '#BE185D')} rx="3" />
                      )}
                      {seat.side === 'bottom' && (
                        <rect x={-SEAT_SIZE / 2 + 4} y={SEAT_SIZE / 2 + 2} width={SEAT_SIZE - 8} height="6" 
                              fill={isCheckedIn ? checkedInStroke : (member.gender === 'male' ? '#1D4ED8' : '#BE185D')} rx="3" />
                      )}
                      {seat.side === 'left' && (
                        <rect x={-SEAT_SIZE / 2 - 8} y={-SEAT_SIZE / 2 + 4} width="6" height={SEAT_SIZE - 8} 
                              fill={isCheckedIn ? checkedInStroke : (member.gender === 'male' ? '#1D4ED8' : '#BE185D')} rx="3" />
                      )}
                      {seat.side === 'right' && (
                        <rect x={SEAT_SIZE / 2 + 2} y={-SEAT_SIZE / 2 + 4} width="6" height={SEAT_SIZE - 8} 
                              fill={isCheckedIn ? checkedInStroke : (member.gender === 'male' ? '#1D4ED8' : '#BE185D')} rx="3" />
                      )}

                      {/* 참가자 이름 */}
                      <text
                        x={0}
                        y={5}
                        textAnchor="middle"
                        className={`text-xs font-medium fill-white ${isCheckedIn ? 'font-bold' : ''}`}
                        style={{ fontSize: isCheckedIn ? '12px' : '11px' }}
                      >
                        {member.name}
                      </text>

                      {/* 성별 아이콘 또는 체크인 아이콘 */}
                      <text
                        x={0}
                        y={-8}
                        textAnchor="middle"
                        className="text-xs fill-white"
                        style={{ fontSize: '12px' }}
                      >
                        {isCheckedIn ? '✓' : (member.gender === 'male' ? '♂' : '♀')}
                      </text>
                    </g>
                  )
                })}
              </g>
            )
          })}

          {/* 범례 */}
          <g transform={`translate(20, ${canvasHeight - 100})`}>
            <rect x={0} y={0} width="280" height="80" fill="white" stroke="#ccc" strokeWidth="1" rx="4" filter="url(#shadow)" />
            <text x={10} y={20} className="text-sm font-bold fill-gray-800" style={{ fontSize: '12px' }}>범례</text>
            
            {/* 첫 번째 줄 */}
            <rect x={10} y={25} width="20" height="20" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="1" rx="3" />
            <text x={35} y={38} className="text-xs fill-gray-700" style={{ fontSize: '10px' }}>남성</text>
            
            <rect x={80} y={25} width="20" height="20" fill="#EC4899" stroke="#BE185D" strokeWidth="1" rx="3" />
            <text x={105} y={38} className="text-xs fill-gray-700" style={{ fontSize: '10px' }}>여성</text>
            
            {/* 두 번째 줄 */}
            <rect x={10} y={50} width="20" height="20" fill="#059669" stroke="#047857" strokeWidth="2" rx="3" />
            <text x={35} y={63} className="text-xs fill-gray-700" style={{ fontSize: '10px' }}>입장완료</text>
            
            <rect x={100} y={50} width="20" height="20" fill="none" stroke="#10B981" strokeWidth="2" strokeDasharray="4,2" rx="3" />
            <text x={125} y={63} className="text-xs fill-gray-700" style={{ fontSize: '10px' }}>체크인 표시</text>
          </g>
        </svg>
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
                          {member.name}
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
                          {member.name}
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
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-500 p-2 rounded-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">📋 참가자 테이블 찾기</h2>
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
                            {member.name}
                          </span>
                          {isCheckedIn && (
                            <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full font-medium">
                              입장완료
                            </span>
                          )}
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
                            {member.name}
                          </span>
                          {isCheckedIn && (
                            <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full font-medium">
                              입장완료
                            </span>
                          )}
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