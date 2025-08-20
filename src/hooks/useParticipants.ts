import { useState, useCallback } from 'react'
import { Participant } from '@/utils/grouping'
import { createSnapshot } from '@/utils/backup'

export function useParticipants() {
  const [participants, setParticipants] = useState<Participant[]>([])

  const addParticipant = useCallback(async (participantData: {
    name: string
    gender: 'male' | 'female'
    mbti: 'extrovert' | 'introvert'
  }) => {
    const newParticipant: Participant = {
      id: Date.now().toString(),
      name: participantData.name,
      gender: participantData.gender,
      mbti: participantData.mbti,
      meetingsByRound: {},
      allMetPeople: [],
      groupHistory: []
    }
    
    const updatedParticipants = [...participants, newParticipant]
    
    // Supabase에 저장
    const { saveParticipants } = await import('@/utils/database')
    await saveParticipants(updatedParticipants)
    
    // 스냅샷 생성
    await createSnapshot(`참가자 추가: ${participantData.name}`, updatedParticipants.length)
    
    setParticipants(updatedParticipants)
  }, [participants])

  const removeParticipant = useCallback(async (id: string) => {
    const participantToRemove = participants.find(p => p.id === id)
    const updatedParticipants = participants.filter(p => p.id !== id)
    
    if (participantToRemove) {
      // 이탈 참가자 정보 저장
      const { getExitedParticipants, saveExitedParticipants, saveParticipants } = await import('@/utils/database')
      const exitedParticipants = await getExitedParticipants()
      
      const newExitedParticipant = {
        [id]: {
          name: participantToRemove.name,
          gender: participantToRemove.gender
        }
      }
      
      await saveExitedParticipants({ ...exitedParticipants, ...newExitedParticipant })
      await saveParticipants(updatedParticipants)
      await createSnapshot(`참가자 삭제: ${participantToRemove.name}`, updatedParticipants.length)
    }
    
    setParticipants(updatedParticipants)
  }, [participants])

  const bulkAddParticipants = useCallback(async (bulkText: string) => {
    const lines = bulkText.trim().split('\n')
    const newParticipants: Participant[] = []
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine) continue
      
      let name = '', gender: 'male' | 'female' = 'male', mbti: 'extrovert' | 'introvert' = 'extrovert'
      
      // 콤마로 분리된 형식 처리
      if (trimmedLine.includes(',')) {
        const parts = trimmedLine.split(',').map(p => p.trim())
        
        if (parts.length >= 1) name = parts[0]
        if (parts.length >= 2) {
          const genderStr = parts[1].toLowerCase()
          gender = (genderStr === '여성' || genderStr === 'female' || genderStr === '여') ? 'female' : 'male'
        }
        if (parts.length >= 3) {
          const mbtiStr = parts[2].toLowerCase()
          mbti = (mbtiStr === '내향형' || mbtiStr === 'introvert' || mbtiStr === 'i') ? 'introvert' : 'extrovert'
        }
      } else {
        // 공백으로 분리된 형식 처리
        const parts = trimmedLine.split(/\s+/)
        
        if (parts.length >= 1) name = parts[0]
        if (parts.length >= 2) {
          const genderStr = parts[1].toLowerCase()
          gender = (genderStr === '여성' || genderStr === 'female' || genderStr === '여') ? 'female' : 'male'
        }
        if (parts.length >= 3) {
          const mbtiStr = parts[2].toLowerCase()
          mbti = (mbtiStr === '내향형' || mbtiStr === 'introvert' || mbtiStr === 'i') ? 'introvert' : 'extrovert'
        }
      }
      
      if (name) {
        const newParticipant: Participant = {
          id: `${Date.now()}_${newParticipants.length}`,
          name,
          gender,
          mbti,
          meetingsByRound: {},
          allMetPeople: [],
          groupHistory: []
        }
        newParticipants.push(newParticipant)
      }
    }
    
    if (newParticipants.length > 0) {
      const updatedParticipants = [...participants, ...newParticipants]
      
      // Supabase에 저장
      const { saveParticipants } = await import('@/utils/database')
      await saveParticipants(updatedParticipants)
      await createSnapshot(`일괄 추가: ${newParticipants.length}명`, updatedParticipants.length)
      
      setParticipants(updatedParticipants)
    }
  }, [participants])

  return {
    participants,
    setParticipants,
    addParticipant,
    removeParticipant,
    bulkAddParticipants
  }
}