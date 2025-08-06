import { getCurrentMeetingId } from './database'

// 모임별 localStorage 키 생성
function getMeetingKey(key: string): string {
  const meetingId = getCurrentMeetingId()
  if (!meetingId) {
    console.warn(`⚠️ 활성 모임이 없어 전역 키 사용: ${key}`)
    return key // 폴백: 전역 키 사용
  }
  const meetingKey = `meeting_${meetingId}_${key}`
  console.log(`🔑 모임별 키 생성: ${key} → ${meetingKey} (모임ID: ${meetingId})`)
  return meetingKey
}

// 모임별 데이터 저장
export function setMeetingData(key: string, value: any): void {
  if (typeof window === 'undefined') return
  
  const meetingKey = getMeetingKey(key)
  const serializedValue = typeof value === 'string' ? value : JSON.stringify(value)
  localStorage.setItem(meetingKey, serializedValue)
  
  console.log(`💾 모임별 데이터 저장: ${meetingKey}`, { key, value: typeof value === 'string' ? value : `${JSON.stringify(value).length} chars` })
}

// 모임별 데이터 조회
export function getMeetingData<T>(key: string, defaultValue?: T): T | null {
  if (typeof window === 'undefined') return defaultValue || null
  
  const meetingKey = getMeetingKey(key)
  const stored = localStorage.getItem(meetingKey)
  
  if (!stored) {
    // 모임별 키가 없으면 전역 키에서 마이그레이션 시도
    const globalStored = localStorage.getItem(key)
    if (globalStored) {
      console.log(`🔄 전역 데이터를 모임별로 마이그레이션: ${key} → ${meetingKey}`)
      localStorage.setItem(meetingKey, globalStored)
      // 마이그레이션 후 전역 키는 유지 (다른 모임에서 사용할 수 있음)
      return JSON.parse(globalStored)
    }
    return defaultValue || null
  }
  
  try {
    return JSON.parse(stored)
  } catch {
    return stored as T
  }
}

// 모임별 데이터 삭제
export function removeMeetingData(key: string): void {
  if (typeof window === 'undefined') return
  
  const meetingKey = getMeetingKey(key)
  localStorage.removeItem(meetingKey)
  console.log(`🗑️ 모임별 데이터 삭제: ${meetingKey}`)
}

// 특정 모임의 모든 데이터 삭제
export function clearMeetingData(meetingId?: string): void {
  if (typeof window === 'undefined') return
  
  const targetMeetingId = meetingId || getCurrentMeetingId()
  if (!targetMeetingId) return
  
  const prefix = `meeting_${targetMeetingId}_`
  const keysToRemove: string[] = []
  
  // localStorage에서 해당 모임의 모든 키 찾기
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(prefix)) {
      keysToRemove.push(key)
    }
  }
  
  // 모임별 데이터 삭제
  keysToRemove.forEach(key => {
    localStorage.removeItem(key)
    console.log(`🗑️ 모임 데이터 삭제: ${key}`)
  })
  
  console.log(`✅ 모임 ${targetMeetingId}의 모든 데이터 삭제 완료`)
}

// 모든 모임의 목록 조회 (localStorage 기반)
export function getAllMeetingIds(): string[] {
  if (typeof window === 'undefined') return []
  
  const meetingIds = new Set<string>()
  const prefix = 'meeting_'
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(prefix)) {
      // meeting_{meetingId}_{dataKey} 형태에서 meetingId 추출
      const parts = key.split('_')
      if (parts.length >= 3) {
        const meetingId = parts[1]
        meetingIds.add(meetingId)
      }
    }
  }
  
  return Array.from(meetingIds)
}

// 디버깅용 함수
export function debugLocalStorage(): void {
  if (typeof window === 'undefined') return
  
  console.log('🔍 현재 localStorage 상태:')
  const meetingPrefix = 'meeting_'
  const currentMeetingId = getCurrentMeetingId()
  
  console.log(`📍 현재 활성 모임 ID: ${currentMeetingId}`)
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && (key.startsWith(meetingPrefix) || ['participants', 'groupingResult', 'currentRound', 'groupSettings', 'exitedParticipants'].includes(key))) {
      const value = localStorage.getItem(key)
      const size = value ? value.length : 0
      console.log(`  ${key}: ${size} chars`)
    }
  }
}

// 호환성을 위한 래퍼 함수들
export const meetingStorage = {
  // 참가자 데이터
  setParticipants: (participants: any[]) => setMeetingData('participants', participants),
  getParticipants: () => getMeetingData('participants', []),
  
  // 그룹 배치 결과
  setGroupingResult: (result: any) => setMeetingData('groupingResult', result),
  getGroupingResult: () => getMeetingData('groupingResult', null),
  
  // 현재 라운드
  setCurrentRound: (round: number) => setMeetingData('currentRound', String(round)),
  getCurrentRound: () => {
    const round = getMeetingData('currentRound', '0')
    return parseInt(round as string, 10)
  },
  
  // 이탈 참가자
  setExitedParticipants: (exited: any) => setMeetingData('exitedParticipants', exited),
  getExitedParticipants: () => getMeetingData('exitedParticipants', {}),
  
  // 그룹 설정
  setGroupSettings: (settings: any) => setMeetingData('groupSettings', settings),
  getGroupSettings: () => getMeetingData('groupSettings', {}),
  
  // 스냅샷 (모임별)
  setSnapshots: (snapshots: any[]) => setMeetingData('snapshots', snapshots),
  getSnapshots: () => getMeetingData('snapshots', []),
  
  // 디버깅
  debug: debugLocalStorage,
} 