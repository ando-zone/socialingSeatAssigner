'use client'

import { useMemo, useState } from 'react'
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

type SortField = 'name' | 'gender' | 'mbti' | 'totalMeetings' | 'newMeetingsThisRound' | 'maleConnections' | 'femaleConnections' | 'isCheckedIn'
type SortOrder = 'asc' | 'desc'

export default function ParticipantStats({
  result,
  participants,
  checkInStatus
}: ParticipantStatsProps) {
  const [maleSortField, setMaleSortField] = useState<SortField>('name')
  const [maleSortOrder, setMaleSortOrder] = useState<SortOrder>('asc')
  const [femaleSortField, setFemaleSortField] = useState<SortField>('name')
  const [femaleSortOrder, setFemaleSortOrder] = useState<SortOrder>('asc')
  const [selectedParticipant, setSelectedParticipant] = useState<ParticipantAnalysis | null>(null)
  const [showModal, setShowModal] = useState(false)
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

  const sortParticipants = (participants: ParticipantAnalysis[], sortField: SortField, sortOrder: SortOrder) => {
    return [...participants].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'gender':
          aValue = a.gender
          bValue = b.gender
          break
        case 'mbti':
          aValue = a.mbti
          bValue = b.mbti
          break
        case 'totalMeetings':
          aValue = a.totalMeetings
          bValue = b.totalMeetings
          break
        case 'newMeetingsThisRound':
          aValue = a.newMeetingsThisRound
          bValue = b.newMeetingsThisRound
          break
        case 'maleConnections':
          aValue = a.meetingDiversity.maleConnections
          bValue = b.meetingDiversity.maleConnections
          break
        case 'femaleConnections':
          aValue = a.meetingDiversity.femaleConnections
          bValue = b.meetingDiversity.femaleConnections
          break
        case 'isCheckedIn':
          aValue = a.isCheckedIn ? 1 : 0
          bValue = b.isCheckedIn ? 1 : 0
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }

  const maleAnalysis = useMemo(() => {
    return analysis.filter(p => p.gender === 'male')
  }, [analysis])

  const femaleAnalysis = useMemo(() => {
    return analysis.filter(p => p.gender === 'female')
  }, [analysis])

  const sortedMaleAnalysis = useMemo(() => {
    return sortParticipants(maleAnalysis, maleSortField, maleSortOrder)
  }, [maleAnalysis, maleSortField, maleSortOrder])

  const sortedFemaleAnalysis = useMemo(() => {
    return sortParticipants(femaleAnalysis, femaleSortField, femaleSortOrder)
  }, [femaleAnalysis, femaleSortField, femaleSortOrder])

  const handleMaleSort = (field: SortField) => {
    if (maleSortField === field) {
      setMaleSortOrder(maleSortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setMaleSortField(field)
      setMaleSortOrder('asc')
    }
  }

  const handleFemaleSort = (field: SortField) => {
    if (femaleSortField === field) {
      setFemaleSortOrder(femaleSortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setFemaleSortField(field)
      setFemaleSortOrder('asc')
    }
  }

  const getMaleSortIcon = (field: SortField) => {
    if (maleSortField !== field) return '↕️'
    return maleSortOrder === 'asc' ? '↑' : '↓'
  }

  const getFemaleSortIcon = (field: SortField) => {
    if (femaleSortField !== field) return '↕️'
    return femaleSortOrder === 'asc' ? '↑' : '↓'
  }

  const handleParticipantClick = (participant: ParticipantAnalysis) => {
    setSelectedParticipant(participant)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedParticipant(null)
  }

  const getParticipantMeetingsByRound = (participant: ParticipantAnalysis) => {
    const fullParticipant = participants.find(p => p.id === participant.id)
    if (!fullParticipant?.meetingsByRound) return {}

    // 전체 만남 횟수 계산
    const meetingCounts: { [personId: string]: number } = {}
    Object.entries(fullParticipant.meetingsByRound).forEach(([round, meetingIds]) => {
      if (Array.isArray(meetingIds)) {
        meetingIds.forEach(id => {
          meetingCounts[id] = (meetingCounts[id] || 0) + 1
        })
      }
    })

    const meetingsByRound: { [round: number]: { id: string; name: string; gender: 'male' | 'female'; meetCount: number }[] } = {}
    
    Object.entries(fullParticipant.meetingsByRound).forEach(([round, meetingIds]) => {
      if (Array.isArray(meetingIds)) {
        meetingsByRound[parseInt(round)] = meetingIds.map(id => {
          const metParticipant = participants.find(p => p.id === id)
          return {
            id,
            name: metParticipant?.name || '알 수 없음',
            gender: metParticipant?.gender || 'male',
            meetCount: meetingCounts[id] || 1
          }
        }).sort((a, b) => a.name.localeCompare(b.name, 'ko-KR')) // 가나다순 정렬
      }
    })

    return meetingsByRound
  }

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


      {/* 상세 참가자 분석 */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <span className="text-purple-500 mr-2">👥</span>
          상세 참가자 분석
        </h3>
        
        {/* 남성 참가자 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <span className="text-blue-500 mr-2">👨</span>
            <h4 className="text-lg font-semibold">남성 참가자 ({maleAnalysis.length}명)</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-blue-50">
                  <th 
                    className="text-left p-3 font-medium cursor-pointer hover:bg-blue-100 transition-colors"
                    onClick={() => handleMaleSort('name')}
                  >
                    이름 {getMaleSortIcon('name')}
                  </th>
                  <th 
                    className="text-center p-3 font-medium cursor-pointer hover:bg-blue-100 transition-colors"
                    onClick={() => handleMaleSort('mbti')}
                  >
                    MBTI {getMaleSortIcon('mbti')}
                  </th>
                  <th 
                    className="text-center p-3 font-medium cursor-pointer hover:bg-blue-100 transition-colors"
                    onClick={() => handleMaleSort('totalMeetings')}
                  >
                    전체 만남 {getMaleSortIcon('totalMeetings')}
                  </th>
                  <th 
                    className="text-center p-3 font-medium cursor-pointer hover:bg-blue-100 transition-colors"
                    onClick={() => handleMaleSort('newMeetingsThisRound')}
                  >
                    신규 만남 {getMaleSortIcon('newMeetingsThisRound')}
                  </th>
                  <th 
                    className="text-center p-3 font-medium cursor-pointer hover:bg-blue-100 transition-colors"
                    onClick={() => handleMaleSort('maleConnections')}
                  >
                    남성 연결 {getMaleSortIcon('maleConnections')}
                  </th>
                  <th 
                    className="text-center p-3 font-medium cursor-pointer hover:bg-blue-100 transition-colors"
                    onClick={() => handleMaleSort('femaleConnections')}
                  >
                    여성 연결 {getMaleSortIcon('femaleConnections')}
                  </th>
                  <th 
                    className="text-center p-3 font-medium cursor-pointer hover:bg-blue-100 transition-colors"
                    onClick={() => handleMaleSort('isCheckedIn')}
                  >
                    체크인 {getMaleSortIcon('isCheckedIn')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedMaleAnalysis.map((participant) => (
                  <tr key={participant.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">
                      <button
                        onClick={() => handleParticipantClick(participant)}
                        className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      >
                        {participant.name}
                      </button>
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

        {/* 여성 참가자 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <span className="text-pink-500 mr-2">👩</span>
            <h4 className="text-lg font-semibold">여성 참가자 ({femaleAnalysis.length}명)</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-pink-50">
                  <th 
                    className="text-left p-3 font-medium cursor-pointer hover:bg-pink-100 transition-colors"
                    onClick={() => handleFemaleSort('name')}
                  >
                    이름 {getFemaleSortIcon('name')}
                  </th>
                  <th 
                    className="text-center p-3 font-medium cursor-pointer hover:bg-pink-100 transition-colors"
                    onClick={() => handleFemaleSort('mbti')}
                  >
                    MBTI {getFemaleSortIcon('mbti')}
                  </th>
                  <th 
                    className="text-center p-3 font-medium cursor-pointer hover:bg-pink-100 transition-colors"
                    onClick={() => handleFemaleSort('totalMeetings')}
                  >
                    전체 만남 {getFemaleSortIcon('totalMeetings')}
                  </th>
                  <th 
                    className="text-center p-3 font-medium cursor-pointer hover:bg-pink-100 transition-colors"
                    onClick={() => handleFemaleSort('newMeetingsThisRound')}
                  >
                    신규 만남 {getFemaleSortIcon('newMeetingsThisRound')}
                  </th>
                  <th 
                    className="text-center p-3 font-medium cursor-pointer hover:bg-pink-100 transition-colors"
                    onClick={() => handleFemaleSort('maleConnections')}
                  >
                    남성 연결 {getFemaleSortIcon('maleConnections')}
                  </th>
                  <th 
                    className="text-center p-3 font-medium cursor-pointer hover:bg-pink-100 transition-colors"
                    onClick={() => handleFemaleSort('femaleConnections')}
                  >
                    여성 연결 {getFemaleSortIcon('femaleConnections')}
                  </th>
                  <th 
                    className="text-center p-3 font-medium cursor-pointer hover:bg-pink-100 transition-colors"
                    onClick={() => handleFemaleSort('isCheckedIn')}
                  >
                    체크인 {getFemaleSortIcon('isCheckedIn')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedFemaleAnalysis.map((participant) => (
                  <tr key={participant.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">
                      <button
                        onClick={() => handleParticipantClick(participant)}
                        className="text-pink-600 hover:text-pink-800 hover:underline cursor-pointer"
                      >
                        {participant.name}
                      </button>
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

      {/* 참가자 상세 정보 모달 */}
      {showModal && selectedParticipant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-semibold flex items-center">
                <span className={`mr-3 ${selectedParticipant.gender === 'male' ? 'text-blue-500' : 'text-pink-500'}`}>
                  {selectedParticipant.gender === 'male' ? '👨' : '👩'}
                </span>
                {selectedParticipant.name}의 만남 기록
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="p-6">
              {/* 참가자 기본 정보 */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 font-medium">성별:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                      selectedParticipant.gender === 'male' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-pink-100 text-pink-800'
                    }`}>
                      {selectedParticipant.gender === 'male' ? '남성' : '여성'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 font-medium">MBTI:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                      selectedParticipant.mbti === 'extrovert' 
                        ? 'bg-orange-100 text-orange-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {selectedParticipant.mbti === 'extrovert' ? '외향형 (E)' : '내향형 (I)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 font-medium">총 만남:</span>
                    <span className="ml-2 font-semibold text-purple-600">{selectedParticipant.totalMeetings}명</span>
                  </div>
                  <div>
                    <span className="text-gray-600 font-medium">체크인:</span>
                    <span className={`ml-2 ${selectedParticipant.isCheckedIn ? 'text-green-500' : 'text-gray-400'}`}>
                      {selectedParticipant.isCheckedIn ? '✅ 완료' : '⏳ 대기'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 라운드별 만남 기록 */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">라운드별 만남 기록</h4>
                {(() => {
                  const meetingsByRound = getParticipantMeetingsByRound(selectedParticipant)
                  const rounds = Object.keys(meetingsByRound).map(Number).sort((a, b) => b - a) // 최신 라운드부터

                  if (rounds.length === 0) {
                    return (
                      <div className="text-center py-8 text-gray-500">
                        <p>아직 만남 기록이 없습니다.</p>
                      </div>
                    )
                  }

                  return rounds.map(round => {
                    const meetings = meetingsByRound[round]
                    const isCurrentRound = round === result.round
                    
                    return (
                      <div key={round} className={`border rounded-lg p-4 ${
                        isCurrentRound ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50'
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <h5 className={`font-semibold ${
                            isCurrentRound ? 'text-blue-800' : 'text-gray-700'
                          }`}>
                            {round}라운드 {isCurrentRound && '(현재)'}
                          </h5>
                          <span className={`text-sm px-2 py-1 rounded-full ${
                            isCurrentRound 
                              ? 'bg-blue-200 text-blue-800' 
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            {meetings.length}명과 만남
                          </span>
                        </div>
                        
                        {meetings.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {meetings.map(meeting => (
                              <div
                                key={meeting.id}
                                className={`flex items-center justify-between p-2 rounded text-sm ${
                                  meeting.gender === 'male'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-pink-100 text-pink-800'
                                }`}
                              >
                                <div className="flex items-center">
                                  <span className="mr-2">
                                    {meeting.gender === 'male' ? '👨' : '👩'}
                                  </span>
                                  <span>{meeting.name}</span>
                                </div>
                                <span className="text-xs font-medium opacity-75">
                                  ({meeting.meetCount}번)
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">만남이 없었습니다.</p>
                        )}
                      </div>
                    )
                  })
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}