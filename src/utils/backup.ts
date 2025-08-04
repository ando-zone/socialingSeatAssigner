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
  
  const snapshotId = Date.now()
  const timestamp = new Date().toISOString()
  const data = getCurrentData()
  
  // 로컬스토리지 저장 (기존 방식)
  const snapshots = getSnapshots()
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
    snapshots.shift()
  }
  
  localStorage.setItem('snapshots', JSON.stringify(snapshots))
  console.log(`📸 로컬 스냅샷 생성: ${description}`)
  
  // DB 저장 시도 (실패해도 로컬스토리지는 정상 저장됨)
  try {
    const success = await saveSnapshotToDB(snapshotId, eventType, description, data)
    if (success) {
      console.log(`💾 DB 스냅샷 저장 성공: ${description}`)
    } else {
      console.warn(`⚠️ DB 스냅샷 저장 실패 (로컬은 정상): ${description}`)
    }
  } catch (error) {
    console.warn('⚠️ DB 스냅샷 저장 중 오류 (로컬은 정상):', error)
  }
}

// 모든 스냅샷 조회
export function getSnapshots(): Snapshot[] {
  if (typeof window === 'undefined') return []
  return JSON.parse(localStorage.getItem('snapshots') || '[]')
}

// 특정 스냅샷으로 복원
export function restoreSnapshot(snapshotId: number): boolean {
  if (typeof window === 'undefined') return false
  
  const snapshots = getSnapshots()
  const snapshot = snapshots.find(s => s.id === snapshotId)
  
  if (!snapshot) {
    console.error('스냅샷을 찾을 수 없습니다:', snapshotId)
    return false
  }
  
  try {
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
    
    console.log(`🔄 스냅샷 복원 완료: ${snapshot.description}`)
    return true
  } catch (error) {
    console.error('스냅샷 복원 중 오류:', error)
    return false
  }
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
  
  const snapshots = getSnapshots()
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