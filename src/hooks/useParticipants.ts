import { useState, useCallback } from 'react'
import { Participant } from '@/utils/grouping'
import { createSnapshot } from '@/utils/backup'

export function useParticipants() {
  const [participants, setParticipants] = useState<Participant[]>([])

  const addParticipant = useCallback(async (participantData: {
    name: string
    gender: 'male' | 'female'
    mbti: 'extrovert' | 'introvert'
    age?: number | null
  }) => {
    const newParticipant: Participant = {
      id: Date.now().toString(),
      name: participantData.name,
      gender: participantData.gender,
      mbti: participantData.mbti,
      age: participantData.age || null,
      meetingsByRound: {},
      allMetPeople: [],
      groupHistory: []
    }
    
    const updatedParticipants = [...participants, newParticipant]
    
    // Supabase에 저장
    const { saveParticipants } = await import('@/utils/database')
    await saveParticipants(updatedParticipants)
    
    // 스냅샷 생성
    await createSnapshot('participant_add', `참가자 추가: ${participantData.name}`)
    
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
      await createSnapshot('participant_remove', `참가자 삭제: ${participantToRemove.name}`)
    }
    
    setParticipants(updatedParticipants)
  }, [participants])

  const bulkAddParticipants = useCallback(async (bulkText: string) => {
    const lines = bulkText.trim().split('\n')
    const newParticipants: Participant[] = []
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine) continue
      
      let name = '', gender: 'male' | 'female' = 'male', age: number | null = null, mbti: 'extrovert' | 'introvert' = 'extrovert'
      
      // 콤마로 분리된 형식 처리 (이름,성별,나이,성격)
      if (trimmedLine.includes(',')) {
        const parts = trimmedLine.split(',').map(p => p.trim())
        
        if (parts.length >= 1) name = parts[0]
        if (parts.length >= 2) {
          const genderStr = parts[1].toLowerCase()
          gender = (genderStr === '여성' || genderStr === 'female' || genderStr === '여') ? 'female' : 'male'
        }
        if (parts.length >= 3) {
          const ageStr = parts[2].trim()
          if (ageStr && !isNaN(parseInt(ageStr))) {
            age = parseInt(ageStr)
          }
        }
        if (parts.length >= 4) {
          const mbtiStr = parts[3].toLowerCase()
          mbti = (mbtiStr === '내향형' || mbtiStr === 'introvert' || mbtiStr === 'i') ? 'introvert' : 'extrovert'
        } else if (parts.length >= 3 && !parts[2].trim()) {
          // 나이가 비어있고 3번째 항목이 성격인 경우
          const mbtiStr = parts[2].toLowerCase()
          if (mbtiStr === '내향형' || mbtiStr === 'introvert' || mbtiStr === 'i' || mbtiStr === '외향형' || mbtiStr === 'extrovert' || mbtiStr === 'e') {
            age = null
            mbti = (mbtiStr === '내향형' || mbtiStr === 'introvert' || mbtiStr === 'i') ? 'introvert' : 'extrovert'
          }
        }
      } else {
        // 공백으로 분리된 형식 처리 (이름 성별 나이 성격)
        const parts = trimmedLine.split(/\s+/)
        
        if (parts.length >= 1) name = parts[0]
        if (parts.length >= 2) {
          const genderStr = parts[1].toLowerCase()
          gender = (genderStr === '여성' || genderStr === 'female' || genderStr === '여') ? 'female' : 'male'
        }
        if (parts.length >= 3) {
          const thirdPart = parts[2].trim()
          // 3번째 부분이 숫자인지 확인
          if (thirdPart && !isNaN(parseInt(thirdPart))) {
            age = parseInt(thirdPart)
            // 4번째 부분이 성격
            if (parts.length >= 4) {
              const mbtiStr = parts[3].toLowerCase()
              mbti = (mbtiStr === '내향형' || mbtiStr === 'introvert' || mbtiStr === 'i') ? 'introvert' : 'extrovert'
            }
          } else {
            // 3번째 부분이 성격인 경우 (나이 없음)
            const mbtiStr = thirdPart.toLowerCase()
            mbti = (mbtiStr === '내향형' || mbtiStr === 'introvert' || mbtiStr === 'i') ? 'introvert' : 'extrovert'
          }
        }
      }
      
      if (name) {
        const newParticipant: Participant = {
          id: `${Date.now()}_${newParticipants.length}`,
          name,
          gender,
          mbti,
          age,
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
      await createSnapshot('bulk_add', `일괄 추가: ${newParticipants.length}명`)
      
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