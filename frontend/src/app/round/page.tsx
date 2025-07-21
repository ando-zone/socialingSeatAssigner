'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Group, GroupingManager, Person, getPersonMeetingList } from '@/utils/grouping';

interface GroupingData {
  people: Person[];
  groupSize: number;
  manager: {
    people: Person[];
    groupSize: number;
    previousMeetings: string[];
    rounds: Group[][];
    currentRound: number;
  };
  currentGroups: Group[];
}

export default function RoundPage() {
  const [groupingData, setGroupingData] = useState<GroupingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [personMeetingList, setPersonMeetingList] = useState<Person[]>([]);
  const router = useRouter();

  useEffect(() => {
    // 세션스토리지에서 데이터 로드
    const savedData = sessionStorage.getItem('groupingData');
    if (!savedData) {
      router.push('/');
      return;
    }

    try {
      const data = JSON.parse(savedData) as GroupingData;
      setGroupingData(data);
    } catch (error) {
      console.error('데이터 파싱 오류:', error);
      router.push('/');
      return;
    }

    setIsLoading(false);
  }, [router]);

  const handleNextRound = () => {
    if (!groupingData) return;

    // GroupingManager 재구성
    const manager = new GroupingManager(groupingData.people, groupingData.groupSize);
    
    // 이전 상태 복원
    manager['state'].previousMeetings = new Set(groupingData.manager.previousMeetings);
    manager['state'].rounds = groupingData.manager.rounds;
    manager['state'].currentRound = groupingData.manager.currentRound;

    // 다음 라운드 생성
    const nextRoundGroups = manager.generateNextRound();

    // 업데이트된 데이터
    const updatedData = {
      ...groupingData,
      manager: {
        people: manager['state'].people,
        groupSize: manager['state'].groupSize,
        previousMeetings: Array.from(manager['state'].previousMeetings),
        rounds: manager['state'].rounds,
        currentRound: manager['state'].currentRound
      },
      currentGroups: nextRoundGroups
    };

    // 세션스토리지 업데이트
    sessionStorage.setItem('groupingData', JSON.stringify(updatedData));
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
    if (!groupingData) return;
    
    const previousMeetings = new Set(groupingData.manager.previousMeetings);
    const meetingList = getPersonMeetingList(person, groupingData.people, previousMeetings);
    
    setSelectedPerson(person);
    setPersonMeetingList(meetingList);
  };

  const closeModal = () => {
    setSelectedPerson(null);
    setPersonMeetingList([]);
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

  if (!groupingData) {
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

  const { currentGroups, manager } = groupingData;
  const currentRound = manager.currentRound;

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
              {groupingData.people.length}명이 {groupingData.groupSize}명씩 {currentGroups.length}개 그룹으로 나뉩니다
            </p>
          </div>

          {/* 그룹 카드들 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {currentGroups.map((group) => (
              <div key={group.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
                  그룹 {group.id}
                </h3>
                                 <div className="space-y-2">
                   {group.members.map((member, index) => (
                     <button
                       key={member.id}
                       onClick={() => handlePersonClick(member)}
                       className="w-full bg-blue-100 hover:bg-blue-200 px-3 py-2 rounded-md border border-blue-300 text-center text-blue-900 font-medium transition-colors cursor-pointer"
                     >
                       {member.name}
                     </button>
                   ))}
                </div>
              </div>
            ))}
          </div>

          {/* 통계 정보 */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-800">{currentRound}</div>
                <div className="text-sm text-blue-600">현재 라운드</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-800">{manager.previousMeetings.length}</div>
                <div className="text-sm text-blue-600">총 만남 수</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-800">
                  {Math.floor((groupingData.people.length - 1) / (groupingData.groupSize - 1))}
                </div>
                <div className="text-sm text-blue-600">예상 최대 라운드</div>
              </div>
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
            👆 참가자 이름을 클릭하면 누구와 만났는지 볼 수 있습니다
          </div>
        </div>
      </div>

      {/* 개별 참가자 만남 현황 모달 */}
      {selectedPerson && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  👤 {selectedPerson.name}의 만남 현황
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-4">
                <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-800">{personMeetingList.length}</div>
                    <div className="text-sm text-blue-600">명과 만남</div>
                  </div>
                </div>
              </div>

              {personMeetingList.length > 0 ? (
                <div>
                  <h4 className="font-medium text-gray-700 mb-3">만난 사람들:</h4>
                  <div className="space-y-2">
                    {personMeetingList.map((person) => (
                      <div
                        key={person.id}
                        className="bg-green-100 px-3 py-2 rounded border border-green-300 text-green-900 font-medium text-center"
                      >
                        {person.name}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <div className="text-4xl mb-2">🤷‍♂️</div>
                  <p>아직 아무와도 만나지 않았습니다.</p>
                </div>
              )}

              <div className="mt-6 text-center">
                <button
                  onClick={closeModal}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
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