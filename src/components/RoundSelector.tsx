'use client'

import type { GroupingResult } from '@/utils/grouping'

interface RoundSelectorProps {
  availableRounds: number[]
  currentRound?: number
  selectedRound: number | null
  onRoundSelect: (round: number) => void
  onReturnToCurrent: () => void
  showReturnButton?: boolean
  icon?: string
  title?: string
  description?: string
}

export default function RoundSelector({
  availableRounds,
  currentRound,
  selectedRound,
  onRoundSelect,
  onReturnToCurrent,
  showReturnButton = true,
  icon = "📊",
  title = "라운드 선택",
  description
}: RoundSelectorProps) {
  if (availableRounds.length <= 1) {
    return null
  }

  const isViewingPastRound = selectedRound && selectedRound !== currentRound

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">{title}:</span>
          <div className="flex flex-wrap gap-2">
            {availableRounds.map(round => (
              <button
                key={round}
                onClick={() => round === currentRound ? onReturnToCurrent() : onRoundSelect(round)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  selectedRound === round
                    ? 'bg-blue-600 text-white'
                    : round === currentRound && !selectedRound
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {round}라운드
                {round === currentRound && (
                  <span className="ml-1 text-xs">(현재)</span>
                )}
              </button>
            ))}
          </div>
        </div>
        {showReturnButton && isViewingPastRound && (
          <button
            onClick={onReturnToCurrent}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
          >
            <span>🔄</span>
            <span>현재 라운드로</span>
          </button>
        )}
      </div>
      {isViewingPastRound && description && (
        <div className="mt-3 p-2 bg-blue-50 rounded-md">
          <p className="text-sm text-blue-700">
            <strong>{icon} 과거 {description}:</strong> 이 화면은 {selectedRound}라운드의 과거 {description}를 보여줍니다.
            {description.includes('결과') && ' 편집이나 수정은 현재 라운드에서만 가능합니다.'}
          </p>
        </div>
      )}
    </div>
  )
}