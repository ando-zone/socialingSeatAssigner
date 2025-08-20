import { isSupabaseConfigured } from '@/lib/supabase'
import type { Participant, GroupingResult } from './grouping'

// 저장 전략 인터페이스
export interface StorageStrategy {
  // 참가자 관련
  getParticipants(): Promise<Participant[]>
  setParticipants(participants: Participant[]): Promise<void>
  
  // 그룹 결과 관련  
  getGroupingResult(): Promise<GroupingResult | null>
  setGroupingResult(result: GroupingResult): Promise<void>
  
  // 현재 라운드
  getCurrentRound(): Promise<number>
  setCurrentRound(round: number): Promise<void>
  
  // 이탈 참가자
  getExitedParticipants(): Promise<Record<string, {name: string, gender: 'male' | 'female'}>>
  setExitedParticipants(exited: Record<string, {name: string, gender: 'male' | 'female'}>): Promise<void>
  
  // 그룹 설정
  getGroupSettings(): Promise<any>
  setGroupSettings(settings: any): Promise<void>
  
  // 스냅샷
  getSnapshots(): Promise<any[]>
  setSnapshots(snapshots: any[]): Promise<void>
  
  // 초기화
  clearAll(): Promise<void>
}

// localStorage 전용 전략 (개발 모드)
class LocalStorageStrategy implements StorageStrategy {
  private meetingId: string
  
  constructor(meetingId: string) {
    this.meetingId = meetingId
  }
  
  private getKey(key: string): string {
    return `meeting_${this.meetingId}_${key}`
  }
  
  async getParticipants(): Promise<Participant[]> {
    const stored = localStorage.getItem(this.getKey('participants'))
    return stored ? JSON.parse(stored) : []
  }
  
  async setParticipants(participants: Participant[]): Promise<void> {
    localStorage.setItem(this.getKey('participants'), JSON.stringify(participants))
  }
  
  async getGroupingResult(): Promise<GroupingResult | null> {
    const stored = localStorage.getItem(this.getKey('groupingResult'))
    return stored ? JSON.parse(stored) : null
  }
  
  async setGroupingResult(result: GroupingResult): Promise<void> {
    localStorage.setItem(this.getKey('groupingResult'), JSON.stringify(result))
  }
  
  async getCurrentRound(): Promise<number> {
    const stored = localStorage.getItem(this.getKey('currentRound'))
    return stored ? parseInt(stored, 10) : 0
  }
  
  async setCurrentRound(round: number): Promise<void> {
    localStorage.setItem(this.getKey('currentRound'), String(round))
  }
  
  async getExitedParticipants(): Promise<Record<string, {name: string, gender: 'male' | 'female'}>> {
    const stored = localStorage.getItem(this.getKey('exitedParticipants'))
    return stored ? JSON.parse(stored) : {}
  }
  
  async setExitedParticipants(exited: Record<string, {name: string, gender: 'male' | 'female'}>): Promise<void> {
    localStorage.setItem(this.getKey('exitedParticipants'), JSON.stringify(exited))
  }
  
  async getGroupSettings(): Promise<any> {
    const stored = localStorage.getItem(this.getKey('groupSettings'))
    return stored ? JSON.parse(stored) : {}
  }
  
  async setGroupSettings(settings: any): Promise<void> {
    localStorage.setItem(this.getKey('groupSettings'), JSON.stringify(settings))
  }
  
  async getSnapshots(): Promise<any[]> {
    const stored = localStorage.getItem(this.getKey('snapshots'))
    return stored ? JSON.parse(stored) : []
  }
  
  async setSnapshots(snapshots: any[]): Promise<void> {
    localStorage.setItem(this.getKey('snapshots'), JSON.stringify(snapshots))
  }
  
  async clearAll(): Promise<void> {
    const prefix = `meeting_${this.meetingId}_`
    const keysToRemove: string[] = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key)
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key))
    console.log(`✅ 모임 ${this.meetingId}의 모든 로컬 데이터 삭제 완료`)
  }
}

// DB 전용 전략 (프로덕션 모드)
class DatabaseStrategy implements StorageStrategy {
  private meetingId: string
  
  constructor(meetingId: string) {
    this.meetingId = meetingId
  }
  
  async getParticipants(): Promise<Participant[]> {
    const { getParticipants } = await import('./database')
    return await getParticipants()
  }
  
  async setParticipants(participants: Participant[]): Promise<void> {
    const { saveParticipants } = await import('./database')
    await saveParticipants(participants)
  }
  
  async getGroupingResult(): Promise<GroupingResult | null> {
    const { getGroupingResult } = await import('./database')
    return await getGroupingResult()
  }
  
  async setGroupingResult(result: GroupingResult): Promise<void> {
    const { saveGroupingResult } = await import('./database')
    await saveGroupingResult(result)
  }
  
  async getCurrentRound(): Promise<number> {
    const { getCurrentMeeting } = await import('./database')
    const meeting = await getCurrentMeeting()
    return meeting?.current_round || 0
  }
  
  async setCurrentRound(round: number): Promise<void> {
    const { updateMeetingRound } = await import('./database')
    await updateMeetingRound(this.meetingId, round)
  }
  
  async getExitedParticipants(): Promise<Record<string, {name: string, gender: 'male' | 'female'}>> {
    const { getExitedParticipants } = await import('./database')
    return await getExitedParticipants()
  }
  
  async setExitedParticipants(exited: Record<string, {name: string, gender: 'male' | 'female'}>): Promise<void> {
    const { saveExitedParticipants } = await import('./database')
    await saveExitedParticipants(exited)
  }
  
  async getGroupSettings(): Promise<any> {
    const { getGroupSettings } = await import('./database')
    return await getGroupSettings()
  }
  
  async setGroupSettings(settings: any): Promise<void> {
    const { saveGroupSettings } = await import('./database')
    await saveGroupSettings(settings)
  }
  
  async getSnapshots(): Promise<any[]> {
    const { getSnapshots } = await import('./database')
    return await getSnapshots()
  }
  
  async setSnapshots(snapshots: any[]): Promise<void> {
    // DB는 스냅샷을 개별적으로 저장하므로 이 메서드는 사용하지 않음
    console.warn('DB 모드에서는 스냅샷을 개별적으로 저장합니다.')
  }
  
  async clearAll(): Promise<void> {
    const { deleteMeeting, getCurrentMeeting } = await import('./database')
    const meeting = await getCurrentMeeting()
    if (meeting?.user_id) {
      await deleteMeeting(this.meetingId)
      console.log(`✅ 모임 ${this.meetingId}의 모든 DB 데이터 삭제 완료`)
    }
  }
}

// 전략 팩토리
export function createStorageStrategy(meetingId: string): StorageStrategy {
  if (isSupabaseConfigured) {
    console.log('🗄️ DB 저장 전략 사용')
    return new DatabaseStrategy(meetingId)
  } else {
    console.log('💾 로컬 저장 전략 사용')
    return new LocalStorageStrategy(meetingId)
  }
}

// 전역 저장소 인스턴스
let globalStorage: StorageStrategy | null = null

export function getStorageInstance(): StorageStrategy {
  if (!globalStorage) {
    // 임시 모임 ID 생성 (개발 모드용)
    const meetingId = isSupabaseConfigured ? 'temp' : `temp-meeting-${Date.now()}`
    globalStorage = createStorageStrategy(meetingId)
  }
  return globalStorage
}

export function setStorageInstance(meetingId: string): StorageStrategy {
  globalStorage = createStorageStrategy(meetingId)
  return globalStorage
}