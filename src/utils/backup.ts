import { saveSnapshot as saveSnapshotToDB } from './database'
import { 
  participantService,
  groupingResultService,
  roundService,
  exitedParticipantService,
  groupSettingsService,
  snapshotService
} from './data-service'

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
  data: BackupData
  description: string
}

// 현재 모든 데이터를 BackupData 형태로 수집
export async function getCurrentData(): Promise<BackupData> {
  if (typeof window === 'undefined') {
    return {
      participants: [],
      groupingResult: null,
      currentRound: '1',
      exitedParticipants: {},
      groupSettings: null,
      timestamp: new Date().toISOString(),
      version: '1.0'
    }
  }
  
  try {
    const [participants, groupingResult, currentRound, exitedParticipants, groupSettings] = await Promise.all([
      participantService.get(),
      groupingResultService.get(),
      roundService.get(),
      exitedParticipantService.get(),
      groupSettingsService.get()
    ])
  
    const data = {
      participants,
      groupingResult,
      currentRound: String(currentRound),
      exitedParticipants,
      groupSettings,
      timestamp: new Date().toISOString(),
      version: '1.0'
    }
    
    console.log(`📦 스냅샷 데이터 수집:`, {
      participantCount: participants.length,
      participantNames: participants.map((p: any) => p.name),
      currentRound,
      hasGroupingResult: !!groupingResult,
      exitedCount: Object.keys(exitedParticipants || {}).length,
      hasGroupSettings: !!groupSettings
    })
    
    return data
  } catch (error) {
    console.error('스냅샷 데이터 수집 실패:', error)
    return {
      participants: [],
      groupingResult: null,
      currentRound: '1',
      exitedParticipants: {},
      groupSettings: null,
      timestamp: new Date().toISOString(),
      version: '1.0'
    }
  }
}

// 스냅샷 생성 (로컬스토리지 + DB 동시 저장)
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
  
  // 데이터베이스에 스냅샷 저장
  const snapshot: Snapshot = {
    id: snapshotId,
    timestamp,
    eventType,
    description,
    data
  }
  
  console.log(`✅ 스냅샷 준비 완료: ${description} (ID: ${snapshotId})`)
  
  // DB 저장 시도
  try {
    const { saveSnapshot } = await import('./database')
    const success = await saveSnapshot(snapshotId, eventType, description, data)
    if (success) {
      console.log(`💾 DB 스냅샷 저장 성공: ${description} (ID: ${snapshotId})`)
    } else {
      console.warn(`⚠️ DB 스냅샷 저장 실패 (로컬은 정상): ${description} (ID: ${snapshotId})`)
    }
  } catch (error) {
    console.warn(`⚠️ DB 스냅샷 저장 중 오류 (로컬은 정상): ${description} (ID: ${snapshotId})`, error)
  }
}

// 모든 스냅샷 조회 (DB에서)
export async function getSnapshots(): Promise<Snapshot[]> {
  if (typeof window === 'undefined') return []
  
  try {
    const dbSnapshots = await snapshotService.get()
    
    console.log(`💾 DB 스냅샷 조회: ${dbSnapshots.length}개 발견`)
    console.log(`💾 DB 스냅샷 원본:`, dbSnapshots.map((s: any) => ({ 
      uuid: s.id, 
      snapshot_id: s.snapshot_id, 
      description: s.description 
    })))
    
    // DB 스냅샷을 표준 스냅샷 형태로 변환
    const convertedSnapshots = dbSnapshots.map((dbSnapshot: any) => ({
      id: dbSnapshot.snapshot_id,
      timestamp: dbSnapshot.timestamp,
      eventType: dbSnapshot.event_type,
      description: dbSnapshot.description,
      data: dbSnapshot.data
    }))
    
    console.log(`🔄 변환된 스냅샷 ID들:`, convertedSnapshots.map((s: any) => s.id))
    
    // 시간순 정렬
    const sortedSnapshots = convertedSnapshots.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    console.log(`✅ 최종 스냅샷 총 ${sortedSnapshots.length}개`)
    
    return sortedSnapshots
  } catch (error) {
    console.warn('DB 스냅샷 조회 실패:', error)
    return []
  }
}

// 동기 버전은 더 이상 지원하지 않음 - 비동기 버전 사용 권장
export function getSnapshotsSync(): Snapshot[] {
  if (typeof window === 'undefined') return []
  console.warn('⚠️ getSnapshotsSync는 더 이상 지원하지 않습니다. getSnapshots()를 사용하세요.')
  return []
}

// 특정 스냅샷으로 복원 (통합 버전)
export async function restoreSnapshot(snapshotId: number): Promise<boolean> {
  if (typeof window === 'undefined') return false
  
  try {
    console.log('🔍 스냅샷 복원 시작, ID:', snapshotId)
    
    // 통합 스냅샷 목록에서 검색
    const allSnapshots = await getSnapshots()
    const snapshot = allSnapshots.find(s => s.id === snapshotId)
    
    if (!snapshot) {
      console.error('❌ 통합 스냅샷에서 찾을 수 없습니다:', snapshotId)
      console.log('📋 사용 가능한 스냅샷 ID들:', allSnapshots.map(s => s.id))
      
      return false
    }
    
    console.log('✅ 통합 스냅샷에서 발견, 복원 진행')
    return await restoreSnapshotData(snapshot)
    
  } catch (error) {
    console.error('❌ 스냅샷 복원 중 예외 발생:', error)
    
    return false
  }
}

// 스냅샷 데이터 복원 헬퍼 함수 (비동기로 변경)
async function restoreSnapshotData(snapshot: Snapshot): Promise<boolean> {
  try {
    console.log(`🔄 스냅샷 데이터 복원 시작: ${snapshot.description}`)
    console.log(`📦 복원할 데이터 확인:`, {
      participantCount: snapshot.data.participants?.length || 0,
      participantNames: snapshot.data.participants?.map((p: any) => p.name) || [],
      currentRound: snapshot.data.currentRound,
      hasGroupingResult: !!snapshot.data.groupingResult,
      exitedCount: Object.keys(snapshot.data.exitedParticipants || {}).length,
      hasGroupSettings: !!snapshot.data.groupSettings,
      snapshotTimestamp: snapshot.timestamp
    })
    
    // 현재 상태를 '복원 전' 스냅샷으로 저장
    await createSnapshot('restore_backup', `${formatDateTime(snapshot.timestamp)} 복원 전 백업`)
    
    // 데이터 복원 (data-service 사용)
    console.log(`💾 참가자 데이터 복원: ${snapshot.data.participants?.length || 0}명`)
    await participantService.save(snapshot.data.participants || [])
    
    console.log(`💾 그룹핑 결과 복원: ${snapshot.data.groupingResult ? '있음' : '없음'}`)
    if (snapshot.data.groupingResult) {
      await groupingResultService.save(snapshot.data.groupingResult)
    }
    
    console.log(`💾 현재 라운드 복원: ${snapshot.data.currentRound || '0'}`)
    await roundService.save(parseInt(snapshot.data.currentRound || '0', 10))
    
    console.log(`💾 이탈 참가자 복원: ${Object.keys(snapshot.data.exitedParticipants || {}).length}명`)
    await exitedParticipantService.save(snapshot.data.exitedParticipants || {})
    
    if (snapshot.data.groupSettings) {
      console.log(`💾 그룹 설정 복원: 있음`)
      await groupSettingsService.save(snapshot.data.groupSettings)
    } else {
      console.log(`💾 그룹 설정 복원: 없음 (기본값 유지)`)
    }
    
    console.log(`✅ 스냅샷 복원 완료: ${snapshot.description}`)
    return true
  } catch (error) {
    console.error('❌ 스냅샷 데이터 복원 중 오류:', error)
    return false
  }
}

// 동기 버전은 더 이상 지원하지 않음 - 비동기 버전 사용 권장
export function restoreSnapshotSync(snapshotId: number): boolean {
  if (typeof window === 'undefined') return false
  console.warn('⚠️ restoreSnapshotSync는 더 이상 지원하지 않습니다. restoreSnapshot()를 사용하세요.')
  return false
}

// JSON 파일로 내보내기
export async function exportToJSON(): Promise<void> {
  if (typeof window === 'undefined') return
  
  const data = await getCurrentData()
  const timestamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-')
  const filename = `모임데이터_${timestamp}.json`
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  
  console.log(`💾 데이터 내보내기 완료: ${filename}`)
}

// JSON 파일에서 가져오기
export function importFromJSON(file: File): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false)
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as BackupData
        
        // 데이터 유효성 검증
        if (!data.participants || !Array.isArray(data.participants)) {
          throw new Error('잘못된 데이터 형식입니다.')
        }
        
        // 현재 상태를 백업으로 저장
        await createSnapshot('import_backup', '데이터 가져오기 전 백업')
        
        // 데이터 복원 (data-service 사용)
        await participantService.save(data.participants)
        if (data.groupingResult) {
          await groupingResultService.save(data.groupingResult)
        }
        await roundService.save(parseInt(data.currentRound || '0', 10))
        await exitedParticipantService.save(data.exitedParticipants || {})
        if (data.groupSettings) {
          await groupSettingsService.save(data.groupSettings)
        }
        
        console.log('📥 데이터 가져오기 완료')
        resolve(true)
      } catch (error) {
        console.error('데이터 가져오기 중 오류:', error)
        reject(error)
      }
    }
    
    reader.onerror = () => {
      reject(new Error('파일 읽기 중 오류가 발생했습니다.'))
    }
    
    reader.readAsText(file)
  })
}

// 날짜 시간 포맷팅
export function formatDateTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 스냅샷 삭제 (오래된 것부터) - DB 전용으로 변경
export async function cleanupOldSnapshots(keepCount: number = 30): Promise<void> {
  if (typeof window === 'undefined') return
  
  try {
    const snapshots = await getSnapshots()
    if (snapshots.length <= keepCount) return
    
    // TODO: DB에서 오래된 스냅샷 삭제 기능 필요
    console.log(`🧹 스냅샷 정리가 필요합니다: 현재 ${snapshots.length}개, 유지할 개수 ${keepCount}개`)
    console.log('⚠️ DB 스냅샷 삭제 기능은 아직 구현되지 않았습니다.')
  } catch (error) {
    console.error('스냅샷 정리 중 오류:', error)
  }
}

// 모든 백업 데이터 삭제 - DB 전용으로 변경
export async function clearAllBackups(): Promise<void> {
  if (typeof window === 'undefined') return
  
  // TODO: DB에서 모든 스냅샷 삭제 기능 필요
  console.log('⚠️ DB 백업 데이터 삭제 기능은 아직 구현되지 않았습니다.')
  console.log('🗑️ 현재는 개별 모임 데이터만 삭제할 수 있습니다.')
}