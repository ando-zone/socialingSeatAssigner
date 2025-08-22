'use client'

interface GroupingSettingsProps {
  groupingMode: 'auto' | 'manual'
  groupSize: number
  numGroups: number
  customGroupSizes: number[]
  customGroupGenders: { maleCount: number; femaleCount: number }[]
  enableGenderRatio: boolean
  participantCount: number
  onGroupingModeChange: (mode: 'auto' | 'manual') => void
  onGroupSizeChange: (size: number) => void
  onNumGroupsChange: (num: number) => void
  onCustomGroupSizeChange: (groupIndex: number, size: number) => void
  onCustomGroupMaleCountChange: (groupIndex: number, count: number) => void
  onCustomGroupFemaleCountChange: (groupIndex: number, count: number) => void
  onEnableGenderRatioChange: (enabled: boolean) => void
}

export default function GroupingSettings({
  groupingMode,
  groupSize,
  numGroups,
  customGroupSizes,
  customGroupGenders,
  enableGenderRatio,
  participantCount,
  onGroupingModeChange,
  onGroupSizeChange,
  onNumGroupsChange,
  onCustomGroupSizeChange,
  onCustomGroupMaleCountChange,
  onCustomGroupFemaleCountChange,
  onEnableGenderRatioChange
}: GroupingSettingsProps) {
  
  const getTotalCustomSize = () => customGroupSizes.reduce((sum, size) => sum + size, 0)

  return (
    <div className="bg-gradient-to-r from-white to-gray-50 rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4">
        <h2 className="text-xl font-bold text-white flex items-center">
          <span className="mr-3 text-2xl">⚙️</span>
          그룹 설정
        </h2>
      </div>
      
      <div className="p-6 space-y-8">
        {/* 모드 선택 - 현대적인 토글 스타일 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="mr-2 text-blue-500">🎯</span>
            그룹핑 모드
          </h3>
          <div className="bg-gray-100 p-1 rounded-xl flex">
            <button
              onClick={() => onGroupingModeChange('auto')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                groupingMode === 'auto'
                  ? 'bg-white text-blue-600 shadow-md transform scale-[1.02]'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <span className="text-lg">🤖</span>
                <span>자동 모드</span>
              </div>
              <div className="text-xs mt-1 opacity-70">균등하게 분배</div>
            </button>
            <button
              onClick={() => onGroupingModeChange('manual')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                groupingMode === 'manual'
                  ? 'bg-white text-purple-600 shadow-md transform scale-[1.02]'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <span className="text-lg">🎨</span>
                <span>수동 모드</span>
              </div>
              <div className="text-xs mt-1 opacity-70">세밀하게 조정</div>
            </button>
          </div>
        </div>

        {/* 자동 모드 설정 - 세련된 카드 스타일 */}
        {groupingMode === 'auto' && (
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200 shadow-inner">
            <h3 className="font-bold text-blue-800 mb-6 flex items-center text-lg">
              <span className="mr-2 text-xl">🤖</span>
              자동 모드 설정
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-blue-700">
                  <span className="flex items-center">
                    <span className="mr-2">👥</span>
                    그룹당 인원
                  </span>
                </label>
                <div className="flex items-center bg-white border-2 border-blue-200 rounded-xl overflow-hidden focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 transition-all duration-200">
                  <button
                    type="button"
                    onClick={() => groupSize > 2 && onGroupSizeChange(groupSize - 1)}
                    disabled={groupSize <= 2}
                    className="flex items-center justify-center w-12 h-12 bg-gradient-to-b from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 disabled:from-gray-100 disabled:to-gray-100 disabled:text-gray-400 text-gray-600 border-r border-blue-200 transition-all duration-150 hover:scale-105 active:scale-95"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <div className="flex-1 flex items-center justify-center px-4 py-3">
                    <span className="text-lg font-bold text-gray-800 mr-2">{groupSize}</span>
                    <span className="text-sm text-gray-500">명</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => groupSize < 20 && onGroupSizeChange(groupSize + 1)}
                    disabled={groupSize >= 20}
                    className="flex items-center justify-center w-12 h-12 bg-gradient-to-b from-gray-50 to-gray-100 hover:from-blue-50 hover:to-blue-100 disabled:from-gray-100 disabled:to-gray-100 disabled:text-gray-400 text-blue-600 border-l border-blue-200 transition-all duration-150 hover:scale-105 active:scale-95"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-4 border border-blue-200">
                <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
                  <span className="mr-2">📊</span>
                  예상 결과
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">총 참가자:</span>
                    <span className="font-bold text-blue-600 text-lg">{participantCount}명</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">예상 그룹:</span>
                    <span className="font-bold text-green-600 text-lg">{Math.ceil(participantCount / groupSize)}개</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="text-xs text-gray-500 text-center">
                      각 그룹이 최대한 균등하게 배치됩니다
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 수동 모드 설정 - 세련된 카드 스타일 */}
        {groupingMode === 'manual' && (
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200 shadow-inner space-y-6">
            <h3 className="font-bold text-purple-800 mb-6 flex items-center text-lg">
              <span className="mr-2 text-xl">🎨</span>
              수동 모드 설정
            </h3>
            
            {/* 그룹 수 설정과 요약 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-purple-700">
                  <span className="flex items-center">
                    <span className="mr-2">🔢</span>
                    그룹 수
                  </span>
                </label>
                <div className="flex items-center bg-white border-2 border-purple-200 rounded-xl overflow-hidden focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-200 transition-all duration-200">
                  <button
                    type="button"
                    onClick={() => numGroups > 1 && onNumGroupsChange(numGroups - 1)}
                    disabled={numGroups <= 1}
                    className="flex items-center justify-center w-12 h-12 bg-gradient-to-b from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 disabled:from-gray-100 disabled:to-gray-100 disabled:text-gray-400 text-gray-600 border-r border-purple-200 transition-all duration-150 hover:scale-105 active:scale-95"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <div className="flex-1 flex items-center justify-center px-4 py-3">
                    <span className="text-lg font-bold text-gray-800 mr-2">{numGroups}</span>
                    <span className="text-sm text-gray-500">개</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => numGroups < 20 && onNumGroupsChange(numGroups + 1)}
                    disabled={numGroups >= 20}
                    className="flex items-center justify-center w-12 h-12 bg-gradient-to-b from-gray-50 to-gray-100 hover:from-purple-50 hover:to-purple-100 disabled:from-gray-100 disabled:to-gray-100 disabled:text-gray-400 text-purple-600 border-l border-purple-200 transition-all duration-150 hover:scale-105 active:scale-95"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-4 border border-purple-200">
                <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
                  <span className="mr-2">📊</span>
                  현재 상태
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">설정 인원:</span>
                    <span className={`font-bold text-lg ${
                      getTotalCustomSize() === participantCount ? 'text-green-600' : 
                      getTotalCustomSize() > participantCount ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {getTotalCustomSize()}명
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">총 참가자:</span>
                    <span className="font-bold text-blue-600 text-lg">{participantCount}명</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className={`text-xs text-center font-medium ${
                      getTotalCustomSize() === participantCount ? 'text-green-600' : 
                      getTotalCustomSize() > participantCount ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {getTotalCustomSize() === participantCount ? '✅ 인원이 정확히 맞습니다' :
                       getTotalCustomSize() > participantCount ? '⚠️ 설정 인원이 더 많습니다' :
                       '⚠️ 설정 인원이 부족합니다'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 성비 균형 토글 - 개선된 스타일 */}
            <div className="bg-white rounded-xl p-4 border border-purple-200">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">⚖️</span>
                  <div>
                    <span className="font-semibold text-gray-800">성비 균형 고려</span>
                    <div className="text-sm text-gray-600">그룹별 남녀 비율 세부 설정</div>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={enableGenderRatio}
                    onChange={(e) => onEnableGenderRatioChange(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-12 h-6 rounded-full transition-all duration-200 ${
                    enableGenderRatio ? 'bg-purple-500' : 'bg-gray-300'
                  }`}>
                    <div className={`w-5 h-5 bg-white rounded-full transform transition-transform duration-200 ${
                      enableGenderRatio ? 'translate-x-6 translate-y-0.5' : 'translate-x-0.5 translate-y-0.5'
                    }`}></div>
                  </div>
                </div>
              </label>
              {enableGenderRatio && (
                <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="text-sm text-purple-700 flex items-center">
                    <span className="mr-2">💡</span>
                    각 그룹별로 원하는 남녀 비율을 정확히 설정할 수 있습니다.
                  </div>
                </div>
              )}
            </div>

            {/* 그룹별 설정 카드들 */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-800 flex items-center">
                <span className="mr-2">👥</span>
                그룹별 세부 설정
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {customGroupSizes.map((size, index) => (
                  <div key={index} className="bg-white rounded-xl border-2 border-gray-200 hover:border-purple-300 transition-colors duration-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2">
                      <div className="font-bold text-white text-center">그룹 {index + 1}</div>
                    </div>
                    
                    <div className="p-4 space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-2">총 인원</label>
                        <div className="flex items-center bg-white border-2 border-gray-200 rounded-lg overflow-hidden focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-200 transition-all duration-200">
                          <button
                            type="button"
                            onClick={() => size > 1 && onCustomGroupSizeChange(index, size - 1)}
                            disabled={size <= 1}
                            className="flex items-center justify-center w-8 h-8 bg-gradient-to-b from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 disabled:from-gray-100 disabled:to-gray-100 disabled:text-gray-400 text-gray-600 border-r border-gray-200 transition-all duration-150 hover:scale-105 active:scale-95"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                          </button>
                          <div className="flex-1 flex items-center justify-center px-2 py-2">
                            <span className="text-sm font-bold text-gray-800 mr-1">{size}</span>
                            <span className="text-xs text-gray-500">명</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => size < 50 && onCustomGroupSizeChange(index, size + 1)}
                            disabled={size >= 50}
                            className="flex items-center justify-center w-8 h-8 bg-gradient-to-b from-gray-50 to-gray-100 hover:from-purple-50 hover:to-purple-100 disabled:from-gray-100 disabled:to-gray-100 disabled:text-gray-400 text-purple-600 border-l border-gray-200 transition-all duration-150 hover:scale-105 active:scale-95"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      {enableGenderRatio && (
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-gray-600">성비 설정</div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-blue-600 mb-1">👨 남성</label>
                              <div className="flex items-center bg-white border border-blue-300 rounded overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-200 transition-all duration-200">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentCount = customGroupGenders[index]?.maleCount || 0;
                                    if (currentCount > 0) onCustomGroupMaleCountChange(index, currentCount - 1);
                                  }}
                                  disabled={(customGroupGenders[index]?.maleCount || 0) <= 0}
                                  className="flex items-center justify-center w-6 h-6 bg-gradient-to-b from-gray-50 to-gray-100 hover:from-blue-50 hover:to-blue-100 disabled:from-gray-100 disabled:to-gray-100 disabled:text-gray-400 text-blue-600 border-r border-blue-200 transition-all duration-150 hover:scale-105 active:scale-95"
                                >
                                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                  </svg>
                                </button>
                                <div className="flex-1 flex items-center justify-center px-1 py-1">
                                  <span className="text-xs font-bold text-gray-800">{customGroupGenders[index]?.maleCount || 0}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentCount = customGroupGenders[index]?.maleCount || 0;
                                    if (currentCount < size) onCustomGroupMaleCountChange(index, currentCount + 1);
                                  }}
                                  disabled={(customGroupGenders[index]?.maleCount || 0) >= size}
                                  className="flex items-center justify-center w-6 h-6 bg-gradient-to-b from-gray-50 to-gray-100 hover:from-blue-50 hover:to-blue-100 disabled:from-gray-100 disabled:to-gray-100 disabled:text-gray-400 text-blue-600 border-l border-blue-200 transition-all duration-150 hover:scale-105 active:scale-95"
                                >
                                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-pink-600 mb-1">👩 여성</label>
                              <div className="flex items-center bg-white border border-pink-300 rounded overflow-hidden focus-within:border-pink-500 focus-within:ring-1 focus-within:ring-pink-200 transition-all duration-200">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentCount = customGroupGenders[index]?.femaleCount || 0;
                                    if (currentCount > 0) onCustomGroupFemaleCountChange(index, currentCount - 1);
                                  }}
                                  disabled={(customGroupGenders[index]?.femaleCount || 0) <= 0}
                                  className="flex items-center justify-center w-6 h-6 bg-gradient-to-b from-gray-50 to-gray-100 hover:from-pink-50 hover:to-pink-100 disabled:from-gray-100 disabled:to-gray-100 disabled:text-gray-400 text-pink-600 border-r border-pink-200 transition-all duration-150 hover:scale-105 active:scale-95"
                                >
                                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                  </svg>
                                </button>
                                <div className="flex-1 flex items-center justify-center px-1 py-1">
                                  <span className="text-xs font-bold text-gray-800">{customGroupGenders[index]?.femaleCount || 0}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentCount = customGroupGenders[index]?.femaleCount || 0;
                                    if (currentCount < size) onCustomGroupFemaleCountChange(index, currentCount + 1);
                                  }}
                                  disabled={(customGroupGenders[index]?.femaleCount || 0) >= size}
                                  className="flex items-center justify-center w-6 h-6 bg-gradient-to-b from-gray-50 to-gray-100 hover:from-pink-50 hover:to-pink-100 disabled:from-gray-100 disabled:to-gray-100 disabled:text-gray-400 text-pink-600 border-l border-pink-200 transition-all duration-150 hover:scale-105 active:scale-95"
                                >
                                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className={`text-xs text-center p-2 rounded ${
                            (customGroupGenders[index]?.maleCount || 0) + (customGroupGenders[index]?.femaleCount || 0) === size
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            합계: {(customGroupGenders[index]?.maleCount || 0) + (customGroupGenders[index]?.femaleCount || 0)} / {size}
                            {(customGroupGenders[index]?.maleCount || 0) + (customGroupGenders[index]?.femaleCount || 0) === size ? ' ✅' : ' ⚠️'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}