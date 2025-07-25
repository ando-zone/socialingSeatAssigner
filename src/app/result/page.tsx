'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { GroupingResult, Participant } from '@/utils/grouping'

export default function ResultPage() {
  const router = useRouter()
  const [result, setResult] = useState<GroupingResult | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])

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