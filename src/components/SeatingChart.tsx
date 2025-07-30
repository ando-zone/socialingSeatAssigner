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
  onPrint?: () => void
}

export default function SeatingChart({ groups, participants, onPrint }: SeatingChartProps) {
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

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">좌석 배치도</h2>
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

                  return (
                    <g key={seatIndex} transform={`translate(${seat.x}, ${seat.y})`}>
                      {/* 의자 */}
                      <rect
                        x={-SEAT_SIZE / 2}
                        y={-SEAT_SIZE / 2}
                        width={SEAT_SIZE}
                        height={SEAT_SIZE}
                        fill={member.gender === 'male' ? '#3B82F6' : '#EC4899'}
                        stroke={member.gender === 'male' ? '#1D4ED8' : '#BE185D'}
                        strokeWidth="2"
                        rx="6"
                        filter="url(#shadow)"
                      />
                      
                      {/* 의자 등받이 */}
                      {seat.side === 'top' && (
                        <rect x={-SEAT_SIZE / 2 + 4} y={-SEAT_SIZE / 2 - 8} width={SEAT_SIZE - 8} height="6" 
                              fill={member.gender === 'male' ? '#1D4ED8' : '#BE185D'} rx="3" />
                      )}
                      {seat.side === 'bottom' && (
                        <rect x={-SEAT_SIZE / 2 + 4} y={SEAT_SIZE / 2 + 2} width={SEAT_SIZE - 8} height="6" 
                              fill={member.gender === 'male' ? '#1D4ED8' : '#BE185D'} rx="3" />
                      )}
                      {seat.side === 'left' && (
                        <rect x={-SEAT_SIZE / 2 - 8} y={-SEAT_SIZE / 2 + 4} width="6" height={SEAT_SIZE - 8} 
                              fill={member.gender === 'male' ? '#1D4ED8' : '#BE185D'} rx="3" />
                      )}
                      {seat.side === 'right' && (
                        <rect x={SEAT_SIZE / 2 + 2} y={-SEAT_SIZE / 2 + 4} width="6" height={SEAT_SIZE - 8} 
                              fill={member.gender === 'male' ? '#1D4ED8' : '#BE185D'} rx="3" />
                      )}

                      {/* 참가자 이름 */}
                      <text
                        x={0}
                        y={5}
                        textAnchor="middle"
                        className="text-xs font-medium fill-white"
                        style={{ fontSize: '11px' }}
                      >
                        {member.name}
                      </text>

                      {/* 성별 아이콘 */}
                      <text
                        x={0}
                        y={-8}
                        textAnchor="middle"
                        className="text-xs fill-white"
                        style={{ fontSize: '12px' }}
                      >
                        {member.gender === 'male' ? '♂' : '♀'}
                      </text>
                    </g>
                  )
                })}
              </g>
            )
          })}

          {/* 범례 */}
          <g transform={`translate(20, ${canvasHeight - 80})`}>
            <rect x={0} y={0} width="200" height="60" fill="white" stroke="#ccc" strokeWidth="1" rx="4" filter="url(#shadow)" />
            <text x={10} y={20} className="text-sm font-bold fill-gray-800" style={{ fontSize: '12px' }}>범례</text>
            
            <rect x={10} y={25} width="20" height="20" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="1" rx="3" />
            <text x={35} y={38} className="text-xs fill-gray-700" style={{ fontSize: '10px' }}>남성</text>
            
            <rect x={80} y={25} width="20" height="20" fill="#EC4899" stroke="#BE185D" strokeWidth="1" rx="3" />
            <text x={105} y={38} className="text-xs fill-gray-700" style={{ fontSize: '10px' }}>여성</text>
          </g>
        </svg>
      </div>

      {/* 테이블별 상세 정보 */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((group) => (
          <div key={group.id} className="bg-gray-50 rounded-lg p-4 border">
            <h3 className="font-semibold text-gray-800 mb-2">테이블 {group.id}</h3>
            <div className="space-y-1">
              {group.members.map((member, index) => (
                <div key={member.id} className="flex items-center gap-2 text-sm">
                  <span className={`w-3 h-3 rounded-full ${member.gender === 'male' ? 'bg-blue-500' : 'bg-pink-500'}`}></span>
                  <span>{member.name}</span>
                  <span className="text-gray-500">({member.mbti === 'extrovert' ? 'E' : 'I'})</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}