/**
 * Supabase 전용 데이터 서비스
 * localStorage 의존성을 완전히 제거하고 DB만 사용
 */

import { 
  getCurrentMeetingId, 
  getParticipants as dbGetParticipants,
  saveParticipants as dbSaveParticipants,
  getGroupingResult as dbGetGroupingResult,
  saveGroupingResult as dbSaveGroupingResult,
  getCurrentMeeting,
  updateMeetingRound,
  getExitedParticipants as dbGetExitedParticipants,
  saveExitedParticipants as dbSaveExitedParticipants,
  getGroupSettings as dbGetGroupSettings,
  saveGroupSettings as dbSaveGroupSettings,
  getSnapshots as dbGetSnapshots
} from './database'

import { createSnapshot } from './backup'
import type { Participant, GroupingResult } from './grouping'

// 에러 핸들링을 위한 유틸리티
function handleError(operation: string, error: any): never {
  console.error(`❌ ${operation} 실패:`, error)
  throw new Error(`데이터베이스 ${operation} 중 오류가 발생했습니다: ${error.message}`)
}

// 참가자 관련
export const participantService = {
  async get(): Promise<Participant[]> {
    try {
      const participants = await dbGetParticipants()
      console.log(`✅ 참가자 조회 성공: ${participants.length}명`)
      return participants
    } catch (error) {
      handleError('참가자 조회', error)
    }
  },

  async save(participants: Participant[]): Promise<void> {
    try {
      await dbSaveParticipants(participants)
      console.log(`✅ 참가자 저장 성공: ${participants.length}명`)
    } catch (error) {
      handleError('참가자 저장', error)
    }
  },

  async add(participant: Participant): Promise<Participant[]> {
    try {
      const currentParticipants = await this.get()
      const updatedParticipants = [...currentParticipants, participant]
      await this.save(updatedParticipants)
      
      // 스냅샷 생성
      await createSnapshot('participant_add', `참가자 추가: ${participant.name}`)
      
      return updatedParticipants
    } catch (error) {
      handleError('참가자 추가', error)
    }
  },

  async remove(participantId: string): Promise<{
    participants: Participant[], 
    removedParticipant: Participant | null
  }> {
    try {
      const currentParticipants = await this.get()
      const participantToRemove = currentParticipants.find(p => p.id === participantId)
      const updatedParticipants = currentParticipants.filter(p => p.id !== participantId)
      
      await this.save(updatedParticipants)
      
      // 이탈 참가자로 기록
      if (participantToRemove) {
        const exitedParticipants = await exitedParticipantService.get()
        exitedParticipants[participantId] = {
          name: participantToRemove.name,
          gender: participantToRemove.gender
        }
        await exitedParticipantService.save(exitedParticipants)
        
        // 스냅샷 생성
        await createSnapshot('participant_remove', `참가자 제거: ${participantToRemove.name}`)
      }
      
      return { participants: updatedParticipants, removedParticipant: participantToRemove || null }
    } catch (error) {
      handleError('참가자 제거', error)
    }
  }
}

// 그룹 결과 관련
export const groupingResultService = {
  async get(): Promise<GroupingResult | null> {
    try {
      const result = await dbGetGroupingResult()
      console.log(`✅ 그룹 결과 조회 성공: ${result ? '결과 있음' : '결과 없음'}`)
      return result
    } catch (error) {
      console.warn('⚠️ 그룹 결과 조회 실패:', error)
      return null
    }
  },

  async save(result: GroupingResult): Promise<void> {
    try {
      await dbSaveGroupingResult(result)
      console.log(`✅ 그룹 결과 저장 성공: ${result.groups.length}개 그룹`)
    } catch (error) {
      handleError('그룹 결과 저장', error)
    }
  }
}

// 현재 라운드 관련
export const roundService = {
  async get(): Promise<number> {
    try {
      const meeting = await getCurrentMeeting()
      const round = meeting?.current_round || 0
      console.log(`✅ 현재 라운드 조회: ${round}`)
      return round
    } catch (error) {
      console.warn('⚠️ 현재 라운드 조회 실패, 기본값 0 사용:', error)
      return 0
    }
  },

  async save(round: number): Promise<void> {
    try {
      const meetingId = getCurrentMeetingId()
      if (!meetingId) throw new Error('활성 모임이 없습니다')
      
      await updateMeetingRound(meetingId, round)
      console.log(`✅ 라운드 업데이트 성공: ${round}`)
    } catch (error) {
      handleError('라운드 업데이트', error)
    }
  }
}

// 이탈 참가자 관련
export const exitedParticipantService = {
  async get(): Promise<Record<string, {name: string, gender: 'male' | 'female'}>> {
    try {
      const exited = await dbGetExitedParticipants()
      console.log(`✅ 이탈 참가자 조회 성공: ${Object.keys(exited).length}명`)
      return exited
    } catch (error) {
      console.warn('⚠️ 이탈 참가자 조회 실패:', error)
      return {}
    }
  },

  async save(exited: Record<string, {name: string, gender: 'male' | 'female'}>): Promise<void> {
    try {
      await dbSaveExitedParticipants(exited)
      console.log(`✅ 이탈 참가자 저장 성공: ${Object.keys(exited).length}명`)
    } catch (error) {
      handleError('이탈 참가자 저장', error)
    }
  }
}

// 그룹 설정 관련
export const groupSettingsService = {
  async get(): Promise<any> {
    try {
      const settings = await dbGetGroupSettings()
      console.log('✅ 그룹 설정 조회 성공')
      return settings || {}
    } catch (error) {
      console.warn('⚠️ 그룹 설정 조회 실패:', error)
      return {}
    }
  },

  async save(settings: any): Promise<void> {
    try {
      await dbSaveGroupSettings(settings)
      console.log('✅ 그룹 설정 저장 성공')
    } catch (error) {
      handleError('그룹 설정 저장', error)
    }
  }
}

// 스냅샷 관련
export const snapshotService = {
  async get(): Promise<any[]> {
    try {
      const snapshots = await dbGetSnapshots()
      console.log(`✅ 스냅샷 조회 성공: ${snapshots.length}개`)
      return snapshots
    } catch (error) {
      console.warn('⚠️ 스냅샷 조회 실패:', error)
      return []
    }
  }
}

// 전체 데이터 초기화
export const dataService = {
  async clearAll(): Promise<void> {
    try {
      // 각 데이터 타입별로 초기화
      await Promise.all([
        participantService.save([]),
        groupingResultService.save({
          groups: [],
          round: 0,
          summary: {
            totalGroups: 0,
            avgGroupSize: 0,
            genderBalanceScore: 0,
            mbtiBalanceScore: 0,
            newMeetingsCount: 0
          }
        } as GroupingResult),
        roundService.save(0),
        exitedParticipantService.save({}),
        groupSettingsService.save({})
      ])
      
      console.log('✅ 전체 데이터 초기화 완료')
    } catch (error) {
      handleError('데이터 초기화', error)
    }
  },

  // 데이터 상태 확인
  async getStatus(): Promise<{
    participantCount: number
    hasGroupingResult: boolean
    currentRound: number
    exitedCount: number
  }> {
    try {
      const [participants, result, round, exited] = await Promise.all([
        participantService.get(),
        groupingResultService.get(),
        roundService.get(),
        exitedParticipantService.get()
      ])

      return {
        participantCount: participants.length,
        hasGroupingResult: !!result,
        currentRound: round,
        exitedCount: Object.keys(exited).length
      }
    } catch (error) {
      console.warn('⚠️ 데이터 상태 확인 실패:', error)
      return {
        participantCount: 0,
        hasGroupingResult: false,
        currentRound: 0,
        exitedCount: 0
      }
    }
  }
}