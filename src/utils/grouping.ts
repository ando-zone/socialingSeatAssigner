export interface Participant {
  id: string
  name: string
  gender: 'male' | 'female'
  mbti: 'extrovert' | 'introvert'
  meetingsByRound: { [round: number]: string[] } // 라운드별 만남 기록
  allMetPeople: string[] // 전체 만난 사람 목록 (중복 제거)
  groupHistory: number[] // 그룹 히스토리
  isCheckedIn?: boolean // 입장 체크 상태 (선택적)
}

export interface Group {
  id: number
  members: Participant[]
  maleCount: number
  femaleCount: number
  extrovertCount: number
  introvertCount: number
  newMeetingsCount: number
}

export interface GroupingResult {
  groups: Group[]
  round: number
  summary: {
    totalGroups: number
    avgGroupSize: number
    genderBalanceScore: number
    mbtiBalanceScore: number
    newMeetingsCount: number
  }
}

// 두 참가자가 이전에 만났는지 확인 (현재 라운드 제외)
function haveMet(p1: Participant, p2: Participant, currentRound?: number): boolean {
  if (currentRound === undefined) {
    // 라운드 정보가 없으면 전체 기록 사용 (기존 동작)
    return p1.allMetPeople.includes(p2.id)
  }
  
  // 현재 라운드 이전의 만남만 확인
  const previousMeetings = new Set<string>()
  Object.entries(p1.meetingsByRound).forEach(([round, meetings]) => {
    if (parseInt(round) < currentRound) {
      meetings.forEach(meetingId => previousMeetings.add(meetingId))
    }
  })
  
  return previousMeetings.has(p2.id)
}

// 유틸리티 함수: allMetPeople 배열 업데이트
function updateAllMetPeople(participant: Participant): void {
  const allMet = new Set<string>()
  
  // 모든 라운드의 만남 기록을 합치기
  Object.values(participant.meetingsByRound).forEach(roundMeetings => {
    roundMeetings.forEach(personId => allMet.add(personId))
  })
  
  participant.allMetPeople = Array.from(allMet)
}

// 참가자 데이터 검증 및 초기화 함수
export function migrateParticipantData(participants: Participant[], currentRound: number = 1): Participant[] {
  return participants.map(participant => {
    // 필수 필드가 없다면 초기화
    if (!participant.meetingsByRound) {
      participant.meetingsByRound = {}
    }
    if (!participant.allMetPeople) {
      participant.allMetPeople = []
    }
    if (!participant.groupHistory) {
      participant.groupHistory = []
    }
    
    // allMetPeople는 result 페이지에서 실시간 계산하므로 여기서는 제거
    
    return participant
  })
}

// 참가자가 이전 라운드와 다른 그룹 번호를 가져야 하는지 확인
function shouldAvoidGroupNumber(participant: Participant, groupNumber: number): boolean {
  const history = participant.groupHistory
  return history.length > 0 && history[history.length - 1] === groupNumber
}

// 기본 배치 로직
function assignParticipantsBasic(participants: Participant[], groups: Participant[][], currentRound: number): void {
  const shuffledParticipants = [...participants].sort(() => Math.random() - 0.5)
  
  shuffledParticipants.forEach((participant) => {
    let bestGroupIndex = 0
    let minGroupSize = groups[0].length
    let foundAvoidableGroup = false
    
    // 이전 라운드 그룹 번호를 회피할 수 있는 그룹 찾기
    for (let i = 0; i < groups.length; i++) {
      const canAvoidPreviousGroup = !shouldAvoidGroupNumber(participant, i + 1)
      
      if (canAvoidPreviousGroup && !foundAvoidableGroup) {
        // 이전 그룹을 회피할 수 있는 첫 번째 그룹
        bestGroupIndex = i
        minGroupSize = groups[i].length
        foundAvoidableGroup = true
      } else if (canAvoidPreviousGroup && foundAvoidableGroup) {
        // 이전 그룹을 회피할 수 있는 그룹 중 크기가 더 작은 그룹
        if (groups[i].length < minGroupSize) {
          bestGroupIndex = i
          minGroupSize = groups[i].length
        }
      } else if (!foundAvoidableGroup) {
        // 이전 그룹을 회피할 수 없다면 가장 작은 그룹
        if (groups[i].length < minGroupSize) {
          bestGroupIndex = i
          minGroupSize = groups[i].length
        }
      }
    }
    
    groups[bestGroupIndex].push(participant)
  })
}

// 성비 제약 조건을 고려한 배치 로직
function assignParticipantsWithGenderConstraints(
  participants: Participant[], 
  groups: Participant[][], 
  genderConstraints: GenderConstraint[], 
  currentRound: number
): { success: boolean; reason?: string } {
  console.log('성비 제약 조건:', genderConstraints)
  
  // 참가자를 성별로 분리
  const maleParticipants = participants.filter(p => p.gender === 'male')
  const femaleParticipants = participants.filter(p => p.gender === 'female')
  
  console.log(`남성 참가자: ${maleParticipants.length}명, 여성 참가자: ${femaleParticipants.length}명`)
  
  // 총 필요한 성별별 인원 계산
  const totalMaleNeeded = genderConstraints.reduce((sum, constraint) => sum + constraint.maleCount, 0)
  const totalFemaleNeeded = genderConstraints.reduce((sum, constraint) => sum + constraint.femaleCount, 0)
  
  console.log(`필요한 남성: ${totalMaleNeeded}명, 필요한 여성: ${totalFemaleNeeded}명`)
  
  // 참가자 수가 부족한지 확인
  if (maleParticipants.length < totalMaleNeeded || femaleParticipants.length < totalFemaleNeeded) {
    return { 
      success: false, 
      reason: `성별 참가자 수 부족 - 남성: ${maleParticipants.length}/${totalMaleNeeded}, 여성: ${femaleParticipants.length}/${totalFemaleNeeded}`
    }
  }
  
  // 각 그룹에 성별 제약 조건에 따라 배치
  const assignedMales = new Set<string>()
  const assignedFemales = new Set<string>()
  
  for (let groupIndex = 0; groupIndex < genderConstraints.length; groupIndex++) {
    const constraint = genderConstraints[groupIndex]
    const group = groups[groupIndex]
    
    // 이 그룹에 배치할 남성들 선택
    const availableMales = maleParticipants.filter(p => !assignedMales.has(p.id))
    const selectedMales = selectBestParticipantsForGroup(availableMales, constraint.maleCount, groupIndex + 1)
    
    // 이 그룹에 배치할 여성들 선택  
    const availableFemales = femaleParticipants.filter(p => !assignedFemales.has(p.id))
    const selectedFemales = selectBestParticipantsForGroup(availableFemales, constraint.femaleCount, groupIndex + 1)
    
    // 그룹에 추가
    selectedMales.forEach(p => {
      group.push(p)
      assignedMales.add(p.id)
    })
    selectedFemales.forEach(p => {
      group.push(p)
      assignedFemales.add(p.id)
    })
    
    console.log(`그룹 ${groupIndex + 1}: 남성 ${selectedMales.length}명, 여성 ${selectedFemales.length}명 배치`)
  }
  
  return { success: true }
}

// 그룹에 가장 적합한 참가자들을 선택하는 함수
function selectBestParticipantsForGroup(candidates: Participant[], count: number, groupNumber: number): Participant[] {
  if (candidates.length <= count) {
    return [...candidates]
  }
  
  // 우선순위: 이전 라운드에서 해당 그룹 번호가 아닌 사람들을 우선 선택
  const canAvoidPrevious = candidates.filter(p => !shouldAvoidGroupNumber(p, groupNumber))
  const mustUsePrevious = candidates.filter(p => shouldAvoidGroupNumber(p, groupNumber))
  
  let selected: Participant[] = []
  
  // 먼저 이전 그룹을 회피할 수 있는 사람들을 무작위로 선택
  const shuffledAvoidable = [...canAvoidPrevious].sort(() => Math.random() - 0.5)
  const neededFromAvoidable = Math.min(count, shuffledAvoidable.length)
  selected.push(...shuffledAvoidable.slice(0, neededFromAvoidable))
  
  // 부족하면 이전 같은 그룹이었던 사람들도 추가
  const remainingNeeded = count - selected.length
  if (remainingNeeded > 0) {
    const shuffledMustUse = [...mustUsePrevious].sort(() => Math.random() - 0.5)
    selected.push(...shuffledMustUse.slice(0, remainingNeeded))
  }
  
  return selected
}

// 성비 제약 조건 인터페이스
export interface GenderConstraint {
  maleCount: number
  femaleCount: number
}

// 성비 제약조건 체크 함수
function checkGenderConstraints(groups: Participant[][], genderConstraints: GenderConstraint[]): boolean {
  if (!genderConstraints || genderConstraints.length !== groups.length) {
    return true // 제약조건이 없으면 통과
  }
  
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i]
    const constraint = genderConstraints[i]
    const maleCount = group.filter(p => p.gender === 'male').length
    const femaleCount = group.filter(p => p.gender === 'female').length
    
    if (maleCount !== constraint.maleCount || femaleCount !== constraint.femaleCount) {
      console.warn(`⚠️ 그룹 ${i + 1} 성비 불일치: 실제 남${maleCount}/여${femaleCount}, 기대 남${constraint.maleCount}/여${constraint.femaleCount}`)
      return false
    }
  }
  
  return true
}

// 최적화된 그룹 배치 알고리즘
export function createOptimalGroups(
  participants: Participant[], 
  groupSizeOrSizes: number | number[] = 4,
  currentRound: number = 1,
  genderConstraints?: GenderConstraint[]
): GroupingResult {
  if (participants.length < 2) {
    throw new Error('최소 2명 이상의 참가자가 필요합니다.')
  }

  // 그룹 크기 배열 생성
  let groupSizes: number[]
  if (Array.isArray(groupSizeOrSizes)) {
    groupSizes = groupSizeOrSizes
  } else {
    // 기존 방식: 동일한 크기로 자동 계산
    const numGroups = Math.ceil(participants.length / groupSizeOrSizes)
    groupSizes = Array(numGroups).fill(groupSizeOrSizes)
  }

  // 총 예상 인원과 실제 인원 비교
  const totalExpectedSize = groupSizes.reduce((sum, size) => sum + size, 0)
  if (totalExpectedSize < participants.length) {
    throw new Error(`설정된 그룹 크기의 총합(${totalExpectedSize}명)이 참가자 수(${participants.length}명)보다 적습니다.`)
  }

  const numGroups = groupSizes.length
  console.log(`그룹 배치 시작: 참가자 ${participants.length}명`)
  console.log(`그룹 구성: ${groupSizes.map((size, i) => `그룹${i+1}(${size}명)`).join(', ')}`)
  console.log(`총 ${numGroups}개 그룹, 예상 총 인원: ${totalExpectedSize}명`)

  // 그룹 배열 초기화
  const groups: Participant[][] = Array.from({ length: numGroups }, () => [])

  // 성비 제약 조건이 있는 경우 특별한 배치 로직 사용
  if (genderConstraints && genderConstraints.length === numGroups) {
    // 성비 제약 조건에 따른 배치
    console.log('🎯 성비 제약 조건을 적용한 그룹 배치 시작')
    const result = assignParticipantsWithGenderConstraints(participants, groups, genderConstraints, currentRound)
    if (!result.success) {
      console.error('❌ 성비 제약 조건 배치 실패:', result.reason)
      throw new Error(`성비 제약 조건을 만족할 수 없습니다: ${result.reason}`)
    } else {
      console.log('✅ 성비 제약 조건 배치 성공')
      // 성비 제약조건이 정확히 적용되었는지 재확인
      const finalCheck = checkGenderConstraints(groups, genderConstraints)
      if (!finalCheck) {
        console.error('❌ 성비 제약조건 검증 실패')
        throw new Error('성비 제약조건이 올바르게 적용되지 않았습니다.')
      }
    }
  } else {
    // 기본 배치 로직
    console.log('기본 배치 로직 사용 (성비 제약조건 없음)')
    assignParticipantsBasic(participants, groups, currentRound)
  }

  console.log('초기 배치 완료:', groups.map(g => g.length))
  
  // 이전 라운드 그룹 번호 회피 통계
  let totalAvoidanceSuccess = 0
  let totalParticipants = 0
  groups.forEach((group, index) => {
    const groupNumber = index + 1
    group.forEach(participant => {
      totalParticipants++
      if (!shouldAvoidGroupNumber(participant, groupNumber)) {
        totalAvoidanceSuccess++
      }
    })
  })
  console.log(`그룹 번호 회피 성공률: ${totalParticipants > 0 ? Math.round((totalAvoidanceSuccess / totalParticipants) * 100) : 0}% (${totalAvoidanceSuccess}/${totalParticipants})`)

  // 새로운 만남 최적화 (특히 새로운 이성과의 만남 우선) - 성비 제약조건 고려
  if (genderConstraints && genderConstraints.length === numGroups) {
    console.log('🔒 성비 제약조건 활성화: 성비 유지를 최우선으로 최적화 시작')
  }
  optimizeNewMeetings(groups, participants, currentRound, genderConstraints)
  
  // 그룹 균형 최적화 - 성비 제약조건이 없는 경우만 실행
  if (!genderConstraints || genderConstraints.length !== numGroups) {
    console.log('일반 그룹 균형 최적화 실행')
    optimizeGroupBalance(groups, groupSizes)
  } else {
    console.log('⚠️ 성비 제약조건으로 인해 일반 균형 최적화 생략')
  }

  console.log('최적화 완료:', groups.map(g => g.length))
  
  // 성비 제약조건이 있는 경우 최적화 후에도 유지되는지 최종 확인
  if (genderConstraints && genderConstraints.length === numGroups) {
    const finalConstraintCheck = checkGenderConstraints(groups, genderConstraints)
    if (!finalConstraintCheck) {
      console.error('🚨 심각한 오류: 최적화 과정에서 성비 제약조건이 깨짐!')
      // 각 그룹별 성비 상세 로그
      groups.forEach((group, index) => {
        const maleCount = group.filter(p => p.gender === 'male').length
        const femaleCount = group.filter(p => p.gender === 'female').length
        const expected = genderConstraints[index]
        console.error(`그룹 ${index + 1}: 실제 남${maleCount}/여${femaleCount}, 기대 남${expected.maleCount}/여${expected.femaleCount}`)
      })
      throw new Error('최적화 과정에서 성비 제약조건이 위반되었습니다.')
    } else {
      console.log('✅ 최적화 후에도 성비 제약조건 유지됨')
    }
  }

  // 결과 구성
  const finalGroups: Group[] = groups.map((groupMembers, index) => {
    const maleCount = groupMembers.filter(p => p.gender === 'male').length
    const femaleCount = groupMembers.filter(p => p.gender === 'female').length
    const extrovertCount = groupMembers.filter(p => p.mbti === 'extrovert').length
    const introvertCount = groupMembers.filter(p => p.mbti === 'introvert').length
    
    // 이 그룹에서의 새로운 만남 수 미리 계산 (updateMeetingHistory 호출 전)
    let groupNewMeetings = 0
    for (let i = 0; i < groupMembers.length; i++) {
      for (let j = i + 1; j < groupMembers.length; j++) {
        if (!haveMet(groupMembers[i], groupMembers[j], currentRound)) {
          groupNewMeetings++
        }
      }
    }
    
    return {
      id: index + 1,
      members: groupMembers,
      maleCount,
      femaleCount,
      extrovertCount,
      introvertCount,
      newMeetingsCount: groupNewMeetings
    }
  }).filter(group => group.members.length > 0) // 빈 그룹 제거

  // 통계 계산
  let newMeetingsTotal = 0
  let totalGenderBalance = 0
  let totalMbtiBalance = 0
  
  console.log('=== 배치 요약에서 새로운 만남 계산 시작 ===')
  
  // ID -> 이름 매핑 함수
  const getNameById = (id: string) => {
    const person = participants.find(p => p.id === id)
    return person ? person.name : `Unknown(${id.slice(-4)})`
  }
  
  finalGroups.forEach(group => {
    const groupMembers = group.members
    let groupNewMeetings = 0
    
    console.log(`그룹 ${group.id} (${groupMembers.length}명): [${groupMembers.map(m => m.name).join(', ')}]`)
    
    // 새로운 만남 계산
    for (let i = 0; i < groupMembers.length; i++) {
      for (let j = i + 1; j < groupMembers.length; j++) {
        const p1 = groupMembers[i]
        const p2 = groupMembers[j]
        const met = haveMet(p1, p2, currentRound)
        
        // 만남 기록 상세 표시
        const p1MetNames = p1.allMetPeople.map(id => getNameById(id))
        console.log(`  ${p1.name} vs ${p2.name}: 이전에 만남? ${met}`)
        console.log(`    ${p1.name}의 만남기록: [${p1MetNames.join(', ')}]`)
        
        if (!met) {
          newMeetingsTotal++
          groupNewMeetings++
          console.log(`    -> 새로운 만남! ✨`)
        }
      }
    }
    console.log(`  그룹 ${group.id} 새로운 만남: ${groupNewMeetings}쌍`)
    
    if (groupMembers.length > 0) {
      totalGenderBalance += 1 - Math.abs(group.maleCount - group.femaleCount) / groupMembers.length
      totalMbtiBalance += 1 - Math.abs(group.extrovertCount - group.introvertCount) / groupMembers.length
    }
  })
  
  console.log(`배치 요약 총 새로운 만남: ${newMeetingsTotal}쌍`)
  console.log('=== 배치 요약 계산 완료 ===')

  console.log(`최종 그룹 수: ${finalGroups.length}`)
  console.log('각 그룹 크기:', finalGroups.map(g => g.members.length))

  return {
    groups: finalGroups,
    round: currentRound,
    summary: {
      totalGroups: finalGroups.length,
      avgGroupSize: finalGroups.length > 0 ? participants.length / finalGroups.length : 0,
      genderBalanceScore: finalGroups.length > 0 ? Math.round((totalGenderBalance / finalGroups.length) * 100) : 0,
      mbtiBalanceScore: finalGroups.length > 0 ? Math.round((totalMbtiBalance / finalGroups.length) * 100) : 0,
      newMeetingsCount: newMeetingsTotal
    }
  }
}

// 그룹 균형 최적화 함수
function optimizeNewMeetings(groups: Participant[][], participants: Participant[], currentRound: number, genderConstraints?: GenderConstraint[]) {
  const maxIterations = 100
  const hasGenderConstraints = genderConstraints && genderConstraints.length === groups.length
  
  if (hasGenderConstraints) {
    console.log('🔒 성비 제약조건을 엄격하게 준수하며 새로운 만남 최적화 진행')
  }
  
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let improved = false
    
    // 모든 그룹 쌍에 대해 새로운 만남 최적화
    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        const group1 = groups[i]
        const group2 = groups[j]
        
        if (group1.length === 0 || group2.length === 0) continue
        
        // 각 그룹에서 한 명씩 교환해보면서 새로운 만남 점수 계산
        for (let p1 = 0; p1 < group1.length; p1++) {
          for (let p2 = 0; p2 < group2.length; p2++) {
            const person1 = group1[p1]
            const person2 = group2[p2]
            
            // 교환 전 새로운 만남 점수 계산
            const oldScore = calculateNewMeetingScore(group1, currentRound) + 
                           calculateNewMeetingScore(group2, currentRound)
            
            // 교환 시도
            group1[p1] = person2
            group2[p2] = person1
            
            // 성비 제약조건 체크 (성비가 최우선순위!)
            const genderConstraintValid = checkGenderConstraints(groups, genderConstraints || [])
            
            if (genderConstraintValid) {
              // 성비가 유지되는 경우에만 새로운 만남 점수 계산
              const newScore = calculateNewMeetingScore(group1, currentRound) + 
                             calculateNewMeetingScore(group2, currentRound)
              
              if (newScore > oldScore) {
                improved = true
                console.log(`🎯 성비 유지하며 최적화: 그룹${i+1}-그룹${j+1} 교환으로 점수 ${oldScore} -> ${newScore}`)
                break
              } else {
                // 점수가 나빠지면 되돌리기
                group1[p1] = person1
                group2[p2] = person2
              }
            } else {
              // 성비 제약조건 위반 시 즉시 되돌리기
              group1[p1] = person1
              group2[p2] = person2
              console.log(`❌ 성비 제약조건 위반으로 교환 취소: 그룹${i+1}-그룹${j+1}`)
            }
          }
          if (improved) break
        }
        if (improved) break
      }
      if (improved) break
    }
    
    if (!improved) break
  }
  
  if (hasGenderConstraints) {
    console.log('✅ 성비 제약조건을 준수하며 새로운 만남 최적화 완료')
  }
}

function calculateNewMeetingScore(group: Participant[], currentRound: number): number {
  let score = 0
  
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      const person1 = group[i]
      const person2 = group[j]
      
      if (!haveMet(person1, person2, currentRound)) {
        // 새로운 만남에 기본 점수 추가
        let meetingScore = 10
        
        // 새로운 이성과의 만남에 추가 점수 (50% 보너스)
        if (person1.gender !== person2.gender) {
          meetingScore += 15
        }
        
        score += meetingScore
      }
    }
  }
  
  return score
}

function optimizeGroupBalance(groups: Participant[][], targetGroupSizes: number[]) {
  const maxIterations = 50
  
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let improved = false
    
    // 그룹 크기를 목표 크기에 맞추기
    for (let i = 0; i < groups.length; i++) {
      for (let j = 0; j < groups.length; j++) {
        if (i === j) continue
        
        const group1 = groups[i]
        const group2 = groups[j]
        const target1 = targetGroupSizes[i] || 0
        const target2 = targetGroupSizes[j] || 0
        
        // group1이 목표보다 크고, group2가 목표보다 작은 경우 이동
        if (group1.length > target1 && group2.length < target2) {
          const memberToMove = group1.pop()
          if (memberToMove) {
            group2.push(memberToMove)
            improved = true
          }
        }
      }
    }
    
    // 성별 균형 개선
    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        const group1 = groups[i]
        const group2 = groups[j]
        
        if (group1.length === 0 || group2.length === 0) continue
        
        const g1Males = group1.filter(p => p.gender === 'male').length
        const g1Females = group1.filter(p => p.gender === 'female').length
        const g2Males = group2.filter(p => p.gender === 'male').length
        const g2Females = group2.filter(p => p.gender === 'female').length
        
        // 성별 불균형이 있는 경우 교환 시도
        if (Math.abs(g1Males - g1Females) > 1 || Math.abs(g2Males - g2Females) > 1) {
          for (let p1 = 0; p1 < group1.length; p1++) {
            for (let p2 = 0; p2 < group2.length; p2++) {
              if (group1[p1].gender !== group2[p2].gender) {
                // 교환 시도
                const oldBalance1 = Math.abs(g1Males - g1Females)
                const oldBalance2 = Math.abs(g2Males - g2Females)
                const oldTotalBalance = oldBalance1 + oldBalance2
                
                // 교환해보기
                const temp = group1[p1]
                group1[p1] = group2[p2]
                group2[p2] = temp
                
                const newG1Males = group1.filter(p => p.gender === 'male').length
                const newG1Females = group1.filter(p => p.gender === 'female').length
                const newG2Males = group2.filter(p => p.gender === 'male').length
                const newG2Females = group2.filter(p => p.gender === 'female').length
                
                const newBalance1 = Math.abs(newG1Males - newG1Females)
                const newBalance2 = Math.abs(newG2Males - newG2Females)
                const newTotalBalance = newBalance1 + newBalance2
                
                if (newTotalBalance < oldTotalBalance) {
                  improved = true
                  break
                } else {
                  // 되돌리기
                  const temp2 = group1[p1]
                  group1[p1] = group2[p2]
                  group2[p2] = temp2
                }
              }
            }
            if (improved) break
          }
        }
        if (improved) break
      }
      if (improved) break
    }
    
    if (!improved) break
  }
}

// 만남 히스토리 업데이트 (새로운 구조 사용)
export function updateMeetingHistory(
  participants: Participant[], 
  groups: Group[], 
  round: number
): Participant[] {
  const updatedParticipants = participants.map(p => ({
    ...p,
    meetingsByRound: { ...p.meetingsByRound },
    allMetPeople: [...p.allMetPeople],
    groupHistory: [...p.groupHistory]
  }))

  // 각 그룹 내 참가자들의 만남 기록 업데이트
  groups.forEach(group => {
    // 그룹 번호 히스토리 업데이트
    group.members.forEach(member => {
      const participant = updatedParticipants.find(p => p.id === member.id)
      if (participant) {
        participant.groupHistory.push(group.id)
      }
    })

    // 서로 만난 기록 업데이트 (라운드별로 저장)
    for (let i = 0; i < group.members.length; i++) {
      for (let j = i + 1; j < group.members.length; j++) {
        const p1 = updatedParticipants.find(p => p.id === group.members[i].id)
        const p2 = updatedParticipants.find(p => p.id === group.members[j].id)
        
        if (p1 && p2) {
          // 라운드별 만남 기록 초기화
          if (!p1.meetingsByRound[round]) p1.meetingsByRound[round] = []
          if (!p2.meetingsByRound[round]) p2.meetingsByRound[round] = []
          
          // 해당 라운드에 만남 기록 추가 (중복 방지)
          if (!p1.meetingsByRound[round].includes(p2.id)) {
            p1.meetingsByRound[round].push(p2.id)
          }
          if (!p2.meetingsByRound[round].includes(p1.id)) {
            p2.meetingsByRound[round].push(p1.id)
          }
          
          // allMetPeople 업데이트
          updateAllMetPeople(p1)
          updateAllMetPeople(p2)
        }
      }
    }
  })

  return updatedParticipants
}