/**
 * Result Page Component for Socialing Seat Assigner
 * 
 * 그룹 배치 결과를 표시하고 실시간 수정이 가능한 결과 페이지입니다.
 * 배치 완료 후 참가자를 추가/삭제/이동하며 최적화된 결과를 만들어갑니다.
 * 
 * 주요 기능:
 * 1. 그룹 배치 결과 시각화 - 그룹별 멤버와 통계 표시
 * 2. 실시간 참가자 관리 - 추가, 삭제, 정보 수정
 * 3. 동적 위치 변경 - 드래그&드롭 또는 터치로 참가자 이동
 * 4. 통계 실시간 재계산 - 성별/MBTI 균형, 새로운 만남 수 자동 업데이트
 * 5. 좌석 배치도 생성 - 실제 좌석 배치를 위한 시각적 가이드
 * 6. 상세 참가자 분석 - 개인별 만남 히스토리와 통계
 * 
 * 탭 구성:
 * - 그룹 결과: 배치 결과와 실시간 편집 기능
 * - 좌석 배치도: 실제 모임에서 사용할 테이블 배치 가이드
 * - 참가자 통계: 개인별 만남 분포와 히스토리 상세 분석
 * 
 * 상호작용 방식:
 * - 데스크톱: 드래그&드롭으로 참가자 위치 변경
 * - 모바일: 터치로 참가자 선택 후 교체 대상 터치
 * - 인라인 편집: 각 참가자의 이름, 성별, MBTI 실시간 수정
 * 
 * 데이터 일관성:
 * - 모든 변경사항은 실시간으로 통계에 반영
 * - 그룹 히스토리와 만남 기록 자동 업데이트
 * - Supabase 실시간 동기화로 데이터 영구 보존
 * 
 * 알고리즘 재계산:
 * - 성별/MBTI 균형 점수 실시간 계산
 * - 새로운 만남 수 동적 업데이트
 * - 이전 라운드 만남 기록과 비교하여 중복 최소화
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { GroupingResult, Participant } from '@/utils/grouping'
import { migrateParticipantData } from '@/utils/grouping'
import { createSnapshot } from '@/utils/backup'
import SeatingChart from '@/components/SeatingChart'

/**
 * 그룹 배치 결과 페이지 메인 컴포넌트
 * 
 * 배치 완료된 그룹을 관리하고 실시간으로 수정할 수 있는 
 * 인터랙티브한 결과 페이지를 제공합니다.
 * 
 * @returns {JSX.Element} 그룹 결과 관리 및 통계 UI
 */
export default function ResultPage() {
  const router = useRouter()
  
  // 핵심 데이터 상태
  const [result, setResult] = useState<GroupingResult | null>(null)        // 그룹 배치 결과
  const [participants, setParticipants] = useState<Participant[]>([])       // 현재 참가자 목록
  const [exitedParticipants, setExitedParticipants] = useState<{[id: string]: {name: string, gender: 'male' | 'female'}}>({}) // 이탈한 참가자 정보
  
  // 참가자 추가 관련 상태
  const [showAddForm, setShowAddForm] = useState<number | null>(null)       // 추가 폼을 표시할 그룹 ID
  const [newParticipant, setNewParticipant] = useState({
    name: '',
    gender: 'male' as 'male' | 'female',
    mbti: 'extrovert' as 'extrovert' | 'introvert'
  })  // 새 참가자 정보
  
  // 드래그&드롭 및 위치 변경 상태
  const [draggedParticipant, setDraggedParticipant] = useState<{id: string, fromGroupId: number} | null>(null)  // 드래그 중인 참가자
  const [swapMessage, setSwapMessage] = useState<string | null>(null)       // 위치 변경 성공/실패 메시지
  const [swapSelectedParticipant, setSwapSelectedParticipant] = useState<{id: string, groupId: number} | null>(null)  // 터치용 선택된 참가자
  
  // UI 상태 관리
  const [activeTab, setActiveTab] = useState<'groups' | 'stats' | 'seating'>('groups')  // 현재 활성 탭
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null)   // 통계 탭에서 선택된 참가자
  const [isMobile, setIsMobile] = useState(false)                          // 모바일 환경 감지
  
  // 참가자 편집 상태
  const [editingParticipant, setEditingParticipant] = useState<string | null>(null)     // 편집 중인 참가자 ID
  const [editForm, setEditForm] = useState({
    name: '',
    gender: 'male' as 'male' | 'female',
    mbti: 'extrovert' as 'extrovert' | 'introvert'
  })  // 편집 폼 데이터

  useEffect(() => {
    const loadData = async () => {
      try {
        const { 
          getGroupingResult, 
          getParticipants, 
          getExitedParticipants,
          getCurrentMeetingId
        } = await import('@/utils/database')
        
        const meetingId = getCurrentMeetingId()
        if (!meetingId) {
          console.log('활성 모임이 없습니다.')
          router.push('/')
          return
        }
        
        console.log('📥 결과 페이지 데이터 로딩 중...')
        
        const [groupingResult, participants, exitedParticipants] = await Promise.all([
          getGroupingResult(),
          getParticipants(),
          getExitedParticipants()
        ])
        
        if (groupingResult && participants.length > 0) {
          // 이탈한 사람들 정보 설정
          setExitedParticipants(exitedParticipants)
          
          // 데이터 마이그레이션 적용
          const migratedParticipants = migrateParticipantData(participants, groupingResult.round || 1)
          
          setResult(groupingResult)
          setParticipants(migratedParticipants)
          
          console.log('✅ 결과 페이지 데이터 로드 완료')
        } else {
          console.log('그룹 배치 결과가 없습니다. 메인 페이지로 이동합니다.')
          router.push('/')
        }
      } catch (error) {
        console.error('❌ 결과 페이지 데이터 로딩 중 오류:', error)
        router.push('/')
      }
    }
    
    loadData()
  }, [router])

  // 모바일 환경 감지
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window)
    }
    
    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  // 현재 라운드 만남 계산 (새로운 구조 사용)
  const getCurrentRoundMeetings = (participantId: string): string[] => {
    if (!result) return []
    
    const participant = participants.find(p => p.id === participantId)
    const currentRound = result.round || 1
    
    return participant?.meetingsByRound[currentRound] || []
  }

  // 이전 라운드들 만남 계산
  const getPreviousRoundsMeetings = (participantId: string): string[] => {
    if (!result) return []
    
    const participant = participants.find(p => p.id === participantId)
    const currentRound = result.round || 1
    const previousMeetings = new Set<string>()
    
    // 현재 라운드 이전의 모든 라운드에서 만난 사람들 수집
    Object.entries(participant?.meetingsByRound || {}).forEach(([round, meetings]) => {
      if (parseInt(round) < currentRound) {
        meetings.forEach(meetingId => previousMeetings.add(meetingId))
      }
    })
    
    return Array.from(previousMeetings)
  }

  // 이전 라운드까지만 만났는지 확인하는 함수
  const haveMetBefore = (p1: Participant, p2: Participant, currentRound: number): boolean => {
    const previousMeetings = new Set<string>()
    Object.entries(p1.meetingsByRound).forEach(([round, meetings]) => {
      if (parseInt(round) < currentRound) {
        meetings.forEach(meetingId => previousMeetings.add(meetingId))
      }
    })
    return previousMeetings.has(p2.id)
  }

  // 완전한 그룹 결과 재계산 함수
  const recalculateGroupResult = (groups: GroupingResult['groups'], updatedParticipants: Participant[]): GroupingResult => {
    if (!result) throw new Error('Result is null')

    // 각 그룹의 상세 통계 재계산
    const recalculatedGroups = groups.map(group => {
      const maleCount = group.members.filter(p => p.gender === 'male').length
      const femaleCount = group.members.filter(p => p.gender === 'female').length
      const extrovertCount = group.members.filter(p => p.mbti === 'extrovert').length
      const introvertCount = group.members.filter(p => p.mbti === 'introvert').length
      
      // 새로운 만남 수 재계산 (업데이트된 참가자 데이터 사용)
      let newMeetingsCount = 0
      for (let i = 0; i < group.members.length; i++) {
        for (let j = i + 1; j < group.members.length; j++) {
          const p1 = updatedParticipants.find(p => p.id === group.members[i].id)
          const p2 = updatedParticipants.find(p => p.id === group.members[j].id)
          if (p1 && p2) {
            const currentRound = result.round || 1
            const haveMet = haveMetBefore(p1, p2, currentRound)
            if (!haveMet) {
              newMeetingsCount++
            }
          }
        }
      }

      return {
        ...group,
        maleCount,
        femaleCount,
        extrovertCount,
        introvertCount,
        newMeetingsCount
      }
    })

    // 전체 요약 통계 재계산
    const totalNewMeetings = recalculatedGroups.reduce((sum, group) => sum + group.newMeetingsCount, 0)
    const totalParticipants = updatedParticipants.length
    
    // 성별 균형 점수 계산
    let totalGenderBalance = 0
    recalculatedGroups.forEach(group => {
      if (group.members.length > 0) {
        const genderBalance = 1 - Math.abs(group.maleCount - group.femaleCount) / group.members.length
        totalGenderBalance += genderBalance
      }
    })
    const avgGenderBalance = recalculatedGroups.length > 0 ? totalGenderBalance / recalculatedGroups.length : 0

    // MBTI 균형 점수 계산
    let totalMbtiBalance = 0
    recalculatedGroups.forEach(group => {
      if (group.members.length > 0) {
        const mbtiBalance = 1 - Math.abs(group.extrovertCount - group.introvertCount) / group.members.length
        totalMbtiBalance += mbtiBalance
      }
    })
    const avgMbtiBalance = recalculatedGroups.length > 0 ? totalMbtiBalance / recalculatedGroups.length : 0

    return {
      groups: recalculatedGroups,
      round: result.round,
      summary: {
        totalGroups: recalculatedGroups.length,
        avgGroupSize: recalculatedGroups.length > 0 ? totalParticipants / recalculatedGroups.length : 0,
        genderBalanceScore: Math.round(avgGenderBalance * 100),
        mbtiBalanceScore: Math.round(avgMbtiBalance * 100),
        newMeetingsCount: totalNewMeetings
      }
    }
  }

  // 새로운 참가자를 특정 그룹에 추가
  const addParticipantToGroup = async (groupId: number) => {
    if (!newParticipant.name.trim() || !result) return

    // 해당 그룹의 기존 멤버들 찾기
    const targetGroup = result.groups.find(group => group.id === groupId)
    if (!targetGroup) return

    const existingMemberIds = targetGroup.members.map(member => member.id)

    // 새로운 참가자 객체 생성 (기존 그룹 멤버들과 이미 만났다고 기록)
    const currentRound = result.round || 1
    const participant: Participant = {
      id: Date.now().toString(),
      name: newParticipant.name.trim(),
      gender: newParticipant.gender,
      mbti: newParticipant.mbti,
      meetingsByRound: {
        [currentRound]: [...existingMemberIds] // 현재 라운드에서 기존 멤버들과 만남
      },
      allMetPeople: [...existingMemberIds], // 전체 만난 사람 목록
      groupHistory: [groupId] // 현재 그룹을 히스토리에 추가
    }

    // 기존 참가자들의 만남 기록도 업데이트 (새 참가자와 만났다고 추가)
    const updatedParticipants = participants.map(p => {
      if (existingMemberIds.includes(p.id)) {
        // 라운드별 만남 기록 업데이트
        const newMeetingsByRound = { ...p.meetingsByRound }
        if (!newMeetingsByRound[currentRound]) {
          newMeetingsByRound[currentRound] = []
        }
        if (!newMeetingsByRound[currentRound].includes(participant.id)) {
          newMeetingsByRound[currentRound].push(participant.id)
        }
        
        // allMetPeople 업데이트
        const newAllMetPeople = [...p.allMetPeople]
        if (!newAllMetPeople.includes(participant.id)) {
          newAllMetPeople.push(participant.id)
        }
        
        return {
          ...p,
          meetingsByRound: newMeetingsByRound,
          allMetPeople: newAllMetPeople
        }
      }
      return p
    })

    // 새 참가자를 목록에 추가
    updatedParticipants.push(participant)


    // 해당 그룹에 참가자 추가 및 카운트 업데이트
    const updatedGroups = result.groups.map(group => {
      if (group.id === groupId) {
        const updatedMembers = [...group.members, participant]
        const maleCount = updatedMembers.filter(p => p.gender === 'male').length
        const femaleCount = updatedMembers.filter(p => p.gender === 'female').length
        const extrovertCount = updatedMembers.filter(p => p.mbti === 'extrovert').length
        const introvertCount = updatedMembers.filter(p => p.mbti === 'introvert').length
        
        return {
          ...group,
          members: updatedMembers,
          maleCount,
          femaleCount,
          extrovertCount,
          introvertCount
        }
      }
      return group
    })

    // 새로운 만남 수 재계산
    let newMeetingsTotal = 0
    updatedGroups.forEach(group => {
      for (let i = 0; i < group.members.length; i++) {
        for (let j = i + 1; j < group.members.length; j++) {
          const p1 = updatedParticipants.find(p => p.id === group.members[i].id)
          const p2 = updatedParticipants.find(p => p.id === group.members[j].id)
          if (p1 && p2) {
            const currentRound = result.round || 1
            const haveMet = haveMetBefore(p1, p2, currentRound)
            if (!haveMet) {
              newMeetingsTotal++
            }
          }
        }
      }
    })

    // 완전한 그룹 결과 재계산 (모든 통계 포함)
    const fullyUpdatedResult = recalculateGroupResult(updatedGroups, updatedParticipants)


    // 상태 업데이트
    setResult(fullyUpdatedResult)
    setParticipants(updatedParticipants)

    // Supabase 업데이트
    try {
      const { saveGroupingResult, saveParticipants } = await import('@/utils/database')
      await Promise.all([
        saveGroupingResult(fullyUpdatedResult),
        saveParticipants(updatedParticipants)
      ])
      console.log('✅ 참가자 추가 후 데이터 저장 완료')
    } catch (error) {
      console.error('❌ 데이터 저장 중 오류:', error)
    }

    // 참가자 추가 시 스냅샷 생성
    createSnapshot('participant_add_result', `그룹 ${groupId}에 ${participant.name} 추가`)

    // 폼 초기화
    setNewParticipant({ name: '', gender: 'male', mbti: 'extrovert' })
    setShowAddForm(null)
  }

  // 추가 폼 취소
  const cancelAddForm = () => {
    setNewParticipant({ name: '', gender: 'male', mbti: 'extrovert' })
    setShowAddForm(null)
  }

  // 참가자 수정 시작
  const startEditParticipant = (participantId: string) => {
    const participant = participants.find(p => p.id === participantId)
    if (participant) {
      setEditingParticipant(participantId)
      setEditForm({
        name: participant.name,
        gender: participant.gender,
        mbti: participant.mbti
      })
    }
  }

  // 참가자 수정 저장
  const saveEditParticipant = async () => {
    if (!editingParticipant || !editForm.name.trim() || !result) return

    const participantToEdit = participants.find(p => p.id === editingParticipant)
    if (!participantToEdit) return

    // 참가자 정보 업데이트
    const updatedParticipants = participants.map(p => 
      p.id === editingParticipant 
        ? { ...p, name: editForm.name.trim(), gender: editForm.gender, mbti: editForm.mbti }
        : p
    )

    // 그룹 결과에서도 해당 참가자 정보 업데이트
    const updatedGroups = result.groups.map(group => ({
      ...group,
      members: group.members.map(member => 
        member.id === editingParticipant
          ? { ...member, name: editForm.name.trim(), gender: editForm.gender, mbti: editForm.mbti }
          : member
      )
    }))

    // 완전한 그룹 결과 재계산 (통계 업데이트)
    const fullyUpdatedResult = recalculateGroupResult(updatedGroups, updatedParticipants)

    // 상태 업데이트
    setResult(fullyUpdatedResult)
    setParticipants(updatedParticipants)

    // Supabase 업데이트
    try {
      const { saveGroupingResult, saveParticipants } = await import('@/utils/database')
      await Promise.all([
        saveGroupingResult(fullyUpdatedResult),
        saveParticipants(updatedParticipants)
      ])
      console.log('✅ 참가자 이동 후 데이터 저장 완료')
    } catch (error) {
      console.error('❌ 데이터 저장 중 오류:', error)
    }

    // 스냅샷 생성
    const { createSnapshot } = await import('@/utils/backup')
    await createSnapshot('participant_edit', `참가자 정보 수정: ${participantToEdit.name} → ${editForm.name.trim()}`)

    // 수정 모드 종료
    setEditingParticipant(null)
    setEditForm({ name: '', gender: 'male', mbti: 'extrovert' })
  }

  // 참가자 수정 취소
  const cancelEditParticipant = () => {
    setEditingParticipant(null)
    setEditForm({ name: '', gender: 'male', mbti: 'extrovert' })
  }

  // 참가자 삭제
  const deleteParticipant = async (participantId: string) => {
    if (!result) return

    const participantToDelete = participants.find(p => p.id === participantId)
    if (!participantToDelete) return

    const confirmMessage = `🗑️ "${participantToDelete.name}"을(를) 삭제하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없습니다.`
    
    if (!confirm(confirmMessage)) return

    // 이탈 참가자 목록에 추가
    const updatedExitedParticipants = {
      ...exitedParticipants,
      [participantId]: {
        name: participantToDelete.name,
        gender: participantToDelete.gender
      }
    }

    // 참가자 목록에서 제거
    const updatedParticipants = participants.filter(p => p.id !== participantId)

    // 그룹에서도 해당 참가자 제거
    const updatedGroups = result.groups.map(group => ({
      ...group,
      members: group.members.filter(member => member.id !== participantId)
    }))

    // 완전한 그룹 결과 재계산
    const fullyUpdatedResult = recalculateGroupResult(updatedGroups, updatedParticipants)

    // 상태 업데이트
    setResult(fullyUpdatedResult)
    setParticipants(updatedParticipants)
    setExitedParticipants(updatedExitedParticipants)

    // Supabase 업데이트
    try {
      const { saveGroupingResult, saveParticipants, saveExitedParticipants } = await import('@/utils/database')
      await Promise.all([
        saveGroupingResult(fullyUpdatedResult),
        saveParticipants(updatedParticipants),
        saveExitedParticipants(updatedExitedParticipants)
      ])
      console.log('✅ 참가자 제거 후 데이터 저장 완료')
    } catch (error) {
      console.error('❌ 데이터 저장 중 오류:', error)
    }



    // 스냅샷 생성
    const { createSnapshot } = await import('@/utils/backup')
    await createSnapshot('participant_delete_result', `참가자 삭제: ${participantToDelete.name}`)

    // 선택 상태 초기화
    if (editingParticipant === participantId) {
      setEditingParticipant(null)
      setEditForm({ name: '', gender: 'male', mbti: 'extrovert' })
    }
    if (swapSelectedParticipant?.id === participantId) {
      setSwapSelectedParticipant(null)
    }
  }

  // 두 참가자 swap 함수
  const swapParticipants = async (participant1Id: string, group1Id: number, participant2Id: string, group2Id: number) => {
    if (!result) return

    const updatedGroups = result.groups.map(group => {
      if (group.id === group1Id) {
        // group1에서 participant1을 participant2로 교체
        const updatedMembers = group.members.map(member => 
          member.id === participant1Id 
            ? result.groups.find(g => g.id === group2Id)?.members.find(m => m.id === participant2Id)!
            : member
        )
        return { ...group, members: updatedMembers }
      } else if (group.id === group2Id) {
        // group2에서 participant2를 participant1로 교체
        const updatedMembers = group.members.map(member =>
          member.id === participant2Id
            ? result.groups.find(g => g.id === group1Id)?.members.find(m => m.id === participant1Id)!
            : member
        )
        return { ...group, members: updatedMembers }
      }
      return group
    })

    // 참가자들의 개별 상태도 업데이트 (그룹 히스토리와 만남 기록 수정)
    const currentRound = result.round || 1
    const updatedParticipants = participants.map(participant => {
      let updatedParticipant = { ...participant }
      
      if (participant.id === participant1Id) {
        // participant1의 마지막 그룹 히스토리를 새로운 그룹(group2Id)으로 변경
        const newGroupHistory = [...participant.groupHistory]
        if (newGroupHistory.length > 0) {
          newGroupHistory[newGroupHistory.length - 1] = group2Id
        }
        updatedParticipant.groupHistory = newGroupHistory
        
        // 현재 라운드 만남 기록 업데이트: participant1이 이제 group2에 속함
        const newMeetingsByRound = { ...participant.meetingsByRound }
        if (!newMeetingsByRound[currentRound]) newMeetingsByRound[currentRound] = []
        
        // 새로운 그룹 구성에서 participant1과 같은 그룹인 사람들 = group2의 기존 멤버들 (participant2 제외) + participant1
        const newGroupMembers = updatedGroups.find(g => g.id === group2Id)?.members || []
        const newMeetings = newGroupMembers
          .filter(member => member.id !== participant1Id) // 자신 제외
          .map(member => member.id)
        
        newMeetingsByRound[currentRound] = newMeetings
        updatedParticipant.meetingsByRound = newMeetingsByRound
        
      } else if (participant.id === participant2Id) {
        // participant2의 마지막 그룹 히스토리를 새로운 그룹(group1Id)으로 변경
        const newGroupHistory = [...participant.groupHistory]
        if (newGroupHistory.length > 0) {
          newGroupHistory[newGroupHistory.length - 1] = group1Id
        }
        updatedParticipant.groupHistory = newGroupHistory
        
        // 현재 라운드 만남 기록 업데이트: participant2가 이제 group1에 속함
        const newMeetingsByRound = { ...participant.meetingsByRound }
        if (!newMeetingsByRound[currentRound]) newMeetingsByRound[currentRound] = []
        
        // 새로운 그룹 구성에서 participant2와 같은 그룹인 사람들 = group1의 기존 멤버들 (participant1 제외) + participant2
        const newGroupMembers = updatedGroups.find(g => g.id === group1Id)?.members || []
        const newMeetings = newGroupMembers
          .filter(member => member.id !== participant2Id) // 자신 제외
          .map(member => member.id)
        
        newMeetingsByRound[currentRound] = newMeetings
        updatedParticipant.meetingsByRound = newMeetingsByRound
        
      } else {
        // 다른 참가자들의 만남 기록을 새로운 그룹 구조에 맞춰 재계산
        const newMeetingsByRound = { ...participant.meetingsByRound }
        if (!newMeetingsByRound[currentRound]) newMeetingsByRound[currentRound] = []
        
        // 이 참가자가 속한 새로운 그룹 찾기
        const participantGroup = updatedGroups.find(group => 
          group.members.some(member => member.id === participant.id)
        )
        
        if (participantGroup) {
          // 같은 그룹 멤버들과의 만남 기록 설정 (자신 제외)
          const newMeetings = participantGroup.members
            .filter(member => member.id !== participant.id)
            .map(member => member.id)
          
          newMeetingsByRound[currentRound] = newMeetings
        }
        
        updatedParticipant.meetingsByRound = newMeetingsByRound
      }
      
      // allMetPeople는 통계 계산 시 실시간으로 처리하므로 여기서는 업데이트하지 않음
      
      return updatedParticipant
    })

    // 완전한 그룹 결과 재계산 (모든 통계 포함)
    const fullyUpdatedResult = recalculateGroupResult(updatedGroups, updatedParticipants)

    // 상태 업데이트
    setResult(fullyUpdatedResult)
    setParticipants(updatedParticipants)
    
    // Supabase 업데이트
    try {
      const { saveGroupingResult, saveParticipants } = await import('@/utils/database')
      await Promise.all([
        saveGroupingResult(fullyUpdatedResult),
        saveParticipants(updatedParticipants)
      ])
      console.log('✅ 참가자 편집 후 데이터 저장 완료')
    } catch (error) {
      console.error('❌ 데이터 저장 중 오류:', error)
    }

    // 성공 메시지 표시
    const p1Name = result.groups.find(g => g.id === group1Id)?.members.find(m => m.id === participant1Id)?.name
    const p2Name = result.groups.find(g => g.id === group2Id)?.members.find(m => m.id === participant2Id)?.name
    setSwapMessage(`${p1Name} ↔ ${p2Name} 위치 변경 완료!`)
    
    // Swap 시 스냅샷 생성
    createSnapshot('swap', `${p1Name} ↔ ${p2Name} 위치 변경`)
    
    // 3초 후 메시지 자동 제거
    setTimeout(() => setSwapMessage(null), 3000)
    
  }

  // 드래그 시작
  const handleDragStart = (participantId: string, groupId: number) => {
    setDraggedParticipant({ id: participantId, fromGroupId: groupId })
  }

  // 드래그 오버 (드롭 허용)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  // 드롭 (swap 실행)
  const handleDrop = (targetParticipantId: string, targetGroupId: number) => {
    if (draggedParticipant) {
      // 같은 참가자인지 확인
      if (draggedParticipant.id === targetParticipantId) {
        setDraggedParticipant(null)
        return
      }
      
      // 같은 그룹 내에서 swap 시도하는지 확인
      if (draggedParticipant.fromGroupId === targetGroupId) {
        setSwapMessage('❌ 같은 그룹 내에서는 자리 바꾸기가 불가능합니다.')
        setTimeout(() => setSwapMessage(null), 3000)
        setDraggedParticipant(null)
        return
      }
      
      swapParticipants(
        draggedParticipant.id, 
        draggedParticipant.fromGroupId,
        targetParticipantId,
        targetGroupId
      )
      setDraggedParticipant(null)
    }
  }

  // 터치/클릭 기반 swap 처리
  const handleParticipantClick = async (participantId: string, groupId: number) => {
    if (!swapSelectedParticipant) {
      // 첫 번째 선택
      setSwapSelectedParticipant({ id: participantId, groupId })
      setSwapMessage('💡 이제 바꿀 다른 참가자를 선택해주세요.')
    } else {
      // 두 번째 선택
      if (swapSelectedParticipant.id === participantId) {
        // 같은 사람을 다시 클릭한 경우 선택 취소
        setSwapSelectedParticipant(null)
        setSwapMessage('선택이 취소되었습니다.')
        setTimeout(() => setSwapMessage(null), 2000)
        return
      }
      
      // 같은 그룹 내에서 swap 시도하는지 확인
      if (swapSelectedParticipant.groupId === groupId) {
        setSwapMessage('❌ 같은 그룹 내에서는 자리 바꾸기가 불가능합니다.')
        setTimeout(() => setSwapMessage(null), 3000)
        setSwapSelectedParticipant(null)
        return
      }
      
      // swap 실행
      await swapParticipants(
        swapSelectedParticipant.id,
        swapSelectedParticipant.groupId,
        participantId,
        groupId
      )
      setSwapSelectedParticipant(null)
    }
  }

  const getBalanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getBalanceText = (score: number) => {
    if (score >= 80) return '우수'
    if (score >= 60) return '보통'
    return '개선필요'
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>결과를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Swap 성공 토스트 메시지 */}
      {swapMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ease-in-out">
          <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center">
            <span className="mr-2">✅</span>
            <span className="font-medium">{swapMessage}</span>
          </div>
        </div>
      )}
      
      <div className="max-w-6xl mx-auto px-4">
        {/* 홈 네비게이션 */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
          >
            <span className="text-lg">🏠</span>
            <span className="font-medium">홈으로</span>
          </button>
          
          <div className="text-sm text-gray-500">
            {result.round}라운드 결과
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {result.round}라운드 그룹 배치 결과
          </h1>
          <p className="text-gray-600">최적화된 그룹 배치가 완료되었습니다</p>
        </div>

        {/* 네비게이션 탭 */}
        <div className="bg-white rounded-lg shadow-md mb-8">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                activeTab === 'groups'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-lg mr-2">👥</span>
              그룹 결과
            </button>
            <button
              onClick={() => setActiveTab('seating')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                activeTab === 'seating'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-lg mr-2">🪑</span>
              좌석 배치도
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                activeTab === 'stats'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-lg mr-2">📊</span>
              참가자 통계
            </button>
          </div>
        </div>

        {activeTab === 'groups' && (
          <>
            {/* 요약 통계 */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">배치 요약</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{result.summary.totalGroups}</div>
              <div className="text-sm text-gray-600">총 그룹 수</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{result.summary.newMeetingsCount}</div>
              <div className="text-sm text-gray-600">새로운 만남</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className={`text-2xl font-bold ${getBalanceColor(result.summary.genderBalanceScore)}`}>
                {result.summary.genderBalanceScore}%
              </div>
              <div className="text-sm text-gray-600">성별 균형</div>
              <div className={`text-xs ${getBalanceColor(result.summary.genderBalanceScore)}`}>
                {getBalanceText(result.summary.genderBalanceScore)}
              </div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className={`text-2xl font-bold ${getBalanceColor(result.summary.mbtiBalanceScore)}`}>
                {result.summary.mbtiBalanceScore}%
              </div>
              <div className="text-sm text-gray-600">MBTI 균형</div>
              <div className={`text-xs ${getBalanceColor(result.summary.mbtiBalanceScore)}`}>
                {getBalanceText(result.summary.mbtiBalanceScore)}
              </div>
            </div>
          </div>
        </div>

        {/* 기능 안내 */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <div className="text-blue-400 text-lg">🔧</div>
            </div>
            <div className="ml-3">
              <div className="text-sm text-blue-700">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="mb-1">
                      <strong>🔄 위치 변경:</strong> 
                      {isMobile 
                        ? ' 첫 번째 참가자를 터치하고, 바꿀 다른 참가자를 터치하면 두 사람의 위치가 바뀝니다.'
                        : ' 참가자를 드래그해서 다른 참가자에게 드롭하면 두 사람의 위치가 바뀝니다.'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="mb-1">
                      <strong>✏️ 정보 수정:</strong> 수정 버튼을 클릭하면 참가자의 이름, 성별, MBTI를 변경할 수 있습니다.
                    </p>
                  </div>
                  <div>
                    <p className="mb-1">
                      <strong>🗑️ 참가자 삭제:</strong> 삭제 버튼을 클릭하면 해당 참가자를 그룹에서 제거할 수 있습니다.
                    </p>
                  </div>
                </div>
                <p className="text-xs text-blue-600 mt-3">
                  📝 <strong>업데이트되는 상태:</strong> 그룹 구성, 성별/MBTI 통계, 새로운 만남 수, 그룹 히스토리가 자동으로 재계산됩니다.
                </p>
                {swapSelectedParticipant && (
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-orange-600">
                      🎯 <strong>선택됨:</strong> {result?.groups.find(g => g.members.some(m => m.id === swapSelectedParticipant.id))?.members.find(m => m.id === swapSelectedParticipant.id)?.name} (그룹 {swapSelectedParticipant.groupId})
                    </p>
                    <button
                      onClick={() => {
                        setSwapSelectedParticipant(null)
                        setSwapMessage('선택이 취소되었습니다.')
                        setTimeout(() => setSwapMessage(null), 2000)
                      }}
                      className="text-xs bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded ml-2"
                    >
                      취소
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 그룹별 상세 결과 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {result.groups.filter(group => group.members.length > 0).map((group) => (
            <div key={group.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  그룹 {group.id}
                </h3>
                <span className="text-sm text-gray-500">
                  {group.members.length}명
                </span>
              </div>

              {/* 그룹 균형 표시 */}
              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <div className="space-y-3">
                  {/* 성별 비율 시각화 */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">성별 비율</span>
                      <span className="text-xs text-gray-500">남 {group.maleCount} · 여 {group.femaleCount}</span>
                    </div>
                    <div className="flex h-4 bg-gray-200 rounded-full overflow-hidden">
                      {group.maleCount > 0 && (
                        <div 
                          className="bg-blue-500 flex items-center justify-center text-white text-xs font-medium transition-all duration-500"
                          style={{ width: `${(group.maleCount / group.members.length) * 100}%` }}
                        >
                          {group.maleCount > 0 && group.members.length > 3 && (
                            <span>{group.maleCount}</span>
                          )}
                        </div>
                      )}
                      {group.femaleCount > 0 && (
                        <div 
                          className="bg-pink-500 flex items-center justify-center text-white text-xs font-medium transition-all duration-500"
                          style={{ width: `${(group.femaleCount / group.members.length) * 100}%` }}
                        >
                          {group.femaleCount > 0 && group.members.length > 3 && (
                            <span>{group.femaleCount}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>남성 {Math.round((group.maleCount / group.members.length) * 100)}%</span>
                      <span>여성 {Math.round((group.femaleCount / group.members.length) * 100)}%</span>
                    </div>
                  </div>

                  {/* MBTI 비율 시각화 */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">MBTI 비율</span>
                      <span className="text-xs text-gray-500">외향 {group.extrovertCount} · 내향 {group.introvertCount}</span>
                    </div>
                    <div className="flex h-4 bg-gray-200 rounded-full overflow-hidden">
                      {group.extrovertCount > 0 && (
                        <div 
                          className="bg-orange-500 flex items-center justify-center text-white text-xs font-medium transition-all duration-500"
                          style={{ width: `${(group.extrovertCount / group.members.length) * 100}%` }}
                        >
                          {group.extrovertCount > 0 && group.members.length > 3 && (
                            <span>{group.extrovertCount}</span>
                          )}
                        </div>
                      )}
                      {group.introvertCount > 0 && (
                        <div 
                          className="bg-purple-500 flex items-center justify-center text-white text-xs font-medium transition-all duration-500"
                          style={{ width: `${(group.introvertCount / group.members.length) * 100}%` }}
                        >
                          {group.introvertCount > 0 && group.members.length > 3 && (
                            <span>{group.introvertCount}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>외향형 {Math.round((group.extrovertCount / group.members.length) * 100)}%</span>
                      <span>내향형 {Math.round((group.introvertCount / group.members.length) * 100)}%</span>
                    </div>
                  </div>

                  {/* 균형 점수 표시 */}
                  <div className="flex justify-between text-xs pt-2 border-t border-gray-300">
                    <div className="flex items-center">
                      <span className="text-gray-600 mr-1">성별 균형:</span>
                      <span className={`font-medium ${
                        Math.abs(group.maleCount - group.femaleCount) <= 1 ? 'text-green-600' : 
                        Math.abs(group.maleCount - group.femaleCount) <= 2 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {Math.abs(group.maleCount - group.femaleCount) <= 1 ? '우수' : 
                         Math.abs(group.maleCount - group.femaleCount) <= 2 ? '보통' : '개선필요'}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-gray-600 mr-1">MBTI 균형:</span>
                      <span className={`font-medium ${
                        Math.abs(group.extrovertCount - group.introvertCount) <= 1 ? 'text-green-600' : 
                        Math.abs(group.extrovertCount - group.introvertCount) <= 2 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {Math.abs(group.extrovertCount - group.introvertCount) <= 1 ? '우수' : 
                         Math.abs(group.extrovertCount - group.introvertCount) <= 2 ? '보통' : '개선필요'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 그룹 멤버 목록 */}
              <div className="space-y-2">
                {group.members.map((member) => {
                  const participantHistory = participants.find(p => p.id === member.id)
                  const previousGroups = participantHistory?.groupHistory?.slice(0, -1) || []
                  const isDragging = draggedParticipant?.id === member.id
                  const isSelected = swapSelectedParticipant?.id === member.id
                  const isSwapTarget = swapSelectedParticipant && swapSelectedParticipant.id !== member.id && swapSelectedParticipant.groupId !== group.id
                  
                  return (
                    <div 
                      key={member.id} 
                      className={`
                        border border-gray-200 rounded transition-all duration-200
                        ${editingParticipant === member.id ? 'border-purple-400 bg-purple-50' : ''}
                        ${isDragging ? 'opacity-50 scale-95 border-blue-400 bg-blue-50' : ''}
                        ${isSelected ? 'border-orange-500 bg-orange-100 shadow-lg ring-2 ring-orange-300' : ''}
                        ${isSwapTarget ? 'border-green-500 bg-green-100 hover:border-green-600 hover:bg-green-200 shadow-lg ring-2 ring-green-300' : ''}
                        ${!isDragging && !isSelected && !isSwapTarget && editingParticipant !== member.id ? 'hover:border-blue-300 hover:bg-blue-50' : ''}
                        ${draggedParticipant && draggedParticipant.id !== member.id && draggedParticipant.fromGroupId !== group.id ? 'border-green-300 bg-green-50 hover:border-green-400 hover:bg-green-100 shadow-md' : ''}
                      `}
                    >
                      {editingParticipant === member.id ? (
                        // 수정 모드
                        <div className="p-3 space-y-3">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-purple-700">참가자 정보 수정</h4>
                            <div className="text-xs text-purple-600">그룹 {group.id}</div>
                          </div>
                          
                          <div className="space-y-2">
                            <input
                              type="text"
                              placeholder="이름"
                              value={editForm.name}
                              onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            
                            <div className="grid grid-cols-2 gap-2">
                              <select
                                value={editForm.gender}
                                onChange={(e) => setEditForm({...editForm, gender: e.target.value as 'male' | 'female'})}
                                className="border border-gray-300 rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                              >
                                <option value="male">남성</option>
                                <option value="female">여성</option>
                              </select>
                              
                              <select
                                value={editForm.mbti}
                                onChange={(e) => setEditForm({...editForm, mbti: e.target.value as 'extrovert' | 'introvert'})}
                                className="border border-gray-300 rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                              >
                                <option value="extrovert">외향형</option>
                                <option value="introvert">내향형</option>
                              </select>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={saveEditParticipant}
                              disabled={!editForm.name.trim()}
                              className="flex-1 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white font-medium py-2 px-3 rounded-md text-sm"
                            >
                              저장
                            </button>
                            <button
                              onClick={cancelEditParticipant}
                              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-3 rounded-md text-sm"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      ) : (
                        // 일반 모드
                        <div className="flex items-center justify-between p-2">
                          <div 
                            draggable={!isMobile && !swapSelectedParticipant}
                            onDragStart={!isMobile && !swapSelectedParticipant ? () => handleDragStart(member.id, group.id) : undefined}
                            onDragOver={!isMobile ? handleDragOver : undefined}
                            onDrop={!isMobile ? () => handleDrop(member.id, group.id) : undefined}
                            onClick={isMobile && !swapSelectedParticipant ? () => handleParticipantClick(member.id, group.id) : undefined}
                            className={`flex-1 ${
                              !swapSelectedParticipant ? (isMobile ? 'cursor-pointer' : 'cursor-move') : 'cursor-default'
                            }`}
                            title={
                              isSelected ? '선택됨 - 다시 터치하면 선택 취소' :
                              isSwapTarget ? `${member.name}과 위치 바꾸기` :
                              !swapSelectedParticipant && isMobile ? '터치해서 선택' :
                              !swapSelectedParticipant && draggedParticipant && draggedParticipant.id !== member.id ? `${member.name}과 위치 바꾸기` : 
                              !swapSelectedParticipant ? '드래그해서 다른 사람과 위치 바꾸기' : ''
                            }
                          >
                            <span className="font-medium">{member.name}</span>
                            <div className="text-xs text-gray-500">
                              {member.gender === 'male' ? '남성' : '여성'} · {' '}
                              {member.mbti === 'extrovert' ? '외향' : '내향'}
                            </div>
                            <div className="text-xs text-blue-600">
                              현재 그룹: {group.id}
                            </div>
                            {previousGroups.length > 0 && (
                              <div className="text-xs text-gray-400">
                                이전: {previousGroups.slice(-3).join(', ')}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1 ml-2">
                            {isSelected && (
                              <div className="text-orange-500 text-sm font-bold animate-pulse">
                                ✅
                              </div>
                            )}
                            {isSwapTarget && (
                              <div className="text-green-500 text-sm font-bold animate-bounce">
                                🔄
                              </div>
                            )}
                            
                            {!isSelected && !isSwapTarget && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => startEditParticipant(member.id)}
                                  className="text-purple-500 hover:text-purple-700 text-xs px-1 py-1 rounded hover:bg-purple-100 transition-colors"
                                  title="참가자 정보 수정"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => deleteParticipant(member.id)}
                                  className="text-red-500 hover:text-red-700 text-xs px-1 py-1 rounded hover:bg-red-100 transition-colors"
                                  title="참가자 삭제"
                                >
                                  🗑️
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
                
                {/* 참가자 추가 폼 */}
                {showAddForm === group.id ? (
                  <div className="p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">새 참가자 추가</h4>
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="이름"
                        value={newParticipant.name}
                        onChange={(e) => setNewParticipant({...newParticipant, name: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={newParticipant.gender}
                          onChange={(e) => setNewParticipant({...newParticipant, gender: e.target.value as 'male' | 'female'})}
                          className="border border-gray-300 rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="male">남성</option>
                          <option value="female">여성</option>
                        </select>
                        
                        <select
                          value={newParticipant.mbti}
                          onChange={(e) => setNewParticipant({...newParticipant, mbti: e.target.value as 'extrovert' | 'introvert'})}
                          className="border border-gray-300 rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="extrovert">외향형</option>
                          <option value="introvert">내향형</option>
                        </select>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => addParticipantToGroup(group.id)}
                          disabled={!newParticipant.name.trim()}
                          className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-medium py-2 px-3 rounded-md text-sm"
                        >
                          추가
                        </button>
                        <button
                          onClick={cancelAddForm}
                          className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-3 rounded-md text-sm"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddForm(group.id)}
                    className="w-full p-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
                  >
                    <div className="flex items-center justify-center">
                      <span className="text-lg mr-1">+</span>
                      <span className="text-sm">참가자 추가</span>
                    </div>
                  </button>
                )}
              </div>

              {/* 새로운 만남 표시 */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-xs text-green-600">
새로운 만남: {group.newMeetingsCount}쌍
                </div>
              </div>
            </div>
          ))}
        </div>

          </>
        )}

        {activeTab === 'seating' && result && (
          <SeatingChart 
            groups={result.groups} 
            participants={participants}
            onPrint={() => window.print()}
          />
        )}

        {activeTab === 'stats' && (
          <div className="space-y-6">
            {/* 참가자 통계 계산 */}
            {(() => {
              const participantStats = participants.map(participant => {
                // 이전 라운드들에서 만난 사람들 (새로운 구조 사용)
                const previousMeetings = getPreviousRoundsMeetings(participant.id)
                
                // 현재 라운드에서 만날 사람들
                const currentRoundMeetings = getCurrentRoundMeetings(participant.id)
                
                // 전체 만남 = meetingsByRound에서 직접 계산 (이탈한 사람 포함)
                const allMetIds = new Set<string>()
                Object.values(participant.meetingsByRound).forEach(roundMeetings => {
                  roundMeetings.forEach(personId => allMetIds.add(personId))
                })
                const totalMet = allMetIds.size
                
                
                // 이성 만남 계산 - 이탈한 사람도 포함해서 계산
                // 현재 상태에서 이탈 참가자 정보 가져오기
                const currentExitedParticipants = exitedParticipants
                
                const oppositeMet = Array.from(allMetIds).filter(metId => {
                  const metPerson = participants.find(p => p.id === metId)
                  // 현재 참가자 중에 있으면 성별 비교
                  if (metPerson) {
                    const isOpposite = metPerson.gender !== participant.gender
                    return isOpposite
                  }
                  // 이탈한 사람의 경우 저장된 정보 사용
                  const exitedPerson = currentExitedParticipants[metId]
                  if (exitedPerson) {
                    const isOpposite = exitedPerson.gender !== participant.gender
                    return isOpposite
                  }
                  return false
                }).length
                
                
                // 현재 라운드에서 새로 만날 사람 수 (이전에 만나지 않은 사람들만)
                const newInCurrentRound = currentRoundMeetings.filter(meetingId => 
                  !previousMeetings.includes(meetingId)
                ).length
                
                // 현재 그룹 ID
                const currentGroup = result?.groups.find(group => 
                  group.members.some(member => member.id === participant.id)
                )
                
                return {
                  ...participant,
                  totalMet,
                  oppositeMet,
                  newInCurrentRound,
                  currentGroupId: currentGroup?.id,
                  previousMeetings,
                  currentRoundMeetings
                }
              })

              // 히스토그램을 위한 데이터 그룹핑
              const totalMetCounts = participantStats.reduce((acc, p) => {
                acc[p.totalMet] = (acc[p.totalMet] || 0) + 1
                return acc
              }, {} as Record<number, number>)

              const oppositeMetCounts = participantStats.reduce((acc, p) => {
                acc[p.oppositeMet] = (acc[p.oppositeMet] || 0) + 1
                return acc
              }, {} as Record<number, number>)

              const maxTotalMet = Math.max(...participantStats.map(p => p.totalMet), 0)
              const maxOppositeMet = Math.max(...participantStats.map(p => p.oppositeMet), 0)
              const maxCount = Math.max(...Object.values(totalMetCounts), ...Object.values(oppositeMetCounts), 1)

              return (
                <>
                  {/* 전체 만남 히스토그램 */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <span className="text-blue-500 mr-2">👥</span>
                      전체 만남 수 분포
                    </h3>
                    <div className="space-y-3">
                      {Array.from({ length: maxTotalMet + 1 }, (_, i) => i).map(count => (
                        <div key={count} className="flex items-center">
                          <div className="w-16 text-sm text-gray-600">{count}명:</div>
                          <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                            <div 
                              className="bg-blue-500 h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                              style={{ width: `${((totalMetCounts[count] || 0) / maxCount) * 100}%` }}
                            >
                              <span className="text-white text-xs font-medium">
                                {totalMetCounts[count] || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 이성 만남 히스토그램 */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <span className="text-pink-500 mr-2">💕</span>
                      이성 만남 수 분포
                    </h3>
                    <div className="space-y-3">
                      {Array.from({ length: maxOppositeMet + 1 }, (_, i) => i).map(count => (
                        <div key={count} className="flex items-center">
                          <div className="w-16 text-sm text-gray-600">{count}명:</div>
                          <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                            <div 
                              className="bg-pink-500 h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                              style={{ width: `${((oppositeMetCounts[count] || 0) / maxCount) * 100}%` }}
                            >
                              <span className="text-white text-xs font-medium">
                                {oppositeMetCounts[count] || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 개별 참가자 상세 */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <span className="text-green-500 mr-2">👤</span>
                      개별 참가자 상세 정보
                    </h3>
                    <p className="text-sm text-gray-600 mb-6">참가자를 클릭하면 만난 사람들 목록을 확인할 수 있습니다.</p>
                    
                    {(() => {
                      // 남녀로 분리하고 각각 가나다 순으로 정렬
                      const maleParticipants = participantStats
                        .filter(p => p.gender === 'male')
                        .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
                      
                      const femaleParticipants = participantStats
                        .filter(p => p.gender === 'female')
                        .sort((a, b) => a.name.localeCompare(b.name, 'ko'))

                      return (
                        <div className="space-y-8">
                          {/* 남성 참가자 섹션 */}
                          {maleParticipants.length > 0 && (
                            <div>
                              <div className="flex items-center mb-4 pb-2 border-b border-blue-200">
                                <span className="text-blue-600 text-xl mr-3">👨</span>
                                <h4 className="text-lg font-semibold text-blue-800">
                                  남성 참가자 ({maleParticipants.length}명)
                                </h4>
                              </div>
                              
                                                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                 {maleParticipants.map(participant => (
                                   <div 
                                     key={participant.id}
                                     onClick={() => setSelectedParticipant(
                                       selectedParticipant === participant.id ? null : participant.id
                                     )}
                                     className="border border-blue-200 rounded-lg p-4 hover:bg-blue-50 cursor-pointer transition-colors"
                                   >
                                     <div className="flex justify-between items-start mb-2">
                                       <h5 className="font-medium text-gray-800">{participant.name}</h5>
                                       <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                                         남성 · {participant.mbti === 'extrovert' ? '외향' : '내향'}
                                       </div>
                                     </div>
                                     
                                     <div className="grid grid-cols-3 gap-2 text-sm">
                                       <div className="text-center p-2 bg-blue-50 rounded">
                                         <div className="font-semibold text-blue-600">{participant.totalMet}</div>
                                         <div className="text-gray-600">전체 만남</div>
                                       </div>
                                       <div className="text-center p-2 bg-pink-50 rounded">
                                         <div className="font-semibold text-pink-600">{participant.oppositeMet}</div>
                                         <div className="text-gray-600">이성 만남</div>
                                       </div>
                                       <div className="text-center p-2 bg-green-50 rounded">
                                         <div className="font-semibold text-green-600">{participant.newInCurrentRound}</div>
                                         <div className="text-gray-600">이번 라운드</div>
                                       </div>
                                     </div>
                                     
                                     <div className="mt-2 text-xs text-gray-500 text-center">
                                       현재 그룹: {participant.currentGroupId || '없음'}
                                     </div>

                                     {selectedParticipant === participant.id && (
                                       <div className="mt-4 pt-4 border-t border-gray-200">
                                         <h6 className="font-medium text-gray-700 mb-2">만난 사람들:</h6>
                                         
                                         {/* 이전에 만난 사람들 */}
                                         {participant.previousMeetings && participant.previousMeetings.length > 0 && (
                                           <div className="mb-3">
                                             <div className="text-xs font-medium text-gray-600 mb-1">이미 만난 사람들:</div>
                                             <div className="flex flex-wrap gap-2">
                                               {participant.previousMeetings.map(metId => {
                                                 const metPerson = participants.find(p => p.id === metId)
                                                 const exitedPerson = exitedParticipants[metId]
                                                 
                                                 // 현재 참가자 또는 이탈한 참가자 정보가 있어야 표시
                                                 if (!metPerson && !exitedPerson) return null
                                                 
                                                 const personInfo = metPerson || exitedPerson
                                                 const isExited = !metPerson
                                                 
                                                 return (
                                                   <span 
                                                     key={metId}
                                                     className={`text-xs px-2 py-1 rounded-full ${
                                                       isExited 
                                                         ? 'bg-gray-100 text-gray-500 opacity-75'
                                                         : personInfo.gender === 'male'
                                                           ? 'bg-blue-100 text-blue-700' 
                                                           : 'bg-red-100 text-red-700'
                                                     }`}
                                                   >
                                                     {personInfo.name} {isExited ? '❌' : personInfo.gender === 'male' ? '👨' : '👩'}
                                                   </span>
                                                 )
                                               })}
                                             </div>
                                           </div>
                                         )}
                                         
                                         {/* 현재 라운드에서 만날 사람들 */}
                                         {participant.currentRoundMeetings && participant.currentRoundMeetings.length > 0 && (
                                           <div>
                                             <div className="text-xs font-medium text-green-600 mb-1">이번 라운드에서 만날 사람들:</div>
                                             <div className="flex flex-wrap gap-2">
                                               {participant.currentRoundMeetings.map(meetingId => {
                                                 const meetingPerson = participants.find(p => p.id === meetingId)
                                                 if (!meetingPerson) return null
                                                 
                                                 return (
                                                   <span 
                                                     key={meetingId}
                                                     className={`text-xs px-2 py-1 rounded-full border-2 border-dashed ${
                                                       meetingPerson.gender === 'male'
                                                         ? 'bg-blue-50 text-blue-700 border-blue-300' 
                                                         : 'bg-red-50 text-red-700 border-red-300'
                                                     }`}
                                                   >
                                                     {meetingPerson.name} {meetingPerson.gender === 'male' ? '👨' : '👩'} ✨
                                                   </span>
                                                 )
                                               })}
                                             </div>
                                           </div>
                                         )}
                                         
                                         {(!participant.previousMeetings?.length && !participant.currentRoundMeetings?.length) && (
                                           <p className="text-gray-500 text-sm">아직 만난 사람이 없습니다.</p>
                                         )}
                                       </div>
                                     )}
                                   </div>
                                 ))}
                              </div>
                            </div>
                          )}

                          {/* 여성 참가자 섹션 */}
                          {femaleParticipants.length > 0 && (
                            <div>
                              <div className="flex items-center mb-4 pb-2 border-b border-pink-200">
                                <span className="text-pink-600 text-xl mr-3">👩</span>
                                <h4 className="text-lg font-semibold text-pink-800">
                                  여성 참가자 ({femaleParticipants.length}명)
                                </h4>
                              </div>
                              
                                                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                 {femaleParticipants.map(participant => (
                                   <div 
                                     key={participant.id}
                                     onClick={() => setSelectedParticipant(
                                       selectedParticipant === participant.id ? null : participant.id
                                     )}
                                     className="border border-pink-200 rounded-lg p-4 hover:bg-pink-50 cursor-pointer transition-colors"
                                   >
                                     <div className="flex justify-between items-start mb-2">
                                       <h5 className="font-medium text-gray-800">{participant.name}</h5>
                                       <div className="text-xs text-pink-600 bg-pink-100 px-2 py-1 rounded-full">
                                         여성 · {participant.mbti === 'extrovert' ? '외향' : '내향'}
                                       </div>
                                     </div>
                                     
                                     <div className="grid grid-cols-3 gap-2 text-sm">
                                       <div className="text-center p-2 bg-blue-50 rounded">
                                         <div className="font-semibold text-blue-600">{participant.totalMet}</div>
                                         <div className="text-gray-600">전체 만남</div>
                                       </div>
                                       <div className="text-center p-2 bg-pink-50 rounded">
                                         <div className="font-semibold text-pink-600">{participant.oppositeMet}</div>
                                         <div className="text-gray-600">이성 만남</div>
                                       </div>
                                       <div className="text-center p-2 bg-green-50 rounded">
                                         <div className="font-semibold text-green-600">{participant.newInCurrentRound}</div>
                                         <div className="text-gray-600">이번 라운드</div>
                                       </div>
                                     </div>
                                     
                                     <div className="mt-2 text-xs text-gray-500 text-center">
                                       현재 그룹: {participant.currentGroupId || '없음'}
                                     </div>

                                     {selectedParticipant === participant.id && (
                                       <div className="mt-4 pt-4 border-t border-gray-200">
                                         <h6 className="font-medium text-gray-700 mb-2">만난 사람들:</h6>
                                         
                                         {/* 이전에 만난 사람들 */}
                                         {participant.previousMeetings && participant.previousMeetings.length > 0 && (
                                           <div className="mb-3">
                                             <div className="text-xs font-medium text-gray-600 mb-1">이미 만난 사람들:</div>
                                             <div className="flex flex-wrap gap-2">
                                               {participant.previousMeetings.map(metId => {
                                                 const metPerson = participants.find(p => p.id === metId)
                                                 const exitedPerson = exitedParticipants[metId]
                                                 
                                                 // 현재 참가자 또는 이탈한 참가자 정보가 있어야 표시
                                                 if (!metPerson && !exitedPerson) return null
                                                 
                                                 const personInfo = metPerson || exitedPerson
                                                 const isExited = !metPerson
                                                 
                                                 return (
                                                   <span 
                                                     key={metId}
                                                     className={`text-xs px-2 py-1 rounded-full ${
                                                       isExited 
                                                         ? 'bg-gray-100 text-gray-500 opacity-75'
                                                         : personInfo.gender === 'male'
                                                           ? 'bg-blue-100 text-blue-700' 
                                                           : 'bg-red-100 text-red-700'
                                                     }`}
                                                   >
                                                     {personInfo.name} {isExited ? '❌' : personInfo.gender === 'male' ? '👨' : '👩'}
                                                   </span>
                                                 )
                                               })}
                                             </div>
                                           </div>
                                         )}
                                         
                                         {/* 현재 라운드에서 만날 사람들 */}
                                         {participant.currentRoundMeetings && participant.currentRoundMeetings.length > 0 && (
                                           <div>
                                             <div className="text-xs font-medium text-green-600 mb-1">이번 라운드에서 만날 사람들:</div>
                                             <div className="flex flex-wrap gap-2">
                                               {participant.currentRoundMeetings.map(meetingId => {
                                                 const meetingPerson = participants.find(p => p.id === meetingId)
                                                 if (!meetingPerson) return null
                                                 
                                                 return (
                                                   <span 
                                                     key={meetingId}
                                                     className={`text-xs px-2 py-1 rounded-full border-2 border-dashed ${
                                                       meetingPerson.gender === 'male'
                                                         ? 'bg-blue-50 text-blue-700 border-blue-300' 
                                                         : 'bg-red-50 text-red-700 border-red-300'
                                                     }`}
                                                   >
                                                     {meetingPerson.name} {meetingPerson.gender === 'male' ? '👨' : '👩'} ✨
                                                   </span>
                                                 )
                                               })}
                                             </div>
                                           </div>
                                         )}
                                         
                                         {(!participant.previousMeetings?.length && !participant.currentRoundMeetings?.length) && (
                                           <p className="text-gray-500 text-sm">아직 만난 사람이 없습니다.</p>
                                         )}
                                       </div>
                                     )}
                                   </div>
                                 ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                </>
              )
            })()}
          </div>
        )}

        {/* 액션 버튼 - 더 많은 간격 */}
        <div className="mt-16 mb-8">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/')}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-6 rounded-md"
            >
              다음 라운드 준비
            </button>
            <button
              onClick={() => {
                // Supabase에서는 데이터가 자동으로 유지되므로 바로 이동
                router.push('/')
              }}
              className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-md"
            >
              새로운 모임 시작
            </button>
            <button
              onClick={() => window.print()}
              className="bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-6 rounded-md"
            >
              결과 인쇄
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}