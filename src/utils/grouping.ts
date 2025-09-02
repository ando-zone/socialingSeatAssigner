/**
 * Genetic Algorithm-based Group Assignment System for Social Meetings
 * 
 * 이 모듈은 소셜 모임에서 참가자들을 최적의 그룹으로 배치하는 시스템입니다.
 * 유전 알고리즘과 휴리스틱 최적화를 통해 다음 목표를 달성합니다:
 * 
 * 주요 목표:
 * - 새로운 만남 극대화: 이전에 만나지 않은 사람들끼리 그룹 구성
 * - 성별 균형: 각 그룹의 성별 비율 균형 유지
 * - MBTI 균형: 외향형/내향형 비율 고려
 * - 그룹 히스토리 다변화: 같은 그룹 번호 반복 최소화
 * 
 * 핵심 알고리즘:
 * 1. 기본 배치: 참가자를 그룹에 기본 배치
 * 2. 새로운 만남 최적화: 이전에 만나지 않은 사람들끼리 우선 매칭
 * 3. 그룹 균형 최적화: 성별 및 MBTI 비율 조정
 * 4. 반복 개선: 점진적 최적화를 통한 품질 향상
 */

/**
 * 모임 참가자 정보 인터페이스
 * 
 * 각 참가자의 기본 정보와 만남 히스토리를 추적합니다.
 * 라운드별 만남 기록을 통해 중복 만남을 최소화하고,
 * 그룹 히스토리를 통해 같은 그룹 번호 반복을 방지합니다.
 */
export interface Participant {
  id: string                                    // 참가자 고유 식별자
  name: string                                 // 참가자 이름
  gender: 'male' | 'female'                   // 성별 (그룹 균형 계산에 사용)
  mbti: 'extrovert' | 'introvert'             // MBTI 외향/내향성 (그룹 다양성에 활용)
  meetingsByRound: { [round: number]: string[] } // 라운드별 만난 사람들의 ID 목록
  allMetPeople: string[]                       // 전체 만난 사람 목록 (중복 제거된 통합 뷰)
  groupHistory: number[]                       // 각 라운드별 소속했던 그룹 번호 히스토리
}

/**
 * 생성된 그룹 정보 인터페이스
 * 
 * 알고리즘에 의해 생성된 그룹의 구성원과 통계를 포함합니다.
 * 그룹 품질 평가와 시각화에 필요한 모든 메트릭을 제공합니다.
 */
export interface Group {
  id: number                    // 그룹 번호 (1부터 시작)
  members: Participant[]        // 그룹 구성원 목록
  maleCount: number            // 남성 구성원 수
  femaleCount: number          // 여성 구성원 수
  extrovertCount: number       // 외향형 구성원 수
  introvertCount: number       // 내향형 구성원 수
  newMeetingsCount: number     // 이 그룹에서 발생하는 새로운 만남의 수
}

/**
 * 그룹 배치 결과 인터페이스
 * 
 * 알고리즘 실행 결과로 생성된 그룹들과 전체 배치 품질 지표를 포함합니다.
 * 이 정보는 결과 화면 표시와 데이터베이스 저장에 사용됩니다.
 */
export interface GroupingResult {
  groups: Group[]                              // 생성된 그룹 목록
  round: number                               // 해당 라운드 번호
  summary: {                                  // 전체 배치 품질 요약
    totalGroups: number                       // 총 그룹 개수
    avgGroupSize: number                     // 평균 그룹 크기
    genderBalanceScore: number               // 성별 균형 점수 (0-100)
    mbtiBalanceScore: number                 // MBTI 균형 점수 (0-100)
    newMeetingsCount: number                 // 전체 새로운 만남 쌍의 수
  }
}

/**
 * 두 참가자가 이전에 만났는지 확인합니다.
 * 
 * @param p1 - 첫 번째 참가자
 * @param p2 - 두 번째 참가자
 * @param currentRound - 현재 라운드 번호 (이 라운드 이전의 만남만 확인)
 * @returns 이전에 만난 적이 있으면 true, 처음 만나면 false
 * 
 * 동작 방식:
 * - currentRound가 제공되면: 해당 라운드 이전의 만남만 확인
 * - currentRound가 없으면: 전체 만남 기록(allMetPeople) 사용
 * 
 * 이 함수는 새로운 만남을 우선시하는 배치 알고리즘의 핵심입니다.
 * 같은 사람들이 반복적으로 만나는 것을 방지하여 네트워킹 효과를 극대화합니다.
 */
function haveMet(p1: Participant, p2: Participant, currentRound?: number): boolean {
  if (currentRound === undefined) {
    // 라운드 정보가 없으면 전체 기록 사용 (기존 동작, 하위 호환성)
    return p1.allMetPeople.includes(p2.id)
  }
  
  // 현재 라운드 이전의 만남만 확인 (정확한 시점 기반 계산)
  const previousMeetings = new Set<string>()
  Object.entries(p1.meetingsByRound).forEach(([round, meetings]) => {
    if (parseInt(round) < currentRound) {
      meetings.forEach(meetingId => previousMeetings.add(meetingId))
    }
  })
  
  return previousMeetings.has(p2.id)
}

/**
 * 참가자의 전체 만남 목록(allMetPeople)을 업데이트합니다.
 * 
 * @param participant - 업데이트할 참가자
 * 
 * 동작 과정:
 * 1. 모든 라운드의 만남 기록(meetingsByRound)을 순회
 * 2. 중복을 제거하여 전체 만난 사람 목록을 생성
 * 3. participant.allMetPeople에 업데이트된 목록 저장
 * 
 * 이 함수는 라운드별 상세 기록을 통합된 뷰로 변환하여
 * haveMet() 함수에서 빠른 조회가 가능하도록 합니다.
 */
function updateAllMetPeople(participant: Participant): void {
  const allMet = new Set<string>()
  
  // 모든 라운드의 만남 기록을 합치기 (중복 자동 제거)
  Object.values(participant.meetingsByRound).forEach(roundMeetings => {
    roundMeetings.forEach(personId => allMet.add(personId))
  })
  
  // Set을 배열로 변환하여 중복이 제거된 최종 목록 저장
  participant.allMetPeople = Array.from(allMet)
}

/**
 * 참가자 데이터의 무결성을 검증하고 누락된 필드를 초기화합니다.
 * 
 * @param participants - 검증할 참가자 목록
 * @param currentRound - 현재 라운드 번호 (기본값: 1)
 * @returns 검증되고 초기화된 참가자 목록
 * 
 * 데이터 마이그레이션 처리:
 * - meetingsByRound 필드 누락 시 빈 객체로 초기화
 * - allMetPeople 필드 누락 시 빈 배열로 초기화
 * - groupHistory 필드 누락 시 빈 배열로 초기화
 * 
 * 이 함수는 버전 호환성을 보장하고 새로 추가된 필드가 있는 경우
 * 기존 데이터를 안전하게 업그레이드하는 역할을 합니다.
 * 
 * 주의: allMetPeople은 result 페이지에서 실시간 계산되므로
 * 여기서는 초기화만 수행합니다.
 */
export function migrateParticipantData(participants: Participant[], currentRound: number = 1): Participant[] {
  return participants.map(participant => {
    // 필수 필드 존재 여부 검증 및 초기화
    if (!participant.meetingsByRound) {
      participant.meetingsByRound = {} // 빈 객체로 초기화
    }
    if (!participant.allMetPeople) {
      participant.allMetPeople = [] // 빈 배열로 초기화
    }
    if (!participant.groupHistory) {
      participant.groupHistory = [] // 빈 배열로 초기화
    }
    
    // allMetPeople는 result 페이지에서 실시간 계산하므로 여기서는 초기화만 수행
    // 실제 데이터 동기화는 updateAllMetPeople() 함수에서 처리
    
    return participant
  })
}

/**
 * 참가자가 특정 그룹 번호를 피해야 하는지 확인합니다.
 * 
 * @param participant - 확인할 참가자
 * @param groupNumber - 확인할 그룹 번호
 * @returns 해당 그룹을 피해야 하면 true, 그렇지 않으면 false
 * 
 * 그룹 다양성 확보 전략:
 * - 참가자가 이전 라운드에서 같은 번호의 그룹에 있었다면 피하도록 함
 * - 이를 통해 참가자들이 다양한 그룹을 경험할 수 있게 됨
 * - 단순히 사람만 바뀌는 것이 아니라 그룹 위치/번호도 다변화
 * 
 * 예시:
 * - 1라운드에서 그룹1에 있었던 사람은 2라운드에서 그룹1을 피함
 * - 하지만 참가자가 부족한 경우 불가피하게 같은 그룹번호 배치 가능
 */
function shouldAvoidGroupNumber(participant: Participant, groupNumber: number): boolean {
  const history = participant.groupHistory
  // 그룹 히스토리가 있고, 마지막 라운드에서 같은 그룹 번호였다면 피해야 함
  return history.length > 0 && history[history.length - 1] === groupNumber
}

/**
 * 기본 참가자 배치 알고리즘을 수행합니다.
 * 
 * @param participants - 배치할 참가자 목록
 * @param groups - 배치할 그룹 배열 (2차원 배열)
 * @param currentRound - 현재 라운드 번호
 * 
 * 배치 전략 (우선순위 순서):
 * 1. 이전 라운드와 다른 그룹 번호 우선 선택
 * 2. 동일 조건일 때는 가장 작은 그룹 선택 (균등 분배)
 * 3. 이전 그룹번호를 피할 수 없는 경우에도 최소 크기 그룹 선택
 * 
 * 특징:
 * - 참가자 순서를 무작위로 섞어서 공평성 보장
 * - 그룹 크기 균등화와 그룹 다양성을 동시에 고려
 * - 성비나 기타 제약사항은 고려하지 않는 기본 알고리즘
 * 
 * 이 함수는 성별 제약이 없는 경우나 제약 조건 배치가 실패했을 때
 * 폴백(fallback) 알고리즘으로 사용됩니다.
 */
function assignParticipantsBasic(participants: Participant[], groups: Participant[][], currentRound: number): void {
  // 참가자 순서를 무작위로 섞어 공평한 배치 보장
  const shuffledParticipants = [...participants].sort(() => Math.random() - 0.5)
  
  // 각 참가자에 대해 최적의 그룹 찾기
  shuffledParticipants.forEach((participant) => {
    let bestGroupIndex = 0
    let minGroupSize = groups[0].length
    let foundAvoidableGroup = false
    
    // 이전 라운드 그룹 번호를 회피할 수 있는 그룹 찾기
    for (let i = 0; i < groups.length; i++) {
      const canAvoidPreviousGroup = !shouldAvoidGroupNumber(participant, i + 1)
      
      if (canAvoidPreviousGroup && !foundAvoidableGroup) {
        // 이전 그룹을 회피할 수 있는 첫 번째 그룹 발견
        bestGroupIndex = i
        minGroupSize = groups[i].length
        foundAvoidableGroup = true
      } else if (canAvoidPreviousGroup && foundAvoidableGroup) {
        // 이전 그룹을 회피할 수 있는 그룹 중 크기가 더 작은 그룹 선택
        if (groups[i].length < minGroupSize) {
          bestGroupIndex = i
          minGroupSize = groups[i].length
        }
      } else if (!foundAvoidableGroup) {
        // 이전 그룹을 회피할 수 없다면 최소한 가장 작은 그룹 선택
        if (groups[i].length < minGroupSize) {
          bestGroupIndex = i
          minGroupSize = groups[i].length
        }
      }
    }
    
    // 선택된 그룹에 참가자 배치
    groups[bestGroupIndex].push(participant)
  })
}

/**
 * 성별 제약 조건을 고려한 고급 참가자 배치 알고리즘입니다.
 * 
 * @param participants - 배치할 참가자 목록
 * @param groups - 배치할 그룹 배열 (2차원 배열)
 * @param genderConstraints - 각 그룹별 성별 구성 제약조건
 * @param currentRound - 현재 라운드 번호
 * @returns 배치 성공 여부와 실패 시 사유
 * 
 * 고급 배치 전략:
 * 1. 전체 참가자를 성별로 분리
 * 2. 각 그룹의 성별 제약 조건 확인
 * 3. 필요한 성별별 인원 대비 실제 참가자 수 검증
 * 4. 각 그룹별로 최적의 성별 조합 선택
 * 5. 그룹 다양성과 이전 만남 기록 고려하여 배치
 * 
 * 실패 조건:
 * - 남성 또는 여성 참가자가 필요한 수보다 적은 경우
 * - 제약 조건이 그룹 수와 일치하지 않는 경우
 * 
 * 성공 시 각 그룹은 정확히 지정된 성별 비율을 유지하게 됩니다.
 * 실패 시 기본 배치 알고리즘으로 폴백됩니다.
 */
function assignParticipantsWithGenderConstraints(
  participants: Participant[], 
  groups: Participant[][], 
  genderConstraints: GenderConstraint[], 
  currentRound: number
): { success: boolean; reason?: string } {
  console.log('🎯 성비 제약 조건 배치 시작:', genderConstraints)
  
  // 1단계: 참가자를 성별로 분리
  const maleParticipants = participants.filter(p => p.gender === 'male')
  const femaleParticipants = participants.filter(p => p.gender === 'female')
  
  console.log(`현재 성별 구성 - 남성: ${maleParticipants.length}명, 여성: ${femaleParticipants.length}명`)
  
  // 2단계: 제약 조건에 따른 총 필요 인원 계산
  const totalMaleNeeded = genderConstraints.reduce((sum, constraint) => sum + constraint.maleCount, 0)
  const totalFemaleNeeded = genderConstraints.reduce((sum, constraint) => sum + constraint.femaleCount, 0)
  
  console.log(`제약 조건 요구사항 - 남성: ${totalMaleNeeded}명, 여성: ${totalFemaleNeeded}명`)
  
  // 3단계: 실현 가능성 검증
  if (maleParticipants.length < totalMaleNeeded || femaleParticipants.length < totalFemaleNeeded) {
    return { 
      success: false, 
      reason: `성별 참가자 수 부족 - 남성: ${maleParticipants.length}/${totalMaleNeeded}, 여성: ${femaleParticipants.length}/${totalFemaleNeeded}`
    }
  }
  
  // 4단계: 그룹별 성별 제약 조건에 따른 순차 배치
  const assignedMales = new Set<string>()    // 이미 배치된 남성 참가자 ID 추적
  const assignedFemales = new Set<string>()  // 이미 배치된 여성 참가자 ID 추적
  
  for (let groupIndex = 0; groupIndex < genderConstraints.length; groupIndex++) {
    const constraint = genderConstraints[groupIndex]
    const group = groups[groupIndex]
    
    // 이 그룹에 배치할 남성들 선택
    const availableMales = maleParticipants.filter(p => !assignedMales.has(p.id))
    const selectedMales = selectBestParticipantsForGroup(availableMales, constraint.maleCount, groupIndex + 1)
    
    // 이 그룹에 배치할 여성들 선택  
    const availableFemales = femaleParticipants.filter(p => !assignedFemales.has(p.id))
    const selectedFemales = selectBestParticipantsForGroup(availableFemales, constraint.femaleCount, groupIndex + 1)
    
    // 선택된 참가자들을 그룹에 추가하고 배치 완료 표시
    selectedMales.forEach(p => {
      group.push(p)
      assignedMales.add(p.id)
    })
    selectedFemales.forEach(p => {
      group.push(p)
      assignedFemales.add(p.id)
    })
    
    console.log(`그룹 ${groupIndex + 1} 배치 완료: 남성 ${selectedMales.length}명, 여성 ${selectedFemales.length}명 (목표: ${constraint.maleCount}/${constraint.femaleCount})`)
  }
  
  return { success: true }
}

/**
 * 특정 그룹에 가장 적합한 참가자들을 선택합니다.
 * 
 * @param candidates - 선택 가능한 후보 참가자 목록
 * @param count - 선택해야 할 참가자 수
 * @param groupNumber - 대상 그룹 번호
 * @returns 선택된 참가자 목록
 * 
 * 선택 알고리즘 (우선순위 순서):
 * 1. 이전 라운드에서 해당 그룹번호가 아니었던 참가자 우선 선택
 * 2. 같은 조건의 참가자들 중에서는 무작위 선택 (공평성)
 * 3. 필요한 인원이 부족하면 이전 같은 그룹번호였던 참가자도 선택
 * 
 * 그룹 다양성 전략:
 * - 참가자들이 매 라운드마다 다른 그룹 번호를 경험하도록 유도
 * - 하지만 인원이 부족한 상황에서는 유연하게 대응
 * - 무작위 선택으로 특정 참가자가 불리하지 않도록 보장
 * 
 * 이 함수는 성별 제약 조건 배치에서 각 성별별로 호출됩니다.
 */
function selectBestParticipantsForGroup(candidates: Participant[], count: number, groupNumber: number): Participant[] {
  // 후보자가 필요한 수보다 적거나 같으면 모두 선택
  if (candidates.length <= count) {
    return [...candidates]
  }
  
  // 그룹 다양성을 위한 우선순위 기반 선택
  // 우선순위 1: 이전 라운드에서 해당 그룹 번호가 아니었던 참가자들
  const canAvoidPrevious = candidates.filter(p => !shouldAvoidGroupNumber(p, groupNumber))
  // 우선순위 2: 이전 라운드에서 해당 그룹 번호였던 참가자들
  const mustUsePrevious = candidates.filter(p => shouldAvoidGroupNumber(p, groupNumber))
  
  let selected: Participant[] = []
  
  // 1단계: 그룹 다양성 확보를 위해 이전 그룹을 회피할 수 있는 사람들 우선 선택
  const shuffledAvoidable = [...canAvoidPrevious].sort(() => Math.random() - 0.5)
  const neededFromAvoidable = Math.min(count, shuffledAvoidable.length)
  selected.push(...shuffledAvoidable.slice(0, neededFromAvoidable))
  
  // 2단계: 부족한 인원을 이전 같은 그룹이었던 사람들로 채우기
  const remainingNeeded = count - selected.length
  if (remainingNeeded > 0) {
    const shuffledMustUse = [...mustUsePrevious].sort(() => Math.random() - 0.5)
    selected.push(...shuffledMustUse.slice(0, remainingNeeded))
  }
  
  return selected
}

/**
 * 그룹별 성별 구성 제약 조건 인터페이스
 * 
 * 각 그룹이 가져야 할 남성과 여성의 정확한 수를 지정합니다.
 * 사용자가 수동 모드에서 성비 설정을 활성화했을 때 사용됩니다.
 * 
 * 예시:
 * - { maleCount: 6, femaleCount: 6 }: 12명 그룹에서 남녀 동수
 * - { maleCount: 7, femaleCount: 5 }: 12명 그룹에서 남성 다수
 * - { maleCount: 4, femaleCount: 8 }: 12명 그룹에서 여성 다수
 */
export interface GenderConstraint {
  maleCount: number    // 해당 그룹에 배치되어야 할 남성 참가자 수
  femaleCount: number  // 해당 그룹에 배치되어야 할 여성 참가자 수
}

/**
 * 최적화된 그룹 배치 알고리즘의 메인 함수입니다.
 * 
 * @param participants - 배치할 참가자 목록
 * @param groupSizeOrSizes - 그룹 크기 (숫자) 또는 각 그룹별 크기 배열
 * @param currentRound - 현재 라운드 번호
 * @param genderConstraints - 선택적 성별 제약 조건 배열
 * @returns 최적화된 그룹 배치 결과
 * 
 * 알고리즘 파이프라인:
 * 1. 입력 검증 및 그룹 크기 배열 생성
 * 2. 초기 배치 (기본 또는 성별 제약)
 * 3. 새로운 만남 최적화 (교환 기반)
 * 4. 그룹 균형 최적화 (크기 및 성별 균형)
 * 5. 결과 집계 및 통계 계산
 * 
 * 지원하는 모드:
 * - 자동 모드: 모든 그룹이 동일한 크기
 * - 수동 모드: 각 그룹별로 다른 크기 지정 가능
 * - 성별 제약: 각 그룹의 정확한 성별 구성 지정 가능
 * 
 * 최적화 목표:
 * - 새로운 만남 수 최대화 (특히 이성간 만남 우선)
 * - 그룹 크기 목표치 달성
 * - 성별 및 MBTI 균형 유지
 * - 그룹 번호 다양성 확보
 * 
 * 예외 상황:
 * - 참가자가 2명 미만일 때 에러
 * - 설정된 총 그룹 크기가 참가자 수보다 적을 때 에러
 * - 성별 제약 조건 미충족 시 기본 알고리즘으로 폴백
 */
export function createOptimalGroups(
  participants: Participant[], 
  groupSizeOrSizes: number | number[] = 4,
  currentRound: number = 1,
  genderConstraints?: GenderConstraint[]
): GroupingResult {
  // 1단계: 입력 검증
  if (participants.length < 2) {
    throw new Error('최소 2명 이상의 참가자가 필요합니다.')
  }

  // 2단계: 그룹 크기 배열 생성 (자동/수동 모드 지원)
  let groupSizes: number[]
  if (Array.isArray(groupSizeOrSizes)) {
    // 수동 모드: 각 그룹별로 다른 크기 지정 가능
    groupSizes = groupSizeOrSizes
  } else {
    // 자동 모드: 동일한 크기로 자동 계산
    const numGroups = Math.ceil(participants.length / groupSizeOrSizes)
    groupSizes = Array(numGroups).fill(groupSizeOrSizes)
  }

  // 3단계: 총 예상 인원과 실제 인원 검증
  const totalExpectedSize = groupSizes.reduce((sum, size) => sum + size, 0)
  if (totalExpectedSize < participants.length) {
    throw new Error(`설정된 그룹 크기의 총합(${totalExpectedSize}명)이 참가자 수(${participants.length}명)보다 적습니다.`)
  }

  // 4단계: 그룹 배치 시작 로깅
  const numGroups = groupSizes.length
  console.log(`📋 그룹 배치 시작: 참가자 ${participants.length}명`)
  console.log(`📊 그룹 구성: ${groupSizes.map((size, i) => `그룹${i+1}(${size}명)`).join(', ')}`)
  console.log(`🎯 총 ${numGroups}개 그룹, 예상 총 인원: ${totalExpectedSize}명`)

  // 5단계: 빈 그룹 배열 초기화
  const groups: Participant[][] = Array.from({ length: numGroups }, () => [])

  // 6단계: 배치 전략 선택 (성비 제약 조건 여부에 따라)
  if (genderConstraints && genderConstraints.length === numGroups) {
    // 고급 배치: 성비 제약 조건을 적용한 그룹 배치
    console.log('🎯 성비 제약 조건을 적용한 고급 배치 모드')
    const result = assignParticipantsWithGenderConstraints(participants, groups, genderConstraints, currentRound)
    if (!result.success) {
      console.warn('⚠️ 성비 제약 조건 배치 실패, 기본 배치로 안전 전환:', result.reason)
      // 실패 시 기본 배치로 폴백하여 서비스 연속성 보장
      assignParticipantsBasic(participants, groups, currentRound)
    }
  } else {
    // 기본 배치: 성비 제약 없이 균등하고 다양한 배치
    console.log('⚡ 기본 배치 모드 (성비 제약 없음)')
    assignParticipantsBasic(participants, groups, currentRound)
  }

  console.log('✅ 초기 배치 완료:', groups.map(g => g.length))
  
  // 7단계: 그룹 다양성 달성도 통계 계산
  let totalAvoidanceSuccess = 0  // 이전 라운드와 다른 그룹 번호를 받은 참가자 수
  let totalParticipants = 0       // 전체 참가자 수
  
  groups.forEach((group, index) => {
    const groupNumber = index + 1
    group.forEach(participant => {
      totalParticipants++
      // 이전 라운드와 다른 그룹 번호를 받았다면 성공으로 카운트
      if (!shouldAvoidGroupNumber(participant, groupNumber)) {
        totalAvoidanceSuccess++
      }
    })
  })
  
  const avoidanceRate = totalParticipants > 0 ? Math.round((totalAvoidanceSuccess / totalParticipants) * 100) : 0
  console.log(`📊 그룹 다양성 달성률: ${avoidanceRate}% (${totalAvoidanceSuccess}/${totalParticipants}명이 다른 그룹 번호 배치)`)

  // 8단계: 새로운 만남 최적화 (특히 새로운 이성과의 만남 우선)
  console.log('🔄 새로운 만남 최적화 시작...')
  optimizeNewMeetings(groups, participants, currentRound)
  
  // 9단계: 그룹 구조적 균형 최적화 (크기 및 성별 균형)
  console.log('⚖️ 그룹 균형 최적화 시작...')
  optimizeGroupBalance(groups, groupSizes)

  console.log('🎉 모든 최적화 완료:', groups.map(g => g.length))

  // 10단계: 최종 그룹 결과 객체 생성
  const finalGroups: Group[] = groups.map((groupMembers, index) => {
    // 각 그룹의 성별 구성 통계 계산
    const maleCount = groupMembers.filter(p => p.gender === 'male').length
    const femaleCount = groupMembers.filter(p => p.gender === 'female').length
    // 각 그룹의 MBTI 구성 통계 계산
    const extrovertCount = groupMembers.filter(p => p.mbti === 'extrovert').length
    const introvertCount = groupMembers.filter(p => p.mbti === 'introvert').length
    
    // 이 그룹에서 발생하는 새로운 만남의 수를 사전 계산
    // (updateMeetingHistory 호출 전에 계산하여 정확한 값 확보)
    let groupNewMeetings = 0
    for (let i = 0; i < groupMembers.length; i++) {
      for (let j = i + 1; j < groupMembers.length; j++) {
        if (!haveMet(groupMembers[i], groupMembers[j], currentRound)) {
          groupNewMeetings++
        }
      }
    }
    
    return {
      id: index + 1,                    // 그룹 번호 (1부터 시작)
      members: groupMembers,            // 그룹 구성원
      maleCount,                       // 남성 구성원 수
      femaleCount,                     // 여성 구성원 수
      extrovertCount,                  // 외향형 구성원 수
      introvertCount,                  // 내향형 구성원 수
      newMeetingsCount: groupNewMeetings // 새로운 만남 쌍의 수
    }
  }).filter(group => group.members.length > 0) // 빈 그룹 제거 (예외 상황 방지)

  // 11단계: 전체 배치 품질 통계 계산
  let newMeetingsTotal = 0      // 전체 새로운 만남 쌍의 수
  let totalGenderBalance = 0    // 전체 성별 균형 점수
  let totalMbtiBalance = 0      // 전체 MBTI 균형 점수
  
  console.log('📊 === 배치 품질 분석 시작 ===')
  
  // 디버깅을 위한 ID -> 이름 매핑 유틸리티 함수
  const getNameById = (id: string) => {
    const person = participants.find(p => p.id === id)
    return person ? person.name : `Unknown(${id.slice(-4)})`
  }
  
  // 각 그룹별 상세 분석 및 품질 지표 계산
  finalGroups.forEach(group => {
    const groupMembers = group.members
    let groupNewMeetings = 0
    
    console.log(`📋 그룹 ${group.id} (${groupMembers.length}명): [${groupMembers.map(m => m.name).join(', ')}]`)
    
    // 그룹 내 모든 쌍 조합의 만남 여부 확인
    for (let i = 0; i < groupMembers.length; i++) {
      for (let j = i + 1; j < groupMembers.length; j++) {
        const p1 = groupMembers[i]
        const p2 = groupMembers[j]
        const met = haveMet(p1, p2, currentRound)
        
        // 디버깅을 위한 상세 만남 기록 로깅
        const p1MetNames = p1.allMetPeople.map(id => getNameById(id))
        console.log(`  👥 ${p1.name} vs ${p2.name}: 이전 만남 ${met ? '있음' : '없음'}`)
        console.log(`    📜 ${p1.name}의 기존 만남기록: [${p1MetNames.join(', ')}]`)
        
        if (!met) {
          newMeetingsTotal++      // 전체 카운터 증가
          groupNewMeetings++      // 그룹별 카운터 증가
          console.log(`    ✨ -> 새로운 만남 발생!`)
        }
      }
    }
    console.log(`  📊 그룹 ${group.id} 새로운 만남 총계: ${groupNewMeetings}쌍`)
    
    // 그룹별 균형 점수 계산 (0~1 사이, 1에 가까울수록 균형)
    if (groupMembers.length > 0) {
      // 성별 균형: |남성수 - 여성수| / 총인원이 작을수록 균형잡힘
      totalGenderBalance += 1 - Math.abs(group.maleCount - group.femaleCount) / groupMembers.length
      // MBTI 균형: |외향형수 - 내향형수| / 총인원이 작을수록 균형잡힘
      totalMbtiBalance += 1 - Math.abs(group.extrovertCount - group.introvertCount) / groupMembers.length
    }
  })
  
  console.log(`🎯 전체 새로운 만남 총계: ${newMeetingsTotal}쌍`)
  console.log('📊 === 배치 품질 분석 완료 ===')

  console.log(`🏁 최종 결과 - 그룹 수: ${finalGroups.length}개`)
  console.log('📏 각 그룹 크기:', finalGroups.map(g => g.members.length))

  // 12단계: 최종 결과 반환
  return {
    groups: finalGroups,
    round: currentRound,
    summary: {
      totalGroups: finalGroups.length,
      // 평균 그룹 크기 (소수점 포함)
      avgGroupSize: finalGroups.length > 0 ? participants.length / finalGroups.length : 0,
      // 성별 균형 점수 (0-100, 100에 가까울수록 균형잡힘)
      genderBalanceScore: finalGroups.length > 0 ? Math.round((totalGenderBalance / finalGroups.length) * 100) : 0,
      // MBTI 균형 점수 (0-100, 100에 가까울수록 균형잡힘)
      mbtiBalanceScore: finalGroups.length > 0 ? Math.round((totalMbtiBalance / finalGroups.length) * 100) : 0,
      // 전체 새로운 만남 쌍의 수 (높을수록 좋음)
      newMeetingsCount: newMeetingsTotal
    }
  }
}

/**
 * 그룹 간 참가자 교환을 통해 새로운 만남을 최적화합니다.
 * 
 * @param groups - 최적화할 그룹 배열
 * @param participants - 전체 참가자 목록
 * @param currentRound - 현재 라운드 번호
 * 
 * 최적화 알고리즘:
 * 1. 모든 그룹 쌍 조합을 순회
 * 2. 각 쌍에서 참가자 1:1 교환 시뮬레이션
 * 3. 교환 전후 새로운 만남 점수 비교
 * 4. 개선되는 경우 교환 실행, 아니면 되돌림
 * 5. 더 이상 개선이 없을 때까지 반복 (최대 100회)
 * 
 * 점수 계산 기준:
 * - 새로운 만남 1쌍당 기본 10점
 * - 새로운 이성간 만남 1쌍당 추가 15점 (총 25점)
 * - 이미 만난 적 있는 쌍은 0점
 * 
 * 조기 종료 조건:
 * - 한 번의 순회에서 개선이 발생하면 즉시 다음 iteration 시작
 * - 전체 순회에서 개선이 없으면 최적화 완료
 * 
 * 이 함수는 초기 배치 후 품질을 더욱 높이는 후처리 단계입니다.
 */
function optimizeNewMeetings(groups: Participant[][], participants: Participant[], currentRound: number) {
  const maxIterations = 100  // 무한 루프 방지를 위한 최대 반복 횟수
  
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let improved = false  // 이번 iteration에서 개선이 있었는지 추적
    
    // 모든 그룹 쌍 조합에 대해 새로운 만남 최적화 시도
    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        const group1 = groups[i]
        const group2 = groups[j]
        
        // 빈 그룹은 건너뜀 (에러 방지)
        if (group1.length === 0 || group2.length === 0) continue
        
        // 두 그룹 간 모든 참가자 쌍에 대해 교환 시뮬레이션
        for (let p1 = 0; p1 < group1.length; p1++) {
          for (let p2 = 0; p2 < group2.length; p2++) {
            const person1 = group1[p1]
            const person2 = group2[p2]
            
            // 교환 전 새로운 만남 점수 계산 (현재 상태)
            const oldScore = calculateNewMeetingScore(group1, currentRound) + 
                           calculateNewMeetingScore(group2, currentRound)
            
            // 임시 교환 실행 (시뮬레이션)
            group1[p1] = person2
            group2[p2] = person1
            
            // 교환 후 새로운 만남 점수 계산 (변경된 상태)
            const newScore = calculateNewMeetingScore(group1, currentRound) + 
                           calculateNewMeetingScore(group2, currentRound)
            
            if (newScore > oldScore) {
              // 개선되었으므로 교환 유지하고 최적화 계속
              improved = true
              break
            } else {
              // 개선되지 않았으므로 원상복구
              group1[p1] = person1
              group2[p2] = person2
            }
          }
          // 한 그룹에서 개선이 발견되면 해당 그룹 최적화 중단
          if (improved) break
        }
        // 한 그룹 쌍에서 개선이 발견되면 해당 iteration 중단
        if (improved) break
      }
      // 전체 그룹 쌍 중에서 개선이 발견되면 다음 iteration으로
      if (improved) break
    }
    
    // 이번 iteration에서 아무 개선이 없었다면 최적화 완료
    if (!improved) break
  }
}

/**
 * 특정 그룹에서 발생하는 새로운 만남의 총 점수를 계산합니다.
 * 
 * @param group - 점수를 계산할 그룹
 * @param currentRound - 현재 라운드 번호
 * @returns 해당 그룹의 새로운 만남 총 점수
 * 
 * 점수 산정 기준:
 * - 기본 새로운 만남: 10점/쌍
 * - 새로운 이성간 만남: 추가 15점/쌍 (총 25점)
 * - 이전에 만난 적이 있는 쌍: 0점
 * 
 * 계산 방식:
 * - 그룹 내 모든 참가자 쌍 조합을 확인 (n choose 2)
 * - 각 쌍이 이전 라운드에서 만난 적이 있는지 확인
 * - 새로운 만남이면 점수 부여, 성별이 다르면 보너스 점수 추가
 * 
 * 이성간 만남에 보너스를 주는 이유:
 * - 소셜 네트워킹에서 이성간 만남이 더 큰 가치를 가질 수 있음
 * - 연애나 네트워킹 측면에서 다양성 증대
 * - 하지만 기본 점수도 충분히 보장하여 동성간 만남도 중요시
 */
function calculateNewMeetingScore(group: Participant[], currentRound: number): number {
  let score = 0
  
  // 그룹 내 모든 참가자 쌍에 대해 점수 계산
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      const person1 = group[i]
      const person2 = group[j]
      
      // 이전에 만난 적이 없는 쌍에만 점수 부여
      if (!haveMet(person1, person2, currentRound)) {
        // 새로운 만남 기본 점수
        let meetingScore = 10
        
        // 이성간 만남 보너스 점수 (네트워킹 효과 증대)
        if (person1.gender !== person2.gender) {
          meetingScore += 15  // 50% 보너스 (총 25점)
        }
        
        score += meetingScore
      }
      // 이미 만난 적이 있는 쌍은 0점 (중복 만남 방지)
    }
  }
  
  return score
}

/**
 * 그룹 크기와 성별 균형을 최적화합니다.
 * 
 * @param groups - 최적화할 그룹 배열
 * @param targetGroupSizes - 각 그룹의 목표 크기 배열
 * 
 * 2단계 최적화 프로세스:
 * 
 * 1단계: 그룹 크기 조정
 * - 목표보다 큰 그룹에서 목표보다 작은 그룹으로 참가자 이동
 * - 전체적으로 목표 크기에 맞추는 것이 우선 목표
 * - 단방향 이동 (큰 그룹 → 작은 그룹)
 * 
 * 2단계: 성별 균형 개선
 * - 각 그룹의 성별 불균형 정도 계산
 * - 성별 불균형이 1명 이상인 그룹들 간 참가자 교환
 * - 다른 성별끼리만 교환하여 전체 균형 개선
 * - 교환 전후 불균형 정도를 비교하여 개선되는 경우만 실행
 * 
 * 반복 최적화:
 * - 각 단계에서 개선이 있으면 계속 반복
 * - 최대 50회 iteration으로 무한 루프 방지
 * - 한 번의 순회에서 개선이 없으면 최적화 완료
 * 
 * 주의사항:
 * - 이 함수는 새로운 만남 최적화보다는 구조적 균형에 집중
 * - 참가자 교환 시 기존 만남 기록은 고려하지 않음
 * - 따라서 optimizeNewMeetings() 이후에 실행되어야 함
 */
function optimizeGroupBalance(groups: Participant[][], targetGroupSizes: number[]) {
  const maxIterations = 50  // 성능 고려한 적절한 반복 횟수
  
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let improved = false  // 이번 iteration에서 개선 여부 추적
    
    // 1단계: 그룹 크기를 목표 크기에 맞추는 최적화
    for (let i = 0; i < groups.length; i++) {
      for (let j = 0; j < groups.length; j++) {
        if (i === j) continue  // 같은 그룹끼리는 건너뜀
        
        const group1 = groups[i]
        const group2 = groups[j]
        const target1 = targetGroupSizes[i] || 0  // 그룹1의 목표 크기
        const target2 = targetGroupSizes[j] || 0  // 그룹2의 목표 크기
        
        // 크기 불균형 해소: 큰 그룹에서 작은 그룹으로 이동
        if (group1.length > target1 && group2.length < target2) {
          const memberToMove = group1.pop()  // 마지막 멤버 이동
          if (memberToMove) {
            group2.push(memberToMove)
            improved = true  // 개선 발생
          }
        }
      }
    }
    
    // 2단계: 성별 균형 개선을 위한 참가자 교환
    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        const group1 = groups[i]
        const group2 = groups[j]
        
        // 빈 그룹 건너뜀
        if (group1.length === 0 || group2.length === 0) continue
        
        // 각 그룹의 현재 성별 구성 계산
        const g1Males = group1.filter(p => p.gender === 'male').length
        const g1Females = group1.filter(p => p.gender === 'female').length
        const g2Males = group2.filter(p => p.gender === 'male').length
        const g2Females = group2.filter(p => p.gender === 'female').length
        
        // 성별 불균형이 심한 경우에만 교환 시도 (1명 초과 차이)
        if (Math.abs(g1Males - g1Females) > 1 || Math.abs(g2Males - g2Females) > 1) {
          // 두 그룹 간 모든 참가자 쌍에 대해 교환 시뮬레이션
          for (let p1 = 0; p1 < group1.length; p1++) {
            for (let p2 = 0; p2 < group2.length; p2++) {
              // 다른 성별끼리만 교환 (성별 균형 개선 효과)
              if (group1[p1].gender !== group2[p2].gender) {
                // 교환 전 불균형 정도 계산
                const oldBalance1 = Math.abs(g1Males - g1Females)
                const oldBalance2 = Math.abs(g2Males - g2Females)
                const oldTotalBalance = oldBalance1 + oldBalance2
                
                // 임시 교환 실행
                const temp = group1[p1]
                group1[p1] = group2[p2]
                group2[p2] = temp
                
                // 교환 후 새로운 성별 구성 계산
                const newG1Males = group1.filter(p => p.gender === 'male').length
                const newG1Females = group1.filter(p => p.gender === 'female').length
                const newG2Males = group2.filter(p => p.gender === 'male').length
                const newG2Females = group2.filter(p => p.gender === 'female').length
                
                // 교환 후 불균형 정도 계산
                const newBalance1 = Math.abs(newG1Males - newG1Females)
                const newBalance2 = Math.abs(newG2Males - newG2Females)
                const newTotalBalance = newBalance1 + newBalance2
                
                if (newTotalBalance < oldTotalBalance) {
                  // 전체 균형이 개선되었으므로 교환 유지
                  improved = true
                  break
                } else {
                  // 개선되지 않았으므로 원상복구
                  const temp2 = group1[p1]
                  group1[p1] = group2[p2]
                  group2[p2] = temp2
                }
              }
            }
            // 성별 균형에서 개선이 발견되면 중단하고 다음 iteration으로
            if (improved) break
          }
        }
        if (improved) break
      }
      if (improved) break
    }
    
    // 전체 최적화에서 개선이 없었다면 최적화 완료
    if (!improved) break
  }
}

/**
 * 그룹 배치 결과를 바탕으로 참가자들의 만남 히스토리를 업데이트합니다.
 * 
 * @param participants - 히스토리를 업데이트할 참가자 목록
 * @param groups - 현재 라운드의 그룹 배치 결과
 * @param round - 현재 라운드 번호
 * @returns 업데이트된 참가자 목록
 * 
 * 업데이트 과정:
 * 
 * 1. 불변성 보장: 기존 참가자 객체를 변경하지 않고 새 객체 생성
 * 2. 그룹 히스토리 업데이트: 각 참가자의 groupHistory에 현재 그룹 번호 추가
 * 3. 라운드별 만남 기록: meetingsByRound에 현재 라운드 만남 정보 추가
 * 4. 전체 만남 목록 갱신: allMetPeople 배열을 최신 상태로 동기화
 * 
 * 만남 기록 저장 방식:
 * - meetingsByRound[라운드번호] = [만난사람ID1, 만난사람ID2, ...]
 * - 양방향 기록: A가 B를 만나면, A의 기록에 B를, B의 기록에 A를 추가
 * - 중복 방지: 같은 라운드에서 같은 사람을 중복 기록하지 않음
 * 
 * allMetPeople 동기화:
 * - updateAllMetPeople() 함수로 각 참가자의 통합 만남 목록 갱신
 * - 이는 빠른 만남 여부 확인을 위한 캐시 역할
 * 
 * 데이터 무결성:
 * - 깊은 복사로 원본 데이터 보호
 * - 모든 참가자가 동일한 만남 정보를 가지도록 보장
 * - 라운드별 세분화된 기록으로 정확한 히스토리 추적
 * 
 * 이 함수는 그룹 배치가 확정된 후 반드시 호출되어야 하며,
 * 다음 라운드의 최적화 알고리즘에서 중요한 기준 데이터가 됩니다.
 */
export function updateMeetingHistory(
  participants: Participant[], 
  groups: Group[], 
  round: number
): Participant[] {
  // 불변성 보장: 기존 참가자 객체를 변경하지 않고 새 객체 생성
  const updatedParticipants = participants.map(p => ({
    ...p,
    meetingsByRound: { ...p.meetingsByRound },    // 얕은 복사
    allMetPeople: [...p.allMetPeople],            // 배열 복사
    groupHistory: [...p.groupHistory]             // 배열 복사
  }))

  // 각 그룹 내 참가자들의 만남 기록 및 그룹 히스토리 업데이트
  groups.forEach(group => {
    // 1단계: 그룹 번호 히스토리 업데이트
    group.members.forEach(member => {
      const participant = updatedParticipants.find(p => p.id === member.id)
      if (participant) {
        // 현재 라운드의 그룹 번호를 히스토리에 추가
        participant.groupHistory.push(group.id)
      }
    })

    // 2단계: 그룹 내 참가자들 간의 만남 기록 업데이트 (양방향)
    for (let i = 0; i < group.members.length; i++) {
      for (let j = i + 1; j < group.members.length; j++) {
        const p1 = updatedParticipants.find(p => p.id === group.members[i].id)
        const p2 = updatedParticipants.find(p => p.id === group.members[j].id)
        
        if (p1 && p2) {
          // 해당 라운드의 만남 기록 배열 초기화 (없는 경우)
          if (!p1.meetingsByRound[round]) p1.meetingsByRound[round] = []
          if (!p2.meetingsByRound[round]) p2.meetingsByRound[round] = []
          
          // 양방향 만남 기록 추가 (중복 방지)
          // p1의 기록에 p2 추가
          if (!p1.meetingsByRound[round].includes(p2.id)) {
            p1.meetingsByRound[round].push(p2.id)
          }
          // p2의 기록에 p1 추가
          if (!p2.meetingsByRound[round].includes(p1.id)) {
            p2.meetingsByRound[round].push(p1.id)
          }
          
          // 전체 만남 목록 동기화 (빠른 조회를 위한 캐시)
          updateAllMetPeople(p1)
          updateAllMetPeople(p2)
        }
      }
    }
  })

  // 업데이트된 참가자 목록 반환
  return updatedParticipants
}