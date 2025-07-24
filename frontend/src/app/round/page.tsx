'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Group, AdvancedGroupingManager, Person, getPersonMeetingList, GroupingConfig } from '@/utils/grouping';

interface GroupingData {
  people: Person[];
  groupSizes: number[];
  enableGroupNumberAvoidance: boolean;
  enableGenderBalancing: boolean;
  currentGroups: Group[];
  currentRound: number;
  totalMeetings: number;
  previousMeetings: string[]; // 만남 데이터 추가
}

export default function RoundPage() {
  const [groupingData, setGroupingData] = useState<GroupingData | null>(null);
  const [manager, setManager] = useState<AdvancedGroupingManager | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [personMeetingList, setPersonMeetingList] = useState<Person[]>([]);
  const [personGroupHistory, setPersonGroupHistory] = useState<{ [round: number]: number } | null>(null);
  const router = useRouter();

  useEffect(() => {
    // 세션스토리지에서 데이터 로드
    const savedData = sessionStorage.getItem('groupingData');
    if (!savedData) {
      router.push('/');
      return;
    }

    try {
      const rawData = JSON.parse(savedData);
      
      // 배열을 다시 Set으로 변환
      const deserializedPeople = rawData.people.map((person: Record<string, unknown>) => ({
        ...person,
        previousGroupNumbers: new Set<number>((person.previousGroupNumbers as number[]) || []),
        groupHistory: (person.groupHistory as { [round: number]: number }) || {},
        lastGroupNumber: person.lastGroupNumber as number | undefined
      }));

      const deserializedGroups = rawData.currentGroups.map((group: Record<string, unknown>) => ({
        ...group,
        members: (group.members as Record<string, unknown>[]).map((member: Record<string, unknown>) => ({
          ...member,
          previousGroupNumbers: new Set<number>((member.previousGroupNumbers as number[]) || []),
          groupHistory: (member.groupHistory as { [round: number]: number }) || {},
          lastGroupNumber: member.lastGroupNumber as number | undefined
        }))
      }));

      const data: GroupingData = {
        ...rawData,
        people: deserializedPeople,
        currentGroups: deserializedGroups,
        previousMeetings: rawData.previousMeetings || [] // 기본값 제공
      };
      
      setGroupingData(data);

      // AdvancedGroupingManager 재구성
      const config: GroupingConfig = {
        people: data.people,
        groupSizes: data.groupSizes,
        enableGroupNumberAvoidance: data.enableGroupNumberAvoidance,
        genderBalancing: data.enableGenderBalancing
      };

      const managerInstance = new AdvancedGroupingManager(config);
      // 현재 상태로 설정
      managerInstance['state'].currentRound = data.currentRound;
      // 이전 만남 데이터 복원
      if (data.previousMeetings) {
        managerInstance['state'].previousMeetings = new Set(data.previousMeetings);
      }
      setManager(managerInstance);

    } catch (error) {
      console.error('데이터 파싱 오류:', error);
      router.push('/');
      return;
    }

    setIsLoading(false);
  }, [router]);

  const handleNextRound = () => {
    if (!groupingData || !manager) return;

    // 다음 라운드 생성
    const nextRoundGroups = manager.generateNextRound();

    // Set을 배열로 변환하여 직렬화 가능하게 만들기
    const serializablePeople = groupingData.people.map(person => ({
      ...person,
      previousGroupNumbers: Array.from(person.previousGroupNumbers),
      groupHistory: person.groupHistory,
      lastGroupNumber: person.lastGroupNumber
    }));

    const serializableGroups = nextRoundGroups.map(group => ({
      ...group,
      members: group.members.map(member => ({
        ...member,
        previousGroupNumbers: Array.from(member.previousGroupNumbers),
        groupHistory: member.groupHistory,
        lastGroupNumber: member.lastGroupNumber
      }))
    }));

    // 업데이트된 데이터
    const updatedData: GroupingData = {
      ...groupingData,
      currentGroups: nextRoundGroups,
      currentRound: manager.getCurrentRound(),
      totalMeetings: manager.getTotalMeetings()
    };

    // 세션스토리지 업데이트 (직렬화 가능한 데이터 사용)
    sessionStorage.setItem('groupingData', JSON.stringify({
      ...updatedData,
      people: serializablePeople,
      currentGroups: serializableGroups,
      previousMeetings: Array.from(manager.getPreviousMeetings()) // 업데이트된 만남 데이터 저장
    }));
    
    setGroupingData(updatedData);
  };

  const handleComplete = () => {
    router.push('/result');
  };

  const handleNewStart = () => {
    sessionStorage.removeItem('groupingData');
    router.push('/');
  };

  const handlePersonClick = (person: Person) => {
    if (!groupingData || !manager) return;
    
    // 개별 참가자의 만남 현황과 그룹 히스토리 조회
    const meetingList = manager.getPersonMeetings(person.id);
    const groupHistory = manager.getPersonHistory(person.id);
    
    setSelectedPerson(person);
    setPersonMeetingList(meetingList);
    setPersonGroupHistory(groupHistory);
  };

  const closeModal = () => {
    setSelectedPerson(null);
    setPersonMeetingList([]);
    setPersonGroupHistory(null);
  };

  const getGroupStats = () => {
    if (!manager) return {};
    return manager.getGroupExperienceStats();
  };

  const getParticipantStats = () => {
    if (!manager) return [];
    return manager.getParticipantStats();
  };

  const getParticipantMeetingStats = () => {
    if (!manager || !groupingData) return [];
    
    return groupingData.people.map(person => {
      const meetingCount = manager.getPersonMeetings(person.id).length;
      return {
        person,
        meetingCount
      };
    }).sort((a, b) => b.meetingCount - a.meetingCount); // 만남 수 많은 순으로 정렬
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!groupingData || !manager) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">데이터를 불러올 수 없습니다.</p>
          <button
            onClick={handleNewStart}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            처음으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const { currentGroups, currentRound, groupSizes, enableGroupNumberAvoidance, enableGenderBalancing } = groupingData;
  const groupStats = getGroupStats();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* 헤더 */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🎯 라운드 {currentRound}
            </h1>
            <p className="text-gray-600">
              {groupingData.people.length}명이 {groupSizes.length}개 그룹으로 나뉩니다
            </p>
            <div className="mt-2 text-sm text-gray-500">
              설정: 그룹 번호 회피 {enableGroupNumberAvoidance ? '✅' : '❌'} | 
              성별 균형 {enableGenderBalancing ? '✅' : '❌'}
            </div>
          </div>

          {/* 그룹 카드들 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {currentGroups.map((group) => {
              const lastGroupReuse = group.members.filter(member => 
                member.lastGroupNumber === group.id
              ).length;
              const maleCount = group.members.filter(m => m.gender === '남').length;
              const femaleCount = group.members.filter(m => m.gender === '여').length;

              return (
                <div key={group.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">
                      그룹 {group.id} 
                      <span className="text-sm text-gray-500 ml-1">
                        (최대 {group.maxSize}명)
                      </span>
                    </h3>
                    <div className="text-xs text-gray-500 mt-1">
                      {enableGenderBalancing && (
                        <span>남 {maleCount}명, 여 {femaleCount}명</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {group.members.map((member, index) => {
                      const isLastGroupReuse = member.lastGroupNumber === group.id;
                      const genderColor = member.gender === '남' ? 'text-blue-900 bg-blue-100 border-blue-300' 
                                        : member.gender === '여' ? 'text-pink-900 bg-pink-100 border-pink-300'
                                        : 'text-gray-900 bg-gray-100 border-gray-300';
                      
                      return (
                        <button
                          key={member.id}
                          onClick={() => handlePersonClick(member)}
                          className={`w-full hover:opacity-75 px-3 py-2 rounded-md border text-center font-medium transition-colors cursor-pointer ${genderColor}`}
                        >
                          {member.name}
                          {isLastGroupReuse && enableGroupNumberAvoidance && (
                            <span className="ml-1 text-orange-600">🔄</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 통계 정보 */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-800">{currentRound}</div>
                <div className="text-sm text-blue-600">현재 라운드</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-800">{groupingData.totalMeetings}</div>
                <div className="text-sm text-blue-600">총 만남 수</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-800">
                  {manager.getMaxPossibleRounds()}
                </div>
                <div className="text-sm text-blue-600">예상 최대 라운드</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-800">
                  {Math.round((groupingData.totalMeetings / (groupingData.people.length * (groupingData.people.length - 1) / 2)) * 100) || 0}%
                </div>
                <div className="text-sm text-blue-600">만남 진행률</div>
              </div>
            </div>
          </div>



          {/* 참가자별 만남 수 히스토그램 */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">📊 참가자별 만남 현황</h2>
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="space-y-3">
                {getParticipantMeetingStats().map((stat, index) => {
                  const stats = getParticipantMeetingStats();
                  const maxMeetings = stats.length > 0 ? Math.max(...stats.map(s => s.meetingCount)) : 0;
                  const percentage = maxMeetings > 0 ? (stat.meetingCount / maxMeetings) * 100 : 0;
                  
                  return (
                    <div key={stat.person.id} className="flex items-center space-x-3">
                      <div className="w-20 text-sm font-medium text-gray-700 text-right flex-shrink-0">
                        {stat.person.name}
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${percentage}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-semibold text-gray-800">
                            {stat.meetingCount}명
                          </span>
                        </div>
                      </div>
                      <div className="w-8 text-xs text-gray-500 flex-shrink-0">
                        {stat.person.gender && (
                          <span className={stat.person.gender === '남' ? 'text-blue-600' : 'text-pink-600'}>
                            {stat.person.gender}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {(() => {
                const stats = getParticipantMeetingStats();
                if (stats.length === 0) return null;
                
                const meetingCounts = stats.map(s => s.meetingCount);
                const maxMeetings = Math.max(...meetingCounts);
                const minMeetings = Math.min(...meetingCounts);
                const avgMeetings = meetingCounts.reduce((sum, count) => sum + count, 0) / meetingCounts.length;
                
                return (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center text-sm">
                      <div>
                        <div className="font-semibold text-gray-800">{maxMeetings}명</div>
                        <div className="text-gray-600">최대 만남</div>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">{minMeetings}명</div>
                        <div className="text-gray-600">최소 만남</div>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">{avgMeetings.toFixed(1)}명</div>
                        <div className="text-gray-600">평균 만남</div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* 액션 버튼들 */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleNextRound}
              className="bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              다음 라운드
            </button>
            <button
              onClick={handleComplete}
              className="bg-green-600 text-white px-6 py-3 rounded-md font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
            >
              완료
            </button>
            <button
              onClick={handleNewStart}
              className="bg-gray-600 text-white px-6 py-3 rounded-md font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              새로 시작
            </button>
          </div>

          {/* 힌트 */}
          <div className="mt-6 text-center text-sm text-gray-500">
            💡 각 그룹의 참가자들이 이전에 만나지 않은 새로운 조합으로 구성되었습니다
            <br />
            👆 참가자 이름을 클릭하면 만남 히스토리와 그룹 경험을 볼 수 있습니다
            <br />
            🔄 표시는 직전 라운드와 같은 그룹 번호에 배치된 참가자입니다
          </div>
        </div>
      </div>

      {/* 개별 참가자 상세 정보 모달 */}
      {selectedPerson && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">
                  👤 {selectedPerson.name}{selectedPerson.gender && ` (${selectedPerson.gender})`}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-800 text-2xl font-bold"
                >
                  ✕
                </button>
              </div>
              
              {/* 그룹 히스토리 */}
              {personGroupHistory && Object.keys(personGroupHistory).length > 0 && (
                <div className="mb-4">
                  <h4 className="font-bold text-gray-800 mb-3 text-base">📍 그룹 히스토리:</h4>
                  <div className="space-y-1">
                    {Object.entries(personGroupHistory)
                      .sort(([a], [b]) => parseInt(a) - parseInt(b))
                      .map(([round, groupNum]) => (
                        <div key={round} className="flex justify-between bg-gray-200 border border-gray-300 px-3 py-2 rounded text-sm">
                          <span className="text-gray-800 font-medium">라운드 {round}</span>
                          <span className="text-gray-900 font-bold">그룹 {groupNum}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* 만남 통계 */}
              <div className="mb-4">
                <div className="bg-blue-100 border-2 border-blue-300 p-4 rounded-lg shadow-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-900">
                      {personMeetingList.length}명
                    </div>
                    <div className="text-sm font-semibold text-blue-800 mt-1">총 만남 수</div>
                  </div>
                </div>
              </div>

              {/* 만난 사람들 */}
              <div className="mb-4">
                <h4 className="font-bold text-gray-800 mb-3 text-base">👥 만난 사람들:</h4>
                {personMeetingList.length > 0 ? (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {personMeetingList.map((person) => (
                      <div
                        key={person.id}
                        className="bg-green-50 border-2 border-green-400 px-3 py-2 rounded text-green-800 font-semibold text-center text-sm shadow-sm"
                      >
                        {person.name}{person.gender && ` (${person.gender})`}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-600 text-sm bg-gray-100 border border-gray-300 rounded-lg py-4">
                    <div className="text-3xl mb-3">🤷‍♂️</div>
                    <p className="font-medium">아직 아무와도 만나지 않았습니다.</p>
                  </div>
                )}
              </div>

              <div className="mt-6 text-center">
                <button
                  onClick={closeModal}
                  className="bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors shadow-md"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 