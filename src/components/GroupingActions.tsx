'use client'

interface GroupingActionsProps {
  participantCount: number
  hasExistingResult: boolean
  isLoading: boolean
  onStartGrouping: () => Promise<void>
  onRegroupCurrent: () => Promise<void>
  onViewResults: () => void
  groupingMode: 'auto' | 'manual'
  customGroupSizes: number[]
}

export default function GroupingActions({
  participantCount,
  hasExistingResult,
  isLoading,
  onStartGrouping,
  onRegroupCurrent,
  onViewResults,
  groupingMode,
  customGroupSizes
}: GroupingActionsProps) {
  
  const getTotalCustomSize = () => customGroupSizes.reduce((sum, size) => sum + size, 0)
  
  const canStartGrouping = () => {
    if (participantCount < 2) return false
    if (groupingMode === 'manual') {
      return participantCount <= getTotalCustomSize()
    }
    return true
  }

  const getErrorMessage = () => {
    if (participantCount < 2) {
      return '최소 2명 이상의 참가자가 필요합니다.'
    }
    if (groupingMode === 'manual' && participantCount > getTotalCustomSize()) {
      return `참가자 수(${participantCount}명)가 설정된 그룹 총 인원(${getTotalCustomSize()}명)보다 많습니다.`
    }
    return null
  }

  return (
    <div className="space-y-4">
      {/* 에러 메시지 */}
      {!canStartGrouping() && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {getErrorMessage()}
        </div>
      )}

      {/* 그룹핑 시작 버튼 */}
      <button
        onClick={onStartGrouping}
        disabled={!canStartGrouping() || isLoading}
        className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition-colors ${
          canStartGrouping() && !isLoading
            ? 'bg-green-500 hover:bg-green-600 text-white'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        {isLoading ? '그룹 배치 중...' : '🎯 그룹 배치 시작!'}
      </button>

      {/* 기존 결과 관련 버튼들 */}
      {hasExistingResult && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={onRegroupCurrent}
            disabled={!canStartGrouping() || isLoading}
            className={`py-3 px-4 rounded-lg font-medium transition-colors ${
              canStartGrouping() && !isLoading
                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            🔄 현재 라운드 재배치
          </button>
          <button
            onClick={onViewResults}
            className="py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            📊 결과 보기
          </button>
        </div>
      )}

      {/* 정보 표시 */}
      {participantCount > 0 && (
        <div className="text-sm text-gray-600 text-center">
          {groupingMode === 'auto' ? (
            <>참가자 {participantCount}명을 자동으로 균등 분배합니다.</>
          ) : (
            <>참가자 {participantCount}명을 {customGroupSizes.length}개 그룹(총 {getTotalCustomSize()}명)에 배치합니다.</>
          )}
        </div>
      )}
    </div>
  )
}