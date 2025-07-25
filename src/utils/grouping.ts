export interface Participant {
  id: string
  name: string
  gender: 'male' | 'female'
  mbti: 'extrovert' | 'introvert'
  metPeople?: string[]
  groupHistory?: number[]
}

export interface Group {
  id: number
  members: Participant[]
  maleCount: number
  femaleCount: number
  extrovertCount: number
  introvertCount: number
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

// 두 참가자가 이전에 만났는지 확인
function haveMet(p1: Participant, p2: Participant): boolean {
  return p1.metPeople?.includes(p2.id) || false
}

// 그룹의 균형 점수 계산 (높을수록 좋음)
function calculateGroupBalance(group: Participant[], groupNumber?: number): number {
  if (group.length === 0) return 0
  
  const maleCount = group.filter(p => p.gender === 'male').length
  const femaleCount = group.filter(p => p.gender === 'female').length
  const extrovertCount = group.filter(p => p.mbti === 'extrovert').length
  const introvertCount = group.filter(p => p.mbti === 'introvert').length
  
  // 성별 균형 점수 (0-1)
  const genderBalance = 1 - Math.abs(maleCount - femaleCount) / group.length
  
  // MBTI 균형 점수 (0-1)
  const mbtiBalance = 1 - Math.abs(extrovertCount - introvertCount) / group.length
  
  // 새로운 만남 점수
  let newMeetings = 0
  let totalPairs = 0
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      totalPairs++
      if (!haveMet(group[i], group[j])) {
        newMeetings++
      }
    }
  }
  const newMeetingScore = totalPairs > 0 ? newMeetings / totalPairs : 1
  
  // 이전 라운드 그룹 번호 회피 점수
  let groupAvoidanceScore = 1
  if (groupNumber !== undefined) {
    const membersAvoidingPrevious = group.filter(p => !shouldAvoidGroupNumber(p, groupNumber)).length
    groupAvoidanceScore = group.length > 0 ? membersAvoidingPrevious / group.length : 1
  }
  
  // 가중 평균 (성별 균형 60%, 새로운 만남 25%, 그룹 번호 회피 10%, MBTI 균형 5%)
  return genderBalance * 0.6 + newMeetingScore * 0.25 + groupAvoidanceScore * 0.1 + mbtiBalance * 0.05
}

// 참가자가 이전 라운드와 다른 그룹 번호를 가져야 하는지 확인
function shouldAvoidGroupNumber(participant: Participant, groupNumber: number): boolean {
  const history = participant.groupHistory || []
  return history.length > 0 && history[history.length - 1] === groupNumber
}

// 최적화된 그룹 배치 알고리즘
export function createOptimalGroups(
  participants: Participant[], 
  groupSize: number = 4,
  currentRound: number = 1
): GroupingResult {
  if (participants.length < 2) {
    throw new Error('최소 2명 이상의 참가자가 필요합니다.')
  }

  console.log(`그룹 배치 시작: 참가자 ${participants.length}명, 그룹 크기 ${groupSize}`)

  // 필요한 그룹 수 계산
  const numGroups = Math.ceil(participants.length / groupSize)
  console.log(`필요한 그룹 수: ${numGroups}`)

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
  optimizeGroupBalance(groups, groupSize)

  console.log('최적화 완료:', groups.map(g => g.length))

  // 결과 구성
  const finalGroups: Group[] = groups.map((groupMembers, index) => {
    const maleCount = groupMembers.filter(p => p.gender === 'male').length
    const femaleCount = groupMembers.filter(p => p.gender === 'female').length
    const extrovertCount = groupMembers.filter(p => p.mbti === 'extrovert').length
    const introvertCount = groupMembers.filter(p => p.mbti === 'introvert').length
    
    return {
      id: index + 1,
      members: groupMembers,
      maleCount,
      femaleCount,
      extrovertCount,
      introvertCount
    }
  }).filter(group => group.members.length > 0) // 빈 그룹 제거

  // 통계 계산
  let newMeetingsTotal = 0
  let totalGenderBalance = 0
  let totalMbtiBalance = 0
  
  finalGroups.forEach(group => {
    const groupMembers = group.members
    
    // 새로운 만남 계산
    for (let i = 0; i < groupMembers.length; i++) {
      for (let j = i + 1; j < groupMembers.length; j++) {
        if (!haveMet(groupMembers[i], groupMembers[j])) {
          newMeetingsTotal++
        }
      }
    }
    
    if (groupMembers.length > 0) {
      totalGenderBalance += 1 - Math.abs(group.maleCount - group.femaleCount) / groupMembers.length
      totalMbtiBalance += 1 - Math.abs(group.extrovertCount - group.introvertCount) / groupMembers.length
    }
  })

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
function optimizeGroupBalance(groups: Participant[][], targetGroupSize: number) {
  const maxIterations = 50
  
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let improved = false
    
    // 그룹 크기 균형 맞추기
    for (let i = 0; i < groups.length; i++) {
      for (let j = 0; j < groups.length; j++) {
        if (i === j) continue
        
        const group1 = groups[i]
        const group2 = groups[j]
        
        // 크기 차이가 2 이상인 경우 조정
        if (group1.length - group2.length >= 2) {
          // group1에서 group2로 한 명 이동
          if (group1.length > 1) {
            const memberToMove = group1.pop()
            if (memberToMove) {
              group2.push(memberToMove)
              improved = true
            }
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

// 만남 히스토리 업데이트
export function updateMeetingHistory(
  participants: Participant[], 
  groups: Group[], 
  round: number
): Participant[] {
  const updatedParticipants = participants.map(p => ({
    ...p,
    metPeople: [...(p.metPeople || [])],
    groupHistory: [...(p.groupHistory || [])]
  }))

  // 각 그룹 내 참가자들의 만남 기록 업데이트
  groups.forEach(group => {
    // 그룹 번호 히스토리 업데이트
    group.members.forEach(member => {
      const participant = updatedParticipants.find(p => p.id === member.id)
      if (participant) {
        participant.groupHistory!.push(group.id)
      }
    })

    // 서로 만난 기록 업데이트
    for (let i = 0; i < group.members.length; i++) {
      for (let j = i + 1; j < group.members.length; j++) {
        const p1 = updatedParticipants.find(p => p.id === group.members[i].id)
        const p2 = updatedParticipants.find(p => p.id === group.members[j].id)
        
        if (p1 && p2) {
          if (!p1.metPeople!.includes(p2.id)) {
            p1.metPeople!.push(p2.id)
          }
          if (!p2.metPeople!.includes(p1.id)) {
            p2.metPeople!.push(p1.id)
          }
        }
      }
    }
  })

  return updatedParticipants
}