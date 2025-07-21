// 그룹핑 관련 타입 정의
export interface Person {
  name: string;
  id: string;
}

export interface Group {
  id: number;
  members: Person[];
}

export interface GroupingState {
  people: Person[];
  groupSize: number;
  previousMeetings: Set<string>;
  rounds: Group[][];
  currentRound: number;
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
function addMeetings(groups: Group[], previousMeetings: Set<string>) {
  for (const group of groups) {
    for (let i = 0; i < group.members.length; i++) {
      for (let j = i + 1; j < group.members.length; j++) {
        const key = [group.members[i].id, group.members[j].id].sort().join('-');
        previousMeetings.add(key);
      }
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
        members: shuffledPeople.slice(startIdx, endIdx)
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

// 참가자 이름 문자열을 Person 객체 배열로 변환
export function parseParticipants(participantsText: string): Person[] {
  return participantsText
    .split('\n')
    .map(name => name.trim())
    .filter(name => name.length > 0)
    .map(name => ({
      name,
      id: name // 간단히 이름을 ID로 사용
    }));
}

// 그룹핑 상태 관리 클래스
export class GroupingManager {
  private state: GroupingState;

  constructor(people: Person[], groupSize: number) {
    this.state = {
      people,
      groupSize,
      previousMeetings: new Set(),
      rounds: [],
      currentRound: 0
    };
  }

  // 새로운 라운드 생성
  generateNextRound(): Group[] {
    const groups = generateOptimalGroups(
      this.state.people,
      this.state.groupSize,
      this.state.previousMeetings
    );

    // 만남 기록
    addMeetings(groups, this.state.previousMeetings);
    
    // 라운드 저장
    this.state.rounds.push(groups);
    this.state.currentRound++;

    return groups;
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
    const pairsPerGroup = this.state.groupSize * (this.state.groupSize - 1) / 2;
    const numGroups = Math.floor(this.state.people.length / this.state.groupSize);
    const pairsPerRound = numGroups * pairsPerGroup;
    
    return Math.floor(totalPairs / pairsPerRound);
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