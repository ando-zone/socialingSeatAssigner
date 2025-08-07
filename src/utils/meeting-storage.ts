/**
 * @deprecated 이 파일은 더 이상 사용되지 않습니다.
 * 대신 /utils/data-service.ts를 사용하세요.
 * 
 * Supabase 전용으로 전환하여 localStorage 의존성을 제거했습니다.
 */

import { 
  participantService,
  groupingResultService, 
  roundService,
  exitedParticipantService,
  groupSettingsService,
  snapshotService
} from './data-service'

console.warn('⚠️ meeting-storage.ts는 deprecated입니다. data-service.ts를 사용하세요.')

// 기존 코드와의 호환성을 위한 래퍼
export const meetingStorage = {
  // 참가자 데이터 
  setParticipants: async (participants: any[]) => {
    console.warn('🔄 meetingStorage.setParticipants는 deprecated입니다. participantService.save()를 사용하세요.')
    await participantService.save(participants)
  },
  getParticipants: async () => {
    console.warn('🔄 meetingStorage.getParticipants는 deprecated입니다. participantService.get()을 사용하세요.')
    return await participantService.get()
  },
  
  // 그룹 배치 결과
  setGroupingResult: async (result: any) => {
    console.warn('🔄 meetingStorage.setGroupingResult는 deprecated입니다. groupingResultService.save()를 사용하세요.')
    await groupingResultService.save(result)
  },
  getGroupingResult: async () => {
    console.warn('🔄 meetingStorage.getGroupingResult는 deprecated입니다. groupingResultService.get()을 사용하세요.')
    return await groupingResultService.get()
  },
  
  // 현재 라운드
  setCurrentRound: async (round: number) => {
    console.warn('🔄 meetingStorage.setCurrentRound는 deprecated입니다. roundService.save()를 사용하세요.')
    await roundService.save(round)
  },
  getCurrentRound: async () => {
    console.warn('🔄 meetingStorage.getCurrentRound는 deprecated입니다. roundService.get()을 사용하세요.')
    return await roundService.get()
  },
  
  // 이탈 참가자
  setExitedParticipants: async (exited: any) => {
    console.warn('🔄 meetingStorage.setExitedParticipants는 deprecated입니다. exitedParticipantService.save()를 사용하세요.')
    await exitedParticipantService.save(exited)
  },
  getExitedParticipants: async () => {
    console.warn('🔄 meetingStorage.getExitedParticipants는 deprecated입니다. exitedParticipantService.get()을 사용하세요.')
    return await exitedParticipantService.get()
  },
  
  // 그룹 설정
  setGroupSettings: async (settings: any) => {
    console.warn('🔄 meetingStorage.setGroupSettings는 deprecated입니다. groupSettingsService.save()를 사용하세요.')
    await groupSettingsService.save(settings)
  },
  getGroupSettings: async () => {
    console.warn('🔄 meetingStorage.getGroupSettings는 deprecated입니다. groupSettingsService.get()을 사용하세요.')
    return await groupSettingsService.get()
  },
  
  // 스냅샷
  setSnapshots: async (snapshots: any[]) => {
    console.warn('🔄 meetingStorage.setSnapshots는 deprecated입니다.')
    // 스냅샷은 개별적으로 DB에 저장되므로 일괄 저장 불가
  },
  getSnapshots: async () => {
    console.warn('🔄 meetingStorage.getSnapshots는 deprecated입니다. snapshotService.get()을 사용하세요.')
    return await snapshotService.get()
  },
  
  // 디버깅
  debug: () => {
    console.warn('🔄 meetingStorage.debug()는 deprecated입니다. Supabase 콘솔을 사용하세요.')
  },
} 