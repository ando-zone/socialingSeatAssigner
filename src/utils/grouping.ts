export interface Participant {
  id: string
  name: string
  gender: 'male' | 'female'
  mbti: 'extrovert' | 'introvert'
  meetingsByRound: { [round: number]: string[] } // 라운드별 만남 기록
  allMetPeople: string[] // 전체 만난 사람 목록 (중복 제거)
  groupHistory: number[] // 그룹 히스토리
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
    
    // allMetPeople 재계산 (데이터 일관성 보장)
    updateAllMetPeople(participant)
    
    return participant
  })
}

// 참가자가 이전 라운드와 다른 그룹 번호를 가져야 하는지 확인
function shouldAvoidGroupNumber(participant: Participant, groupNumber: number): boolean {
  const history = participant.groupHistory
  return history.length > 0 && history[history.length - 1] === groupNumber
}

// 최적화된 그룹 배치 알고리즘
export function createOptimalGroups(
  participants: Participant[], 
  groupSizeOrSizes: number | number[] = 4,
  currentRound: number = 1
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

  // 참가자를 그룹에 배치 (이전 라운드 그룹 번호 회피 고려)
  const shuffledParticipants = [...participants].sort(() => Math.random() - 0.5)
  
  // 각 참가자를 적절한 그룹에 배치
  shuffledParticipants.forEach((participant) => {
    let bestGroupIndex = 0
    let minGroupSize = groups[0].length
    let foundAvoidableGroup = false
    
    // 이전 라운드 그룹 번호를 회피할 수 있는 그룹 찾기
    for (let i = 0; i < numGroups; i++) {
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

  // 그룹 균형 최적화
  optimizeGroupBalance(groups, groupSizes)

  console.log('최적화 완료:', groups.map(g => g.length))

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