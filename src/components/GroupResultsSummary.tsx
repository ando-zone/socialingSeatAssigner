'use client'

import type { GroupingResult } from '@/utils/grouping'

interface GroupResultsSummaryProps {
  result: GroupingResult
  checkInStatus: { [participantId: string]: boolean }
  participantCount: number
  onResetAllCheckIn?: () => Promise<void>
  isViewingPastRound?: boolean
}

export default function GroupResultsSummary({
  result,
  checkInStatus,
  participantCount,
  onResetAllCheckIn,
  isViewingPastRound = false
}: GroupResultsSummaryProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">배치 요약</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{result.summary.totalGroups}</div>
          <div className="text-sm text-gray-600">총 그룹 수</div>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{result.summary.newMeetingsCount}</div>
          <div className="text-sm text-gray-600">새로운 만남</div>
        </div>
        <div className="text-center p-4 bg-emerald-50 rounded-lg">
          <div className="text-2xl font-bold text-emerald-600">
            {Object.values(checkInStatus).filter(Boolean).length}/{participantCount}
          </div>
          <div className="text-sm text-gray-600">입장 완료</div>
          <div className="text-xs text-emerald-600 mt-1">
            {Math.round((Object.values(checkInStatus).filter(Boolean).length / Math.max(participantCount, 1)) * 100)}%
          </div>
        </div>
      </div>

      {/* 성별 균형 점수 */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-pink-50 rounded-lg p-4">
          <div className="text-center">
            <div className="text-lg font-bold text-pink-600">
              {result.summary.genderBalanceScore}%
            </div>
            <div className="text-sm text-gray-600">성별 균형 점수</div>
          </div>
        </div>
        <div className="bg-indigo-50 rounded-lg p-4">
          <div className="text-center">
            <div className="text-lg font-bold text-indigo-600">
              {result.summary.mbtiBalanceScore}%
            </div>
            <div className="text-sm text-gray-600">MBTI 균형 점수</div>
          </div>
        </div>
      </div>
    </div>
  )
}