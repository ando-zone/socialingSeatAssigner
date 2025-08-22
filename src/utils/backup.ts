import type { Participant, GroupingResult } from './grouping'

// 현재 상태 데이터 수집 (Supabase에서 가져오기)
async function getCurrentData() {
  try {
    const { getParticipants, getGroupingResult, getExitedParticipants, getGroupSettings } = await import('./database')
    
    const [participants, groupingResult, exitedParticipants, groupSettings] = await Promise.all([
      getParticipants(),
      getGroupingResult(),
      getExitedParticipants(),
      getGroupSettings()
    ])
    
    // 현재 라운드는 groupingResult에서 추출하거나 기본값 1 사용
    const currentRound = groupingResult?.round?.toString() || '1'
    
    return {
      participants,
      groupingResult,
      currentRound,
      exitedParticipants,
      groupSettings
    }
  } catch (error) {
    console.error('현재 데이터 수집 중 오류:', error)
    return {
      participants: [],
      groupingResult: null,
      currentRound: '1',
      exitedParticipants: {},
      groupSettings: null
    }
  }
}

export interface BackupData {
  participants: any[]
  groupingResult: any
  currentRound: string | null
  exitedParticipants: { [id: string]: { name: string, gender: 'male' | 'female' } }
  groupSettings: any
  timestamp: string
  version: string
}

export interface Snapshot {
  id: number
  timestamp: string
  eventType: string
  description: string
  data: any
}

// JSON으로 데이터 내보내기
export async function exportToJSON(): Promise<string> {
  if (typeof window === 'undefined') {
    return JSON.stringify({
      participants: [],
      groupingResult: null,
      currentRound: '1',
      exitedParticipants: {},
      groupSettings: null,
      timestamp: new Date().toISOString(),
      version: '1.0'
    })
  }
  
  const data = await getCurrentData()
  
  // 타임스탬프와 버전 정보 추가
  const backupData = {
    ...data,
    timestamp: new Date().toISOString(),
    version: '1.0'
  }
  
  console.log(`📦 스냅샷 데이터 수집:`, {
    participantCount: data.participants.length,
    participantNames: data.participants.map((p: any) => p.name),
    currentRound: data.currentRound,
    hasGroupingResult: !!data.groupingResult,
    exitedCount: Object.keys(data.exitedParticipants).length,
    hasGroupSettings: !!data.groupSettings
  })
  
  return JSON.stringify(backupData, null, 2)
}

// 스냅샷 생성 (Supabase DB에만 저장)
export async function createSnapshot(eventType: string, description: string): Promise<void> {
  if (typeof window === 'undefined') return
  
  const snapshotId = Date.now() % 2147483647  // PostgreSQL integer 범위 내로 제한
  const timestamp = new Date().toISOString()
  const data = await getCurrentData()
  
  console.log(`📸 스냅샷 생성 시작:`, {
    id: snapshotId,
    eventType,
    description,
    timestamp,
    participantCount: data.participants?.length || 0,
    currentRound: data.currentRound
  })
  
  // Supabase DB에 저장
  try {
    const { saveSnapshot } = await import('./database')
    const success = await saveSnapshot(snapshotId, eventType, description, data)
    if (success) {
      console.log(`💾 DB 스냅샷 저장 성공: ${description} (ID: ${snapshotId})`)
    } else {
      console.warn(`⚠️ DB 스냅샷 저장 실패: ${description} (ID: ${snapshotId})`)
    }
  } catch (error) {
    console.error(`❌ DB 스냅샷 저장 중 오류: ${description} (ID: ${snapshotId})`, error)
  }
}

// 모든 스냅샷 조회 (Supabase DB에서만)
export async function getSnapshots(): Promise<Snapshot[]> {
  if (typeof window === 'undefined') return []
  
  try {
    console.log('📋 스냅샷 목록 조회 시작...')
    
    // Supabase DB에서 스냅샷 가져오기
    const { getSnapshots: getDBSnapshots } = await import('./database')
    console.log('💾 DB 스냅샷 조회 중...')
    
    const dbData = await getDBSnapshots()
    console.log(`💾 DB 스냅샷 ${dbData.length}개 발견`)
    
    // DB 데이터를 로컬 형식으로 변환
    const snapshots = dbData.map((item: any) => ({
      id: item.snapshot_id,
      timestamp: item.timestamp,
      eventType: item.event_type,
      description: item.description,
      data: item.data
    }))
    
    // 최신순 정렬 (ID는 타임스탬프 기반이므로 ID로 내림차순 정렬)
    snapshots.sort((a: any, b: any) => b.id - a.id)
    
    console.log(`📋 총 ${snapshots.length}개 스냅샷 반환`)
    return snapshots
    
  } catch (error) {
    console.error('❌ 스냅샷 조회 중 오류:', error)
    return []
  }
}

// 스냅샷 복원 (Supabase에서 데이터 가져와서 현재 상태에 적용)
export async function restoreSnapshot(snapshotId: number): Promise<boolean> {
  if (typeof window === 'undefined') return false
  
  try {
    console.log(`🔄 스냅샷 복원 시작: ID ${snapshotId}`)
    
    // DB에서 스냅샷 데이터 가져오기
    const { restoreFromSnapshot } = await import('./database')
    const snapshotData = await restoreFromSnapshot(snapshotId)
    
    if (!snapshotData) {
      console.error('❌ 스냅샷 데이터를 찾을 수 없습니다:', snapshotId)
      return false
    }
    
    console.log('📦 복원할 데이터:', {
      participantCount: snapshotData.participants?.length || 0,
      currentRound: snapshotData.currentRound,
      hasGroupingResult: !!snapshotData.groupingResult,
      exitedCount: Object.keys(snapshotData.exitedParticipants || {}).length,
      hasGroupSettings: !!snapshotData.groupSettings
    })
    
    // Supabase에 데이터 저장
    const {
      saveParticipants,
      saveGroupingResult,
      saveExitedParticipants,
      saveGroupSettings,
      updateMeetingRound
    } = await import('./database')
    
    const promises = []
    
    // 참가자 저장
    if (snapshotData.participants) {
      promises.push(saveParticipants(snapshotData.participants))
    }
    
    // 그룹 배치 결과 저장 또는 삭제
    if (snapshotData.groupingResult) {
      // 그룹핑 결과가 있으면 저장
      promises.push(saveGroupingResult(snapshotData.groupingResult))
    } else {
      // 그룹핑 결과가 null이면 기존 결과 삭제 (1라운드 시작 전 상태로 복원)
      console.log('🗑️ 스냅샷에 그룹핑 결과가 없음 - 기존 그룹핑 결과 삭제')
      const { clearGroupingResult } = await import('./database')
      promises.push(clearGroupingResult())
    }
    
    // 이탈 참가자 저장
    if (snapshotData.exitedParticipants) {
      promises.push(saveExitedParticipants(snapshotData.exitedParticipants))
    }
    
    // 그룹 설정 저장
    if (snapshotData.groupSettings) {
      promises.push(saveGroupSettings(snapshotData.groupSettings))
    }
    
    // 라운드 업데이트
    if (snapshotData.currentRound) {
      const { getCurrentMeetingId } = await import('./database')
      const meetingId = getCurrentMeetingId()
      if (meetingId) {
        promises.push(updateMeetingRound(meetingId, parseInt(snapshotData.currentRound)))
      }
    }
    
    const results = await Promise.all(promises)
    const allSuccess = results.every(result => result === true)
    
    if (allSuccess) {
      console.log(`✅ 스냅샷 복원 완료: ID ${snapshotId}`)
      
      // 복원 완료 후 새 스냅샷 생성
      await createSnapshot('restore', `스냅샷 ${snapshotId}에서 복원됨`)
      
      return true
    } else {
      console.error(`❌ 스냅샷 복원 중 일부 실패: ID ${snapshotId}`)
      return false
    }
    
  } catch (error) {
    console.error(`❌ 스냅샷 복원 중 오류: ID ${snapshotId}`, error)
    return false
  }
}

// JSON에서 데이터 가져오기 (JSON 파일 업로드 시 사용)
export async function importFromJSON(jsonString: string): Promise<{ success: boolean; message: string }> {
  try {
    const data = JSON.parse(jsonString)
    
    console.log('📥 JSON 데이터 가져오기:', {
      version: data.version,
      timestamp: data.timestamp,
      participantCount: data.participants?.length || 0,
      hasGroupingResult: !!data.groupingResult,
      exitedCount: Object.keys(data.exitedParticipants || {}).length,
      hasGroupSettings: !!data.groupSettings
    })
    
    // 데이터 검증
    if (!data.participants || !Array.isArray(data.participants)) {
      return { success: false, message: '유효하지 않은 JSON 형식입니다: participants 배열이 없습니다.' }
    }
    
    // Supabase에 데이터 저장
    const {
      saveParticipants,
      saveGroupingResult,
      saveExitedParticipants,
      saveGroupSettings,
      updateMeetingRound
    } = await import('./database')
    
    const promises = []
    
    // 참가자 저장
    promises.push(saveParticipants(data.participants))
    
    // 그룹 배치 결과 저장 또는 삭제
    if (data.groupingResult) {
      // 그룹핑 결과가 있으면 저장
      promises.push(saveGroupingResult(data.groupingResult))
    } else {
      // 그룹핑 결과가 null이면 기존 결과 삭제
      console.log('🗑️ JSON에 그룹핑 결과가 없음 - 기존 그룹핑 결과 삭제')
      const { clearGroupingResult } = await import('./database')
      promises.push(clearGroupingResult())
    }
    
    // 이탈 참가자 저장
    if (data.exitedParticipants) {
      promises.push(saveExitedParticipants(data.exitedParticipants))
    }
    
    // 그룹 설정 저장
    if (data.groupSettings) {
      promises.push(saveGroupSettings(data.groupSettings))
    }
    
    // 라운드 업데이트
    if (data.currentRound) {
      const { getCurrentMeetingId } = await import('./database')
      const meetingId = getCurrentMeetingId()
      if (meetingId) {
        promises.push(updateMeetingRound(meetingId, parseInt(data.currentRound)))
      }
    }
    
    const results = await Promise.all(promises)
    const allSuccess = results.every(result => result === true)
    
    if (allSuccess) {
      console.log('✅ JSON 데이터 가져오기 완료')
      
      // 가져오기 완료 후 새 스냅샷 생성
      await createSnapshot('import', `JSON 파일에서 가져옴`)
      
      return { success: true, message: '데이터를 성공적으로 가져왔습니다.' }
    } else {
      return { success: false, message: '데이터 저장 중 일부 실패했습니다.' }
    }
    
  } catch (error) {
    console.error('❌ JSON 가져오기 중 오류:', error)
    return { success: false, message: `JSON 파싱 오류: ${error}` }
  }
}

// 시간 포맷팅 유틸리티
export function formatDateTime(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch (error) {
    return timestamp
  }
}

// 개별 스냅샷 삭제
export async function deleteSnapshot(snapshotId: number): Promise<boolean> {
  if (typeof window === 'undefined') return false
  
  try {
    console.log(`🗑️ 스냅샷 삭제 시작: ID ${snapshotId}`)
    
    const { deleteSnapshot: deleteSnapshotDB } = await import('./database')
    const success = await deleteSnapshotDB(snapshotId)
    
    if (success) {
      console.log(`✅ 스냅샷 삭제 완료: ID ${snapshotId}`)
      return true
    } else {
      console.error(`❌ 스냅샷 삭제 실패: ID ${snapshotId}`)
      return false
    }
  } catch (error) {
    console.error(`❌ 스냅샷 삭제 중 오류: ID ${snapshotId}`, error)
    return false
  }
}

// 스냅샷 정리 (사용하지 않음 - DB에서 자동 관리)
export async function deleteOldSnapshots(keepCount: number = 20): Promise<void> {
  console.log('🗑️ 스냅샷 정리는 Supabase에서 자동으로 관리됩니다.')
}

// 모든 스냅샷 삭제 (사용하지 않음 - DB에서 자동 관리)
export async function clearAllSnapshots(): Promise<void> {
  console.log('🗑️ 스냅샷 전체 삭제는 Supabase에서 모임 삭제 시 자동으로 처리됩니다.')
}