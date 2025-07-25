'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createOptimalGroups, updateMeetingHistory, type Participant, type GroupingResult } from '@/utils/grouping'

export default function Home() {
  const router = useRouter()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [name, setName] = useState('')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [mbti, setMbti] = useState<'extrovert' | 'introvert'>('extrovert')
  const [currentRound, setCurrentRound] = useState(1)
  const [groupSize, setGroupSize] = useState(4)
  const [isLoading, setIsLoading] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [showBulkInput, setShowBulkInput] = useState(false)

  const addParticipant = () => {
    if (name.trim()) {
      const newParticipant: Participant = {
        id: Date.now().toString(),
        name: name.trim(),
        gender,
        mbti,
        metPeople: [],
        groupHistory: []
      }
      setParticipants([...participants, newParticipant])
      setName('')
    }
  }

  const removeParticipant = (id: string) => {
    setParticipants(participants.filter(p => p.id !== id))
  }

  const handleGrouping = async () => {
    if (participants.length < 2) {
      alert('최소 2명 이상의 참가자가 필요합니다.')
      return
    }

    setIsLoading(true)
    
    try {
      const result = createOptimalGroups(participants, groupSize, currentRound)
      const updatedParticipants = updateMeetingHistory(participants, result.groups, currentRound)
      
      // 결과 페이지로 이동 (상태는 결과 페이지에서 업데이트)
      localStorage.setItem('groupingResult', JSON.stringify(result))
      localStorage.setItem('participants', JSON.stringify(updatedParticipants))
      localStorage.setItem('currentRound', String(currentRound + 1))
      router.push('/result')
    } catch (error) {
      alert('그룹 배치 중 오류가 발생했습니다.')
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
      setParticipants(JSON.parse(storedParticipants))
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
          metPeople: [],
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
            </div>
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
                  {participant.metPeople && participant.metPeople.length > 0 && (
                    <div className="text-xs text-blue-600">
                      만난 사람: {participant.metPeople.length}명
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