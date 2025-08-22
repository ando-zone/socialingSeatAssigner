'use client'

import { useState } from 'react'

interface BackupManagerProps {
  snapshots: any[]
  onExportData: () => Promise<void>
  onImportData: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  onRestoreSnapshot: (snapshotId: number) => Promise<void>
  onDeleteSnapshot: (snapshotId: number) => Promise<void>
  onRefreshSnapshots: () => Promise<void>
  onNewMeeting: () => Promise<void>
}

export default function BackupManager({
  snapshots,
  onExportData,
  onImportData,
  onRestoreSnapshot,
  onDeleteSnapshot,
  onRefreshSnapshots,
  onNewMeeting
}: BackupManagerProps) {
  const [showBackupSection, setShowBackupSection] = useState(false)

  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString)
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">데이터 관리</h2>
      
      {/* 새 모임 시작 */}
      <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
        <h3 className="font-medium text-yellow-800 mb-2">새 모임 시작</h3>
        <p className="text-sm text-yellow-700 mb-3">
          현재 데이터를 모두 삭제하고 새로운 모임을 시작합니다.
        </p>
        <button
          onClick={onNewMeeting}
          className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          🆕 새 모임 시작
        </button>
      </div>

      {/* 백업/복원 섹션 토글 */}
      <div className="border-t pt-4">
        <button
          onClick={() => setShowBackupSection(!showBackupSection)}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg mb-4 transition-colors"
        >
          {showBackupSection ? '백업 관리 닫기' : '백업 관리 열기'}
        </button>

        {showBackupSection && (
          <div className="space-y-6">
            {/* 데이터 내보내기/가져오기 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-gray-700 mb-2">데이터 내보내기</h3>
                <button
                  onClick={onExportData}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  📁 JSON으로 내보내기
                </button>
              </div>
              <div>
                <h3 className="font-medium text-gray-700 mb-2">데이터 가져오기</h3>
                <input
                  type="file"
                  accept=".json"
                  onChange={onImportData}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                />
              </div>
            </div>

            {/* 스냅샷 관리 */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-gray-700">자동 스냅샷</h3>
                <button
                  onClick={onRefreshSnapshots}
                  className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded transition-colors"
                >
                  🔄 새로고침
                </button>
              </div>
              
              {snapshots.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {snapshots.map((snapshot) => (
                    <div key={snapshot.snapshot_id || snapshot.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-sm">
                          {snapshot.description || '스냅샷'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDateTime(snapshot.timestamp)}
                        </div>
                        {snapshot.participant_count && (
                          <div className="text-xs text-blue-600">
                            참가자 {snapshot.participant_count}명
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => onRestoreSnapshot(snapshot.snapshot_id || snapshot.id)}
                          className="text-sm bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded transition-colors"
                        >
                          복원
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('이 스냅샷을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                              onDeleteSnapshot(snapshot.snapshot_id || snapshot.id)
                            }
                          }}
                          className="text-sm bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded transition-colors"
                          title="스냅샷 삭제"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 text-center py-4">
                  저장된 스냅샷이 없습니다.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}