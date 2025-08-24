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
  
  // Broadcast 채널 인스턴스를 저장
  const [broadcastChannel, setBroadcastChannel] = useState<any>(null)

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

  // Supabase Broadcast로 실시간 체크인 상태 동기화
  useEffect(() => {
    if (!result) return

    const setupBroadcast = async () => {
      try {
        const { getCurrentMeetingId } = await import('@/utils/database')
        const { createSupabaseClient } = await import('@/lib/supabase')
        const supabase = createSupabaseClient()
        const meetingId = getCurrentMeetingId()
        
        if (!supabase || !meetingId) {
          console.log('Supabase 또는 모임 ID가 없어서 브로드캐스트를 설정하지 않습니다.')
          return
        }

        const channelName = `checkin-${meetingId}`
        console.log('📡 Supabase Broadcast 채널 구독 시작:', channelName)
        console.log('🔍 사용자 정보:', { meetingId, participantCount: participants.length })
        
        const channel = supabase
          .channel(channelName)
          .on('broadcast', { event: 'checkin-update' }, (payload: any) => {
            console.log('🎯 [수신] 체크인 업데이트 브로드캐스트:', {
              전체_payload: payload,
              event: payload.event,
              payload_내용: payload.payload
            })
            
            if (payload.payload && payload.payload.participantId !== undefined && payload.payload.isChecked !== undefined) {
              const { participantId, isChecked } = payload.payload
              
              setCheckInStatus(prev => {
                console.log('🔄 체크인 상태 업데이트:', { 
                  participantId, 
                  기존: prev[participantId], 
                  새로운값: isChecked 
                })
                return {
                  ...prev,
                  [participantId]: isChecked
                }
              })
              
              const participantName = participants.find(p => p.id === participantId)?.name
              console.log(`✅ ${participantName}의 체크인 상태가 ${isChecked ? '체크됨' : '해제됨'}으로 실시간 동기화됨`)
            } else {
              console.warn('⚠️ 브로드캐스트 페이로드 구조가 예상과 다름:', payload)
            }
          })
          .on('broadcast', { event: 'checkin-reset-all' }, (payload: any) => {
            console.log('🎯 [수신] 전체 초기화 브로드캐스트:', payload)
            
            if (payload.payload && payload.payload.resetAll) {
              const resetStatus: {[participantId: string]: boolean} = {}
              participants.forEach(p => {
                resetStatus[p.id] = false
              })
              setCheckInStatus(resetStatus)
              
              console.log('✅ 전체 체크인 상태가 초기화됨')
            }
          })
          .subscribe((status) => {
            console.log('📡 Broadcast 채널 상태 변경:', { status, channelName })
            if (status === 'SUBSCRIBED') {
              console.log('✅ Broadcast 채널 구독 성공!', channelName)
              setBroadcastChannel(channel) // 채널 인스턴스 저장
            } else if (status === 'CHANNEL_ERROR') {
              console.error('❌ Broadcast 채널 오류:', channelName)
            } else if (status === 'TIMED_OUT') {
              console.error('❌ Broadcast 채널 타임아웃:', channelName)
            }
          })

        return () => {
          console.log('📡 Broadcast 채널 구독 해제')
          setBroadcastChannel(null)
          channel.unsubscribe()
        }
      } catch (error) {
        console.error('❌ Broadcast 설정 중 오류:', error)
      }
    }

    const cleanup = setupBroadcast()
    
    return () => {
      cleanup?.then(cleanupFn => cleanupFn?.())
    }
  }, [result, participants])

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

  // Check-in functions with DB + Broadcast
  const toggleCheckIn = useCallback(async (participantId: string) => {
    try {
      const currentStatus = checkInStatus[participantId] || false
      const newStatus = !currentStatus
      
      // 1. 즉시 로컬 상태 업데이트 (낙관적 업데이트)
      setCheckInStatus(prev => ({
        ...prev,
        [participantId]: newStatus
      }))
      
      // 2. DB에 저장
      const { updateParticipantCheckIn, getCurrentMeetingId } = await import('@/utils/database')
      const success = await updateParticipantCheckIn(participantId, newStatus)
      
      if (success) {
        // 3. 브로드캐스트로 다른 사용자들에게 알림
        try {
          if (broadcastChannel) {
            const broadcastData = {
              type: 'broadcast',
              event: 'checkin-update',
              payload: {
                participantId,
                isChecked: newStatus
              }
            }
            
            console.log('📤 [전송] 저장된 채널로 브로드캐스트 전송 시작:', { broadcastData })
            
            const sendResult = await broadcastChannel.send(broadcastData)
            
            const participantName = participants.find(p => p.id === participantId)?.name
            console.log(`📤 [전송] ${participantName}의 체크인 브로드캐스트 전송 결과:`, sendResult)
          } else {
            console.warn('⚠️ 브로드캐스트 채널이 아직 준비되지 않음')
          }
        } catch (broadcastError) {
          console.error('❌ 브로드캐스트 전송 실패:', broadcastError)
        }
      } else {
        // DB 저장 실패 시 로컬 상태 되돌리기
        setCheckInStatus(prev => ({
          ...prev,
          [participantId]: currentStatus
        }))
        
        const participantName = participants.find(p => p.id === participantId)?.name
        console.log(`${participantName}의 체크인 상태 업데이트 실패 (로컬에서만 작동)`)
      }
    } catch (error) {
      console.error('체크인 상태 업데이트 실패:', error)
      
      // 오류 발생 시 로컬 상태 되돌리기
      setCheckInStatus(prev => ({
        ...prev,
        [participantId]: checkInStatus[participantId] || false
      }))
    }
  }, [checkInStatus, participants])

  const resetAllCheckIn = useCallback(async () => {
    console.log('🔄 [시작] resetAllCheckIn 함수 호출됨')
    console.log('📡 [확인] broadcastChannel 상태:', { 
      exists: !!broadcastChannel, 
      type: typeof broadcastChannel,
      participantCount: participants.length 
    })
    
    try {
      const { resetAllCheckInStatus, getCurrentMeetingId } = await import('@/utils/database')
      console.log('💾 [시작] DB에서 전체 체크인 상태 초기화 시도')
      
      const success = await resetAllCheckInStatus()
      console.log('💾 [결과] DB 초기화 결과:', success)
      
      if (success) {
        // 로컬 상태 초기화
        const resetStatus: {[participantId: string]: boolean} = {}
        participants.forEach(p => {
          resetStatus[p.id] = false
        })
        setCheckInStatus(resetStatus)
        console.log('✅ 로컬 상태 초기화 완료')
        
        // 전체 초기화 브로드캐스트
        console.log('📡 [시작] 브로드캐스트 전송 시도')
        try {
          if (broadcastChannel) {
            console.log('📡 [확인] 브로드캐스트 채널 존재함, 전송 시작')
            
            const broadcastData = {
              type: 'broadcast',
              event: 'checkin-reset-all',
              payload: { resetAll: true }
            }
            console.log('📤 [전송] 브로드캐스트 데이터:', broadcastData)
            
            const sendResult = await broadcastChannel.send(broadcastData)
            console.log('📡 [결과] 전체 체크인 초기화 브로드캐스트 전송 완료:', sendResult)
          } else {
            console.warn('⚠️ [경고] 브로드캐스트 채널이 null임 - 전송하지 않음')
          }
        } catch (broadcastError) {
          console.error('❌ [오류] 브로드캐스트 전송 실패:', broadcastError)
        }
      } else {
        console.error('❌ [오류] DB 초기화 실패로 브로드캐스트 전송하지 않음')
      }
    } catch (error) {
      console.error('❌ [오류] 전체 체크인 초기화 실패:', error)
    }
  }, [participants, broadcastChannel])

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