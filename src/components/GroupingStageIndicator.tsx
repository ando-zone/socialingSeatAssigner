'use client'

interface GroupingStageIndicatorProps {
  hasGroupingResult: boolean
  currentRound: number
  participantCount: number
}

export default function GroupingStageIndicator({
  hasGroupingResult,
  currentRound,
  participantCount
}: GroupingStageIndicatorProps) {
  // 현재 단계 결정
  const getStageInfo = () => {
    if (!hasGroupingResult) {
      return {
        stage: '그룹 배치 전',
        description: participantCount > 0 
          ? `${participantCount}명의 참가자가 첫 번째 그룹 배치를 기다리고 있습니다.`
          : '참가자를 추가하고 첫 번째 그룹 배치를 시작하세요.',
        icon: '🎯',
        color: 'from-blue-500 to-cyan-500',
        bgColor: 'from-blue-50 to-cyan-50',
        borderColor: 'border-blue-200'
      }
    } else {
      const completedRound = currentRound - 1
      return {
        stage: `${completedRound}라운드 그룹 배치 완료`,
        description: `${completedRound}라운드 그룹 배치가 완료되었습니다. ${currentRound}라운드를 진행하거나 결과를 확인하세요.`,
        icon: '✅',
        color: 'from-green-500 to-emerald-500',
        bgColor: 'from-green-50 to-emerald-50',
        borderColor: 'border-green-200'
      }
    }
  }

  const stageInfo = getStageInfo()

  return (
    <div className={`bg-gradient-to-r ${stageInfo.bgColor} rounded-xl shadow-lg border-2 ${stageInfo.borderColor} overflow-hidden mb-8`}>
      <div className={`bg-gradient-to-r ${stageInfo.color} px-6 py-4`}>
        <div className="flex items-center justify-center">
          <span className="text-3xl mr-3">{stageInfo.icon}</span>
          <h2 className="text-2xl font-bold text-white text-center">
            현재 진행 단계
          </h2>
        </div>
      </div>
      
      <div className="p-8 text-center">
        <div className="mb-4">
          <div className={`inline-block bg-gradient-to-r ${stageInfo.color} text-white px-8 py-4 rounded-full shadow-lg`}>
            <span className="text-xl font-bold">{stageInfo.stage}</span>
          </div>
        </div>
        
        <p className="text-gray-700 text-lg leading-relaxed max-w-2xl mx-auto">
          {stageInfo.description}
        </p>
        
        {/* 진행률 표시 */}
        <div className="mt-6 flex items-center justify-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-600">참가자</span>
            <div className="bg-white px-3 py-1 rounded-full border shadow-sm">
              <span className="font-bold text-blue-600">{participantCount}명</span>
            </div>
          </div>
          
          {hasGroupingResult && (
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-600">완료 라운드</span>
              <div className="bg-white px-3 py-1 rounded-full border shadow-sm">
                <span className="font-bold text-green-600">{currentRound - 1}라운드</span>
              </div>
            </div>
          )}
        </div>
        
        {/* 다음 단계 안내 */}
        <div className="mt-8 p-4 bg-white/50 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-2">다음 단계</h3>
          <p className="text-gray-600 text-sm">
            {!hasGroupingResult 
              ? '아래 그룹 설정을 확인하고 "그룹 배치 시작" 버튼을 클릭하세요.'
              : `${currentRound}라운드 그룹 배치를 진행하거나 "결과 보기"에서 현재 결과를 확인하세요.`
            }
          </p>
        </div>
      </div>
    </div>
  )
}