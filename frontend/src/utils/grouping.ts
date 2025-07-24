// 그룹핑 관련 타입 정의
export interface Person {
  name: string;
  id: string;
  gender?: string; // 성별 추가 (선택사항)
  previousGroupNumbers: Set<number>; // 이전에 속했던 그룹 번호들
  groupHistory: { [round: number]: number }; // 라운드별 그룹 히스토리 {라운드: 그룹번호}
  lastGroupNumber?: number; // 직전 라운드의 그룹 번호 (회피용)
}

export interface Group {
  id: number;
  members: Person[];
  maxSize: number; // 그룹별 최대 인원 설정
}

export interface GroupingState {
  people: Person[];
  groupSizes: number[]; // 각 그룹별 최대 인원 배열
  previousMeetings: Set<string>;
  rounds: Group[][];
  currentRound: number;
}

// 그룹핑 설정 인터페이스
export interface GroupingConfig {
  people: Person[];
  groupSizes?: number[]; // 각 그룹별 크기 지정
  defaultGroupSize?: number; // 모든 그룹 같은 크기일 때
  enableGroupNumberAvoidance?: boolean; // 그룹 번호 회피 기능 활성화
  genderBalancing?: boolean; // 성별 균형 고려
}

// 두 사람이 만난 적 있는지 확인하는 함수
function haveMet(person1: Person, person2: Person, previousMeetings: Set<string>): boolean {
  const key = [person1.id, person2.id].sort().join('-');
  return previousMeetings.has(key);
}

// 그룹의 점수 계산 (이전에 만난 쌍의 개수)
function calculateGroupScore(group: Person[], previousMeetings: Set<string>): number {
  let score = 0;
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      if (haveMet(group[i], group[j], previousMeetings)) {
        score++;
      }
    }
  }
  return score;
}

// 만남을 기록하는 함수
function addMeetings(groups: Group[], previousMeetings: Set<string>, currentRound: number) {
  for (const group of groups) {
    // 그룹 내 모든 만남 기록
    for (let i = 0; i < group.members.length; i++) {
      for (let j = i + 1; j < group.members.length; j++) {
        const key = [group.members[i].id, group.members[j].id].sort().join('-');
        previousMeetings.add(key);
      }
    }
    
    // 각 참가자에게 그룹 번호와 라운드 기록
    for (const person of group.members) {
      person.previousGroupNumbers.add(group.id);
      person.groupHistory[currentRound] = group.id;
      person.lastGroupNumber = group.id; // 직전 그룹 번호 업데이트
    }
  }
}

// 간단한 유전 알고리즘으로 최적 그룹 생성
export function generateOptimalGroups(
  people: Person[],
  groupSize: number,
  previousMeetings: Set<string>,
  maxIterations: number = 1000
): Group[] {
  const numGroups = Math.floor(people.length / groupSize);
  let bestGroups: Group[] = [];
  let bestScore = Infinity;

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // 사람들을 섞어서 그룹 생성
    const shuffledPeople = [...people].sort(() => Math.random() - 0.5);
    const groups: Group[] = [];

    for (let i = 0; i < numGroups; i++) {
      const startIdx = i * groupSize;
      const endIdx = startIdx + groupSize;
      groups.push({
        id: i + 1,
        members: shuffledPeople.slice(startIdx, endIdx),
        maxSize: groupSize // maxSize 프로퍼티 추가
      });
    }

    // 점수 계산
    let totalScore = 0;
    for (const group of groups) {
      totalScore += calculateGroupScore(group.members, previousMeetings);
    }

    if (totalScore < bestScore) {
      bestScore = totalScore;
      bestGroups = groups;
      
      // 완벽한 해답을 찾으면 조기 종료
      if (totalScore === 0) {
        break;
      }
    }
  }

  return bestGroups;
}

// 성별 균형 점수 계산 (낮을수록 좋음)
function calculateGenderBalanceScore(group: Person[]): number {
  const maleCount = group.filter(p => p.gender === '남').length;
  const femaleCount = group.filter(p => p.gender === '여').length;
  const groupSize = group.length;
  
  // 이상적인 비율에서 벗어난 정도
  const idealMale = Math.floor(groupSize / 2);
  const idealFemale = groupSize - idealMale;
  
  return Math.abs(maleCount - idealMale) + Math.abs(femaleCount - idealFemale);
}

// 직전 그룹 번호 재사용 페널티 계산 (낮을수록 좋음)
function calculateLastGroupNumberPenalty(groups: Group[]): number {
  let penalty = 0;
  
  for (const group of groups) {
    for (const person of group.members) {
      if (person.lastGroupNumber === group.id) {
        penalty += 1; // 직전 라운드와 같은 그룹 번호인 경우 페널티
      }
    }
  }
  
  return penalty;
}

// 성별 균형을 강력하게 보장하는 그룹 생성 함수
function generateGenderBalancedGroups(
  people: Person[],
  groupSizes: number[],
  previousMeetings: Set<string>,
  enableGroupNumberAvoidance: boolean
): Group[] {
  // 성별로 분리
  const males = [...people.filter(p => p.gender === '남')];
  const females = [...people.filter(p => p.gender === '여')];
  const others = [...people.filter(p => !p.gender || (p.gender !== '남' && p.gender !== '여'))];
  
  // 순서를 섞어서 다양성 확보
  males.sort(() => Math.random() - 0.5);
  females.sort(() => Math.random() - 0.5);
  others.sort(() => Math.random() - 0.5);
  
  const groups: Group[] = [];
  let maleIndex = 0;
  let femaleIndex = 0;
  let otherIndex = 0;
  
  // 각 그룹별로 강제 성별 균형 배치
  for (let i = 0; i < groupSizes.length; i++) {
    const groupSize = groupSizes[i];
    const groupMembers: Person[] = [];
    
    if (groupSize === 1) {
      // 1명 그룹: 남성, 여성, 기타 순서로 배치
      if (maleIndex < males.length) {
        groupMembers.push(males[maleIndex++]);
      } else if (femaleIndex < females.length) {
        groupMembers.push(females[femaleIndex++]);
      } else if (otherIndex < others.length) {
        groupMembers.push(others[otherIndex++]);
      }
    } else if (groupSize === 2) {
      // 2명 그룹: 반드시 남녀 1명씩 (가장 중요!)
      if (maleIndex < males.length && femaleIndex < females.length) {
        groupMembers.push(males[maleIndex++]);
        groupMembers.push(females[femaleIndex++]);
      } else {
        // 한쪽 성별이 부족하면 남은 사람들로 채우기
        while (groupMembers.length < 2) {
          if (maleIndex < males.length) {
            groupMembers.push(males[maleIndex++]);
          } else if (femaleIndex < females.length) {
            groupMembers.push(females[femaleIndex++]);
          } else if (otherIndex < others.length) {
            groupMembers.push(others[otherIndex++]);
          } else {
            break;
          }
        }
      }
    } else {
      // 3명 이상 그룹: 균등 배치
      const targetMales = Math.floor(groupSize / 2);
      const targetFemales = groupSize - targetMales;
      
      // 남성 배치
      for (let j = 0; j < targetMales && maleIndex < males.length; j++) {
        groupMembers.push(males[maleIndex++]);
      }
      
      // 여성 배치
      for (let j = 0; j < targetFemales && femaleIndex < females.length; j++) {
        groupMembers.push(females[femaleIndex++]);
      }
      
      // 부족한 인원 채우기
      while (groupMembers.length < groupSize) {
        if (maleIndex < males.length) {
          groupMembers.push(males[maleIndex++]);
        } else if (femaleIndex < females.length) {
          groupMembers.push(females[femaleIndex++]);
        } else if (otherIndex < others.length) {
          groupMembers.push(others[otherIndex++]);
        } else {
          break;
        }
      }
    }
    
    if (groupMembers.length > 0) {
      groups.push({
        id: i + 1,
        members: groupMembers,
        maxSize: groupSize
      });
    }
  }
  
  // 🔥 중요: 남은 사람들을 마지막 그룹에 추가
  const remainingPeople: Person[] = [];
  
  // 남은 사람들 수집
  while (maleIndex < males.length) {
    remainingPeople.push(males[maleIndex++]);
  }
  while (femaleIndex < females.length) {
    remainingPeople.push(females[femaleIndex++]);
  }
  while (otherIndex < others.length) {
    remainingPeople.push(others[otherIndex++]);
  }
  
  // 남은 사람들을 마지막 그룹에 추가
  if (remainingPeople.length > 0 && groups.length > 0) {
    const lastGroup = groups[groups.length - 1];
    lastGroup.members.push(...remainingPeople);
  } else if (remainingPeople.length > 0) {
    // 그룹이 없으면 새 그룹 생성
    groups.push({
      id: 1,
      members: remainingPeople,
      maxSize: remainingPeople.length
    });
  }
  
  return groups;
}

// 가변 그룹 크기를 지원하는 고급 그룹 생성 함수
export function generateAdvancedGroups(
  people: Person[],
  groupSizes: number[],
  previousMeetings: Set<string>,
  options: {
    enableGroupNumberAvoidance?: boolean;
    genderBalancing?: boolean;
    maxIterations?: number;
  } = {}
): Group[] {
  const { 
    enableGroupNumberAvoidance = true, 
    genderBalancing = false, 
    maxIterations = 1000 
  } = options;
  
  // 성별 균형이 활성화되어 있으면 랜덤 + 강력한 페널티 방식 사용
  if (genderBalancing) {
    let bestGroups: Group[] = [];
    let bestScore = Infinity;
    
    // 더 많은 반복으로 완벽한 성별 균형 추구
    for (let iteration = 0; iteration < Math.min(maxIterations, 500); iteration++) {
      // 완전 랜덤 배치
      const shuffledPeople = [...people].sort(() => Math.random() - 0.5);
      const groups: Group[] = [];
      let personIdx = 0;

      // 각 그룹의 크기에 맞춰 배치
      for (let i = 0; i < groupSizes.length; i++) {
        const groupSize = groupSizes[i];
        if (personIdx + groupSize <= shuffledPeople.length) {
          const groupMembers = shuffledPeople.slice(personIdx, personIdx + groupSize);
          groups.push({
            id: i + 1,
            members: groupMembers,
            maxSize: groupSize
          });
          personIdx += groupSize;
        } else {
          // 남은 인원이 그룹 크기보다 적으면 가능한 만큼만 배치
          const remainingPeople = shuffledPeople.slice(personIdx);
          if (remainingPeople.length > 0) {
            groups.push({
              id: i + 1,
              members: remainingPeople,
              maxSize: groupSize
            });
          }
          break;
        }
      }
      
      // 점수 계산
      let totalScore = 0;
      
      // 1. 이전 만남 페널티
      for (const group of groups) {
        totalScore += calculateGroupScore(group.members, previousMeetings);
      }
      
      // 2. 성별 균형 페널티 (극도로 높은 가중치)
      for (const group of groups) {
        const genderScore = calculateGenderBalanceScore(group.members);
        totalScore += genderScore * 1000; // 🔥 극도로 높은 가중치로 성별 불균형 완전 차단
      }
      
      // 3. 직전 그룹 번호 재사용 페널티
      if (enableGroupNumberAvoidance) {
        totalScore += calculateLastGroupNumberPenalty(groups) * 3;
      }
      
      if (totalScore < bestScore) {
        bestScore = totalScore;
        bestGroups = groups;
        
        // 성별 균형이 완벽하면 조기 종료
        const genderPenalty = groups.reduce((sum, group) => sum + calculateGenderBalanceScore(group.members), 0);
        if (genderPenalty === 0) {
          console.log(`✅ 완벽한 성별 균형 달성! (반복: ${iteration + 1})`);
          break;
        }
      }
      
      // 진행률 표시 (개발용)
      if (iteration % 100 === 0 && iteration > 0) {
        console.log(`성별 균형 최적화 중... ${iteration}/${Math.min(maxIterations, 500)} (현재 최고점수: ${bestScore})`);
      }
    }
    
    // 최종 결과 로깅
    const finalGenderPenalty = bestGroups.reduce((sum, group) => sum + calculateGenderBalanceScore(group.members), 0);
    console.log(`🎯 성별 균형 최적화 완료! 불균형 점수: ${finalGenderPenalty}`);
    
    return bestGroups;
  }
  
  // 기존 랜덤 방식 (성별 균형 비활성화 시)
  let bestGroups: Group[] = [];
  let bestScore = Infinity;
  
  // 총 배치 가능한 인원 확인
  const totalCapacity = groupSizes.reduce((sum, size) => sum + size, 0);
  if (totalCapacity > people.length) {
    console.warn(`총 그룹 정원(${totalCapacity})이 참가자 수(${people.length})보다 큽니다.`);
  }

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // 사람들을 섞어서 그룹 생성
    const shuffledPeople = [...people].sort(() => Math.random() - 0.5);
    const groups: Group[] = [];
    let personIdx = 0;

    // 각 그룹의 크기에 맞춰 배치
    for (let i = 0; i < groupSizes.length; i++) {
      const groupSize = groupSizes[i];
      if (personIdx + groupSize <= shuffledPeople.length) {
        const groupMembers = shuffledPeople.slice(personIdx, personIdx + groupSize);
        groups.push({
          id: i + 1,
          members: groupMembers,
          maxSize: groupSize
        });
        personIdx += groupSize;
      } else {
        // 남은 인원이 그룹 크기보다 적으면 가능한 만큼만 배치
        const remainingPeople = shuffledPeople.slice(personIdx);
        if (remainingPeople.length > 0) {
          groups.push({
            id: i + 1,
            members: remainingPeople,
            maxSize: groupSize
          });
        }
        break;
      }
    }

    // 점수 계산
    let totalScore = 0;
    
    // 1. 이전 만남 페널티
    for (const group of groups) {
      totalScore += calculateGroupScore(group.members, previousMeetings);
    }
    
    // 2. 직전 그룹 번호 재사용 페널티 (활성화된 경우)
    if (enableGroupNumberAvoidance) {
      totalScore += calculateLastGroupNumberPenalty(groups) * 3; // 가중치 3
    }

    if (totalScore < bestScore) {
      bestScore = totalScore;
      bestGroups = groups;
      
      // 완벽한 해답을 찾으면 조기 종료
      if (totalScore === 0) {
        break;
      }
    }
  }

  return bestGroups;
}

// 참가자 이름 문자열을 Person 객체 배열로 변환
export function parseParticipants(participantsText: string): Person[] {
  return participantsText
    .split('\n')
    .map(name => name.trim())
    .filter(name => name.length > 0)
    .map(name => ({
      name,
      id: name, // 간단히 이름을 ID로 사용
      previousGroupNumbers: new Set(), // 초기화
      groupHistory: {} // 초기화
    }));
}

// 고급 그룹핑 상태 관리 클래스
export class AdvancedGroupingManager {
  private state: GroupingState;
  private options: {
    enableGroupNumberAvoidance: boolean;
    genderBalancing: boolean;
    maxIterations: number;
  };

  constructor(config: GroupingConfig) {
    // 그룹 크기 배열 설정
    let groupSizes: number[];
    if (config.groupSizes) {
      groupSizes = config.groupSizes;
    } else if (config.defaultGroupSize) {
      const numGroups = Math.floor(config.people.length / config.defaultGroupSize);
      groupSizes = Array(numGroups).fill(config.defaultGroupSize);
    } else {
      // 기본값: 4명씩
      const defaultSize = 4;
      const numGroups = Math.floor(config.people.length / defaultSize);
      groupSizes = Array(numGroups).fill(defaultSize);
    }

    this.state = {
      people: config.people,
      groupSizes,
      previousMeetings: new Set(),
      rounds: [],
      currentRound: 0
    };

    this.options = {
      enableGroupNumberAvoidance: config.enableGroupNumberAvoidance ?? true,
      genderBalancing: config.genderBalancing ?? false,
      maxIterations: 1000
    };
  }

  // 새로운 라운드 생성 (고급 기능 포함)
  generateNextRound(): Group[] {
    this.state.currentRound++; // 라운드 번호를 먼저 증가
    
    const groups = generateAdvancedGroups(
      this.state.people,
      this.state.groupSizes,
      this.state.previousMeetings,
      this.options
    );

    // 만남 기록 (현재 라운드 번호 포함)
    addMeetings(groups, this.state.previousMeetings, this.state.currentRound);
    
    // 라운드 저장
    this.state.rounds.push(groups);

    return groups;
  }

  // 특정 참가자의 그룹 히스토리 조회
  getPersonHistory(personId: string): { [round: number]: number } | null {
    const person = this.state.people.find(p => p.id === personId);
    return person ? person.groupHistory : null;
  }

  // 참가자 검색
  searchParticipants(keyword: string): Person[] {
    return this.state.people.filter(p => 
      p.name.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  // 그룹 번호별 경험자 수 조회
  getGroupExperienceStats(): { [groupNumber: number]: number } {
    const stats: { [groupNumber: number]: number } = {};
    
    for (let i = 1; i <= this.state.groupSizes.length; i++) {
      stats[i] = this.state.people.filter(p => p.previousGroupNumbers.has(i)).length;
    }
    
    return stats;
  }

  // 참가자별 그룹 경험 통계
  getParticipantStats(): Array<{
    person: Person;
    experiencedGroups: number;
    totalGroups: number;
    completionRate: number;
  }> {
    const totalGroups = this.state.groupSizes.length;
    
    return this.state.people.map(person => ({
      person,
      experiencedGroups: person.previousGroupNumbers.size,
      totalGroups,
      completionRate: person.previousGroupNumbers.size / totalGroups
    }));
  }

  // 특정 참가자가 만난 사람들 목록 조회
  getPersonMeetings(personId: string): Person[] {
    const person = this.state.people.find(p => p.id === personId);
    if (!person) return [];

    const metPeople: Person[] = [];
    
    for (const otherPerson of this.state.people) {
      if (person.id === otherPerson.id) continue;
      
      const key = [person.id, otherPerson.id].sort().join('-');
      if (this.state.previousMeetings.has(key)) {
        metPeople.push(otherPerson);
      }
    }
    
    return metPeople;
  }

  // 전체 만남 현황 조회 (디버깅용)
  getPreviousMeetings(): Set<string> {
    return this.state.previousMeetings;
  }
  
  // 현재 라운드 번호
  getCurrentRound(): number {
    return this.state.currentRound;
  }

  // 전체 라운드 히스토리
  getAllRounds(): Group[][] {
    return this.state.rounds;
  }

  // 총 만남 수 통계
  getTotalMeetings(): number {
    return this.state.previousMeetings.size;
  }

  // 이론적 최대 라운드 수 계산
  getMaxPossibleRounds(): number {
    const totalPairs = this.state.people.length * (this.state.people.length - 1) / 2;
    const avgGroupSize = this.state.groupSizes.reduce((sum, size) => sum + size, 0) / this.state.groupSizes.length;
    const pairsPerRound = this.state.groupSizes.reduce((sum, size) => sum + size * (size - 1) / 2, 0);
    
    return Math.floor(totalPairs / pairsPerRound);
  }
}

// 기존 GroupingManager 클래스 (하위 호환성을 위해 유지)
export class GroupingManager extends AdvancedGroupingManager {
  constructor(people: Person[], groupSize: number) {
    super({
      people,
      defaultGroupSize: groupSize,
      enableGroupNumberAvoidance: false,
      genderBalancing: false
    });
  }
}

// 그룹 유효성 검사
export function validateGrouping(people: Person[], groupSize: number): string | null {
  if (people.length === 0) {
    return '참가자를 입력해주세요.';
  }
  
  if (groupSize < 2) {
    return '그룹 크기는 최소 2명 이상이어야 합니다.';
  }
  
  if (people.length < groupSize) {
    return '참가자 수가 그룹 크기보다 적습니다.';
  }
  
  if (people.length % groupSize !== 0) {
    return `참가자 수(${people.length}명)가 그룹 크기(${groupSize}명)로 나누어떨어지지 않습니다.`;
  }
  
  // 중복 이름 검사
  const names = people.map(p => p.name);
  const uniqueNames = new Set(names);
  if (names.length !== uniqueNames.size) {
    return '중복된 이름이 있습니다.';
  }
  
  return null;
}

// 개별 참가자의 만남 현황
export interface PersonMeetingRecord {
  person: Person;
  meetings: { [personId: string]: number };
  totalMeetings: number;
  duplicateMeetings: number; // 2번 이상 만난 사람 수
}

// 전체 만남 검증 결과
export interface ValidationResult {
  isValid: boolean;
  totalDuplicates: number;
  problemPairs: Array<{ person1: Person; person2: Person; meetCount: number }>;
  personRecords: PersonMeetingRecord[];
}

// 각 참가자별 만남 현황 분석
export function analyzePersonMeetings(people: Person[], previousMeetings: Set<string>): PersonMeetingRecord[] {
  const records: PersonMeetingRecord[] = [];

  for (const person of people) {
    const meetings: { [personId: string]: number } = {};
    let totalMeetings = 0;
    let duplicateMeetings = 0;

    // 이 사람과 만난 모든 사람들 체크
    for (const otherPerson of people) {
      if (person.id === otherPerson.id) continue;

      const key = [person.id, otherPerson.id].sort().join('-');
      const meetCount = previousMeetings.has(key) ? 1 : 0;
      
      // 실제로는 더 정교한 카운팅이 필요하지만, 현재 구조에서는 1번만 기록됨
      // 나중에 확장 가능하도록 구조는 유지
      if (meetCount > 0) {
        meetings[otherPerson.id] = meetCount;
        totalMeetings += meetCount;
        if (meetCount >= 2) {
          duplicateMeetings++;
        }
      }
    }

    records.push({
      person,
      meetings,
      totalMeetings,
      duplicateMeetings
    });
  }

  return records;
}

// 중복 만남 검증
export function validateMeetings(people: Person[], previousMeetings: Set<string>): ValidationResult {
  const personRecords = analyzePersonMeetings(people, previousMeetings);
  const problemPairs: Array<{ person1: Person; person2: Person; meetCount: number }> = [];
  
  // 2번 이상 만난 쌍 찾기 (현재 구조에서는 실제로는 발생하지 않지만, 확장성을 위해)
  let totalDuplicates = 0;
  
  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      const person1 = people[i];
      const person2 = people[j];
      const key = [person1.id, person2.id].sort().join('-');
      
      if (previousMeetings.has(key)) {
        // 현재는 1번만 카운트되지만, 향후 확장을 위한 구조
        const meetCount = 1; // 실제로는 더 정교한 카운팅 로직 필요
        
        if (meetCount >= 2) {
          problemPairs.push({ person1, person2, meetCount });
          totalDuplicates++;
        }
      }
    }
  }

  return {
    isValid: totalDuplicates === 0,
    totalDuplicates,
    problemPairs,
    personRecords
  };
}

// 각 사람이 만난 사람들의 목록을 가져오기
export function getPersonMeetingList(person: Person, people: Person[], previousMeetings: Set<string>): Person[] {
  const metPeople: Person[] = [];
  
  for (const otherPerson of people) {
    if (person.id === otherPerson.id) continue;
    
    const key = [person.id, otherPerson.id].sort().join('-');
    if (previousMeetings.has(key)) {
      metPeople.push(otherPerson);
    }
  }
  
  return metPeople;
} 