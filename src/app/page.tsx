'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createOptimalGroups, updateMeetingHistory, migrateParticipantData, type Participant, type GroupingResult } from '@/utils/grouping'
import { createSnapshot, exportToJSON, importFromJSON, getSnapshots, restoreSnapshot, formatDateTime } from '@/utils/backup'

export default function Home() {
  const router = useRouter()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [name, setName] = useState('')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [mbti, setMbti] = useState<'extrovert' | 'introvert'>('extrovert')
  const [currentRound, setCurrentRound] = useState(1)
  const [groupSize, setGroupSize] = useState(4)
  const [isLoading, setIsLoading] = useState(false)
  const [groupingMode, setGroupingMode] = useState<'auto' | 'manual'>('auto')
  const [numGroups, setNumGroups] = useState(3)
  const [customGroupSizes, setCustomGroupSizes] = useState<number[]>([4, 4, 4])
  const [bulkText, setBulkText] = useState('')
  const [showBulkInput, setShowBulkInput] = useState(false)
  const [showBackupSection, setShowBackupSection] = useState(false)
  const [snapshots, setSnapshots] = useState<any[]>([])

  const addParticipant = () => {
    if (name.trim()) {
      const newParticipant: Participant = {
        id: Date.now().toString(),
        name: name.trim(),
        gender,
        mbti,
        meetingsByRound: {},
        allMetPeople: [],
        groupHistory: []
      }
      setParticipants([...participants, newParticipant])
      setName('')
      
      // 참가자 추가 시 스냅샷 생성
      setTimeout(() => {
        createSnapshot('participant_add', `참가자 추가: ${newParticipant.name}`)
      }, 100)
    }
  }

  const removeParticipant = (id: string) => {
    const participantToRemove = participants.find(p => p.id === id)
    if (participantToRemove) {
      // 이탈한 사람 정보를 localStorage에 저장
      const exitedParticipants = JSON.parse(localStorage.getItem('exitedParticipants') || '{}')
      exitedParticipants[id] = {
        name: participantToRemove.name,
        gender: participantToRemove.gender
      }
      localStorage.setItem('exitedParticipants', JSON.stringify(exitedParticipants))
      
      // 참가자 제거 시 스냅샷 생성
      createSnapshot('participant_remove', `참가자 제거: ${participantToRemove.name}`)
    }
    
    setParticipants(participants.filter(p => p.id !== id))
  }

  // 그룹 수 변경 시 customGroupSizes 배열 크기 조정
  const handleNumGroupsChange = (newNumGroups: number) => {
    setNumGroups(newNumGroups)
    const newSizes = [...customGroupSizes]
    
    if (newNumGroups > customGroupSizes.length) {
      // 그룹 수가 늘어나면 기본값(4명)으로 추가
      while (newSizes.length < newNumGroups) {
        newSizes.push(4)
      }
    } else if (newNumGroups < customGroupSizes.length) {
      // 그룹 수가 줄어들면 뒤에서부터 제거
      newSizes.splice(newNumGroups)
    }
    
    setCustomGroupSizes(newSizes)
  }

  // 개별 그룹 크기 변경
  const handleGroupSizeChange = (groupIndex: number, newSize: number) => {
    const newSizes = [...customGroupSizes]
    newSizes[groupIndex] = newSize
    setCustomGroupSizes(newSizes)
  }

  // 총 예상 인원 계산
  const getTotalCustomSize = () => customGroupSizes.reduce((sum, size) => sum + size, 0)

  const handleGrouping = async () => {
    if (participants.length < 2) {
      alert('최소 2명 이상의 참가자가 필요합니다.')
      return
    }

    // 수동 모드에서 총 인원 체크
    if (groupingMode === 'manual') {
      const totalCustomSize = customGroupSizes.reduce((sum, size) => sum + size, 0)
      if (totalCustomSize < participants.length) {
        alert(`설정된 그룹 크기의 총합(${totalCustomSize}명)이 참가자 수(${participants.length}명)보다 적습니다.`)
        return
      }
    }

    setIsLoading(true)
    
    try {
      // 그룹 배치 전 스냅샷 생성
      createSnapshot('round_start', `${currentRound}라운드 시작 전`)
      
      const groupSizeParam = groupingMode === 'auto' ? groupSize : customGroupSizes
      const result = createOptimalGroups(participants, groupSizeParam, currentRound)
      const updatedParticipants = updateMeetingHistory(participants, result.groups, currentRound)
      
      // 결과 페이지로 이동 (상태는 결과 페이지에서 업데이트)
      localStorage.setItem('groupingResult', JSON.stringify(result))
      localStorage.setItem('participants', JSON.stringify(updatedParticipants))
      localStorage.setItem('currentRound', String(currentRound + 1))
      
      // 그룹 배치 완료 후 스냅샷 생성
      setTimeout(() => {
        createSnapshot('round_complete', `${currentRound}라운드 배치 완료`)
      }, 100)
      
      router.push('/result')
    } catch (error: any) {
      alert(error.message || '그룹 배치 중 오류가 발생했습니다.')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  // 페이지 로드 시 저장된 데이터 복원
  useEffect(() => {
    const storedParticipants = localStorage.getItem('participants')
    const storedRound = localStorage.getItem('currentRound')
    
    if (storedParticipants) {
      const participants = JSON.parse(storedParticipants)
      const currentRound = storedRound ? Number(storedRound) : 1
      
      // 데이터 마이그레이션 적용
      const migratedParticipants = migrateParticipantData(participants, currentRound)
      
      setParticipants(migratedParticipants)
      
      // 마이그레이션된 데이터를 localStorage에 저장
      localStorage.setItem('participants', JSON.stringify(migratedParticipants))
    }
    if (storedRound) {
      setCurrentRound(Number(storedRound))
    }
  }, [])

  const processBulkInput = () => {
    if (!bulkText.trim()) return

    const lines = bulkText.trim().split('\n')
    const newParticipants: Participant[] = []
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim()
      if (!trimmedLine) return

      // 다양한 형식 지원: "이름,성별,MBTI" 또는 "이름 성별 MBTI" 또는 "이름"만
      let name = '', gender: 'male' | 'female' = 'male', mbti: 'extrovert' | 'introvert' = 'extrovert'
      
      if (trimmedLine.includes(',')) {
        // CSV 형식: "이름,성별,MBTI"
        const parts = trimmedLine.split(',').map(p => p.trim())
        name = parts[0] || ''
        
        if (parts[1]) {
          const genderStr = parts[1].toLowerCase()
          if (genderStr.includes('여') || genderStr.includes('female') || genderStr.includes('f')) {
            gender = 'female'
          }
        }
        
        if (parts[2]) {
          const mbtiStr = parts[2].toLowerCase()
          if (mbtiStr.includes('내향') || mbtiStr.includes('introvert') || mbtiStr.includes('i')) {
            mbti = 'introvert'
          }
        }
      } else if (trimmedLine.includes(' ')) {
        // 공백 구분: "이름 성별 MBTI"
        const parts = trimmedLine.split(/\s+/)
        name = parts[0] || ''
        
        if (parts[1]) {
          const genderStr = parts[1].toLowerCase()
          if (genderStr.includes('여') || genderStr.includes('female') || genderStr.includes('f')) {
            gender = 'female'
          }
        }
        
        if (parts[2]) {
          const mbtiStr = parts[2].toLowerCase()
          if (mbtiStr.includes('내향') || mbtiStr.includes('introvert') || mbtiStr.includes('i')) {
            mbti = 'introvert'
          }
        }
      } else {
        // 이름만: 기본값 사용
        name = trimmedLine
      }

      if (name) {
        newParticipants.push({
          id: `${Date.now()}-${index}`,
          name,
          gender,
          mbti,
          meetingsByRound: {},
          allMetPeople: [],
          groupHistory: []
        })
      }
    })

    if (newParticipants.length > 0) {
      setParticipants([...participants, ...newParticipants])
      setBulkText('')
      setShowBulkInput(false)
      
      // 벌크 추가 시 스냅샷 생성
      setTimeout(() => {
        createSnapshot('bulk_add', `벌크 추가: ${newParticipants.length}명`)
      }, 100)
    }
  }

  // 백업 관련 함수들
  const handleExportData = () => {
    exportToJSON()
  }

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      await importFromJSON(file)
      alert('데이터를 성공적으로 가져왔습니다!')
      window.location.reload() // 페이지 새로고침으로 상태 반영
    } catch (error) {
      alert('데이터 가져오기 실패: ' + (error as Error).message)
    }
    
    // 파일 input 초기화
    event.target.value = ''
  }

  const handleRestoreSnapshot = (snapshotId: number) => {
    if (confirm('이 시점으로 복원하시겠습니까? 현재 데이터는 백업됩니다.')) {
      const success = restoreSnapshot(snapshotId)
      if (success) {
        alert('복원이 완료되었습니다!')
        window.location.reload()
      } else {
        alert('복원 중 오류가 발생했습니다.')
      }
    }
  }

  const refreshSnapshots = () => {
    if (typeof window !== 'undefined') {
      setSnapshots(getSnapshots())
    }
  }

  // 컴포넌트 마운트 시 스냅샷 목록 새로고침
  useEffect(() => {
    refreshSnapshots()
  }, [participants, currentRound])

  // 클라이언트사이드에서만 스냅샷 로드
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSnapshots(getSnapshots())
    }
  }, [])

  // 새로운 모임 시작 함수
  const handleNewMeeting = () => {
    const confirmMessage = `🎉 새로운 모임을 시작하시겠습니까?

다음 데이터가 초기화됩니다:
• 모든 참가자 정보
• 그룹 히스토리
• 만난 사람 기록
• 현재 라운드 정보

💾 백업 스냅샷은 유지됩니다.`

    if (confirm(confirmMessage)) {
      try {
        // localStorage의 모임 관련 데이터만 삭제 (백업은 유지)
        localStorage.removeItem('participants')
        localStorage.removeItem('currentRound')
        localStorage.removeItem('groupingResult')
        localStorage.removeItem('exitedParticipants')
        
        // 상태 초기화
        setParticipants([])
        setCurrentRound(1)
        setName('')
        setGender('male')
        setMbti('extrovert')
        setGroupSize(4)
        setGroupingMode('auto')
        setNumGroups(3)
        setCustomGroupSizes([4, 4, 4])
        setBulkText('')
        setShowBulkInput(false)
        setShowBackupSection(false)
        
        alert('✅ 새로운 모임이 시작되었습니다!')
      } catch (error) {
        console.error('초기화 중 오류 발생:', error)
        alert('❌ 초기화 중 오류가 발생했습니다. 페이지를 새로고침 해주세요.')
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* 헤더 섹션 - 제목과 초기화 버튼 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-800">
              모임 자리 배치 프로그램
            </h1>
            <div className="flex items-center space-x-4">
              {participants.length > 0 && (
                <div className="text-right">
                  <div className="text-sm text-gray-600">현재 참가자</div>
                  <div className="text-2xl font-bold text-blue-600">{participants.length}명</div>
                </div>
              )}
                             <button
                 onClick={handleNewMeeting}
                 className="bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white font-medium py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                 title="새로운 모임을 시작합니다 (백업은 유지됩니다)"
               >
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>새로운 모임 시작</span>
                </div>
              </button>
            </div>
          </div>
          
          {/* 안내 문구 */}
          {participants.length === 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-blue-700 font-medium">새로운 모임을 시작하세요!</span>
              </div>
              <p className="text-blue-600 text-sm mt-1">
                참가자를 추가하고 그룹을 배치하여 즐거운 모임을 만들어보세요.
              </p>
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">참석자 추가</h2>
          
          {/* 그룹 설정 모드 선택 - 개선된 UI */}
          <div className="mb-6">
            <label className="block text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <span className="text-purple-500 mr-2">⚙️</span>
              그룹 설정 방식
            </label>
            
            {/* 카드 형태의 선택 버튼 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* 자동 모드 카드 */}
              <div
                onClick={() => setGroupingMode('auto')}
                className={`cursor-pointer rounded-xl border-2 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg ${
                  groupingMode === 'auto'
                    ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-100 shadow-lg'
                    : 'border-gray-200 bg-white hover:border-blue-300'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        groupingMode === 'auto' 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        🤖
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-800">자동 모드</h3>
                        <p className="text-sm text-gray-600">동일한 크기로 자동 배치</p>
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      groupingMode === 'auto'
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`}>
                      {groupingMode === 'auto' && (
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="mr-2">✅</span>
                      <span>간편한 설정</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="mr-2">⚡</span>
                      <span>빠른 배치</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="mr-2">🎯</span>
                      <span>균등한 그룹 크기</span>
                    </div>
                  </div>
                  
                  {groupingMode === 'auto' && (
                    <div className="mt-4 p-3 bg-white bg-opacity-60 rounded-lg">
                      <div className="text-xs text-blue-700 font-medium">현재 설정</div>
                      <div className="text-sm text-blue-800">
                        그룹당 {groupSize}명 · 예상 {participants.length > 0 ? Math.ceil(participants.length / groupSize) : 0}개 그룹
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 수동 모드 카드 */}
              <div
                onClick={() => setGroupingMode('manual')}
                className={`cursor-pointer rounded-xl border-2 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg ${
                  groupingMode === 'manual'
                    ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-pink-100 shadow-lg'
                    : 'border-gray-200 bg-white hover:border-purple-300'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        groupingMode === 'manual' 
                          ? 'bg-purple-500 text-white' 
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        🎨
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-800">수동 모드</h3>
                        <p className="text-sm text-gray-600">개별 그룹 크기 설정</p>
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      groupingMode === 'manual'
                        ? 'border-purple-500 bg-purple-500'
                        : 'border-gray-300'
                    }`}>
                      {groupingMode === 'manual' && (
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="mr-2">🎛️</span>
                      <span>세밀한 조정</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="mr-2">🎯</span>
                      <span>맞춤형 그룹</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="mr-2">💎</span>
                      <span>유연한 설정</span>
                    </div>
                  </div>
                  
                  {groupingMode === 'manual' && (
                    <div className="mt-4 p-3 bg-white bg-opacity-60 rounded-lg">
                      <div className="text-xs text-purple-700 font-medium">현재 설정</div>
                      <div className="text-sm text-purple-800">
                        {numGroups}개 그룹 · 총 {getTotalCustomSize()}명 예상
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 세부 설정 섹션 */}
            <div className={`p-6 rounded-xl border-2 transition-all duration-300 ${
              groupingMode === 'auto' 
                ? 'border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100' 
                : 'border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100'
            }`}>
              {groupingMode === 'auto' ? (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-800 flex items-center mb-4">
                    <span className="text-blue-500 mr-2">🤖</span>
                    자동 모드 설정
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-gray-700">그룹 크기 선택</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[3, 4, 5, 6].map((size) => (
                          <button
                            key={size}
                            onClick={() => setGroupSize(size)}
                            className={`p-3 rounded-lg border-2 transition-all duration-200 text-center font-medium ${
                              groupSize === size
                                ? 'border-blue-500 bg-blue-500 text-white shadow-md'
                                : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                            }`}
                          >
                            <div className="text-lg">{size}명</div>
                            <div className="text-xs opacity-75">그룹당</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="bg-white bg-opacity-70 p-4 rounded-lg">
                      <h5 className="font-medium text-gray-700 mb-2 flex items-center">
                        <span className="mr-2">📊</span>
                        예상 결과
                      </h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">현재 참가자:</span>
                          <span className="font-medium text-blue-700">{participants.length}명</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">예상 그룹 수:</span>
                          <span className="font-medium text-blue-700">
                            {participants.length > 0 ? Math.ceil(participants.length / groupSize) : 0}개
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">그룹당 인원:</span>
                          <span className="font-medium text-blue-700">{groupSize}명</span>
                        </div>
                        {participants.length % groupSize !== 0 && participants.length > 0 && (
                          <div className="mt-2 p-2 bg-orange-100 rounded text-xs text-orange-700">
                            ⚠️ 마지막 그룹: {participants.length % groupSize}명
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-800 flex items-center mb-4">
                    <span className="text-purple-500 mr-2">🎨</span>
                    수동 모드 설정
                  </h4>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 그룹 수 선택 */}
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-gray-700">그룹 수 선택</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[2, 3, 4, 5, 6, 7, 8].map((num) => (
                          <button
                            key={num}
                            onClick={() => handleNumGroupsChange(num)}
                            className={`p-2 rounded-lg border-2 transition-all duration-200 text-center font-medium ${
                              numGroups === num
                                ? 'border-purple-500 bg-purple-500 text-white shadow-md'
                                : 'border-gray-300 bg-white text-gray-700 hover:border-purple-300 hover:bg-purple-50'
                            }`}
                          >
                            <div className="text-sm">{num}개</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* 그룹별 인원 설정 */}
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-gray-700">각 그룹 인원 수</label>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {customGroupSizes.map((size, index) => (
                          <div key={index} className="flex items-center space-x-3 bg-white bg-opacity-70 p-2 rounded-lg">
                            <div className="flex items-center justify-center w-8 h-8 bg-purple-100 text-purple-600 rounded-full text-sm font-medium">
                              {index + 1}
                            </div>
                            <span className="text-sm text-gray-600 min-w-[50px]">그룹:</span>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleGroupSizeChange(index, Math.max(2, size - 1))}
                                className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-purple-600"
                              >
                                -
                              </button>
                              <span className="w-8 text-center font-medium">{size}</span>
                              <button
                                onClick={() => handleGroupSizeChange(index, Math.min(20, size + 1))}
                                className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-purple-600"
                              >
                                +
                              </button>
                              <span className="text-sm text-gray-500">명</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* 결과 요약 */}
                    <div className="bg-white bg-opacity-70 p-4 rounded-lg">
                      <h5 className="font-medium text-gray-700 mb-3 flex items-center">
                        <span className="mr-2">📊</span>
                        설정 요약
                      </h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">현재 참가자:</span>
                          <span className="font-medium text-purple-700">{participants.length}명</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">설정 그룹 수:</span>
                          <span className="font-medium text-purple-700">{numGroups}개</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">총 예상 인원:</span>
                          <span className="font-medium text-purple-700">{getTotalCustomSize()}명</span>
                        </div>
                        
                        {/* 상태 표시 */}
                        <div className="mt-3 pt-2 border-t border-gray-200">
                          {getTotalCustomSize() === participants.length ? (
                            <div className="flex items-center text-green-600 text-xs">
                              <span className="mr-1">✅</span>
                              <span>완벽한 배치!</span>
                            </div>
                          ) : getTotalCustomSize() < participants.length ? (
                            <div className="flex items-center text-red-600 text-xs">
                              <span className="mr-1">⚠️</span>
                              <span>{participants.length - getTotalCustomSize()}명 초과</span>
                            </div>
                          ) : (
                            <div className="flex items-center text-orange-600 text-xs">
                              <span className="mr-1">💡</span>
                              <span>{getTotalCustomSize() - participants.length}명 여유</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 현재 라운드 표시 - 개선된 UI */}
          <div className="mb-6">
            <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-white bg-opacity-20 rounded-full p-3 animate-pulse">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-blue-100">현재 진행중</h3>
                    <div className="text-3xl font-bold bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                      {currentRound}라운드
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-blue-100 text-sm">참가자</div>
                  <div className="text-2xl font-bold">{participants.length}명</div>
                  {participants.length >= 2 && (
                    <div className="inline-flex items-center mt-1 px-2 py-1 bg-green-500 bg-opacity-20 rounded-full">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-ping"></div>
                      <span className="text-xs text-green-200">배치 가능</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* 참가자 수에 따른 예상 그룹 정보 */}
              {participants.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white border-opacity-20">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-100">
                      {groupingMode === 'auto' 
                        ? `예상 그룹: ${Math.ceil(participants.length / groupSize)}개 (${groupSize}명씩)`
                        : `설정 그룹: ${numGroups}개 (총 ${getTotalCustomSize()}명)`
                      }
                    </span>
                    {groupingMode === 'manual' && getTotalCustomSize() !== participants.length && (
                      <span className={`font-medium px-2 py-1 rounded-full text-xs ${
                        getTotalCustomSize() < participants.length 
                          ? 'bg-red-500 bg-opacity-20 text-red-200' 
                          : 'bg-yellow-500 bg-opacity-20 text-yellow-200'
                      }`}>
                        {getTotalCustomSize() < participants.length 
                          ? `${participants.length - getTotalCustomSize()}명 초과` 
                          : `${getTotalCustomSize() - participants.length}명 여유`
                        }
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              {/* 장식적 요소 - 개선된 애니메이션 */}
              <div className="absolute top-0 right-0 -mr-2 -mt-2 w-16 h-16 bg-white bg-opacity-10 rounded-full animate-bounce"></div>
              <div className="absolute bottom-0 left-0 -ml-2 -mb-2 w-12 h-12 bg-white bg-opacity-10 rounded-full animate-pulse"></div>
              <div className="absolute top-1/2 right-4 w-3 h-3 bg-yellow-300 rounded-full animate-ping opacity-75"></div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <input
              type="text"
              placeholder="이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as 'male' | 'female')}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="male">남성</option>
              <option value="female">여성</option>
            </select>
            
            <select
              value={mbti}
              onChange={(e) => setMbti(e.target.value as 'extrovert' | 'introvert')}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="extrovert">외향형</option>
              <option value="introvert">내향형</option>
            </select>
            
            <button
              onClick={addParticipant}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md"
            >
              추가
            </button>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium">벌크 추가</h3>
              <button
                onClick={() => setShowBulkInput(!showBulkInput)}
                className="text-blue-500 hover:text-blue-700 text-sm"
              >
                {showBulkInput ? '숨기기' : '여러 명 한번에 추가'}
              </button>
            </div>
            
            {showBulkInput && (
              <div className="space-y-3">
                <div className="text-sm text-gray-600">
                  <p className="mb-2">지원하는 형식:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>이름만: 김철수 (기본값: 남성, 외향형)</li>
                    <li>공백 구분: 김철수 남 외향</li>
                    <li>쉼표 구분: 김철수,남,외향</li>
                    <li>성별: 남/여 또는 male/female 또는 m/f</li>
                    <li>MBTI: 외향/내향 또는 extrovert/introvert 또는 e/i</li>
                  </ul>
                  <div className="mt-3 p-2 bg-gray-100 rounded text-xs">
                    <strong>예시:</strong><br/>
                    김철수<br/>
                    이영희,여,내향<br/>
                    박민수 남 외향
                  </div>
                </div>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder="여기에 참가자 정보를 입력해 주세요 (한 줄에 한 명씩)"
                  className="w-full h-32 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={processBulkInput}
                    className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-md text-sm"
                  >
                    벌크 추가
                  </button>
                  <button
                    onClick={() => {
                      setBulkText('')
                      setShowBulkInput(false)
                    }}
                    className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-md text-sm"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">
            참석자 목록 ({participants.length}명)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {participants.sort((a, b) => a.name.localeCompare(b.name, 'ko')).map((participant) => (
              <div
                key={participant.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-md"
              >
                <div>
                  <span className="font-medium">{participant.name}</span>
                  <div className="text-sm text-gray-600">
                    {participant.gender === 'male' ? '남성' : '여성'} · {' '}
                    {participant.mbti === 'extrovert' ? '외향형' : '내향형'}
                  </div>
                  {participant.allMetPeople && participant.allMetPeople.length > 0 && (
                    <div className="text-xs text-blue-600">
                      만난 사람: {participant.allMetPeople.length}명
                    </div>
                  )}
                  {participant.groupHistory && participant.groupHistory.length > 0 && (
                    <div className="text-xs text-purple-600">
                      그룹 히스토리: {participant.groupHistory.slice(-3).join(', ')}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeParticipant(participant.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
          
          {participants.length >= 2 && (
            <div className="mt-6 text-center">
              <button 
                onClick={handleGrouping}
                disabled={isLoading}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-md"
              >
                {isLoading ? '배치 중...' : '그룹 배치하기'}
              </button>
            </div>
          )}
        </div>

        {/* 백업 및 복원 섹션 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">데이터 백업 및 복원</h2>
            <button
              onClick={() => setShowBackupSection(!showBackupSection)}
              className="text-blue-500 hover:text-blue-700 text-sm"
            >
              {showBackupSection ? '숨기기' : '백업 메뉴 열기'}
            </button>
          </div>

          {showBackupSection && (
            <div className="space-y-6">
              {/* JSON 내보내기/가져오기 */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-medium mb-3 flex items-center">
                  <span className="text-blue-500 mr-2">💾</span>
                  데이터 내보내기 / 가져오기
                </h3>
                <div className="flex gap-4">
                  <button
                    onClick={handleExportData}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md"
                  >
                    데이터 내보내기 (JSON)
                  </button>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportData}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <button className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-md">
                      데이터 가져오기 (JSON)
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  💡 중요한 데이터는 정기적으로 내보내기하여 백업하세요.
                </p>
              </div>

              {/* 스냅샷 복원 */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-medium flex items-center">
                    <span className="text-orange-500 mr-2">📸</span>
                    자동 스냅샷 복원
                  </h3>
                  <button
                    onClick={refreshSnapshots}
                    className="text-blue-500 hover:text-blue-700 text-sm"
                  >
                    새로고침
                  </button>
                </div>
                
                {snapshots.length === 0 ? (
                  <p className="text-gray-500 text-sm">저장된 스냅샷이 없습니다.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {snapshots.slice(-10).reverse().map((snapshot) => (
                      <div 
                        key={snapshot.id}
                        className="flex justify-between items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm">{snapshot.description}</div>
                          <div className="text-xs text-gray-500">
                            {formatDateTime(snapshot.timestamp)}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRestoreSnapshot(snapshot.id)}
                          className="bg-orange-500 hover:bg-orange-600 text-white text-xs py-1 px-3 rounded"
                        >
                          복원
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-sm text-gray-600 mt-3">
                  💡 참가자 추가/제거, 그룹 배치, 위치 변경 시 자동으로 스냅샷이 생성됩니다.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}