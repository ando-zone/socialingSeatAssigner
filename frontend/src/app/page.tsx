'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseParticipants, validateGrouping, GroupingManager } from '@/utils/grouping';

export default function Home() {
  const [participantsText, setParticipantsText] = useState('김철수\n박영희\n이민호\n정수진\n최진우\n한소영\n이지은\n박민수');
  const [groupSize, setGroupSize] = useState(4);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 참가자 파싱
    const people = parseParticipants(participantsText);
    
    // 유효성 검사
    const validationError = validateGrouping(people, groupSize);
    if (validationError) {
      setError(validationError);
      return;
    }

    // 그룹핑 매니저 생성 및 세션스토리지에 저장
    const manager = new GroupingManager(people, groupSize);
    const firstRoundGroups = manager.generateNextRound();
    
    // 상태를 세션스토리지에 저장
    sessionStorage.setItem('groupingData', JSON.stringify({
      people,
      groupSize,
      manager: {
        people: manager['state'].people,
        groupSize: manager['state'].groupSize,
        previousMeetings: Array.from(manager['state'].previousMeetings),
        rounds: manager['state'].rounds,
        currentRound: manager['state'].currentRound
      },
      currentGroups: firstRoundGroups
    }));

    // 라운드 페이지로 이동
    router.push('/round');
  };

  const people = parseParticipants(participantsText);
  const numGroups = people.length > 0 ? Math.floor(people.length / groupSize) : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* 헤더 */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🎪 자리 배치 프로그램
            </h1>
            <p className="text-gray-600">
              참가자들이 매 라운드마다 새로운 사람들과 만날 수 있도록 도와드립니다
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 참가자 입력 */}
            <div>
              <label htmlFor="participants" className="block text-sm font-medium text-gray-700 mb-2">
                👥 참가자 (한 줄에 하나씩):
              </label>
                             <textarea
                 id="participants"
                 value={participantsText}
                 onChange={(e) => setParticipantsText(e.target.value)}
                 rows={8}
                 className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm bg-blue-50 text-blue-900 font-medium"
                 placeholder="김철수&#10;박영희&#10;이민호&#10;..."
               />
              <div className="mt-2 text-sm text-gray-500">
                총 {people.length}명
              </div>
            </div>

            {/* 그룹 크기 설정 */}
            <div>
              <label htmlFor="groupSize" className="block text-sm font-medium text-gray-700 mb-2">
                그룹 크기:
              </label>
              <div className="flex items-center space-x-4">
                                 <input
                   type="number"
                   id="groupSize"
                   value={groupSize}
                   onChange={(e) => setGroupSize(parseInt(e.target.value) || 1)}
                   min="2"
                   max="20"
                   className="w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-blue-50 text-blue-900 font-medium text-center"
                 />
                <span className="text-sm text-gray-600">명</span>
                {numGroups > 0 && (
                  <span className="text-sm text-gray-500">
                    → {numGroups}개 그룹
                  </span>
                )}
              </div>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">❌ {error}</p>
              </div>
            )}

            {/* 미리보기 정보 */}
            {people.length > 0 && groupSize >= 2 && people.length % groupSize === 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h3 className="text-sm font-medium text-blue-800 mb-2">📋 미리보기:</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• 총 참가자: {people.length}명</li>
                  <li>• 그룹 크기: {groupSize}명</li>
                  <li>• 그룹 수: {numGroups}개</li>
                  <li>• 예상 최대 라운드: 약 {Math.floor((people.length - 1) / (groupSize - 1))}라운드</li>
                </ul>
              </div>
            )}

            {/* 시작 버튼 */}
            <div className="text-center">
              <button
                type="submit"
                disabled={people.length === 0 || groupSize < 2}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-md font-medium text-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                시작하기
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
