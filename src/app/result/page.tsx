'use client'

import { useMemo } from 'react'
import SeatingChart from '@/components/SeatingChart'
import RoundSelector from '@/components/RoundSelector'
import GroupResultsSummary from '@/components/GroupResultsSummary'
import GroupCard from '@/components/GroupCard'
import ParticipantStats from '@/components/ParticipantStats'

// Hooks
import { useResultPage } from '@/hooks/useResultPage'
import { useParticipantActions } from '@/hooks/useParticipantActions'

export default function ResultPage() {
  const {
    result,
    participants,
    activeTab,
    isMobile,
    checkInStatus,
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
    setActiveTab,
    setEditForm,
    setNewParticipant,
    selectHistoryRound,
    selectGroupsRound,
    returnToCurrentRound,
    toggleCheckIn,
    resetAllCheckIn,
    router,
    ...restState
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
    editForm,
    newParticipant,
    selectedParticipant,
    swapSelectedParticipant,
    draggedParticipant,
    ...restState
  })

  // 현재 표시할 결과 결정
  const displayResult = useMemo(() => {
    return selectedGroupsRound && groupsRoundResult ? groupsRoundResult : result
  }, [selectedGroupsRound, groupsRoundResult, result])

  const isViewingPastRound = useMemo(() => {
    return selectedGroupsRound && selectedGroupsRound !== result?.round
  }, [selectedGroupsRound, result?.round])

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
            <p className="text-gray-600">
              {result.round}라운드 그룹 배치 결과를 확인하고 관리하세요.
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            ← 메인으로
          </button>
        </div>

        {/* 메시지 표시 */}
        {swapMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
            {swapMessage}
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
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                activeTab === 'history'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-lg mr-2">📜</span>
              라운드 히스토리
            </button>
          </div>
        </div>

        {/* Groups Tab */}
        {activeTab === 'groups' && (
          <>
            {/* 라운드 선택 */}
            <RoundSelector
              availableRounds={availableRounds}
              currentRound={result.round}
              selectedRound={selectedGroupsRound}
              onRoundSelect={selectGroupsRound}
              onReturnToCurrent={returnToCurrentRound}
              icon="📊"
              description="결과"
            />

            {/* 요약 통계 */}
            <GroupResultsSummary
              result={displayResult}
              checkInStatus={checkInStatus}
              participantCount={participants.length}
              onResetAllCheckIn={resetAllCheckIn}
              isViewingPastRound={isViewingPastRound}
            />

            {/* 그룹 카드들 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayResult.groups.filter(group => group.members.length > 0).map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  checkInStatus={checkInStatus}
                  isViewingPastRound={isViewingPastRound}
                  isMobile={isMobile}
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
                  onSetShowAddForm={restState.setShowAddForm}
                  getCurrentRoundMeetings={getCurrentRoundMeetings}
                  getPreviousRoundsMeetings={getPreviousRoundsMeetings}
                />
              ))}
            </div>

            {/* 좌석 배치도 */}
            <SeatingChart 
              groups={displayResult.groups} 
              participants={participants}
              checkInStatus={checkInStatus}
              onToggleCheckIn={toggleCheckIn}
              onPrint={() => window.print()}
            />
          </>
        )}

        {/* Seating Tab */}
        {activeTab === 'seating' && result && (
          <div className="space-y-6">
            <RoundSelector
              availableRounds={availableRounds}
              currentRound={result.round}
              selectedRound={selectedGroupsRound}
              onRoundSelect={selectGroupsRound}
              onReturnToCurrent={returnToCurrentRound}
              icon="🪑"
              description="좌석"
            />
            
            <SeatingChart 
              groups={(selectedGroupsRound && groupsRoundResult ? groupsRoundResult : result).groups} 
              participants={participants}
              checkInStatus={checkInStatus}
              onToggleCheckIn={toggleCheckIn}
              onPrint={() => window.print()}
            />
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <RoundSelector
              availableRounds={availableRounds}
              currentRound={result.round}
              selectedRound={selectedGroupsRound}
              onRoundSelect={selectGroupsRound}
              onReturnToCurrent={returnToCurrentRound}
              icon="📊"
              description="통계"
            />
            
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
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <span className="text-purple-500 mr-2">📜</span>
                라운드 히스토리
              </h2>
              <p className="text-gray-600 mb-4">지난 라운드들의 그룹 배치 결과를 확인할 수 있습니다.</p>
              
              {availableRounds.length > 0 ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      확인할 라운드를 선택하세요:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {availableRounds.map(round => (
                        <button
                          key={round}
                          onClick={() => selectHistoryRound(round)}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            selectedHistoryRound === round
                              ? 'bg-purple-600 text-white'
                              : round === result?.round
                                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {round}라운드
                          {round === result?.round && (
                            <span className="ml-1 text-xs">(현재)</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {historyResult && selectedHistoryRound && (
                    <div className="mt-6 p-4 bg-purple-50 rounded-lg">
                      <h3 className="font-semibold text-purple-800 mb-2">
                        {selectedHistoryRound}라운드 결과
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-purple-600 font-medium">총 그룹:</span> {historyResult.summary.totalGroups}개
                        </div>
                        <div>
                          <span className="text-purple-600 font-medium">새로운 만남:</span> {historyResult.summary.newMeetingsCount}쌍
                        </div>
                        <div>
                          <span className="text-purple-600 font-medium">재회:</span> {historyResult.summary.repeatMeetingsCount}쌍
                        </div>
                        <div>
                          <span className="text-purple-600 font-medium">성별 균형:</span> {historyResult.summary.genderBalanceScore}%
                        </div>
                      </div>
                      
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {historyResult.groups.map(group => (
                          <div key={group.id} className="bg-white p-3 rounded border">
                            <div className="font-medium text-sm mb-2">그룹 {group.id} ({group.members.length}명)</div>
                            <div className="text-xs space-y-1">
                              {group.members.map(member => (
                                <div key={member.id} className="text-gray-600">
                                  {member.name} ({member.gender === 'male' ? '남' : '여'})
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <p className="text-sm text-purple-700 mt-4">
                        <strong>히스토리 모드:</strong> 이 화면은 {selectedHistoryRound}라운드의 과거 결과를 보여줍니다. 
                        편집이나 수정은 현재 라운드에서만 가능합니다.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>아직 저장된 라운드가 없습니다.</p>
                  <p className="text-sm mt-2">첫 번째 라운드를 진행해주세요!</p>
                </div>
              )}
            </div>
          </div>
        )}

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