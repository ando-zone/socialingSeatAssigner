'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createOptimalGroups, updateMeetingHistory, migrateParticipantData, type Participant, type GroupingResult, type GenderConstraint } from '@/utils/grouping'
import { createSnapshot, exportToJSON, importFromJSON, getSnapshots, restoreSnapshot, formatDateTime } from '@/utils/backup'

export default function Home() {
  const router = useRouter()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [name, setName] = useState('')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [mbti, setMbti] = useState<'extrovert' | 'introvert'>('extrovert')
  const [currentRound, setCurrentRound] = useState(1)
  const [groupSize, setGroupSize] = useState(4)
  const [isLoading, setIsLoading] = useState(false)
  const [groupingMode, setGroupingMode] = useState<'auto' | 'manual'>('manual')
  const [numGroups, setNumGroups] = useState(6)
  const [customGroupSizes, setCustomGroupSizes] = useState<number[]>([12, 12, 12, 12, 12, 12])
  const [customGroupGenders, setCustomGroupGenders] = useState<{maleCount: number, femaleCount: number}[]>([
    {maleCount: 7, femaleCount: 5}, {maleCount: 7, femaleCount: 5}, {maleCount: 7, femaleCount: 5}, 
    {maleCount: 7, femaleCount: 5}, {maleCount: 7, femaleCount: 5}, {maleCount: 7, femaleCount: 5}
  ])
  const [enableGenderRatio, setEnableGenderRatio] = useState(false)
  const [groupSettingsLoaded, setGroupSettingsLoaded] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [showBulkInput, setShowBulkInput] = useState(false)
  const [showBackupSection, setShowBackupSection] = useState(false)
  const [snapshots, setSnapshots] = useState<any[]>([])
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [hasExistingResult, setHasExistingResult] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [currentMeeting, setCurrentMeeting] = useState<any>(null)

  const addParticipant = async () => {
    if (name.trim()) {
      const newParticipant: Participant = {
        id: Date.now().toString(),
        name: name.trim(),
        gender,
        mbti,
        meetingsByRound: {},
        allMetPeople: [],
        groupHistory: []
      }
      const updatedParticipants = [...participants, newParticipant]
      
      // 즉시 Supabase에 저장 (스냅샷 생성 전에)
      const { saveParticipants } = await import('@/utils/database')
      await saveParticipants(updatedParticipants)
      
      // 상태 업데이트
      setParticipants(updatedParticipants)
      setName('')
      
      // 참가자 추가 시 스냅샷 생성 (Supabase 저장 후)
      try {
        await createSnapshot('participant_add', `참가자 추가: ${newParticipant.name}`)
        console.log(`✅ 참가자 추가 스냅샷 생성 완료: ${newParticipant.name}`)
        
        // DB 저장 시도
        try {
          const { saveParticipants } = await import('@/utils/database')
          await saveParticipants(updatedParticipants)
          console.log('✅ 참가자 DB 저장 성공')
        } catch (error) {
          console.warn('⚠️ 참가자 DB 저장 실패 (로컬은 정상):', error)
        }
      } catch (error) {
        console.error('❌ 스냅샷 생성 실패:', error)
      }
    }
  }

  const removeParticipant = async (id: string) => {
    const participantToRemove = participants.find(p => p.id === id)
    const updatedParticipants = participants.filter(p => p.id !== id)
    
    // 즉시 Supabase에 저장 (스냅샷 생성 전에)
    const { saveParticipants, getExitedParticipants, saveExitedParticipants } = await import('@/utils/database')
    await saveParticipants(updatedParticipants)
    
    if (participantToRemove) {
      // 이탈한 사람 정보를 Supabase에 저장
      const exitedParticipants = await getExitedParticipants()
      exitedParticipants[id] = {
        name: participantToRemove.name,
        gender: participantToRemove.gender
      }
      await saveExitedParticipants(exitedParticipants)
      
      // 참가자 제거 시 스냅샷 생성 (Supabase 저장 후)
      try {
        await createSnapshot('participant_remove', `참가자 제거: ${participantToRemove.name}`)
        console.log(`✅ 참가자 제거 스냅샷 생성 완료: ${participantToRemove.name}`)
        
        // DB 저장 시도
        try {
          const { saveParticipants, saveExitedParticipants } = await import('@/utils/database')
          await Promise.all([
            saveParticipants(updatedParticipants),
            saveExitedParticipants(exitedParticipants)
          ])
          console.log('✅ 참가자 제거 DB 저장 성공')
        } catch (error) {
          console.warn('⚠️ 참가자 제거 DB 저장 실패 (로컬은 정상):', error)
        }
      } catch (error) {
        console.error('❌ 스냅샷 생성 실패:', error)
      }
    }
    
    // 상태 업데이트
    setParticipants(updatedParticipants)
  }

  // 그룹 수 변경 시 customGroupSizes 및 customGroupGenders 배열 크기 조정
  const handleNumGroupsChange = (newNumGroups: number) => {
    setNumGroups(newNumGroups)
    const newSizes = [...customGroupSizes]
    const newGenders = [...customGroupGenders]
    
    if (newNumGroups > customGroupSizes.length) {
      // 그룹 수가 늘어나면 마지막 그룹의 설정을 복사하여 추가
      const lastSize = newSizes.length > 0 ? newSizes[newSizes.length - 1] : 4
      const lastGender = newGenders.length > 0 ? newGenders[newGenders.length - 1] : {maleCount: 2, femaleCount: 2}
      
      while (newSizes.length < newNumGroups) {
        newSizes.push(lastSize)
        newGenders.push({...lastGender}) // 깊은 복사로 추가
      }
    } else if (newNumGroups < customGroupSizes.length) {
      // 그룹 수가 줄어들면 뒤에서부터 제거
      newSizes.splice(newNumGroups)
      newGenders.splice(newNumGroups)
    }
    
    setCustomGroupSizes(newSizes)
    setCustomGroupGenders(newGenders)
  }

  // 개별 그룹 크기 변경
  const handleGroupSizeChange = (groupIndex: number, newSize: number) => {
    const newSizes = [...customGroupSizes]
    newSizes[groupIndex] = newSize
    console.log(`🎯 그룹 ${groupIndex + 1} 크기 변경: ${customGroupSizes[groupIndex]} → ${newSize}`)
    console.log('📊 새로운 그룹 크기 배열:', newSizes)
    setCustomGroupSizes(newSizes)
    
    // 성비가 활성화된 경우, 그룹 크기에 맞춰 성비도 조정
    if (enableGenderRatio) {
      const newGenders = [...customGroupGenders]
      const currentGender = newGenders[groupIndex]
      const currentTotal = currentGender.maleCount + currentGender.femaleCount
      
      if (newSize !== currentTotal) {
        // 기존 비율을 유지하면서 크기 조정
        const maleRatio = currentGender.maleCount / Math.max(currentTotal, 1)
        const newMaleCount = Math.round(newSize * maleRatio)
        const newFemaleCount = newSize - newMaleCount
        
        newGenders[groupIndex] = {
          maleCount: Math.max(0, newMaleCount),
          femaleCount: Math.max(0, newFemaleCount)
        }
        setCustomGroupGenders(newGenders)
      }
    }
  }
  
  // 개별 그룹의 남성 수 변경
  const handleGroupMaleCountChange = (groupIndex: number, newMaleCount: number) => {
    const newGenders = [...customGroupGenders]
    const groupSize = customGroupSizes[groupIndex]
    const maxMale = Math.max(0, Math.min(groupSize, newMaleCount))
    const newFemaleCount = groupSize - maxMale
    
    newGenders[groupIndex] = {
      maleCount: maxMale,
      femaleCount: Math.max(0, newFemaleCount)
    }
    setCustomGroupGenders(newGenders)
  }
  
  // 개별 그룹의 여성 수 변경
  const handleGroupFemaleCountChange = (groupIndex: number, newFemaleCount: number) => {
    const newGenders = [...customGroupGenders]
    const groupSize = customGroupSizes[groupIndex]
    const maxFemale = Math.max(0, Math.min(groupSize, newFemaleCount))
    const newMaleCount = groupSize - maxFemale
    
    newGenders[groupIndex] = {
      maleCount: Math.max(0, newMaleCount),
      femaleCount: maxFemale
    }
    setCustomGroupGenders(newGenders)
  }

  // 총 예상 인원 계산
  const getTotalCustomSize = () => customGroupSizes.reduce((sum, size) => sum + size, 0)

  const handleGrouping = async () => {
    if (participants.length < 2) {
      alert('최소 2명 이상의 참가자가 필요합니다.')
      return
    }

    // 수동 모드에서 총 인원 체크
    if (groupingMode === 'manual') {
      const totalCustomSize = customGroupSizes.reduce((sum, size) => sum + size, 0)
      if (totalCustomSize < participants.length) {
        alert(`설정된 그룹 크기의 총합(${totalCustomSize}명)이 참가자 수(${participants.length}명)보다 적습니다.`)
        return
      }
    }

    setIsLoading(true)
    
    try {
      // 동적 import로 database 함수들 가져오기
      const { 
        getCurrentMeetingId, 
        updateMeetingRound, 
        saveParticipants, 
        saveGroupingResult, 
        saveGroupSettings 
      } = await import('@/utils/database')
      
      // 그룹 배치 전 스냅샷 생성
      await createSnapshot('round_start', `${currentRound}라운드 시작 전`)
      
      const groupSizeParam = groupingMode === 'auto' ? groupSize : customGroupSizes
      
      // 성비 제약 조건 준비
      let genderConstraints: GenderConstraint[] | undefined = undefined
      if (groupingMode === 'manual' && enableGenderRatio) {
        genderConstraints = customGroupGenders.map(gender => ({
          maleCount: gender.maleCount,
          femaleCount: gender.femaleCount
        }))
        console.log('🎯 성비 제약 조건 적용:', genderConstraints)
      }
      
      const result = createOptimalGroups(participants, groupSizeParam, currentRound, genderConstraints)
      const updatedParticipants = updateMeetingHistory(participants, result.groups, currentRound)
      
      const nextRound = currentRound + 1
      
      // Supabase 저장
      await saveGroupingResult(result)
      await saveParticipants(updatedParticipants)
      
      const meetingId = getCurrentMeetingId()
      if (meetingId) {
        await updateMeetingRound(meetingId, nextRound)
      }
      
      // 그룹 설정 저장
      const groupSettings = {
        groupingMode,
        groupSize,
        numGroups,
        customGroupSizes,
        customGroupGenders,
        enableGenderRatio
      }
      await saveGroupSettings(groupSettings)
      
      // 스냅샷 생성
      try {
        await createSnapshot('group_generation', `${nextRound-1}라운드 그룹 생성`)
        console.log('✅ 그룹 생성 스냅샷 저장 완료')
      } catch (snapshotError) {
        console.warn('⚠️ 스냅샷 생성 실패:', snapshotError)
      }
      
      // 결과가 생성되었음을 표시
      setHasExistingResult(true)
      
      // 그룹 배치 완료 후 스냅샷 생성
      setTimeout(async () => {
        await createSnapshot('round_complete', `${currentRound}라운드 배치 완료`)
      }, 100)
      
      router.push('/result')
    } catch (error: any) {
      alert(error.message || '그룹 배치 중 오류가 발생했습니다.')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  // 페이지 로드 시 저장된 데이터 복원
  useEffect(() => {
    // 클라이언트에서만 실행
    if (typeof window === 'undefined') return
    
    // URL에서 모임 ID 확인
    const checkUrlMeetingId = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search)
        const urlMeetingId = urlParams.get('meeting')
        
        if (urlMeetingId) {
          console.log('URL에서 모임 ID 감지:', urlMeetingId)
          const { setCurrentMeetingId, getUserMeetings } = await import('@/utils/database')
          const { createSupabaseClient } = await import('@/lib/supabase')
          
          const supabase = createSupabaseClient()
          if (supabase) {
            // 현재 사용자 확인
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
              // 해당 모임이 사용자의 모임인지 확인
              const userMeetings = await getUserMeetings(user.id)
              const targetMeeting = userMeetings.find(m => m.id === urlMeetingId)
              
              if (targetMeeting) {
                setCurrentMeetingId(urlMeetingId)
                console.log('✅ URL 모임으로 전환:', targetMeeting.name)
                // URL 파라미터 제거
                window.history.replaceState({}, '', window.location.pathname)
              } else {
                console.warn('⚠️ 해당 모임에 접근 권한이 없습니다:', urlMeetingId)
              }
            }
          }
        }
      } catch (error) {
        console.warn('URL 모임 ID 처리 실패:', error)
      }
    }
    
    checkUrlMeetingId()
    
    // 클라이언트임을 표시
    setIsClient(true)
    
    // Supabase에서 데이터 로딩
    const loadData = async () => {
      try {
        const { 
          getParticipants, 
          getGroupingResult, 
          getGroupSettings,
          getCurrentMeetingId,
          getCurrentMeeting
        } = await import('@/utils/database')
        
        const meetingId = getCurrentMeetingId()
        if (!meetingId) {
          console.log('활성 모임이 없습니다.')
          return
        }
        
        // 현재 모임 정보 가져오기
        const meeting = await getCurrentMeeting()
        setCurrentMeeting(meeting)
        
        console.log('📥 Supabase에서 데이터 로딩 중...')
        
        const [participants, groupingResult, groupSettings] = await Promise.all([
          getParticipants(),
          getGroupingResult(),
          getGroupSettings()
        ])
        
        // 기존 결과가 있는지 확인
        setHasExistingResult(!!groupingResult)
        
        // 참가자 데이터 설정
        if (participants.length > 0) {
          // 현재 라운드 추출
          const currentRound = groupingResult?.round ? groupingResult.round + 1 : 1
          
          // 데이터 마이그레이션 적용
          const migratedParticipants = migrateParticipantData(participants, currentRound)
          setParticipants(migratedParticipants)
          setCurrentRound(currentRound)
          
          console.log('✅ 참가자 데이터 로드:', migratedParticipants.length + '명')
        }
        
        // 그룹 설정 복원 - Supabase 우선, localStorage 백업
        if (groupSettings) {
          console.log('저장된 그룹 설정 복원:', groupSettings)
          setGroupingMode(groupSettings.groupingMode || 'manual')
          setGroupSize(groupSettings.groupSize || 4)
          setNumGroups(groupSettings.numGroups || 6)
          setCustomGroupSizes(groupSettings.customGroupSizes || [12, 12, 12, 12, 12, 12])
          
          // 성비 설정이 Supabase에 없으면 localStorage에서 복원 시도
          if (groupSettings.customGroupGenders) {
            setCustomGroupGenders(groupSettings.customGroupGenders)
          } else {
            const localGenders = localStorage.getItem('seatAssigner_customGroupGenders')
            if (localGenders) {
              try {
                setCustomGroupGenders(JSON.parse(localGenders))
              } catch (e) {
                setCustomGroupGenders([
                  {maleCount: 7, femaleCount: 5}, {maleCount: 7, femaleCount: 5}, {maleCount: 7, femaleCount: 5}, 
                  {maleCount: 7, femaleCount: 5}, {maleCount: 7, femaleCount: 5}, {maleCount: 7, femaleCount: 5}
                ])
              }
            } else {
              setCustomGroupGenders([
                {maleCount: 7, femaleCount: 5}, {maleCount: 7, femaleCount: 5}, {maleCount: 7, femaleCount: 5}, 
                {maleCount: 7, femaleCount: 5}, {maleCount: 7, femaleCount: 5}, {maleCount: 7, femaleCount: 5}
              ])
            }
          }
          
          // 배열 길이 동기화 확인
          setTimeout(() => {
            setCustomGroupSizes(prevSizes => {
              setCustomGroupGenders(prevGenders => {
                const targetLength = prevSizes.length;
                const newGenders = [...prevGenders];
                
                // genders 배열이 sizes보다 짧으면 기본값으로 채움
                while (newGenders.length < targetLength) {
                  newGenders.push({maleCount: 7, femaleCount: 5});
                }
                
                // genders 배열이 sizes보다 길면 자름
                if (newGenders.length > targetLength) {
                  newGenders.splice(targetLength);
                }
                
                return newGenders;
              });
              return prevSizes;
            });
          }, 0);
          
          if (groupSettings.enableGenderRatio !== undefined) {
            setEnableGenderRatio(groupSettings.enableGenderRatio)
          } else {
            const localEnabled = localStorage.getItem('seatAssigner_enableGenderRatio')
            if (localEnabled) {
              setEnableGenderRatio(localEnabled === 'true')
            } else {
              setEnableGenderRatio(false)
            }
          }
        } else {
          // 저장된 설정이 없으면 localStorage 체크 후 기본값으로 초기화
          console.log('저장된 그룹 설정이 없어 localStorage 확인 후 기본값 사용')
          setGroupingMode('manual')
          setGroupSize(4)
          setNumGroups(6)
          setCustomGroupSizes([12, 12, 12, 12, 12, 12])
          
          // localStorage에서 성비 설정 복원 시도
          const localGenders = localStorage.getItem('seatAssigner_customGroupGenders')
          const localEnabled = localStorage.getItem('seatAssigner_enableGenderRatio')
          
          if (localGenders) {
            try {
              setCustomGroupGenders(JSON.parse(localGenders))
              console.log('localStorage에서 성비 설정 복원됨')
            } catch (e) {
              setCustomGroupGenders([
                {maleCount: 7, femaleCount: 5}, {maleCount: 7, femaleCount: 5}, {maleCount: 7, femaleCount: 5}, 
                {maleCount: 7, femaleCount: 5}, {maleCount: 7, femaleCount: 5}, {maleCount: 7, femaleCount: 5}
              ])
            }
          } else {
            setCustomGroupGenders([
              {maleCount: 7, femaleCount: 5}, {maleCount: 7, femaleCount: 5}, {maleCount: 7, femaleCount: 5}, 
              {maleCount: 7, femaleCount: 5}, {maleCount: 7, femaleCount: 5}, {maleCount: 7, femaleCount: 5}
            ])
          }
          
          if (localEnabled) {
            setEnableGenderRatio(localEnabled === 'true')
            console.log('localStorage에서 성비 체크박스 상태 복원됨:', localEnabled === 'true')
          } else {
            setEnableGenderRatio(false)
          }
        }
        setGroupSettingsLoaded(true)
        
        console.log('📦 데이터 로딩 완료')
        
      } catch (error) {
        console.error('❌ 데이터 로딩 중 오류:', error)
      }
    }
    
    loadData()
    
    // 초기 로드 완료 표시
    setIsInitialLoad(false)
  }, [])

  // 그룹 설정 변경 시 Supabase에 저장 (초기 로드 및 설정 로드 완료 후에만)
  useEffect(() => {
    if (!isInitialLoad && groupSettingsLoaded) {
      const saveGroupSettings = async () => {
        try {
          const { saveGroupSettings: saveSettings } = await import('@/utils/database')
          const groupSettings = {
            groupingMode,
            groupSize,
            numGroups,
            customGroupSizes,
            customGroupGenders,
            enableGenderRatio
          }
          await saveSettings(groupSettings)
          
          // localStorage에도 백업 저장 (마이그레이션 전까지 임시 사용)
          localStorage.setItem('seatAssigner_customGroupGenders', JSON.stringify(customGroupGenders))
          localStorage.setItem('seatAssigner_enableGenderRatio', enableGenderRatio.toString())
          
          console.log('그룹 설정 저장됨 (Supabase + localStorage):', groupSettings)
        } catch (error) {
          console.error('그룹 설정 저장 중 오류:', error)
          
          // Supabase 저장 실패 시 localStorage라도 저장
          try {
            localStorage.setItem('seatAssigner_customGroupGenders', JSON.stringify(customGroupGenders))
            localStorage.setItem('seatAssigner_enableGenderRatio', enableGenderRatio.toString())
            console.log('localStorage에 성비 설정 백업 저장 완료')
          } catch (localError) {
            console.error('localStorage 백업 저장도 실패:', localError)
          }
        }
      }
      saveGroupSettings()
    }
  }, [groupingMode, groupSize, numGroups, customGroupSizes, customGroupGenders, enableGenderRatio, isInitialLoad, groupSettingsLoaded])

  // 현재 라운드 재배치 (라운드 번호는 유지하고 다시 배치)
  const regroupCurrentRound = async () => {
    if (participants.length < 2) {
      alert('참가자가 최소 2명 이상 필요합니다.')
      return
    }

    const confirmMessage = `현재 ${currentRound-1}라운드를 다시 배치하시겠습니까?\n\n⚠️ 기존 배치 결과가 새로운 배치로 교체됩니다.`
    if (!confirm(confirmMessage)) {
      return
    }

    setIsLoading(true)
    
    try {
      const { saveGroupingResult, saveParticipants } = await import('@/utils/database')
      
      // 재배치 전 스냅샷 생성
      await createSnapshot('regroup_start', `${currentRound-1}라운드 재배치 시작`)
      
      const groupSizeParam = groupingMode === 'auto' ? groupSize : customGroupSizes
      const reGroupRound = currentRound - 1 // 현재 라운드를 다시 배치
      
      // 성비 제약 조건 준비
      let genderConstraints: GenderConstraint[] | undefined = undefined
      if (groupingMode === 'manual' && enableGenderRatio) {
        genderConstraints = customGroupGenders.map(gender => ({
          maleCount: gender.maleCount,
          femaleCount: gender.femaleCount
        }))
        console.log('🎯 재배치 시 성비 제약 조건 적용:', genderConstraints)
      }
      
      console.log(`🔄 ${reGroupRound}라운드 재배치 시작 - 기존 히스토리 정리 중...`)
      
      // 참가자 히스토리에서 해당 라운드 정보 제거 (재배치를 위해)
      const participantsForRegroup = participants.map(p => {
        const newMeetingsByRound = { ...p.meetingsByRound }
        if (newMeetingsByRound[reGroupRound]) {
          delete newMeetingsByRound[reGroupRound]
        }
        
        // allMetPeople을 나머지 라운드들로부터 다시 계산
        const allMet = new Set<string>()
        Object.entries(newMeetingsByRound).forEach(([round, meetIds]) => {
          if (parseInt(round) !== reGroupRound) { // 재배치할 라운드 제외
            meetIds.forEach(metId => allMet.add(metId))
          }
        })
        const newAllMetPeople = Array.from(allMet)
        
        // groupHistory에서 해당 라운드의 그룹 정보도 제거
        let newGroupHistory = [...p.groupHistory]
        if (newGroupHistory.length >= reGroupRound) {
          // 해당 라운드의 그룹 정보 제거 (배열 인덱스는 0부터 시작하므로 round-1)
          newGroupHistory = newGroupHistory.slice(0, reGroupRound - 1)
        }
        
        return {
          ...p,
          meetingsByRound: newMeetingsByRound,
          allMetPeople: newAllMetPeople,
          groupHistory: newGroupHistory
        }
      })
      
      // 새로운 그룹 배치
      const result = createOptimalGroups(participantsForRegroup, groupSizeParam, reGroupRound, genderConstraints)
      const updatedParticipants = updateMeetingHistory(participantsForRegroup, result.groups, reGroupRound)
      
      console.log(`✅ ${reGroupRound}라운드 재배치 완료 - 새로운 히스토리 적용됨`)
      
      // Supabase 저장
      await saveGroupingResult(result)
      await saveParticipants(updatedParticipants)
      
      // 재배치 완료 스냅샷 생성
      await createSnapshot('regroup_completed', `${reGroupRound}라운드 재배치 완료`)
      
      // 상태 업데이트
      setParticipants(updatedParticipants)
      
      // 결과 페이지로 이동
      router.push('/result')
    } catch (error) {
      alert('재배치 중 오류가 발생했습니다: ' + (error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const processBulkInput = async () => {
    if (!bulkText.trim()) return

    const lines = bulkText.trim().split('\n')
    const newParticipants: Participant[] = []
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim()
      if (!trimmedLine) return

      // 다양한 형식 지원: "이름,성별,MBTI" 또는 "이름 성별 MBTI" 또는 "이름"만
      let name = '', gender: 'male' | 'female' = 'male', mbti: 'extrovert' | 'introvert' = 'extrovert'
      
      if (trimmedLine.includes(',')) {
        // CSV 형식: "이름,성별,MBTI"
        const parts = trimmedLine.split(',').map(p => p.trim())
        name = parts[0] || ''
        
        if (parts[1]) {
          const genderStr = parts[1].toLowerCase()
          if (genderStr.includes('여') || genderStr.includes('female') || genderStr.includes('f')) {
            gender = 'female'
          }
        }
        
        if (parts[2]) {
          const mbtiStr = parts[2].toLowerCase()
          if (mbtiStr.includes('내향') || mbtiStr.includes('introvert') || mbtiStr.includes('i')) {
            mbti = 'introvert'
          }
        }
      } else if (trimmedLine.includes(' ')) {
        // 공백 구분: "이름 성별 MBTI"
        const parts = trimmedLine.split(/\s+/)
        name = parts[0] || ''
        
        if (parts[1]) {
          const genderStr = parts[1].toLowerCase()
          if (genderStr.includes('여') || genderStr.includes('female') || genderStr.includes('f')) {
            gender = 'female'
          }
        }
        
        if (parts[2]) {
          const mbtiStr = parts[2].toLowerCase()
          if (mbtiStr.includes('introvert') || mbtiStr.includes('i')) {
            mbti = 'introvert'
          }
        }
      } else {
        // 이름만: 기본값 사용
        name = trimmedLine
      }

      if (name) {
        newParticipants.push({
          id: `${Date.now()}-${index}`,
          name,
          gender,
          mbti,
          meetingsByRound: {},
          allMetPeople: [],
          groupHistory: []
        })
      }
    })

    if (newParticipants.length > 0) {
      const updatedParticipants = [...participants, ...newParticipants]
      
      // 즉시 Supabase에 저장 (스냅샷 생성 전에)
      const { saveParticipants } = await import('@/utils/database')
      await saveParticipants(updatedParticipants)
      
      // 상태 업데이트
      setParticipants(updatedParticipants)
      setBulkText('')
      setShowBulkInput(false)
      
      // 벌크 추가 시 스냅샷 생성 (Supabase 저장 후)
      try {
        await createSnapshot('bulk_add', `벌크 추가: ${newParticipants.length}명`)
        console.log(`✅ 벌크 추가 스냅샷 생성 완료: ${newParticipants.length}명`)
        
        // DB 저장 시도
        try {
          const { saveParticipants } = await import('@/utils/database')
          await saveParticipants(updatedParticipants)
          console.log('✅ 벌크 추가 DB 저장 성공')
        } catch (error) {
          console.warn('⚠️ 벌크 추가 DB 저장 실패 (로컬은 정상):', error)
        }
      } catch (error) {
        console.error('❌ 스냅샷 생성 실패:', error)
      }
    }
  }

  // 백업 관련 함수들
  const handleExportData = async () => {
    try {
      const jsonData = await exportToJSON()
      const blob = new Blob([jsonData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `socializing-data-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      alert('데이터가 성공적으로 내보내졌습니다.')
    } catch (error) {
      console.error('데이터 내보내기 실패:', error)
      alert('데이터 내보내기에 실패했습니다.')
    }
  }

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const fileContent = await file.text()
      const result = await importFromJSON(fileContent)
      if (!result.success) {
        throw new Error(result.message)
      }
      // 데이터 가져온 후 기존 결과 확인
      try {
        const { getGroupingResult } = await import('@/utils/database')
        const groupingResult = await getGroupingResult()
        setHasExistingResult(!!groupingResult)
      } catch (error) {
        console.error('기존 결과 확인 중 오류:', error)
      }
      alert('데이터를 성공적으로 가져왔습니다!')
      window.location.reload() // 페이지 새로고침으로 상태 반영
    } catch (error) {
      alert('데이터 가져오기 실패: ' + (error as Error).message)
    }
    
    // 파일 input 초기화
    event.target.value = ''
  }

  const handleRestoreSnapshot = async (snapshotId: number) => {
    if (confirm('이 시점으로 복원하시겠습니까? 현재 데이터는 백업됩니다.')) {
      try {
        console.log('🔄 스냅샷 복원 시작, ID:', snapshotId)
        const success = await restoreSnapshot(snapshotId)
        
        if (success) {
          console.log('✅ 스냅샷 복원 성공!')
          
          // 복원 후 기존 결과 확인
          try {
            const { getGroupingResult } = await import('@/utils/database')
            const groupingResult = await getGroupingResult()
            setHasExistingResult(!!groupingResult)
          } catch (error) {
            console.error('복원 후 결과 확인 중 오류:', error)
          }
          
          alert('✅ 복원이 완료되었습니다!')
          window.location.reload()
        } else {
          console.error('❌ 스냅샷 복원 실패')
          alert('❌ 복원 중 오류가 발생했습니다. 콘솔을 확인해주세요.')
        }
      } catch (error) {
        console.error('❌ 스냅샷 복원 중 예외:', error)
        alert('❌ 복원 중 오류가 발생했습니다: ' + (error as Error).message)
      }
    }
  }

  const refreshSnapshots = async () => {
    if (typeof window !== 'undefined') {
      try {
        const allSnapshots = await getSnapshots()
        setSnapshots(allSnapshots)
      } catch (error) {
        console.warn('스냅샷 조회 실패:', error)
        setSnapshots([])
      }
    }
  }

  // 컴포넌트 마운트 시 스냅샷 목록 새로고침
  useEffect(() => {
    refreshSnapshots()
  }, [participants, currentRound])

  // 클라이언트사이드에서만 스냅샷 로드
  useEffect(() => {
    if (typeof window !== 'undefined') {
      refreshSnapshots()
    }
  }, [])



  // 새로운 모임 시작 함수
  const handleNewMeeting = async () => {
    const confirmMessage = `🎉 새로운 모임을 시작하시겠습니까?

다음 데이터가 초기화됩니다:
• 모든 참가자 정보
• 그룹 히스토리
• 만난 사람 기록
• 현재 라운드 정보

다음 데이터는 유지됩니다:
• 그룹 설정 (그룹 수, 크기, 성비 설정)
• 백업 스냅샷`

    if (confirm(confirmMessage)) {
      try {
        // Supabase에서 현재 모임의 데이터 삭제
        console.log('데이터 초기화: 현재 모임 데이터 삭제 중...')
        const { clearCurrentMeetingData } = await import('@/utils/database')
        const cleared = await clearCurrentMeetingData()
        
        if (!cleared) {
          throw new Error('데이터 삭제 실패')
        }
        
        console.log('✅ 데이터 삭제 완료, 상태 초기화 중...')
        
        // 상태 초기화 (데이터 삭제 확인 후에만 실행) - 그룹 설정은 유지
        setParticipants([])
        setCurrentRound(1)
        setName('')
        setGender('male')
        setMbti('extrovert')
        setBulkText('')
        setShowBulkInput(false)
        setShowBackupSection(false)
        setHasExistingResult(false)
        setIsInitialLoad(true)
        setGroupSettingsLoaded(false)
        
        // localStorage에서 참가자 관련 데이터만 초기화 (그룹 설정은 유지)
        if (typeof window !== 'undefined') {
          localStorage.removeItem('seatAssigner_participants')
          localStorage.removeItem('seatAssigner_groupingResult')
          localStorage.removeItem('seatAssigner_currentRound')
          localStorage.removeItem('seatAssigner_exitedParticipants')
          // seatAssigner_groupSettings는 유지
        }
        
        // 초기화 완료 후 스냅샷 생성
        setTimeout(async () => {
          setIsInitialLoad(false)
          setGroupSettingsLoaded(true)
          // 백지 상태 스냅샷 생성
          await createSnapshot('meeting_start', '새로운 모임 시작 - 초기화된 상태')
          console.log('🎯 새로운 모임 초기화 완료')
        }, 200)
        
        alert('✅ 새로운 모임이 시작되었습니다!')
      } catch (error) {
        console.error('초기화 중 오류 발생:', error)
        alert('❌ 초기화 중 오류가 발생했습니다. 페이지를 새로고침 해주세요.')
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* 헤더 섹션 - 제목과 초기화 버튼 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center space-x-3">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>{currentMeeting ? currentMeeting.name : '모임 자리 배치 프로그램'}</span>
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {participants.length > 0 && (
                <div className="text-right">
                  <div className="text-sm text-gray-600">현재 참가자</div>
                  <div className="text-2xl font-bold text-blue-600">{participants.length}명</div>
                </div>
              )}
              
              <button
                onClick={handleNewMeeting}
                className="bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white font-medium py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                title="새로운 모임을 시작합니다 (백업은 유지됩니다)"
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>새로운 모임 시작</span>
                </div>
              </button>
            </div>
          </div>
          
          {/* 안내 문구 */}
          {participants.length === 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-blue-700 font-medium">새로운 모임을 시작하세요!</span>
              </div>
              <p className="text-blue-600 text-sm mt-1">
                참가자를 추가하고 그룹을 배치하여 즐거운 모임을 만들어보세요.
              </p>
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">참석자 추가</h2>
          
          {/* 그룹 설정 모드 선택 - 개선된 UI */}
          <div className="mb-6">
            <label className="block text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <span className="text-purple-500 mr-2">⚙️</span>
              그룹 설정 방식
            </label>
            
            {/* 카드 형태의 선택 버튼 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* 자동 모드 카드 */}
              <div
                onClick={() => setGroupingMode('auto')}
                className={`cursor-pointer rounded-xl border-2 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg ${
                  groupingMode === 'auto'
                    ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-100 shadow-lg'
                    : 'border-gray-200 bg-white hover:border-blue-300'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        groupingMode === 'auto' 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        🤖
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-800">자동 모드</h3>
                        <p className="text-sm text-gray-600">동일한 크기로 자동 배치</p>
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      groupingMode === 'auto'
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`}>
                      {groupingMode === 'auto' && (
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="mr-2">✅</span>
                      <span>간편한 설정</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="mr-2">⚡</span>
                      <span>빠른 배치</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="mr-2">🎯</span>
                      <span>균등한 그룹 크기</span>
                    </div>
                  </div>
                  
                  {groupingMode === 'auto' && (
                    <div className="mt-4 p-3 bg-white bg-opacity-60 rounded-lg">
                      <div className="text-xs text-blue-700 font-medium">현재 설정</div>
                      <div className="text-sm text-blue-800">
                        그룹당 {groupSize}명 · 예상 {participants.length > 0 ? Math.ceil(participants.length / groupSize) : 0}개 그룹
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 수동 모드 카드 */}
              <div
                onClick={() => setGroupingMode('manual')}
                className={`cursor-pointer rounded-xl border-2 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg ${
                  groupingMode === 'manual'
                    ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-pink-100 shadow-lg'
                    : 'border-gray-200 bg-white hover:border-purple-300'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        groupingMode === 'manual' 
                          ? 'bg-purple-500 text-white' 
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        🎨
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-800">수동 모드</h3>
                        <p className="text-sm text-gray-600">개별 그룹 크기 설정</p>
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      groupingMode === 'manual'
                        ? 'border-purple-500 bg-purple-500'
                        : 'border-gray-300'
                    }`}>
                      {groupingMode === 'manual' && (
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="mr-2">🎛️</span>
                      <span>세밀한 조정</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="mr-2">🎯</span>
                      <span>맞춤형 그룹</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="mr-2">💎</span>
                      <span>유연한 설정</span>
                    </div>
                  </div>
                  
                  {groupingMode === 'manual' && (
                    <div className="mt-4 p-3 bg-white bg-opacity-60 rounded-lg">
                      <div className="text-xs text-purple-700 font-medium">현재 설정</div>
                      <div className="text-sm text-purple-800">
                        {numGroups}개 그룹 · 총 {getTotalCustomSize()}명 예상
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 세부 설정 섹션 */}
            <div className={`p-6 rounded-xl border-2 transition-all duration-300 ${
              groupingMode === 'auto' 
                ? 'border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100' 
                : 'border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100'
            }`}>
              {groupingMode === 'auto' ? (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-800 flex items-center mb-4">
                    <span className="text-blue-500 mr-2">🤖</span>
                    자동 모드 설정
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-gray-700">그룹 크기 선택</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[3, 4, 5, 6].map((size) => (
                          <button
                            key={size}
                            onClick={() => setGroupSize(size)}
                            className={`p-3 rounded-lg border-2 transition-all duration-200 text-center font-medium ${
                              groupSize === size
                                ? 'border-blue-500 bg-blue-500 text-white shadow-md'
                                : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                            }`}
                          >
                            <div className="text-lg">{size}명</div>
                            <div className="text-xs opacity-75">그룹당</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="bg-white bg-opacity-70 p-4 rounded-lg">
                      <h5 className="font-medium text-gray-700 mb-2 flex items-center">
                        <span className="mr-2">📊</span>
                        예상 결과
                      </h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">현재 참가자:</span>
                          <span className="font-medium text-blue-700">{participants.length}명</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">예상 그룹 수:</span>
                          <span className="font-medium text-blue-700">
                            {participants.length > 0 ? Math.ceil(participants.length / groupSize) : 0}개
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">그룹당 인원:</span>
                          <span className="font-medium text-blue-700">{groupSize}명</span>
                        </div>
                        {participants.length % groupSize !== 0 && participants.length > 0 && (
                          <div className="mt-2 p-2 bg-orange-100 rounded text-xs text-orange-700">
                            ⚠️ 마지막 그룹: {participants.length % groupSize}명
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-800 flex items-center mb-4">
                    <span className="text-purple-500 mr-2">🎨</span>
                    수동 모드 설정
                  </h4>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 그룹 수 선택 */}
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-gray-700">그룹 수 선택</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[2, 3, 4, 5, 6, 7, 8].map((num) => (
                          <button
                            key={num}
                            onClick={() => handleNumGroupsChange(num)}
                            className={`p-2 rounded-lg border-2 transition-all duration-200 text-center font-medium ${
                              numGroups === num
                                ? 'border-purple-500 bg-purple-500 text-white shadow-md'
                                : 'border-gray-300 bg-white text-gray-700 hover:border-purple-300 hover:bg-purple-50'
                            }`}
                          >
                            <div className="text-sm">{num}개</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* 그룹별 인원 설정 */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-semibold text-gray-700">각 그룹 설정</label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="enableGenderRatio"
                            checked={enableGenderRatio}
                            onChange={(e) => setEnableGenderRatio(e.target.checked)}
                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          />
                          <label htmlFor="enableGenderRatio" className="text-xs text-gray-600">성비 개별 설정</label>
                        </div>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {customGroupSizes.map((size, index) => (
                          <div key={index} className="bg-white bg-opacity-70 p-3 rounded-lg border">
                            <div className="flex items-center space-x-3 mb-2">
                              <div className="flex items-center justify-center min-w-[2rem] w-8 h-8 bg-purple-100 text-purple-600 rounded-full text-sm font-medium flex-shrink-0">
                                {index + 1}
                              </div>
                              <span className="text-sm text-gray-600 min-w-[50px]">그룹 {index + 1}:</span>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleGroupSizeChange(index, Math.max(2, size - 1))}
                                  className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-purple-600"
                                >
                                  -
                                </button>
                                <span className="w-8 text-center font-medium">{size}</span>
                                <button
                                  onClick={() => handleGroupSizeChange(index, Math.min(20, size + 1))}
                                  className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-purple-600"
                                >
                                  +
                                </button>
                                <span className="text-sm text-gray-500">명</span>
                              </div>
                            </div>
                            
                            {enableGenderRatio && (
                              <div className="mt-2 p-3 bg-gradient-to-r from-blue-50 to-pink-50 rounded-lg border border-purple-200">
                                <div className="text-xs font-medium text-gray-700 mb-3">성비 설정</div>
                                <div className="space-y-3">
                                  {/* 남성 설정 */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                      <span className="text-sm text-blue-700 font-medium">남성</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <button
                                        onClick={() => handleGroupMaleCountChange(index, Math.max(0, customGroupGenders[index]?.maleCount - 1))}
                                        className="w-7 h-7 bg-blue-500 text-white rounded-md flex items-center justify-center text-sm hover:bg-blue-600 transition-colors"
                                      >
                                        −
                                      </button>
                                      <div className="w-8 text-center">
                                        <span className="text-sm font-bold text-blue-700">{customGroupGenders[index]?.maleCount || 0}</span>
                                      </div>
                                      <button
                                        onClick={() => handleGroupMaleCountChange(index, Math.min(size, customGroupGenders[index]?.maleCount + 1))}
                                        className="w-7 h-7 bg-blue-500 text-white rounded-md flex items-center justify-center text-sm hover:bg-blue-600 transition-colors"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                  
                                  {/* 여성 설정 */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
                                      <span className="text-sm text-pink-700 font-medium">여성</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <button
                                        onClick={() => handleGroupFemaleCountChange(index, Math.max(0, customGroupGenders[index]?.femaleCount - 1))}
                                        className="w-7 h-7 bg-pink-500 text-white rounded-md flex items-center justify-center text-sm hover:bg-pink-600 transition-colors"
                                      >
                                        −
                                      </button>
                                      <div className="w-8 text-center">
                                        <span className="text-sm font-bold text-pink-700">{customGroupGenders[index]?.femaleCount || 0}</span>
                                      </div>
                                      <button
                                        onClick={() => handleGroupFemaleCountChange(index, Math.min(size, customGroupGenders[index]?.femaleCount + 1))}
                                        className="w-7 h-7 bg-pink-500 text-white rounded-md flex items-center justify-center text-sm hover:bg-pink-600 transition-colors"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                  
                                  {/* 합계 표시 */}
                                  <div className="pt-2 border-t border-gray-200">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-gray-600">합계</span>
                                      <div className="flex items-center space-x-1">
                                        <span className="font-medium text-gray-800">
                                          {(customGroupGenders[index]?.maleCount || 0) + (customGroupGenders[index]?.femaleCount || 0)}명
                                        </span>
                                        {((customGroupGenders[index]?.maleCount || 0) + (customGroupGenders[index]?.femaleCount || 0)) !== size && (
                                          <span className="text-red-600 font-medium">
                                            ⚠️ 불일치
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* 결과 요약 */}
                    <div className="bg-white bg-opacity-70 p-4 rounded-lg">
                      <h5 className="font-medium text-gray-700 mb-3 flex items-center">
                        <span className="mr-2">📊</span>
                        설정 요약
                      </h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">현재 참가자:</span>
                          <span className="font-medium text-purple-700">{participants.length}명</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">설정 그룹 수:</span>
                          <span className="font-medium text-purple-700">{numGroups}개</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">총 예상 인원:</span>
                          <span className="font-medium text-purple-700">{getTotalCustomSize()}명</span>
                        </div>
                        
                        {/* 상태 표시 */}
                        <div className="mt-3 pt-2 border-t border-gray-200">
                          {getTotalCustomSize() === participants.length ? (
                            <div className="flex items-center text-green-600 text-xs">
                              <span className="mr-1">✅</span>
                              <span>완벽한 배치!</span>
                            </div>
                          ) : getTotalCustomSize() < participants.length ? (
                            <div className="flex items-center text-red-600 text-xs">
                              <span className="mr-1">⚠️</span>
                              <span>{participants.length - getTotalCustomSize()}명 초과</span>
                            </div>
                          ) : (
                            <div className="flex items-center text-orange-600 text-xs">
                              <span className="mr-1">💡</span>
                              <span>{getTotalCustomSize() - participants.length}명 여유</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 현재 라운드 표시 - 개선된 UI */}
          <div className="mb-6">
            <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-white bg-opacity-20 rounded-full p-3 animate-pulse">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    {hasExistingResult ? (
                      <>
                        <h3 className="text-lg font-medium text-green-200">배치 완료</h3>
                        <div className="text-3xl font-bold bg-gradient-to-r from-green-300 to-emerald-300 bg-clip-text text-transparent">
                          {currentRound - 1}라운드 배치 완료
                        </div>
                      </>
                    ) : (
                      <>
                        <h3 className="text-lg font-medium text-blue-100">배치 준비</h3>
                        <div className="text-3xl font-bold bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                          {currentRound}라운드 배치 전
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-blue-100 text-sm">참가자</div>
                  <div className="text-2xl font-bold">{participants.length}명</div>
                  {participants.length >= 2 && (
                    <div className="inline-flex items-center mt-1 px-2 py-1 bg-green-500 bg-opacity-20 rounded-full">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-ping"></div>
                      <span className="text-xs text-green-200">배치 가능</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* 참가자 수에 따른 예상 그룹 정보 */}
              {participants.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white border-opacity-20">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-100">
                      {groupingMode === 'auto' 
                        ? `예상 그룹: ${Math.ceil(participants.length / groupSize)}개 (${groupSize}명씩)`
                        : `설정 그룹: ${numGroups}개 (총 ${getTotalCustomSize()}명)`
                      }
                    </span>
                    {groupingMode === 'manual' && getTotalCustomSize() !== participants.length && (
                      <span className={`font-medium px-2 py-1 rounded-full text-xs ${
                        getTotalCustomSize() < participants.length 
                          ? 'bg-red-500 bg-opacity-20 text-red-200' 
                          : 'bg-yellow-500 bg-opacity-20 text-yellow-200'
                      }`}>
                        {getTotalCustomSize() < participants.length 
                          ? `${participants.length - getTotalCustomSize()}명 초과` 
                          : `${getTotalCustomSize() - participants.length}명 여유`
                        }
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              {/* 장식적 요소 - 개선된 애니메이션 */}
              <div className="absolute top-0 right-0 -mr-2 -mt-2 w-16 h-16 bg-white bg-opacity-10 rounded-full animate-bounce"></div>
              <div className="absolute bottom-0 left-0 -ml-2 -mb-2 w-12 h-12 bg-white bg-opacity-10 rounded-full animate-pulse"></div>
              <div className="absolute top-1/2 right-4 w-3 h-3 bg-yellow-300 rounded-full animate-ping opacity-75"></div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <input
              type="text"
              placeholder="이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as 'male' | 'female')}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="male">남성</option>
              <option value="female">여성</option>
            </select>
            
            <select
              value={mbti}
              onChange={(e) => setMbti(e.target.value as 'extrovert' | 'introvert')}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="extrovert">외향형</option>
              <option value="introvert">내향형</option>
            </select>
            
            <button
              onClick={addParticipant}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md"
            >
              추가
            </button>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium">벌크 추가</h3>
              <button
                onClick={() => setShowBulkInput(!showBulkInput)}
                className="text-blue-500 hover:text-blue-700 text-sm"
              >
                {showBulkInput ? '숨기기' : '여러 명 한번에 추가'}
              </button>
            </div>
            
            {showBulkInput && (
              <div className="space-y-3">
                <div className="text-sm text-gray-600">
                  <p className="mb-2">지원하는 형식:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>이름만: 김철수 (기본값: 남성, 외향형)</li>
                    <li>공백 구분: 김철수 남 외향</li>
                    <li>쉼표 구분: 김철수,남,외향</li>
                    <li>성별: 남/여 또는 male/female 또는 m/f</li>
                    <li>MBTI: 외향/내향 또는 extrovert/introvert 또는 e/i</li>
                  </ul>
                  <div className="mt-3 p-2 bg-gray-100 rounded text-xs">
                    <strong>예시:</strong><br/>
                    김철수<br/>
                    이영희,여,내향<br/>
                    박민수 남 외향
                  </div>
                </div>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder="여기에 참가자 정보를 입력해 주세요 (한 줄에 한 명씩)"
                  className="w-full h-32 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={processBulkInput}
                    className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-md text-sm"
                  >
                    벌크 추가
                  </button>
                  <button
                    onClick={() => {
                      setBulkText('')
                      setShowBulkInput(false)
                    }}
                    className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-md text-sm"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">
            참석자 목록 ({participants.length}명)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {participants.sort((a, b) => a.name.localeCompare(b.name, 'ko')).map((participant) => (
              <div
                key={participant.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-md"
              >
                <div>
                  <span className="font-medium">{participant.name}</span>
                  <div className="text-sm text-gray-600">
                    {participant.gender === 'male' ? '남성' : '여성'} · {' '}
                    {participant.mbti === 'extrovert' ? '외향형' : '내향형'}
                  </div>
                  {participant.allMetPeople && participant.allMetPeople.length > 0 && (
                    <div className="text-xs text-blue-600">
                      만난 사람: {participant.allMetPeople.length}명
                    </div>
                  )}
                  {participant.groupHistory && participant.groupHistory.length > 0 && (
                    <div className="text-xs text-purple-600">
                      그룹 히스토리: {participant.groupHistory.slice(-3).join(', ')}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeParticipant(participant.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
          
          {participants.length >= 2 && (
            <div className="mt-6 text-center">
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button 
                  onClick={handleGrouping}
                  disabled={isLoading}
                  className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-md"
                >
                  {isLoading ? '배치 중...' : '새로운 그룹 배치하기'}
                </button>
                
                {isClient && hasExistingResult && (
                  <>
                    <button
                      onClick={regroupCurrentRound}
                      disabled={isLoading}
                      className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-md"
                    >
                      {isLoading ? '재배치 중...' : '이번 그룹 재배치하기'}
                    </button>
                    
                    <button
                      onClick={() => router.push('/result')}
                      className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-5 rounded-md flex items-center gap-2"
                    >
                      <span className="text-lg">📊</span>
                      <span>배치 결과 확인하기</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 백업 및 복원 섹션 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">데이터 백업 및 복원</h2>
            <button
              onClick={() => setShowBackupSection(!showBackupSection)}
              className="text-blue-500 hover:text-blue-700 text-sm"
            >
              {showBackupSection ? '숨기기' : '백업 메뉴 열기'}
            </button>
          </div>

          {showBackupSection && (
            <div className="space-y-6">
              {/* JSON 내보내기/가져오기 */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-medium mb-3 flex items-center">
                  <span className="text-blue-500 mr-2">💾</span>
                  데이터 내보내기 / 가져오기
                </h3>
                <div className="flex gap-4">
                  <button
                    onClick={handleExportData}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md"
                  >
                    데이터 내보내기 (JSON)
                  </button>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportData}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <button className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-md">
                      데이터 가져오기 (JSON)
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  💡 중요한 데이터는 정기적으로 내보내기하여 백업하세요.
                </p>
              </div>

              {/* 스냅샷 복원 */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-medium flex items-center">
                    <span className="text-orange-500 mr-2">📸</span>
                    자동 스냅샷 복원
                  </h3>
                  <button
                    onClick={refreshSnapshots}
                    className="text-blue-500 hover:text-blue-700 text-sm"
                  >
                    새로고침
                  </button>
                </div>
                
                {snapshots.length === 0 ? (
                  <p className="text-gray-500 text-sm">저장된 스냅샷이 없습니다.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {snapshots.slice(-20).reverse().map((snapshot) => (
                      <div 
                        key={snapshot.id}
                        className="flex justify-between items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm">{snapshot.description}</div>
                          <div className="text-xs text-gray-500">
                            {formatDateTime(snapshot.timestamp)}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRestoreSnapshot(snapshot.id)}
                          className="bg-orange-500 hover:bg-orange-600 text-white text-xs py-1 px-3 rounded"
                        >
                          복원
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-sm text-gray-600 mt-3">
                  💡 참가자 추가/제거, 그룹 배치, 위치 변경 시 자동으로 스냅샷이 생성됩니다.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}