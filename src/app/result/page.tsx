'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { GroupingResult, Participant } from '@/utils/grouping'

export default function ResultPage() {
  const router = useRouter()
  const [result, setResult] = useState<GroupingResult | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [showAddForm, setShowAddForm] = useState<number | null>(null) // 어느 그룹에 추가할지
  const [newParticipant, setNewParticipant] = useState({
    name: '',
    gender: 'male' as 'male' | 'female',
    mbti: 'extrovert' as 'extrovert' | 'introvert'
  })

  useEffect(() => {
    const storedResult = localStorage.getItem('groupingResult')
    const storedParticipants = localStorage.getItem('participants')
    
    if (storedResult && storedParticipants) {
      setResult(JSON.parse(storedResult))
      setParticipants(JSON.parse(storedParticipants))
    } else {
      router.push('/')
    }
  }, [router])

  // 새로운 참가자를 특정 그룹에 추가
  const addParticipantToGroup = (groupId: number) => {
    if (!newParticipant.name.trim() || !result) return

    // 해당 그룹의 기존 멤버들 찾기
    const targetGroup = result.groups.find(group => group.id === groupId)
    if (!targetGroup) return

    const existingMemberIds = targetGroup.members.map(member => member.id)

    // 새로운 참가자 객체 생성 (기존 그룹 멤버들과 이미 만났다고 기록)
    const participant: Participant = {
      id: Date.now().toString(),
      name: newParticipant.name.trim(),
      gender: newParticipant.gender,
      mbti: newParticipant.mbti,
      metPeople: [...existingMemberIds], // 현재 그룹의 모든 기존 멤버들과 만났다고 기록
      groupHistory: [groupId] // 현재 그룹을 히스토리에 추가
    }

    // 기존 참가자들의 만남 기록도 업데이트 (새 참가자와 만났다고 추가)
    const updatedParticipants = participants.map(p => {
      if (existingMemberIds.includes(p.id)) {
        return {
          ...p,
          metPeople: [...(p.metPeople || []), participant.id]
        }
      }
      return p
    })

    // 새 참가자를 목록에 추가
    updatedParticipants.push(participant)

    console.log(`새 참가자 "${participant.name}" 그룹 ${groupId}에 추가됨`)
    console.log(`기존 멤버들과의 만남 기록:`, participant.metPeople)
    console.log(`기존 멤버들에게도 새 참가자와의 만남 기록 추가됨`)

    // 해당 그룹에 참가자 추가 및 카운트 업데이트
    const updatedGroups = result.groups.map(group => {
      if (group.id === groupId) {
        const updatedMembers = [...group.members, participant]
        const maleCount = updatedMembers.filter(p => p.gender === 'male').length
        const femaleCount = updatedMembers.filter(p => p.gender === 'female').length
        const extrovertCount = updatedMembers.filter(p => p.mbti === 'extrovert').length
        const introvertCount = updatedMembers.filter(p => p.mbti === 'introvert').length
        
        return {
          ...group,
          members: updatedMembers,
          maleCount,
          femaleCount,
          extrovertCount,
          introvertCount
        }
      }
      return group
    })

    // 새로운 만남 수 재계산
    let newMeetingsTotal = 0
    updatedGroups.forEach(group => {
      for (let i = 0; i < group.members.length; i++) {
        for (let j = i + 1; j < group.members.length; j++) {
          const p1 = updatedParticipants.find(p => p.id === group.members[i].id)
          const p2 = updatedParticipants.find(p => p.id === group.members[j].id)
          if (p1 && p2 && !(p1.metPeople?.includes(p2.id))) {
            newMeetingsTotal++
          }
        }
      }
    })

    // 결과 업데이트
    const updatedResult = {
      ...result,
      groups: updatedGroups,
      summary: {
        ...result.summary,
        newMeetingsCount: newMeetingsTotal
      }
    }

    // 상태 업데이트
    setResult(updatedResult)
    setParticipants(updatedParticipants)

    // localStorage 업데이트
    localStorage.setItem('groupingResult', JSON.stringify(updatedResult))
    localStorage.setItem('participants', JSON.stringify(updatedParticipants))

    // 폼 초기화
    setNewParticipant({ name: '', gender: 'male', mbti: 'extrovert' })
    setShowAddForm(null)
  }

  // 추가 폼 취소
  const cancelAddForm = () => {
    setNewParticipant({ name: '', gender: 'male', mbti: 'extrovert' })
    setShowAddForm(null)
  }

  const getBalanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getBalanceText = (score: number) => {
    if (score >= 80) return '우수'
    if (score >= 60) return '보통'
    return '개선필요'
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>결과를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {result.round - 1}라운드 그룹 배치 결과
          </h1>
          <p className="text-gray-600">최적화된 그룹 배치가 완료되었습니다</p>
        </div>

        {/* 요약 통계 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">배치 요약</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{result.summary.totalGroups}</div>
              <div className="text-sm text-gray-600">총 그룹 수</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{result.summary.newMeetingsCount}</div>
              <div className="text-sm text-gray-600">새로운 만남</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className={`text-2xl font-bold ${getBalanceColor(result.summary.genderBalanceScore)}`}>
                {result.summary.genderBalanceScore}%
              </div>
              <div className="text-sm text-gray-600">성별 균형</div>
              <div className={`text-xs ${getBalanceColor(result.summary.genderBalanceScore)}`}>
                {getBalanceText(result.summary.genderBalanceScore)}
              </div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className={`text-2xl font-bold ${getBalanceColor(result.summary.mbtiBalanceScore)}`}>
                {result.summary.mbtiBalanceScore}%
              </div>
              <div className="text-sm text-gray-600">MBTI 균형</div>
              <div className={`text-xs ${getBalanceColor(result.summary.mbtiBalanceScore)}`}>
                {getBalanceText(result.summary.mbtiBalanceScore)}
              </div>
            </div>
          </div>
        </div>

        {/* 그룹별 상세 결과 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {result.groups.filter(group => group.members.length > 0).map((group) => (
            <div key={group.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  그룹 {group.id}
                </h3>
                <span className="text-sm text-gray-500">
                  {group.members.length}명
                </span>
              </div>

              {/* 그룹 균형 표시 */}
              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <div className="flex justify-between text-sm">
                  <span>성별:</span>
                  <span>남 {group.maleCount} · 여 {group.femaleCount}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span>MBTI:</span>
                  <span>외향 {group.extrovertCount} · 내향 {group.introvertCount}</span>
                </div>
              </div>

              {/* 그룹 멤버 목록 */}
              <div className="space-y-2">
                {group.members.map((member) => {
                  const participantHistory = participants.find(p => p.id === member.id)
                  const previousGroups = participantHistory?.groupHistory?.slice(0, -1) || []
                  
                  return (
                    <div key={member.id} className="flex items-center justify-between p-2 border border-gray-200 rounded">
                      <div>
                        <span className="font-medium">{member.name}</span>
                        <div className="text-xs text-gray-500">
                          {member.gender === 'male' ? '남성' : '여성'} · {' '}
                          {member.mbti === 'extrovert' ? '외향' : '내향'}
                        </div>
                      </div>
                      {previousGroups.length > 0 && (
                        <div className="text-xs text-gray-400">
                          이전: {previousGroups.slice(-3).join(', ')}
                        </div>
                      )}
                    </div>
                  )
                })}
                
                {/* 참가자 추가 폼 */}
                {showAddForm === group.id ? (
                  <div className="p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">새 참가자 추가</h4>
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="이름"
                        value={newParticipant.name}
                        onChange={(e) => setNewParticipant({...newParticipant, name: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={newParticipant.gender}
                          onChange={(e) => setNewParticipant({...newParticipant, gender: e.target.value as 'male' | 'female'})}
                          className="border border-gray-300 rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="male">남성</option>
                          <option value="female">여성</option>
                        </select>
                        
                        <select
                          value={newParticipant.mbti}
                          onChange={(e) => setNewParticipant({...newParticipant, mbti: e.target.value as 'extrovert' | 'introvert'})}
                          className="border border-gray-300 rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="extrovert">외향형</option>
                          <option value="introvert">내향형</option>
                        </select>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => addParticipantToGroup(group.id)}
                          disabled={!newParticipant.name.trim()}
                          className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-medium py-2 px-3 rounded-md text-sm"
                        >
                          추가
                        </button>
                        <button
                          onClick={cancelAddForm}
                          className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-3 rounded-md text-sm"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddForm(group.id)}
                    className="w-full p-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
                  >
                    <div className="flex items-center justify-center">
                      <span className="text-lg mr-1">+</span>
                      <span className="text-sm">참가자 추가</span>
                    </div>
                  </button>
                )}
              </div>

              {/* 새로운 만남 표시 */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-xs text-green-600">
                  {(() => {
                    let newMeetings = 0
                    for (let i = 0; i < group.members.length; i++) {
                      for (let j = i + 1; j < group.members.length; j++) {
                        const p1 = participants.find(p => p.id === group.members[i].id)
                        const p2 = participants.find(p => p.id === group.members[j].id)
                        if (p1 && p2) {
                          const p1MetPeople = p1.metPeople?.slice(0, -group.members.length + 1) || []
                          if (!p1MetPeople.includes(p2.id)) {
                            newMeetings++
                          }
                        }
                      }
                    }
                    return `새로운 만남: ${newMeetings}쌍`
                  })()}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 액션 버튼 */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.push('/')}
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-6 rounded-md"
          >
            다음 라운드 준비
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('groupingResult')
              localStorage.removeItem('participants')
              localStorage.removeItem('currentRound')
              router.push('/')
            }}
            className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-md"
          >
            새로운 모임 시작
          </button>
          <button
            onClick={() => window.print()}
            className="bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-6 rounded-md"
          >
            결과 인쇄
          </button>
        </div>
      </div>
    </div>
  )
}