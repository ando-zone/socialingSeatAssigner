'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseParticipants, validateGrouping, AdvancedGroupingManager, Person, GroupingConfig } from '@/utils/grouping';

// 성별 정보를 포함한 참가자 파싱 함수
function parseParticipantsWithGender(participantsText: string, enableGender: boolean): Person[] {
  return participantsText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      let name = line;
      let gender: string | undefined = undefined;
      
      // 성별 정보가 활성화된 경우, "이름(성별)" 형태로 파싱
      if (enableGender) {
        const match = line.match(/^(.+?)\s*\(([남여MF])\s*\)$/);
        if (match) {
          name = match[1].trim();
          gender = match[2] === 'M' ? '남' : match[2] === 'F' ? '여' : match[2];
        }
      }
      
      return {
        name,
        id: name,
        gender,
        previousGroupNumbers: new Set<number>(),
        groupHistory: {},
        lastGroupNumber: undefined
      };
    });
}

export default function Home() {
  const [participantsText, setParticipantsText] = useState('김철수\n박영희\n이민호\n정수진\n최진우\n한소영\n이지은\n박민수');
  const [groupingMode, setGroupingMode] = useState<'uniform' | 'custom'>('uniform');
  const [uniformGroupSize, setUniformGroupSize] = useState(4);
  const [customGroupSizes, setCustomGroupSizes] = useState('4,4,4,4');
  const [enableGender, setEnableGender] = useState(false);
  const [enableGroupNumberAvoidance, setEnableGroupNumberAvoidance] = useState(true);
  const [enableGenderBalancing, setEnableGenderBalancing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 참가자 파싱
    const people = parseParticipantsWithGender(participantsText, enableGender);
    
    // 그룹 크기 설정
    let groupSizes: number[];
    if (groupingMode === 'uniform') {
      const numGroups = Math.floor(people.length / uniformGroupSize);
      groupSizes = Array(numGroups).fill(uniformGroupSize);
    } else {
      try {
        groupSizes = customGroupSizes.split(',').map(s => parseInt(s.trim())).filter(n => n > 0);
        if (groupSizes.length === 0) {
          setError('그룹 크기를 올바르게 입력해주세요.');
          return;
        }
      } catch {
        setError('그룹 크기 형식이 올바르지 않습니다.');
        return;
      }
    }

    // 유효성 검사
    const totalCapacity = groupSizes.reduce((sum, size) => sum + size, 0);
    if (totalCapacity > people.length) {
      setError(`총 그룹 정원(${totalCapacity}명)이 참가자 수(${people.length}명)보다 큽니다.`);
      return;
    }

    if (people.length === 0) {
      setError('참가자를 입력해주세요.');
      return;
    }

    // 성별 밸런싱이 활성화된 경우 성별 정보 확인
    if (enableGenderBalancing && enableGender) {
      const genderedPeople = people.filter(p => p.gender);
      if (genderedPeople.length < people.length) {
        setError('성별 균형 기능을 사용하려면 모든 참가자의 성별을 입력해야 합니다.');
        return;
      }
    }

    // 그룹핑 설정
    const config: GroupingConfig = {
      people,
      groupSizes,
      enableGroupNumberAvoidance,
      genderBalancing: enableGenderBalancing && enableGender
    };

    // 고급 그룹핑 매니저 생성 및 첫 번째 라운드 생성
    const manager = new AdvancedGroupingManager(config);
    const firstRoundGroups = manager.generateNextRound();
    
    // Set을 배열로 변환하여 직렬화 가능하게 만들기
    const serializablePeople = people.map(person => ({
      ...person,
      previousGroupNumbers: Array.from(person.previousGroupNumbers),
      groupHistory: person.groupHistory,
      lastGroupNumber: person.lastGroupNumber
    }));

    const serializableGroups = firstRoundGroups.map(group => ({
      ...group,
      members: group.members.map(member => ({
        ...member,
        previousGroupNumbers: Array.from(member.previousGroupNumbers),
        groupHistory: member.groupHistory
      }))
    }));

    // 상태를 세션스토리지에 저장
    sessionStorage.setItem('groupingData', JSON.stringify({
      people: serializablePeople,
      groupSizes,
      enableGroupNumberAvoidance,
      enableGenderBalancing: enableGenderBalancing && enableGender,
      currentGroups: serializableGroups,
      currentRound: manager.getCurrentRound(),
      totalMeetings: manager.getTotalMeetings(),
      previousMeetings: Array.from(manager.getPreviousMeetings()) // 만남 데이터 저장
    }));

    // 라운드 페이지로 이동
    router.push('/round');
  };

  const people = parseParticipantsWithGender(participantsText, enableGender);
  const groupSizes = groupingMode === 'uniform' 
    ? Array(Math.floor(people.length / uniformGroupSize)).fill(uniformGroupSize)
    : customGroupSizes.split(',').map(s => parseInt(s.trim())).filter(n => n > 0);
  const totalCapacity = groupSizes.reduce((sum, size) => sum + size, 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* 헤더 */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🎪 소셜링 자리 배치 프로그램
            </h1>
            <p className="text-gray-600">
              참가자들이 매 라운드마다 새로운 사람들과 만날 수 있도록 도와드립니다
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* 참가자 입력 */}
            <div>
              <label htmlFor="participants" className="block text-sm font-medium text-gray-700 mb-2">
                👥 참가자 {enableGender && '(이름(성별) 형태로 입력)'}:
              </label>
              <textarea
                id="participants"
                value={participantsText}
                onChange={(e) => setParticipantsText(e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm bg-blue-50 text-blue-900 font-medium"
                placeholder={enableGender ? "김철수(남)\n박영희(여)\n이민호(남)\n..." : "김철수\n박영희\n이민호\n..."}
              />
              <div className="mt-2 text-sm text-gray-500">
                총 {people.length}명
                {enableGender && (
                  <span className="ml-2">
                    (남 {people.filter(p => p.gender === '남').length}명, 
                     여 {people.filter(p => p.gender === '여').length}명,
                     미지정 {people.filter(p => !p.gender).length}명)
                  </span>
                )}
              </div>
            </div>

            {/* 성별 정보 활성화 */}
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={enableGender}
                  onChange={(e) => setEnableGender(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">성별 정보 입력 (성별 균형 기능 사용 시 필요)</span>
              </label>
            </div>

            {/* 그룹 설정 모드 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                📊 그룹 설정 방식:
              </label>
              <div className="space-y-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="radio"
                    value="uniform"
                    checked={groupingMode === 'uniform'}
                    onChange={(e) => setGroupingMode(e.target.value as 'uniform')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">모든 그룹 같은 크기</span>
                </label>
                
                {groupingMode === 'uniform' && (
                  <div className="ml-6">
                    <div className="flex items-center space-x-4">
                      <input
                        type="number"
                        value={uniformGroupSize}
                        onChange={(e) => setUniformGroupSize(parseInt(e.target.value) || 1)}
                        min="2"
                        max="20"
                        className="w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-blue-50 text-blue-900 font-medium text-center"
                      />
                      <span className="text-sm text-gray-600">명씩</span>
                      {people.length > 0 && (
                        <span className="text-sm text-gray-500">
                          → {Math.floor(people.length / uniformGroupSize)}개 그룹
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <label className="flex items-center space-x-3">
                  <input
                    type="radio"
                    value="custom"
                    checked={groupingMode === 'custom'}
                    onChange={(e) => setGroupingMode(e.target.value as 'custom')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">그룹별로 다른 크기</span>
                </label>
                
                {groupingMode === 'custom' && (
                  <div className="ml-6">
                    <input
                      type="text"
                      value={customGroupSizes}
                      onChange={(e) => setCustomGroupSizes(e.target.value)}
                      placeholder="예: 4,6,5,3"
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 font-medium"
                    />
                    <div className="mt-2 text-sm font-medium text-gray-700 bg-gray-100 px-3 py-2 rounded border">
                      <div className="font-semibold text-gray-800">쉼표로 구분하여 입력 (예: 4,6,5,3)</div>
                      {groupSizes.length > 0 && (
                        <div className="mt-1 text-blue-800 font-bold">
                          → {groupSizes.length}개 그룹 (총 {totalCapacity}명 수용)
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 고급 옵션 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                ⚙️ 고급 옵션:
              </label>
              <div className="space-y-3">
                <label className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={enableGroupNumberAvoidance}
                    onChange={(e) => setEnableGroupNumberAvoidance(e.target.checked)}
                    className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">직전 그룹 번호 회피</span>
                    <p className="text-xs text-gray-500">직전 라운드에서 그룹 1에 속했던 사람은 다음 라운드에서 그룹 1을 피합니다</p>
                  </div>
                </label>
                
                <label className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={enableGenderBalancing}
                    onChange={(e) => setEnableGenderBalancing(e.target.checked)}
                    disabled={!enableGender}
                    className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">성별 균형 고려</span>
                    <p className="text-xs text-gray-500">각 그룹의 성별 비율을 균형있게 배치합니다 (성별 정보 필요)</p>
                  </div>
                </label>
              </div>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">❌ {error}</p>
              </div>
            )}

            {/* 미리보기 정보 */}
            {people.length > 0 && groupSizes.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h3 className="text-sm font-medium text-blue-800 mb-2">📋 미리보기:</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• 총 참가자: {people.length}명</li>
                  <li>• 그룹 구성: {groupSizes.join(', ')}명</li>
                  <li>• 총 그룹 수: {groupSizes.length}개</li>
                  <li>• 수용 인원: {totalCapacity}명</li>
                  <li>• 예상 최대 라운드: 약 {Math.floor((people.length - 1) / (groupSizes.reduce((sum, size) => sum + size, 0) / groupSizes.length - 1))}라운드</li>
                  <li>• 그룹 번호 회피: {enableGroupNumberAvoidance ? '활성화' : '비활성화'}</li>
                  <li>• 성별 균형: {enableGenderBalancing && enableGender ? '활성화' : '비활성화'}</li>
                </ul>
              </div>
            )}

            {/* 시작 버튼 */}
            <div className="text-center">
              <button
                type="submit"
                disabled={people.length === 0 || groupSizes.length === 0 || totalCapacity > people.length}
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
