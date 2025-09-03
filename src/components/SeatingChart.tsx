/**
 * Seating Chart Component for Socialing Seat Assigner
 * 
 * 그룹 배치 결과를 시각적인 좌석 배치도로 표시하는 컴포넌트입니다.
 * SVG를 사용하여 실제 모임 장소에서 사용할 수 있는 테이블 배치도를
 * 생성하며, 인쇄 기능도 지원합니다.
 * 
 * 주요 기능:
 * 1. 테이블 자동 배치 - 그룹 수에 따른 최적 테이블 레이아웃
 * 2. 좌석 위치 계산 - 그룹 크기별 맞춤형 좌석 배치 알고리즘
 * 3. 시각적 차별화 - 성별에 따른 색상 구분 (남성: 파랑, 여성: 분홍)
 * 4. 인쇄 최적화 - 프린트 친화적인 레이아웃 및 스타일
 * 5. 참가자 찾기 - 가나다순 정렬된 참가자 목록과 테이블 번호 매핑
 * 
 * 테이블 배치 알고리즘:
 * - 정사각형에 가까운 그리드 형태로 테이블 배치
 * - 각 테이블은 적절한 간격을 두고 배치 (통로 확보)
 * - 그룹 크기에 따라 좌석을 테이블 둘레에 최적 배치
 * 
 * 좌석 배치 로직:
 * - 2명: 상하 배치 (마주보기)
 * - 4명: 사방향 배치 (정사각형)
 * - 6명: 상하 각 2명 + 좌우 각 1명
 * - 8명: 상하 각 3명 + 좌우 각 1명
 */

'use client'

import React from 'react'
import type { Group, Participant } from '@/utils/grouping'

/**
 * 개별 좌석의 위치와 방향 정보
 * @interface SeatPosition
 * @property {number} x - 테이블 기준 x 좌표
 * @property {number} y - 테이블 기준 y 좌표
 * @property {number} angle - 좌석의 회전 각도 (의자 방향)
 * @property {'top' | 'bottom' | 'left' | 'right'} side - 테이블의 어느 쪽에 위치하는지
 */
interface SeatPosition {
  x: number
  y: number
  angle: number
  side: 'top' | 'bottom' | 'left' | 'right'
}

/**
 * 개별 테이블의 레이아웃 정보
 * @interface TableLayout
 * @property {number} id - 테이블 ID (그룹 ID와 매칭)
 * @property {number} x - 캔버스 상의 x 좌표
 * @property {number} y - 캔버스 상의 y 좌표
 * @property {number} width - 테이블 너비
 * @property {number} height - 테이블 높이
 * @property {SeatPosition[]} seats - 해당 테이블의 좌석 배치 정보
 */
interface TableLayout {
  id: number
  x: number
  y: number
  width: number
  height: number
  seats: SeatPosition[]
}

/**
 * SeatingChart 컴포넌트의 Props 인터페이스
 * @interface SeatingChartProps
 * @property {Group[]} groups - 그룹 배치 결과 데이터
 * @property {Participant[]} participants - 전체 참가자 정보 (통계용)
 * @property {() => void} [onPrint] - 인쇄 버튼 클릭 시 호출될 콜백 (선택적)
 */
interface SeatingChartProps {
  groups: Group[]
  participants: Participant[]
  onPrint?: () => void
}

/**
 * 좌석 배치도 메인 컴포넌트
 * 
 * @param {SeatingChartProps} props - 컴포넌트 props
 * @param {Group[]} props.groups - 배치된 그룹 목록
 * @param {Participant[]} props.participants - 전체 참가자 목록
 * @param {() => void} [props.onPrint] - 인쇄 콜백 함수
 * @returns {JSX.Element} SVG 기반 좌석 배치도와 참가자 목록
 */
export default function SeatingChart({ groups, participants, onPrint }: SeatingChartProps) {
  // 배치도 레이아웃 상수 정의
  const SEATS_PER_TABLE = 8     // 테이블당 최대 좌석 수 (사각 테이블 기준)
  const TABLE_WIDTH = 200       // 테이블 너비 (px)
  const TABLE_HEIGHT = 120      // 테이블 높이 (px)
  const MARGIN = 100           // 테이블 간 여백 (px)
  const SEAT_SIZE = 40         // 좌석(의자) 크기 (px)

  /**
   * 그룹 크기에 따른 좌석 배치 생성 알고리즘
   * 
   * 테이블 둘레에 그룹 멤버 수만큼 좌석을 최적 배치합니다.
   * 좌석 간 간격과 대화하기 좋은 거리를 고려하여 설계되었습니다.
   * 
   * 배치 전략:
   * - 2명: 마주보기 (상하)로 배치하여 대화에 집중
   * - 4명: 사방향 배치로 균형잡힌 그룹 대화 가능
   * - 6명: 장축 방향(상하)에 더 많이 배치하여 안정적인 구조
   * - 8명: 최대 수용 인원으로 테이블 둘레 최대 활용
   * 
   * @param {number} memberCount - 그룹 멤버 수 (1-8명)
   * @returns {SeatPosition[]} 계산된 좌석 위치 배열
   */
  const generateSeatPositions = (memberCount: number): SeatPosition[] => {
    const seats: SeatPosition[] = []
    
    if (memberCount <= 2) {
      // 2명: 위아래 (마주보기 배치)
      // 친밀한 대화가 가능한 최적 배치
      seats.push({ x: TABLE_WIDTH / 2, y: -SEAT_SIZE / 2, angle: 0, side: 'top' })
      if (memberCount > 1) {
        seats.push({ x: TABLE_WIDTH / 2, y: TABLE_HEIGHT + SEAT_SIZE / 2, angle: 180, side: 'bottom' })
      }
    } else if (memberCount <= 4) {
      // 4명: 상하좌우 (정사각형 배치)
      // 모든 멤버가 서로를 쉽게 볼 수 있는 균형잡힌 구조
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
      // 장축을 활용한 안정적인 그룹 구성
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
      // 8명: 위3, 아래3, 좌우1씩 (최대 수용)
      // 테이블 둘레를 최대 활용한 대규모 그룹 배치
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
    
    // 실제 멤버 수만큼만 반환 (안전장치)
    return seats.slice(0, memberCount)
  }

  /**
   * 테이블 레이아웃 계산 알고리즘
   * 
   * 그룹 수에 따라 테이블을 격자형으로 배치합니다.
   * 정사각형에 가까운 배치를 만들어 공간을 효율적으로 사용하며,
   * 각 테이블 사이에는 충분한 여백을 두어 이동 통로를 확보합니다.
   * 
   * 배치 전략:
   * - √그룹수에 가까운 행 수로 격자 구성
   * - 각 테이블 간 일정한 간격 유지 (MARGIN * 2)
   * - 좌석까지 고려한 실제 필요 공간 계산
   * 
   * @returns {TableLayout[]} 각 테이블의 위치와 좌석 정보를 담은 배열
   */
  const calculateTableLayouts = (): TableLayout[] => {
    const layouts: TableLayout[] = []
    // 정사각형에 가까운 그리드 생성 (예: 9개 → 3x3, 10개 → 4x3)
    const tablesPerRow = Math.ceil(Math.sqrt(groups.length))
    
    groups.forEach((group, index) => {
      // 격자 좌표 계산
      const row = Math.floor(index / tablesPerRow)  // 행 번호
      const col = index % tablesPerRow              // 열 번호
      
      // 실제 캔버스 상의 픽셀 좌표 계산
      // 각 테이블은 테이블 크기 + 여백*2 만큼의 공간을 차지
      const x = col * (TABLE_WIDTH + MARGIN * 2) + MARGIN
      const y = row * (TABLE_HEIGHT + MARGIN * 2) + MARGIN
      
      layouts.push({
        id: group.id,
        x,
        y,
        width: TABLE_WIDTH,
        height: TABLE_HEIGHT,
        seats: generateSeatPositions(group.members.length)  // 그룹 크기별 좌석 배치
      })
    })
    
    return layouts
  }

  // 모든 테이블의 레이아웃 정보 계산
  const tableLayouts = calculateTableLayouts()
  
  // 전체 캔버스 크기 계산
  // 가장 오른쪽 테이블과 가장 아래쪽 테이블을 기준으로 전체 크기 결정
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

                {/* 여성 섹션 - 성별별 그룹 구성원 표시 */}
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
                  {allMaleMembers.map((member, index) => (
                    <div key={member.id} className="flex items-center justify-between py-2 px-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-blue-600 font-medium w-6 text-center">
                          {index + 1}
                        </span>
                        <span className="text-lg font-semibold text-gray-800">
                          {member.name}
                        </span>
                      </div>
                      <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                        테이블 {member.tableId}
                      </div>
                    </div>
                  ))}
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
                  {allFemaleMembers.map((member, index) => (
                    <div key={member.id} className="flex items-center justify-between py-2 px-3 bg-pink-50 rounded-lg hover:bg-pink-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-pink-600 font-medium w-6 text-center">
                          {index + 1}
                        </span>
                        <span className="text-lg font-semibold text-gray-800">
                          {member.name}
                        </span>
                      </div>
                      <div className="bg-pink-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                        테이블 {member.tableId}
                      </div>
                    </div>
                  ))}
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
          <p className="text-blue-600 text-sm mt-1 ml-7">
            가나다순으로 정렬되어 있어 이름으로 쉽게 찾을 수 있습니다. 각 이름 옆의 배지에서 테이블 번호를 확인하세요!
          </p>
        </div>
      </div>
    </div>
  )
}