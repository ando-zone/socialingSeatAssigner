'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Group, Person, validateMeetings, getPersonMeetingList, ValidationResult } from '@/utils/grouping';

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

export default function ResultPage() {
  const [groupingData, setGroupingData] = useState<GroupingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
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
      
      // 검증 로직 실행
      const previousMeetings = new Set(data.manager.previousMeetings);
      const validation = validateMeetings(data.people, previousMeetings);
      setValidationResult(validation);
    } catch (error) {
      console.error('데이터 파싱 오류:', error);
      router.push('/');
      return;
    }

    setIsLoading(false);
  }, [router]);

  const handleNewStart = () => {
    sessionStorage.removeItem('groupingData');
    router.push('/');
  };

  const handlePrint = () => {
    window.print();
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

  const { manager, people, groupSize } = groupingData;
  const totalRounds = manager.currentRound;
  const totalMeetings = manager.previousMeetings.length;
  const maxPossibleMeetings = people.length * (people.length - 1) / 2;
  const completionRate = (totalMeetings / maxPossibleMeetings) * 100;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* 헤더 */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🎉 완료!
            </h1>
            <p className="text-gray-600">
              총 {totalRounds}라운드 진행
            </p>
            <p className="text-green-600 font-medium mt-2">
              모든 사람이 새로운 사람들과 만났습니다!
            </p>
          </div>

          {/* 전체 통계 */}
          <div className="bg-green-50 border border-green-200 rounded-md p-6 mb-8">
            <h2 className="text-lg font-semibold text-green-800 mb-4 text-center">📊 전체 통계</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-800">{people.length}</div>
                <div className="text-sm text-green-600">총 참가자</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-800">{totalRounds}</div>
                <div className="text-sm text-green-600">진행 라운드</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-800">{totalMeetings}</div>
                <div className="text-sm text-green-600">총 만남 수</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-800">{completionRate.toFixed(1)}%</div>
                <div className="text-sm text-green-600">만남 달성률</div>
              </div>
            </div>
          </div>

          {/* 검증 결과 */}
          {validationResult && (
            <div className={`border rounded-md p-6 mb-8 ${
              validationResult.isValid 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <h2 className={`text-lg font-semibold mb-4 text-center ${
                validationResult.isValid 
                  ? 'text-green-800' 
                  : 'text-red-800'
              }`}>
                🔍 만남 검증 결과
              </h2>
              
              {validationResult.isValid ? (
                <div className="text-center">
                  <div className="text-2xl mb-2">✅</div>
                  <p className="text-green-700 font-medium">
                    완벽합니다! 모든 참가자가 중복 없이 새로운 사람들과만 만났습니다.
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-2xl mb-2">⚠️</div>
                  <p className="text-red-700 font-medium mb-4">
                    {validationResult.totalDuplicates}쌍의 중복 만남이 발견되었습니다.
                  </p>
                  {validationResult.problemPairs.length > 0 && (
                    <div className="text-sm text-red-600">
                      <p className="mb-2">중복 만남:</p>
                      {validationResult.problemPairs.map((pair, index) => (
                        <div key={index} className="bg-red-100 p-2 rounded mb-1">
                          {pair.person1.name} ↔ {pair.person2.name} ({pair.meetCount}번)
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 참가자별 만남 현황 */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">👥 참가자별 만남 현황</h2>
            <p className="text-sm text-gray-600 mb-4">참가자를 클릭하면 누구와 만났는지 자세히 볼 수 있습니다.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {validationResult?.personRecords.map((record) => (
                <button
                  key={record.person.id}
                  onClick={() => handlePersonClick(record.person)}
                  className="bg-blue-100 hover:bg-blue-200 text-blue-900 px-3 py-2 rounded-md border border-blue-300 font-medium text-sm transition-colors cursor-pointer"
                >
                  <div>{record.person.name}</div>
                  <div className="text-xs text-blue-600">
                    만남: {record.totalMeetings}명
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 라운드별 요약 */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">📋 라운드별 요약</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-3">
                {manager.rounds.map((round, roundIndex) => (
                  <div key={roundIndex} className="flex items-center justify-between py-2 px-4 bg-white rounded border border-gray-200">
                    <div>
                      <span className="font-medium text-gray-800">라운드 {roundIndex + 1}</span>
                      <span className="text-gray-600 ml-2">
                        {round.length}개 그룹, 그룹당 {groupSize}명
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {round.length * groupSize * (groupSize - 1) / 2}개 새로운 만남
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 마지막 라운드 상세 */}
          {manager.rounds.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                🎯 라운드 {totalRounds} 상세
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {manager.rounds[manager.rounds.length - 1].map((group) => (
                  <div key={group.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="text-md font-semibold text-gray-800 mb-3 text-center">
                      그룹 {group.id}
                    </h3>
                                         <div className="space-y-2">
                       {group.members.map((member) => (
                         <div
                           key={member.id}
                           className="bg-green-100 px-3 py-1 rounded border border-green-300 text-center text-sm text-green-900 font-medium"
                         >
                           {member.name}
                         </div>
                       ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 액션 버튼들 */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleNewStart}
              className="bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              새로 시작
            </button>
            <button
              onClick={handlePrint}
              className="bg-gray-600 text-white px-6 py-3 rounded-md font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              🖨️ 인쇄하기
            </button>
          </div>

          {/* 성공 메시지 */}
          <div className="mt-8 text-center">
            <div className="inline-block bg-green-100 text-green-800 px-6 py-3 rounded-lg">
              <span className="text-lg">✨ 성공적으로 완료되었습니다! ✨</span>
            </div>
            <p className="text-gray-600 mt-2">
              모든 참가자가 다양한 사람들과 만날 수 있는 기회를 가졌습니다.
            </p>
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