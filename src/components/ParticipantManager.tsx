'use client'

import { useState } from 'react'
import { Participant } from '@/utils/grouping'

interface ParticipantManagerProps {
  participants: Participant[]
  onAddParticipant: (participant: Omit<Participant, 'id' | 'meetingsByRound' | 'allMetPeople' | 'groupHistory'>) => Promise<void>
  onRemoveParticipant: (id: string) => Promise<void>
  onBulkAdd: (bulkText: string) => Promise<void>
  currentRound: number
}

export default function ParticipantManager({ 
  participants, 
  onAddParticipant, 
  onRemoveParticipant,
  onBulkAdd,
  currentRound 
}: ParticipantManagerProps) {
  const [name, setName] = useState('')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [mbti, setMbti] = useState<'extrovert' | 'introvert'>('extrovert')
  const [age, setAge] = useState('')
  const [bulkText, setBulkText] = useState('')
  const [showBulkInput, setShowBulkInput] = useState(false)

  const handleAddParticipant = async () => {
    if (name.trim()) {
      await onAddParticipant({
        name: name.trim(),
        gender,
        mbti,
        age: age.trim() ? parseInt(age) : null
      })
      setName('')
      setAge('')
    }
  }

  const handleBulkAdd = async () => {
    if (bulkText.trim()) {
      await onBulkAdd(bulkText)
      setBulkText('')
      setShowBulkInput(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddParticipant()
    }
  }

  return (
    <div className="space-y-6">
      {/* 개별 참가자 추가 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">참가자 관리</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          <input
            type="text"
            placeholder="참가자 이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyPress={handleKeyPress}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          />
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as 'male' | 'female')}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="male">남성</option>
            <option value="female">여성</option>
          </select>
          <input
            type="number"
            placeholder="나이 (선택사항)"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            min="1"
            max="150"
          />
          <select
            value={mbti}
            onChange={(e) => setMbti(e.target.value as 'extrovert' | 'introvert')}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="extrovert">외향형 (E)</option>
            <option value="introvert">내향형 (I)</option>
          </select>
          <button
            onClick={handleAddParticipant}
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-4 py-2 transition-colors"
          >
            추가
          </button>
        </div>

        {/* 일괄 추가 섹션 */}
        <div className="border-t pt-4">
          <button
            onClick={() => setShowBulkInput(!showBulkInput)}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg mb-4 transition-colors"
          >
            {showBulkInput ? '일괄 입력 닫기' : '일괄 입력'}
          </button>
          
          {showBulkInput && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  참가자 일괄 입력
                </label>
                <div className="text-sm text-gray-600 mb-2">
                  형식 1: 이름, 성별, 나이, 성격 (예: 김철수, 남성, 25, 외향형)<br />
                  형식 2: 이름 성별 나이 성격 (공백으로 구분)<br />
                  ※ 나이가 없는 경우 빈값으로 두면 됩니다. (예: 김철수, 남성, , 외향형)
                </div>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder="김철수, 남성, 25, 외향형&#10;박영희, 여성, 30, 내향형&#10;이민수 남성  외향형"
                  className="w-full h-32 p-3 border rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                onClick={handleBulkAdd}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                일괄 추가
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 참가자 목록 */}
      {participants.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">
            현재 참가자 ({participants.length}명) - {currentRound}라운드
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {participants.map((participant) => (
              <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium">{participant.name}</span>
                  <div className="text-sm text-gray-600">
                    {participant.gender === 'male' ? '남성' : '여성'} • {' '}
                    {participant.age ? `${participant.age}세 • ` : ''}{' '}
                    {participant.mbti === 'extrovert' ? '외향형' : '내향형'}
                  </div>
                </div>
                <button
                  onClick={() => onRemoveParticipant(participant.id)}
                  className="text-red-500 hover:text-red-700 px-2 py-1 rounded transition-colors"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}