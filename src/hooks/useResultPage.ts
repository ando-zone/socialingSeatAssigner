import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { GroupingResult, Participant } from '@/utils/grouping'
import { migrateParticipantData } from '@/utils/grouping'
import { createSnapshot } from '@/utils/backup'

export function useResultPage() {
  const router = useRouter()
  const [result, setResult] = useState<GroupingResult | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [exitedParticipants, setExitedParticipants] = useState<{[id: string]: {name: string, gender: 'male' | 'female'}}>({})
  const [activeTab, setActiveTab] = useState<'groups' | 'stats' | 'seating' | 'history'>('groups')
  const [isMobile, setIsMobile] = useState(false)
  const [checkInStatus, setCheckInStatus] = useState<{[participantId: string]: boolean}>({})

  // Round management
  const [availableRounds, setAvailableRounds] = useState<number[]>([])
  const [selectedHistoryRound, setSelectedHistoryRound] = useState<number | null>(null)
  const [historyResult, setHistoryResult] = useState<GroupingResult | null>(null)
  const [selectedGroupsRound, setSelectedGroupsRound] = useState<number | null>(null)
  const [groupsRoundResult, setGroupsRoundResult] = useState<GroupingResult | null>(null)

  // Participant editing
  const [editingParticipant, setEditingParticipant] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    gender: 'male' as 'male' | 'female',
    mbti: 'extrovert' as 'extrovert' | 'introvert'
  })

  // Participant addition
  const [showAddForm, setShowAddForm] = useState<number | null>(null)
  const [newParticipant, setNewParticipant] = useState({
    name: '',
    gender: 'male' as 'male' | 'female',
    mbti: 'extrovert' as 'extrovert' | 'introvert'
  })

  // Drag and drop / mobile interaction
  const [draggedParticipant, setDraggedParticipant] = useState<{id: string, fromGroupId: number} | null>(null)
  const [swapMessage, setSwapMessage] = useState<string | null>(null)
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null)
  const [swapSelectedParticipant, setSwapSelectedParticipant] = useState<{id: string, groupId: number} | null>(null)

  // Initial data loading
  const loadData = useCallback(async () => {
    try {
      const { 
        getGroupingResult, 
        getParticipants, 
        getExitedParticipants,
        getCurrentMeetingId,
        getAllRounds,
        checkTableStructure
      } = await import('@/utils/database')
      
      const meetingId = getCurrentMeetingId()
      if (!meetingId) {
        console.log('활성 모임이 없습니다.')
        router.push('/')
        return
      }
      
      console.log('📥 결과 페이지 데이터 로딩 중...')
      
      await checkTableStructure()
      
      const [groupingResult, participants, exitedParticipants, rounds] = await Promise.all([
        getGroupingResult(),
        getParticipants(),
        getExitedParticipants(),
        getAllRounds()
      ])
      
      if (groupingResult && participants.length > 0) {
        setExitedParticipants(exitedParticipants)
        
        const migratedParticipants = migrateParticipantData(participants, groupingResult.round || 1)
        
        setResult(groupingResult)
        setParticipants(migratedParticipants)
        setAvailableRounds(rounds)
        
        // 체크인 상태 초기화
        const initialCheckInStatus: {[participantId: string]: boolean} = {}
        migratedParticipants.forEach(participant => {
          initialCheckInStatus[participant.id] = participant.isCheckedIn || false
        })
        setCheckInStatus(initialCheckInStatus)
        
        console.log('✅ 결과 페이지 데이터 로드 완료')
      } else {
        console.log('그룹 배치 결과가 없습니다. 메인 페이지로 이동합니다.')
        router.push('/')
      }
    } catch (error) {
      console.error('❌ 결과 페이지 데이터 로딩 중 오류:', error)
      router.push('/')
    }
  }, [router])

  // Mobile detection
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [loadData])

  // Round selection functions
  const selectHistoryRound = useCallback(async (round: number) => {
    try {
      const { getGroupingResultByRound } = await import('@/utils/database')
      const roundResult = await getGroupingResultByRound(round)
      
      if (roundResult) {
        setSelectedHistoryRound(round)
        setHistoryResult(roundResult)
        console.log(`${round}라운드 히스토리 로드 완료`)
      } else {
        console.log(`${round}라운드 데이터를 찾을 수 없습니다.`)
      }
    } catch (error) {
      console.error('히스토리 라운드 로드 중 오류:', error)
    }
  }, [])

  const selectGroupsRound = useCallback(async (round: number) => {
    try {
      const { getGroupingResultByRound } = await import('@/utils/database')
      const roundResult = await getGroupingResultByRound(round)
      
      if (roundResult) {
        setSelectedGroupsRound(round)
        setGroupsRoundResult(roundResult)
        console.log(`${round}라운드 결과 로드 완료`)
      } else {
        console.log(`${round}라운드 데이터를 찾을 수 없습니다.`)
      }
    } catch (error) {
      console.error('그룹 라운드 로드 중 오류:', error)
    }
  }, [])

  const returnToCurrentRound = useCallback(() => {
    setSelectedGroupsRound(null)
    setGroupsRoundResult(null)
  }, [])

  // Check-in functions
  const toggleCheckIn = useCallback(async (participantId: string) => {
    try {
      const currentStatus = checkInStatus[participantId] || false
      const newStatus = !currentStatus
      
      setCheckInStatus(prev => ({
        ...prev,
        [participantId]: newStatus
      }))
      
      const { updateParticipantCheckIn } = await import('@/utils/database')
      const success = await updateParticipantCheckIn(participantId, newStatus)
      
      if (!success) {
        setCheckInStatus(prev => ({
          ...prev,
          [participantId]: currentStatus
        }))
        
        const participantName = participants.find(p => p.id === participantId)?.name
        console.log(`${participantName}의 체크인 상태 업데이트 실패 (로컬에서만 작동)`)
      }
    } catch (error) {
      console.error('체크인 상태 업데이트 실패:', error)
    }
  }, [checkInStatus, participants])

  const resetAllCheckIn = useCallback(async () => {
    try {
      const { resetAllCheckInStatus } = await import('@/utils/database')
      const success = await resetAllCheckInStatus()
      
      if (success) {
        const resetStatus: {[participantId: string]: boolean} = {}
        participants.forEach(p => {
          resetStatus[p.id] = false
        })
        setCheckInStatus(resetStatus)
      }
    } catch (error) {
      console.error('전체 체크인 초기화 실패:', error)
    }
  }, [participants])

  return {
    // State
    result,
    participants,
    exitedParticipants,
    activeTab,
    isMobile,
    checkInStatus,
    availableRounds,
    selectedHistoryRound,
    historyResult,
    selectedGroupsRound,
    groupsRoundResult,
    editingParticipant,
    editForm,
    showAddForm,
    newParticipant,
    draggedParticipant,
    swapMessage,
    selectedParticipant,
    swapSelectedParticipant,
    
    // Setters
    setResult,
    setParticipants,
    setActiveTab,
    setEditingParticipant,
    setEditForm,
    setShowAddForm,
    setNewParticipant,
    setDraggedParticipant,
    setSwapMessage,
    setSelectedParticipant,
    setSwapSelectedParticipant,
    
    // Functions
    loadData,
    selectHistoryRound,
    selectGroupsRound,
    returnToCurrentRound,
    toggleCheckIn,
    resetAllCheckIn,
    router
  }
}