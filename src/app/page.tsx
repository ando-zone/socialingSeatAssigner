'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createOptimalGroups, updateMeetingHistory, migrateParticipantData, type Participant, type GroupingResult } from '@/utils/grouping'

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
    }
  }

  const removeParticipant = (id: string) => {
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
      const groupSizeParam = groupingMode === 'auto' ? groupSize : customGroupSizes
      const result = createOptimalGroups(participants, groupSizeParam, currentRound)
      const updatedParticipants = updateMeetingHistory(participants, result.groups, currentRound)
      
      // 결과 페이지로 이동 (상태는 결과 페이지에서 업데이트)
      localStorage.setItem('groupingResult', JSON.stringify(result))
      localStorage.setItem('participants', JSON.stringify(updatedParticipants))
      localStorage.setItem('currentRound', String(currentRound + 1))
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
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          모임 자리 배치 프로그램
        </h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">참석자 추가</h2>
          
          {/* 그룹 설정 모드 선택 */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-3">그룹 설정 방식</label>
            <div className="flex gap-6 mb-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="auto"
                  checked={groupingMode === 'auto'}
                  onChange={(e) => setGroupingMode(e.target.value as 'auto' | 'manual')}
                  className="mr-2"
                />
                <span>자동 (동일한 크기)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="manual"
                  checked={groupingMode === 'manual'}
                  onChange={(e) => setGroupingMode(e.target.value as 'auto' | 'manual')}
                  className="mr-2"
                />
                <span>수동 (개별 설정)</span>
              </label>
            </div>

            {groupingMode === 'auto' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">그룹 크기</label>
                  <select
                    value={groupSize}
                    onChange={(e) => setGroupSize(Number(e.target.value))}
                    className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                  >
                    <option value={3}>3명</option>
                    <option value={4}>4명</option>
                    <option value={5}>5명</option>
                    <option value={6}>6명</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    예상 그룹 수: {participants.length > 0 ? Math.ceil(participants.length / groupSize) : 0}개
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">그룹 수</label>
                  <select
                    value={numGroups}
                    onChange={(e) => handleNumGroupsChange(Number(e.target.value))}
                    className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {[2, 3, 4, 5, 6, 7, 8].map(num => (
                      <option key={num} value={num}>{num}개 그룹</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">각 그룹별 인원 수</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {customGroupSizes.map((size, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <label className="text-sm text-gray-600 min-w-[60px]">그룹 {index + 1}:</label>
                        <input
                          type="number"
                          min="2"
                          max="10"
                          value={size}
                          onChange={(e) => handleGroupSizeChange(index, Number(e.target.value))}
                          className="border border-gray-300 rounded-md px-2 py-1 w-16 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-500">명</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex justify-between text-sm">
                    <span className="text-gray-600">
                      총 예상 인원: <span className="font-medium">{getTotalCustomSize()}명</span>
                    </span>
                    <span className="text-gray-600">
                      현재 참가자: <span className="font-medium">{participants.length}명</span>
                    </span>
                    {getTotalCustomSize() < participants.length && (
                      <span className="text-red-500 font-medium">
                        인원 부족! ({participants.length - getTotalCustomSize()}명 더 필요)
                      </span>
                    )}
                    {getTotalCustomSize() > participants.length && (
                      <span className="text-orange-500 font-medium">
                        여유 인원: {getTotalCustomSize() - participants.length}명
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">현재 라운드</label>
              <div className="border border-gray-300 rounded-md px-3 py-2 bg-gray-50">
                {currentRound}라운드
              </div>
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
                </div>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder="김철수&#10;이영희,여,내향&#10;박민수 남 외향&#10;최지은 여 내향"
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
            {participants.map((participant) => (
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
      </div>
    </div>
  )
}