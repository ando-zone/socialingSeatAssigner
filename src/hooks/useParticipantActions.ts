import { useCallback } from 'react'
import type { GroupingResult, Participant } from '@/utils/grouping'
import { createSnapshot } from '@/utils/backup'

interface UseParticipantActionsProps {
  result: GroupingResult | null
  participants: Participant[]
  setResult: (result: GroupingResult | null) => void
  setParticipants: (participants: Participant[]) => void
  setSwapMessage: (message: string | null) => void
  editingParticipant: string | null
  setEditingParticipant: (id: string | null) => void
  setEditForm: (form: { name: string; gender: 'male' | 'female'; mbti: 'extrovert' | 'introvert' }) => void
  setShowAddForm: (groupId: number | null) => void
  setNewParticipant: (participant: { name: string; gender: 'male' | 'female'; mbti: 'extrovert' | 'introvert' }) => void
  setSelectedParticipant: (id: string | null) => void
  setSwapSelectedParticipant: (swap: { id: string; groupId: number } | null) => void
  setDraggedParticipant: (drag: { id: string; fromGroupId: number } | null) => void
  editForm: { name: string; gender: 'male' | 'female'; mbti: 'extrovert' | 'introvert' }
  newParticipant: { name: string; gender: 'male' | 'female'; mbti: 'extrovert' | 'introvert' }
  selectedParticipant: string | null
  swapSelectedParticipant: { id: string; groupId: number } | null
  draggedParticipant: { id: string; fromGroupId: number } | null
}

export function useParticipantActions({
  result,
  participants,
  setResult,
  setParticipants,
  setSwapMessage,
  editingParticipant,
  setEditingParticipant,
  setEditForm,
  setShowAddForm,
  setNewParticipant,
  setSelectedParticipant,
  setSwapSelectedParticipant,
  setDraggedParticipant,
  editForm,
  newParticipant,
  selectedParticipant,
  swapSelectedParticipant,
  draggedParticipant
}: UseParticipantActionsProps) {

  // 참가자 정보 수정 시작
  const startEditParticipant = useCallback((participantId: string) => {
    const participant = participants.find(p => p.id === participantId)
    if (participant) {
      setEditForm({
        name: participant.name,
        gender: participant.gender,
        mbti: participant.mbti
      })
      setEditingParticipant(participantId)
    }
  }, [participants, setEditForm, setEditingParticipant])

  // 참가자 정보 수정 저장
  const saveEditParticipant = useCallback(async () => {
    if (!editForm.name.trim()) return

    const updatedParticipants = participants.map(p => 
      p.id === editingParticipant ? { ...p, ...editForm } : p
    )

    try {
      const { saveParticipants } = await import('@/utils/database')
      await saveParticipants(updatedParticipants)
      await createSnapshot('participant_edit', `참가자 수정: ${editForm.name}`)
      
      setParticipants(updatedParticipants)
      setEditingParticipant(null)
    } catch (error) {
      console.error('참가자 수정 실패:', error)
    }
  }, [editForm, participants, editingParticipant, setParticipants, setEditingParticipant])

  // 참가자 정보 수정 취소
  const cancelEditParticipant = useCallback(() => {
    setEditingParticipant(null)
    setEditForm({ name: '', gender: 'male', mbti: 'extrovert' })
  }, [setEditingParticipant, setEditForm])

  // 참가자 삭제
  const deleteParticipant = useCallback(async (participantId: string) => {
    if (!confirm('정말 이 참가자를 삭제하시겠습니까?')) return

    const participantToDelete = participants.find(p => p.id === participantId)
    if (!participantToDelete) return

    try {
      const updatedParticipants = participants.filter(p => p.id !== participantId)
      
      // 결과에서도 제거
      if (result) {
        const updatedGroups = result.groups.map(group => ({
          ...group,
          members: group.members.filter(m => m.id !== participantId)
        }))
        
        const updatedResult = { ...result, groups: updatedGroups }
        setResult(updatedResult)
      }

      const { saveParticipants, saveGroupingResult, getExitedParticipants, saveExitedParticipants } = await import('@/utils/database')
      
      // 이탈 참가자로 기록
      const exitedParticipants = await getExitedParticipants()
      const newExitedParticipant = {
        [participantId]: {
          name: participantToDelete.name,
          gender: participantToDelete.gender
        }
      }
      
      await Promise.all([
        saveParticipants(updatedParticipants),
        result ? saveGroupingResult(result) : Promise.resolve(),
        saveExitedParticipants({ ...exitedParticipants, ...newExitedParticipant })
      ])

      await createSnapshot('participant_delete', `참가자 삭제: ${participantToDelete.name}`)
      
      setParticipants(updatedParticipants)
      
    } catch (error) {
      console.error('참가자 삭제 실패:', error)
    }
  }, [participants, result, setParticipants, setResult])

  // 그룹에 참가자 추가
  const addParticipantToGroup = useCallback(async (groupId: number) => {
    if (!newParticipant.name.trim() || !result) return

    try {
      const newParticipantData: Participant = {
        id: Date.now().toString(),
        name: newParticipant.name.trim(),
        gender: newParticipant.gender,
        mbti: newParticipant.mbti,
        meetingsByRound: {},
        allMetPeople: [],
        groupHistory: []
      }

      // 현재 라운드 정보 추가
      const currentRound = result.round
      const group = result.groups.find(g => g.id === groupId)
      if (group) {
        const existingMemberIds = group.members.map(m => m.id)
        newParticipantData.meetingsByRound = {
          [currentRound]: [...existingMemberIds]
        }
        newParticipantData.allMetPeople = [...existingMemberIds]
        newParticipantData.groupHistory = [groupId]
      }

      // 전체 participants 업데이트 (기존 그룹원들의 만남 기록에 새 참가자 추가)
      const updatedParticipants = participants.map(p => {
        if (group && group.members.some(m => m.id === p.id)) {
          return {
            ...p,
            meetingsByRound: {
              ...p.meetingsByRound,
              [currentRound]: [...(p.meetingsByRound[currentRound] || []), newParticipantData.id]
            },
            allMetPeople: p.allMetPeople.includes(newParticipantData.id) 
              ? p.allMetPeople 
              : [...p.allMetPeople, newParticipantData.id]
          }
        } else {
          // 다른 그룹의 참가자들도 현재 라운드 정보가 없다면 빈 배열로 초기화
          return {
            ...p,
            meetingsByRound: {
              ...p.meetingsByRound,
              [currentRound]: p.meetingsByRound[currentRound] || []
            }
          }
        }
      })
      
      // 새 참가자 추가
      updatedParticipants.push(newParticipantData)
      setParticipants(updatedParticipants)

      // 결과 업데이트
      const updatedGroups = result.groups.map(g => 
        g.id === groupId 
          ? { ...g, members: [...g.members.map(m => {
              const updatedMember = updatedParticipants.find(p => p.id === m.id)
              return updatedMember || m
            }), newParticipantData] }
          : g
      )
      
      const updatedResult = { ...result, groups: updatedGroups }
      
      const { saveParticipants, saveGroupingResult } = await import('@/utils/database')
      await Promise.all([
        saveParticipants(updatedParticipants),
        saveGroupingResult(updatedResult)
      ])

      await createSnapshot('participant_add_to_group', `그룹 ${groupId}에 참가자 추가: ${newParticipantData.name}`)
      
      setParticipants(updatedParticipants)
      setResult(updatedResult)
      setShowAddForm(null)
      setNewParticipant({ name: '', gender: 'male', mbti: 'extrovert' })
      
    } catch (error) {
      console.error('참가자 추가 실패:', error)
    }
  }, [newParticipant, result, participants, setParticipants, setResult, setShowAddForm, setNewParticipant])

  // 참가자 추가 취소
  const cancelAddForm = useCallback(() => {
    setShowAddForm(null)
    setNewParticipant({ name: '', gender: 'male', mbti: 'extrovert' })
  }, [setShowAddForm, setNewParticipant])

  // 참가자 클릭 처리 (모바일)
  const handleParticipantClick = useCallback((participantId: string, groupId: number) => {
    if (selectedParticipant === participantId) {
      // 같은 참가자를 다시 클릭하면 선택 해제
      setSelectedParticipant(null)
      setSwapSelectedParticipant(null)
    } else if (selectedParticipant && selectedParticipant !== participantId) {
      // 다른 참가자가 선택된 상태에서 클릭하면 위치 바꾸기
      setSwapSelectedParticipant({ id: participantId, groupId })
      
      // 실제 위치 바꾸기 실행
      setTimeout(() => {
        swapParticipants(selectedParticipant, participantId)
      }, 100)
    } else {
      // 첫 번째 선택
      setSelectedParticipant(participantId)
    }
  }, [selectedParticipant, setSelectedParticipant, setSwapSelectedParticipant])

  // 참가자 위치 바꾸기
  const swapParticipants = useCallback(async (participantId1: string, participantId2: string) => {
    if (!result) return

    try {
      const participant1 = participants.find(p => p.id === participantId1)
      const participant2 = participants.find(p => p.id === participantId2)
      
      if (!participant1 || !participant2) return

      // 각 참가자가 속한 그룹 찾기
      let group1Index = -1, group2Index = -1
      result.groups.forEach((group, index) => {
        if (group.members.some(m => m.id === participantId1)) group1Index = index
        if (group.members.some(m => m.id === participantId2)) group2Index = index
      })

      if (group1Index === -1 || group2Index === -1) return

      const updatedGroups = [...result.groups]
      
      // 참가자들의 그룹 히스토리와 미팅 히스토리 업데이트
      const currentRound = result.round
      
      // 새로운 그룹원들 목록 계산
      const newGroup1Members = updatedGroups[group1Index].members.filter(m => m.id !== participantId1).map(m => m.id)
      const newGroup2Members = updatedGroups[group2Index].members.filter(m => m.id !== participantId2).map(m => m.id)
      
      const updatedParticipant1 = {
        ...participant1,
        groupHistory: [...participant1.groupHistory.slice(0, -1), updatedGroups[group2Index].id],
        meetingsByRound: {
          ...participant1.meetingsByRound,
          [currentRound]: newGroup2Members
        }
      }
      const updatedParticipant2 = {
        ...participant2,
        groupHistory: [...participant2.groupHistory.slice(0, -1), updatedGroups[group1Index].id],
        meetingsByRound: {
          ...participant2.meetingsByRound,
          [currentRound]: newGroup1Members
        }
      }

      // 참가자들의 그룹 멤버십 업데이트 및 기존 그룹원들의 미팅 기록 업데이트
      updatedGroups[group1Index] = {
        ...updatedGroups[group1Index],
        members: updatedGroups[group1Index].members.map(m => {
          if (m.id === participantId1) {
            return updatedParticipant2
          } else {
            // 기존 그룹원들의 미팅 기록에서 participant1을 participant2로 교체
            const updatedMeetings = [...(m.meetingsByRound[currentRound] || [])]
            const participant1Index = updatedMeetings.indexOf(participantId1)
            if (participant1Index !== -1) {
              updatedMeetings[participant1Index] = participantId2
            }
            return {
              ...m,
              meetingsByRound: {
                ...m.meetingsByRound,
                [currentRound]: updatedMeetings
              }
            }
          }
        })
      }
      
      updatedGroups[group2Index] = {
        ...updatedGroups[group2Index],
        members: updatedGroups[group2Index].members.map(m => {
          if (m.id === participantId2) {
            return updatedParticipant1
          } else {
            // 기존 그룹원들의 미팅 기록에서 participant2를 participant1으로 교체
            const updatedMeetings = [...(m.meetingsByRound[currentRound] || [])]
            const participant2Index = updatedMeetings.indexOf(participantId2)
            if (participant2Index !== -1) {
              updatedMeetings[participant2Index] = participantId1
            }
            return {
              ...m,
              meetingsByRound: {
                ...m.meetingsByRound,
                [currentRound]: updatedMeetings
              }
            }
          }
        })
      }

      const updatedResult = { ...result, groups: updatedGroups }
      
      // participants 상태도 업데이트 (모든 그룹의 멤버들로부터 참가자 정보 추출)
      const updatedParticipants = updatedGroups.flatMap(group => group.members)
      setParticipants(updatedParticipants)
      
      const { saveGroupingResult } = await import('@/utils/database')
      await saveGroupingResult(updatedResult)
      
      setResult(updatedResult)
      setSwapMessage(`${participant1.name}과 ${participant2.name}의 위치를 바꿨습니다.`)
      
      // 상태 초기화
      setSelectedParticipant(null)
      setSwapSelectedParticipant(null)
      setDraggedParticipant(null)
      
      setTimeout(() => setSwapMessage(null), 3000)
      
    } catch (error) {
      console.error('참가자 위치 바꾸기 실패:', error)
    }
  }, [result, participants, setResult, setSwapMessage, setSelectedParticipant, setSwapSelectedParticipant, setDraggedParticipant])

  // 드래그 시작
  const handleDragStart = useCallback((participantId: string, groupId: number) => {
    setDraggedParticipant({ id: participantId, fromGroupId: groupId })
  }, [setDraggedParticipant])

  // 드래그 오버
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  // 드롭
  const handleDrop = useCallback(async (targetParticipantId: string, targetGroupId: number) => {
    if (!draggedParticipant || draggedParticipant.id === targetParticipantId) return

    await swapParticipants(draggedParticipant.id, targetParticipantId)
    setDraggedParticipant(null)
  }, [draggedParticipant, swapParticipants, setDraggedParticipant])

  return {
    startEditParticipant,
    saveEditParticipant,
    cancelEditParticipant,
    deleteParticipant,
    addParticipantToGroup,
    cancelAddForm,
    handleParticipantClick,
    handleDragStart,
    handleDragOver,
    handleDrop,
    swapParticipants
  }
}