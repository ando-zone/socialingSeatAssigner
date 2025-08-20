'use client'

import { useMemo } from 'react'
import type { GroupingResult, Participant } from '@/utils/grouping'

interface ParticipantStatsProps {
  result: GroupingResult
  participants: Participant[]
  checkInStatus: { [participantId: string]: boolean }
}

interface ParticipantAnalysis {
  id: string
  name: string
  gender: 'male' | 'female'
  mbti: 'extrovert' | 'introvert'
  totalMeetings: number
  newMeetingsThisRound: number
  groupHistory: { round: number; groupNumber: number }[]
  isCheckedIn: boolean
  meetingDiversity: {
    maleConnections: number
    femaleConnections: number
    extrovertConnections: number
    introvertConnections: number
  }
}

export default function ParticipantStats({
  result,
  participants,
  checkInStatus
}: ParticipantStatsProps) {
  const analysis = useMemo((): ParticipantAnalysis[] => {
    return participants.map(participant => {
      const currentRoundMeetings = participant.meetingsByRound?.[result.round] || []
      const previousMeetings = new Set<string>()
      
      // 이전 라운드들의 만남 수집
      Object.entries(participant.meetingsByRound || {}).forEach(([round, meetings]) => {
        if (parseInt(round) < result.round && Array.isArray(meetings)) {
          meetings.forEach(id => previousMeetings.add(id))
        }
      })
      
      const newMeetingsThisRound = currentRoundMeetings.filter(id => !previousMeetings.has(id)).length
      
      // 다양성 분석
      const allMetIds = participant.allMetPeople || []
      const metParticipants = participants.filter(p => allMetIds.includes(p.id))
      
      const meetingDiversity = {
        maleConnections: metParticipants.filter(p => p.gender === 'male').length,
        femaleConnections: metParticipants.filter(p => p.gender === 'female').length,
        extrovertConnections: metParticipants.filter(p => p.mbti === 'extrovert').length,
        introvertConnections: metParticipants.filter(p => p.mbti === 'introvert').length
      }
      
      return {
        id: participant.id,
        name: participant.name,
        gender: participant.gender,
        mbti: participant.mbti,
        totalMeetings: allMetIds.length,
        newMeetingsThisRound,
        groupHistory: (participant.groupHistory || []).map((groupNumber, index) => ({
          round: index + 1,
          groupNumber
        })),
        isCheckedIn: checkInStatus[participant.id] || false,
        meetingDiversity
      }
    })
  }, [participants, result.round, checkInStatus])

  const overallStats = useMemo(() => {
    const totalParticipants = participants.length
    const checkedInCount = Object.values(checkInStatus).filter(Boolean).length
    const averageMeetings = analysis.reduce((sum, p) => sum + p.totalMeetings, 0) / totalParticipants
    const averageNewMeetings = analysis.reduce((sum, p) => sum + p.newMeetingsThisRound, 0) / totalParticipants
    
    // 성별 분포
    const maleCount = participants.filter(p => p.gender === 'male').length
    const femaleCount = participants.filter(p => p.gender === 'female').length
    
    // MBTI 분포
    const extrovertCount = participants.filter(p => p.mbti === 'extrovert').length
    const introvertCount = participants.filter(p => p.mbti === 'introvert').length
    
    return {
      totalParticipants,
      checkedInCount,
      checkedInPercentage: Math.round((checkedInCount / totalParticipants) * 100),
      averageMeetings: Math.round(averageMeetings * 10) / 10,
      averageNewMeetings: Math.round(averageNewMeetings * 10) / 10,
      genderDistribution: {
        male: { count: maleCount, percentage: Math.round((maleCount / totalParticipants) * 100) },
        female: { count: femaleCount, percentage: Math.round((femaleCount / totalParticipants) * 100) }
      },
      mbtiDistribution: {
        extrovert: { count: extrovertCount, percentage: Math.round((extrovertCount / totalParticipants) * 100) },
        introvert: { count: introvertCount, percentage: Math.round((introvertCount / totalParticipants) * 100) }
      }
    }
  }, [participants, checkInStatus, analysis])

  const topNetworkers = useMemo(() => {
    return [...analysis]
      .sort((a, b) => b.totalMeetings - a.totalMeetings)
      .slice(0, 5)
  }, [analysis])

  const mostActiveThisRound = useMemo(() => {
    return [...analysis]
      .sort((a, b) => b.newMeetingsThisRound - a.newMeetingsThisRound)
      .slice(0, 5)
  }, [analysis])

  return (
    <div className="space-y-6">
      {/* 전체 통계 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <span className="text-blue-500 mr-2">📊</span>
          전체 통계
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{overallStats.totalParticipants}</div>
            <div className="text-sm text-gray-600">총 참가자</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {overallStats.checkedInCount}/{overallStats.totalParticipants}
            </div>
            <div className="text-sm text-gray-600">입장 완료</div>
            <div className="text-xs text-green-600 mt-1">{overallStats.checkedInPercentage}%</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{overallStats.averageMeetings}</div>
            <div className="text-sm text-gray-600">평균 만남</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{overallStats.averageNewMeetings}</div>
            <div className="text-sm text-gray-600">평균 신규 만남</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 성별 분포 */}
          <div className="bg-pink-50 rounded-lg p-4">
            <h4 className="font-medium text-pink-800 mb-3">성별 분포</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">남성</span>
                <span className="font-medium">
                  {overallStats.genderDistribution.male.count}명 ({overallStats.genderDistribution.male.percentage}%)
                </span>
              </div>
              <div className="w-full bg-pink-200 rounded-full h-2">
                <div 
                  className="bg-pink-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${overallStats.genderDistribution.male.percentage}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">여성</span>
                <span className="font-medium">
                  {overallStats.genderDistribution.female.count}명 ({overallStats.genderDistribution.female.percentage}%)
                </span>
              </div>
              <div className="w-full bg-pink-200 rounded-full h-2">
                <div 
                  className="bg-pink-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${overallStats.genderDistribution.female.percentage}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* MBTI 분포 */}
          <div className="bg-indigo-50 rounded-lg p-4">
            <h4 className="font-medium text-indigo-800 mb-3">MBTI 분포</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">외향형 (E)</span>
                <span className="font-medium">
                  {overallStats.mbtiDistribution.extrovert.count}명 ({overallStats.mbtiDistribution.extrovert.percentage}%)
                </span>
              </div>
              <div className="w-full bg-indigo-200 rounded-full h-2">
                <div 
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${overallStats.mbtiDistribution.extrovert.percentage}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">내향형 (I)</span>
                <span className="font-medium">
                  {overallStats.mbtiDistribution.introvert.count}명 ({overallStats.mbtiDistribution.introvert.percentage}%)
                </span>
              </div>
              <div className="w-full bg-indigo-200 rounded-full h-2">
                <div 
                  className="bg-indigo-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${overallStats.mbtiDistribution.introvert.percentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 네트워킹 리더보드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 전체 네트워킹 순위 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <span className="text-yellow-500 mr-2">🏆</span>
            네트워킹 리더
          </h3>
          <div className="space-y-3">
            {topNetworkers.map((participant, index) => (
              <div key={participant.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-yellow-500 text-white' :
                    index === 1 ? 'bg-gray-400 text-white' :
                    index === 2 ? 'bg-amber-600 text-white' :
                    'bg-gray-200 text-gray-700'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{participant.name}</div>
                    <div className="text-xs text-gray-600">
                      {participant.gender === 'male' ? '남성' : '여성'} • {participant.mbti === 'extrovert' ? 'E' : 'I'}
                      {participant.isCheckedIn ? ' • ✅' : ' • ⏳'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-yellow-600">{participant.totalMeetings}명</div>
                  <div className="text-xs text-gray-600">만남</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 이번 라운드 활발한 참가자 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <span className="text-green-500 mr-2">🔥</span>
            이번 라운드 활발한 참가자
          </h3>
          <div className="space-y-3">
            {mostActiveThisRound.map((participant, index) => (
              <div key={participant.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-green-500 text-white' :
                    index === 1 ? 'bg-green-400 text-white' :
                    index === 2 ? 'bg-green-300 text-white' :
                    'bg-gray-200 text-gray-700'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{participant.name}</div>
                    <div className="text-xs text-gray-600">
                      {participant.gender === 'male' ? '남성' : '여성'} • {participant.mbti === 'extrovert' ? 'E' : 'I'}
                      {participant.isCheckedIn ? ' • ✅' : ' • ⏳'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">{participant.newMeetingsThisRound}명</div>
                  <div className="text-xs text-gray-600">신규</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 상세 참가자 분석 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <span className="text-purple-500 mr-2">👥</span>
          상세 참가자 분석
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-3 font-medium">이름</th>
                <th className="text-center p-3 font-medium">성별</th>
                <th className="text-center p-3 font-medium">MBTI</th>
                <th className="text-center p-3 font-medium">전체 만남</th>
                <th className="text-center p-3 font-medium">신규 만남</th>
                <th className="text-center p-3 font-medium">남성 연결</th>
                <th className="text-center p-3 font-medium">여성 연결</th>
                <th className="text-center p-3 font-medium">체크인</th>
              </tr>
            </thead>
            <tbody>
              {analysis.map((participant) => (
                <tr key={participant.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{participant.name}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      participant.gender === 'male' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-pink-100 text-pink-800'
                    }`}>
                      {participant.gender === 'male' ? '남성' : '여성'}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      participant.mbti === 'extrovert' 
                        ? 'bg-orange-100 text-orange-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {participant.mbti === 'extrovert' ? 'E' : 'I'}
                    </span>
                  </td>
                  <td className="p-3 text-center font-medium">{participant.totalMeetings}</td>
                  <td className="p-3 text-center">
                    <span className={`font-medium ${participant.newMeetingsThisRound > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                      {participant.newMeetingsThisRound}
                    </span>
                  </td>
                  <td className="p-3 text-center">{participant.meetingDiversity.maleConnections}</td>
                  <td className="p-3 text-center">{participant.meetingDiversity.femaleConnections}</td>
                  <td className="p-3 text-center">
                    <span className={`text-lg ${participant.isCheckedIn ? 'text-green-500' : 'text-gray-400'}`}>
                      {participant.isCheckedIn ? '✅' : '⏳'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}