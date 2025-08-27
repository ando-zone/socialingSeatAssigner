'use client'

import { useMemo, useEffect, useState } from 'react'
import SeatingChart from '@/components/SeatingChart'
import TableLayoutUpload from '@/components/TableLayoutUpload'
import RoundSelector from '@/components/RoundSelector'
import GroupResultsSummary from '@/components/GroupResultsSummary'
import GroupCard from '@/components/GroupCard'
import ParticipantStats from '@/components/ParticipantStats'
import BackupManager from '@/components/BackupManager'

// Hooks
import { useResultPage } from '@/hooks/useResultPage'
import { useParticipantActions } from '@/hooks/useParticipantActions'

export default function ResultPage() {
  const [toastVisible, setToastVisible] = useState(false)
  const [tableLayoutUrl, setTableLayoutUrl] = useState<string | null>(null)
  const [snapshots, setSnapshots] = useState<any[]>([])
  const [hasExistingResult, setHasExistingResult] = useState(false)
  
  const {
    result,
    participants,
    activeTab,
    isMobile,
    checkInStatus,
    currentMeeting,
    availableRounds,
    selectedHistoryRound,
    historyResult,
    selectedGroupsRound,
    groupsRoundResult,
    editingParticipant,
    editForm,
    showAddForm,
    newParticipant,
    selectedParticipant,
    swapSelectedParticipant,
    draggedParticipant,
    swapMessage,
    setResult,
    setParticipants,
    setActiveTab,
    setEditingParticipant,
    setEditForm,
    setShowAddForm,
    setNewParticipant,
    setSelectedParticipant,
    setSwapSelectedParticipant,
    setDraggedParticipant,
    setSwapMessage,
    selectHistoryRound,
    selectGroupsRound,
    returnToCurrentRound,
    toggleCheckIn,
    resetAllCheckIn,
    router
  } = useResultPage()

  const {
    startEditParticipant,
    saveEditParticipant,
    cancelEditParticipant,
    deleteParticipant,
    addParticipantToGroup,
    cancelAddForm,
    handleParticipantClick,
    handleDragStart,
    handleDragOver,
    handleDrop
  } = useParticipantActions({
    result,
    participants,
    setResult,
    setParticipants,
    setSwapMessage,
    editingParticipant,
    setEditingParticipant,
    setEditForm,
    setShowAddForm,
    setNewParticipant,
    setSelectedParticipant,
    setSwapSelectedParticipant,
    setDraggedParticipant,
    editForm,
    newParticipant,
    selectedParticipant,
    swapSelectedParticipant,
    draggedParticipant
  })

  // 현재 표시할 결과 결정
  const displayResult = useMemo(() => {
    return selectedGroupsRound && groupsRoundResult ? groupsRoundResult : result
  }, [selectedGroupsRound, groupsRoundResult, result])

  const isViewingPastRound = useMemo(() => {
    return selectedGroupsRound && selectedGroupsRound !== result?.round
  }, [selectedGroupsRound, result?.round])

  // 토스트 애니메이션 효과
  useEffect(() => {
    if (swapMessage) {
      setToastVisible(true)
    } else {
      setToastVisible(false)
    }
  }, [swapMessage])

  // Helper functions
  const getCurrentRoundMeetings = (participantId: string): string[] => {
    if (!result) return []
    
    const participant = participants.find(p => p.id === participantId)
    if (!participant) return []
    
    const currentRound = result.round
    return participant.meetingsByRound?.[currentRound] || []
  }

  const getPreviousRoundsMeetings = (participantId: string): string[] => {
    if (!result) return []
    
    const participant = participants.find(p => p.id === participantId)
    if (!participant) return []
    
    const currentRound = result.round
    const previousMeetings = new Set<string>()
    
    Object.entries(participant?.meetingsByRound || {}).forEach(([round, meetings]) => {
      if (parseInt(round) < currentRound) {
        if (Array.isArray(meetings)) {
          meetings.forEach(personId => previousMeetings.add(personId))
        }
      }
    })
    
    return Array.from(previousMeetings)
  }

  // 테이블 레이아웃 로드
  useEffect(() => {
    const loadTableLayout = async () => {
      try {
        const { getTableLayoutUrl } = await import('@/utils/database')
        const url = await getTableLayoutUrl()
        setTableLayoutUrl(url)
      } catch (error) {
        console.error('테이블 레이아웃 로드 실패:', error)
      }
    }
    loadTableLayout()
  }, [])

  // 스냅샷 로드
  useEffect(() => {
    const loadSnapshots = async () => {
      try {
        const { getSnapshots } = await import('@/utils/backup')
        const allSnapshots = await getSnapshots()
        setSnapshots(allSnapshots)
      } catch (error) {
        console.error('스냅샷 로딩 실패:', error)
      }
    }
    loadSnapshots()
  }, [])

  // 이미지 업로드 핸들러
  const handleImageUpload = async (file: File): Promise<boolean> => {
    try {
      const { uploadTableLayout } = await import('@/utils/database')
      const url = await uploadTableLayout(file)
      if (url) {
        setTableLayoutUrl(url)
        return true
      }
      return false
    } catch (error) {
      console.error('이미지 업로드 실패:', error)
      return false
    }
  }

  // 이미지 삭제 핸들러
  const handleImageDelete = async (): Promise<boolean> => {
    try {
      const { deleteTableLayout } = await import('@/utils/database')
      const success = await deleteTableLayout()
      if (success) {
        setTableLayoutUrl(null)
      }
      return success
    } catch (error) {
      console.error('이미지 삭제 실패:', error)
      return false
    }
  }

  // 백업 관련 함수들
  const handleExportData = async () => {
    try {
      const { exportToJSON } = await import('@/utils/backup')
      const jsonData = await exportToJSON()
      const blob = new Blob([jsonData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `socialingSeatAssigner_${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      alert('데이터가 JSON 파일로 내보내졌습니다!')
    } catch (error) {
      console.error('데이터 내보내기 실패:', error)
      alert('데이터 내보내기에 실패했습니다.')
    }
  }

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const { importFromJSON } = await import('@/utils/backup')
      const fileContent = await file.text()
      const result = await importFromJSON(fileContent)
      
      if (result.success) {
        alert('데이터가 성공적으로 가져와졌습니다!')
        window.location.reload()
      } else {
        alert(`데이터 가져오기 실패: ${result.message}`)
      }
    } catch (error) {
      console.error('데이터 가져오기 실패:', error)
      alert('데이터 가져오기에 실패했습니다.')
    }
    event.target.value = ''
  }

  const handleRestoreSnapshot = async (snapshotId: number) => {
    if (!confirm('이 스냅샷으로 복원하시겠습니까? 현재 데이터가 덮어씌워집니다.')) return
    
    try {
      const { restoreSnapshot } = await import('@/utils/backup')
      const success = await restoreSnapshot(snapshotId)
      if (success) {
        alert('스냅샷이 복원되었습니다!')
        window.location.reload()
      } else {
        alert('스냅샷 복원에 실패했습니다.')
      }
    } catch (error) {
      console.error('스냅샷 복원 실패:', error)
      alert('스냅샷 복원에 실패했습니다.')
    }
  }

  const handleDeleteSnapshot = async (snapshotId: number) => {
    try {
      const { deleteSnapshot } = await import('@/utils/backup')
      const success = await deleteSnapshot(snapshotId)
      if (success) {
        alert('스냅샷이 삭제되었습니다!')
        await refreshSnapshots()
      } else {
        alert('스냅샷 삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('스냅샷 삭제 실패:', error)
      alert('스냅샷 삭제에 실패했습니다.')
    }
  }

  const refreshSnapshots = async () => {
    try {
      const { getSnapshots } = await import('@/utils/backup')
      const allSnapshots = await getSnapshots()
      setSnapshots(allSnapshots)
    } catch (error) {
      console.error('스냅샷 새로고침 실패:', error)
    }
  }

  const handleNewMeeting = async () => {
    const confirmMsg = '새 모임을 시작하면 현재 모든 데이터가 삭제됩니다.\n' +
                      '이 작업은 되돌릴 수 없습니다.\n\n' +
                      '계속하시겠습니까?'
    
    if (!confirm(confirmMsg)) return
    
    try {
      const { clearCurrentMeetingData } = await import('@/utils/database')
      const cleared = await clearCurrentMeetingData()
      
      if (cleared) {
        alert('새 모임이 시작되었습니다!')
        router.push('/')
      } else {
        alert('새 모임 시작에 실패했습니다.')
      }
    } catch (error) {
      console.error('새 모임 시작 실패:', error)
      alert('새 모임 시작에 실패했습니다.')
    }
  }

  // 테이블 레이아웃 업로드 섹션 컴포넌트
  const TableLayoutUploadSection = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <TableLayoutUpload
        currentImageUrl={tableLayoutUrl}
        onImageUpload={handleImageUpload}
        onImageDelete={handleImageDelete}
      />
    </div>
  )

  if (!result || !displayResult) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold mb-2">데이터를 불러오는 중...</div>
          <div className="text-gray-600">잠시만 기다려주세요.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* 헤더 */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              {result.round}라운드 결과
            </h1>
            {currentMeeting && (
              <div className="mt-2 text-sm text-blue-600">
                현재 모임: {currentMeeting.name}
              </div>
            )}
          </div>
          <button
            onClick={() => router.push('/')}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            ← 메인으로
          </button>
        </div>

        {/* 토스트 메시지 */}
        {swapMessage && (
          <div className={`fixed top-4 right-4 sm:right-4 left-4 sm:left-auto z-50 transform transition-all duration-300 ease-in-out ${
            toastVisible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
          }`}>
            <div className="bg-green-500 text-white px-4 py-3 sm:px-6 rounded-lg shadow-lg flex items-center space-x-3 max-w-sm mx-auto sm:mx-0">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1 text-sm font-medium">
                {swapMessage}
              </div>
              <button
                onClick={() => setSwapMessage(null)}
                className="flex-shrink-0 text-white hover:text-gray-200 transition-colors"
                aria-label="알림 닫기"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* 탭 네비게이션 */}
        <div className="bg-white rounded-lg shadow-md mb-8">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                activeTab === 'groups'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-lg mr-2">👥</span>
              그룹 배치
            </button>
            <button
              onClick={() => setActiveTab('seating')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                activeTab === 'seating'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-lg mr-2">🪑</span>
              좌석 배치도
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                activeTab === 'stats'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-lg mr-2">📊</span>
              참가자 통계
            </button>
            <button
              disabled
              className="flex-1 py-4 px-6 text-center font-medium transition-colors cursor-not-allowed text-gray-300 bg-gray-50"
              title="기능 개발 예정"
            >
              <span className="text-lg mr-2">📜</span>
              라운드 히스토리 (예정)
            </button>
          </div>
        </div>

        {/* 공통 라운드 선택 - History 탭이 아닐 때만 표시 */}
        {activeTab !== 'history' && (
          <RoundSelector
            availableRounds={availableRounds}
            currentRound={result.round}
            selectedRound={selectedGroupsRound}
            onRoundSelect={selectGroupsRound}
            onReturnToCurrent={returnToCurrentRound}
            icon={activeTab === 'groups' ? "📊" : activeTab === 'seating' ? "🪑" : "📊"}
            description={activeTab === 'groups' ? "결과" : activeTab === 'seating' ? "좌석" : "통계"}
          />
        )}

        {/* Groups Tab */}
        {activeTab === 'groups' && (
          <>
            {/* 요약 통계 */}
            <GroupResultsSummary
              result={displayResult}
              checkInStatus={checkInStatus}
              participantCount={participants.length}
              onResetAllCheckIn={resetAllCheckIn}
              isViewingPastRound={!!isViewingPastRound}
            />

            {/* 그룹 카드들 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayResult.groups.filter(group => group.members.length > 0).map((group) => {
                const isSeatingTab: boolean = (activeTab as string) === 'seating'
                return (
                <GroupCard
                  key={group.id}
                  group={group}
                  checkInStatus={checkInStatus}
                  isViewingPastRound={!!isViewingPastRound}
                  isMobile={isMobile}
                  showCheckIn={isSeatingTab}
                  selectedParticipant={selectedParticipant}
                  swapSelectedParticipant={swapSelectedParticipant}
                  editingParticipant={editingParticipant}
                  editForm={editForm}
                  showAddForm={showAddForm}
                  newParticipant={newParticipant}
                  onToggleCheckIn={toggleCheckIn}
                  onStartEditParticipant={startEditParticipant}
                  onDeleteParticipant={deleteParticipant}
                  onParticipantClick={handleParticipantClick}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onSaveEditParticipant={saveEditParticipant}
                  onCancelEditParticipant={cancelEditParticipant}
                  onEditFormChange={(field, value) => setEditForm(prev => ({ ...prev, [field]: value }))}
                  onAddParticipantToGroup={addParticipantToGroup}
                  onCancelAddForm={cancelAddForm}
                  onNewParticipantChange={(field, value) => setNewParticipant(prev => ({ ...prev, [field]: value }))}
                  onSetShowAddForm={setShowAddForm}
                  getCurrentRoundMeetings={getCurrentRoundMeetings}
                  getPreviousRoundsMeetings={getPreviousRoundsMeetings}
                />
                )
              })}
            </div>

          </>
        )}

        {/* Seating Tab */}
        {activeTab === 'seating' && result && (
          <div className="space-y-6">
            {/* 테이블 배치도 업로드 섹션 (편집 모드일 때만) */}
            {!isViewingPastRound && <TableLayoutUploadSection />}
            
            {/* 기존 좌석 배치도 */}
            <SeatingChart 
              groups={(selectedGroupsRound && groupsRoundResult ? groupsRoundResult : result).groups} 
              participants={participants}
              checkInStatus={checkInStatus}
              onToggleCheckIn={toggleCheckIn}
              onResetAllCheckIn={!isViewingPastRound ? resetAllCheckIn : undefined}
              onPrint={() => window.print()}
            />
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <ParticipantStats 
              result={displayResult}
              participants={participants}
              checkInStatus={checkInStatus}
            />
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-6xl mb-4">🚧</div>
              <h2 className="text-xl font-semibold mb-4 text-gray-700">
                라운드 히스토리 기능 개발 예정
              </h2>
              <p className="text-gray-500 mb-6">
                지난 라운드들의 그룹 배치 결과를 확인할 수 있는 기능이<br />
                곧 추가될 예정입니다.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 inline-block">
                <p className="text-sm text-blue-700">
                  💡 현재는 <strong>그룹 결과</strong> 탭에서 라운드 선택으로<br />
                  이전 라운드 결과를 확인하실 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 백업 관리 */}
        <div className="mt-8">
          <BackupManager
            snapshots={snapshots}
            onExportData={handleExportData}
            onImportData={handleImportData}
            onRestoreSnapshot={handleRestoreSnapshot}
            onDeleteSnapshot={handleDeleteSnapshot}
            onRefreshSnapshots={refreshSnapshots}
            onNewMeeting={handleNewMeeting}
          />
        </div>

        {/* 하단 액션 버튼들 */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/')}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-6 rounded-md"
            >
              다음 라운드 준비
            </button>
            <button
              onClick={() => {
                router.push('/')
              }}
              className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-md"
            >
              메인으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}