import { saveSnapshot as saveSnapshotToDB } from './database'

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
export function getCurrentData(): BackupData {
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
  
  return {
    participants: JSON.parse(localStorage.getItem('participants') || '[]'),
    groupingResult: JSON.parse(localStorage.getItem('groupingResult') || 'null'),
    currentRound: localStorage.getItem('currentRound'),
    exitedParticipants: JSON.parse(localStorage.getItem('exitedParticipants') || '{}'),
    groupSettings: JSON.parse(localStorage.getItem('groupSettings') || 'null'),
    timestamp: new Date().toISOString(),
    version: '1.0'
  }
}

// 스냅샷 생성 (로컬스토리지 + DB 동시 저장)
export async function createSnapshot(eventType: string, description: string): Promise<void> {
  if (typeof window === 'undefined') return
  
  const snapshotId = Date.now() % 2147483647  // PostgreSQL integer 범위 내로 제한
  const timestamp = new Date().toISOString()
  const data = getCurrentData()
  
  console.log(`📸 스냅샷 생성 시작:`, {
    id: snapshotId,
    eventType,
    description,
    timestamp,
    participantCount: data.participants?.length || 0,
    currentRound: data.currentRound
  })
  
  // 로컬스토리지 저장 (기존 방식)
  const snapshots = getSnapshotsSync()  // 동기 버전 사용
  const snapshot: Snapshot = {
    id: snapshotId,
    timestamp,
    eventType,
    description,
    data
  }
  
  snapshots.push(snapshot)
  
  // 최대 50개 스냅샷만 유지 (더 여유있게)
  if (snapshots.length > 50) {
    const removed = snapshots.shift()
    console.log(`🧹 오래된 스냅샷 제거:`, removed?.id)
  }
  
  localStorage.setItem('snapshots', JSON.stringify(snapshots))
  console.log(`✅ 로컬 스냅샷 저장 완료: ${description} (ID: ${snapshotId})`)
  console.log(`📊 현재 로컬 스냅샷 수: ${snapshots.length}개`)
  
  // DB 저장 시도 (실패해도 로컬스토리지는 정상 저장됨)
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

// 모든 스냅샷 조회 (로컬 + DB 통합)
export async function getSnapshots(): Promise<Snapshot[]> {
  if (typeof window === 'undefined') return []
  
  const localSnapshots = JSON.parse(localStorage.getItem('snapshots') || '[]')
  console.log(`📋 로컬 스냅샷 조회: ${localSnapshots.length}개 발견`)
  console.log(`📋 로컬 스냅샷 ID들:`, localSnapshots.map((s: any) => s.id))
  
  // DB 스냅샷도 가져오기 시도
  try {
    const { getSnapshots: getDBSnapshots } = await import('./database')
    const dbSnapshots = await getDBSnapshots()
    
    console.log(`💾 DB 스냅샷 조회: ${dbSnapshots.length}개 발견`)
    console.log(`💾 DB 스냅샷 원본:`, dbSnapshots.map((s: any) => ({ 
      uuid: s.id, 
      snapshot_id: s.snapshot_id, 
      description: s.description 
    })))
    
    // DB 스냅샷을 로컬 스냅샷 형태로 변환
    const convertedDBSnapshots = dbSnapshots.map((dbSnapshot: any) => ({
      id: dbSnapshot.snapshot_id,
      timestamp: dbSnapshot.timestamp,
      eventType: dbSnapshot.event_type,
      description: dbSnapshot.description,
      data: dbSnapshot.data
    }))
    
    console.log(`🔄 변환된 DB 스냅샷 ID들:`, convertedDBSnapshots.map((s: any) => s.id))
    
    // 중복 제거하고 병합 (id 기준)
    const allSnapshots = [...localSnapshots]
    let addedFromDB = 0
    
    convertedDBSnapshots.forEach((dbSnapshot: any) => {
      if (!allSnapshots.find(local => local.id === dbSnapshot.id)) {
        allSnapshots.push(dbSnapshot)
        addedFromDB++
      }
    })
    
    console.log(`🔀 DB에서 추가된 스냅샷: ${addedFromDB}개`)
    console.log(`📊 통합 스냅샷 총 ${allSnapshots.length}개`)
    
    // 시간순 정렬
    const sortedSnapshots = allSnapshots.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    console.log(`✅ 최종 스냅샷 ID들:`, sortedSnapshots.map((s: any) => s.id))
    
    return sortedSnapshots
  } catch (error) {
    console.warn('DB 스냅샷 조회 실패, 로컬 스냅샷만 사용:', error)
    return localSnapshots
  }
}

// 동기 버전 (기존 호환성 유지)
export function getSnapshotsSync(): Snapshot[] {
  if (typeof window === 'undefined') return []
  return JSON.parse(localStorage.getItem('snapshots') || '[]')
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
      
      // 폴백: 로컬스토리지만 재시도
      const localSnapshots = getSnapshotsSync()
      const localSnapshot = localSnapshots.find(s => s.id === snapshotId)
      
      if (!localSnapshot) {
        console.error('❌ 로컬 스냅샷에서도 찾을 수 없습니다:', snapshotId)
        console.log('📋 로컬 스냅샷 ID들:', localSnapshots.map(s => s.id))
        return false
      }
      
      console.log('✅ 로컬 스냅샷에서 발견, 복원 진행')
      return restoreSnapshotData(localSnapshot)
    }
    
    console.log('✅ 통합 스냅샷에서 발견, 복원 진행')
    return restoreSnapshotData(snapshot)
    
  } catch (error) {
    console.error('❌ 스냅샷 복원 중 예외 발생:', error)
    
    // 에러 시 동기 버전으로 폴백
    try {
      const snapshots = getSnapshotsSync()
      const snapshot = snapshots.find(s => s.id === snapshotId)
      
      if (!snapshot) {
        console.error('❌ 폴백에서도 스냅샷을 찾을 수 없습니다:', snapshotId)
        return false
      }
      
      console.log('✅ 폴백으로 스냅샷 복원 시도')
      return restoreSnapshotData(snapshot)
    } catch (fallbackError) {
      console.error('❌ 폴백 복원도 실패:', fallbackError)
      return false
    }
  }
}

// 스냅샷 데이터 복원 헬퍼 함수
function restoreSnapshotData(snapshot: Snapshot): boolean {
  try {
    console.log(`🔄 스냅샷 데이터 복원 시작: ${snapshot.description}`)
    
    // 현재 상태를 '복원 전' 스냅샷으로 저장
    createSnapshot('restore_backup', `${formatDateTime(snapshot.timestamp)} 복원 전 백업`)
    
    // 데이터 복원
    localStorage.setItem('participants', JSON.stringify(snapshot.data.participants))
    localStorage.setItem('groupingResult', JSON.stringify(snapshot.data.groupingResult))
    localStorage.setItem('currentRound', snapshot.data.currentRound || '1')
    localStorage.setItem('exitedParticipants', JSON.stringify(snapshot.data.exitedParticipants))
    if (snapshot.data.groupSettings) {
      localStorage.setItem('groupSettings', JSON.stringify(snapshot.data.groupSettings))
    }
    
    console.log(`✅ 스냅샷 복원 완료: ${snapshot.description}`)
    return true
  } catch (error) {
    console.error('❌ 스냅샷 데이터 복원 중 오류:', error)
    return false
  }
}

// 동기 버전 (기존 호환성 유지)
export function restoreSnapshotSync(snapshotId: number): boolean {
  if (typeof window === 'undefined') return false
  
  const snapshots = getSnapshotsSync()
  const snapshot = snapshots.find(s => s.id === snapshotId)
  
  if (!snapshot) {
    console.error('스냅샷을 찾을 수 없습니다:', snapshotId)
    return false
  }
  
  return restoreSnapshotData(snapshot)
}

// JSON 파일로 내보내기
export function exportToJSON(): void {
  if (typeof window === 'undefined') return
  
  const data = getCurrentData()
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
    
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as BackupData
        
        // 데이터 유효성 검증
        if (!data.participants || !Array.isArray(data.participants)) {
          throw new Error('잘못된 데이터 형식입니다.')
        }
        
        // 현재 상태를 백업으로 저장
        createSnapshot('import_backup', '데이터 가져오기 전 백업')
        
        // 데이터 복원
        localStorage.setItem('participants', JSON.stringify(data.participants))
        localStorage.setItem('groupingResult', JSON.stringify(data.groupingResult))
        localStorage.setItem('currentRound', data.currentRound || '1')
        localStorage.setItem('exitedParticipants', JSON.stringify(data.exitedParticipants || {}))
        if (data.groupSettings) {
          localStorage.setItem('groupSettings', JSON.stringify(data.groupSettings))
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

// 스냅샷 삭제 (오래된 것부터)
export function cleanupOldSnapshots(keepCount: number = 30): void {
  if (typeof window === 'undefined') return
  
  const snapshots = getSnapshotsSync()  // 동기 버전 사용
  if (snapshots.length <= keepCount) return
  
  const toKeep = snapshots.slice(-keepCount)
  localStorage.setItem('snapshots', JSON.stringify(toKeep))
  
  console.log(`🧹 오래된 스냅샷 정리: ${snapshots.length - keepCount}개 삭제`)
}

// 모든 백업 데이터 삭제
export function clearAllBackups(): void {
  if (typeof window === 'undefined') return
  
  localStorage.removeItem('snapshots')
  console.log('🗑️ 모든 백업 데이터 삭제 완료')
}