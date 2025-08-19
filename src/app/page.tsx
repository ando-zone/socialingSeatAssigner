'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createOptimalGroups, updateMeetingHistory, migrateParticipantData, type GenderConstraint } from '@/utils/grouping'
import { exportToJSON, importFromJSON, getSnapshots, restoreSnapshot } from '@/utils/backup'

// Components
import ParticipantManager from '@/components/ParticipantManager'
import GroupingSettings from '@/components/GroupingSettings'
import GroupingActions from '@/components/GroupingActions'
import BackupManager from '@/components/BackupManager'

// Hooks
import { useParticipants } from '@/hooks/useParticipants'
import { useGroupingSettings } from '@/hooks/useGroupingSettings'

export default function Home() {
  const router = useRouter()
  
  // Custom hooks
  const {
    participants,
    setParticipants,
    addParticipant,
    removeParticipant,
    bulkAddParticipants
  } = useParticipants()
  
  const {
    groupingMode,
    groupSize,
    numGroups,
    customGroupSizes,
    customGroupGenders,
    enableGenderRatio,
    groupSettingsLoaded,
    setGroupingMode,
    setGroupSize,
    setNumGroups,
    setCustomGroupSizes,
    setCustomGroupGenders,
    setEnableGenderRatio,
    setGroupSettingsLoaded,
    handleNumGroupsChange,
    handleGroupSizeChange,
    handleGroupMaleCountChange,
    handleGroupFemaleCountChange,
    saveGroupSettings
  } = useGroupingSettings()

  // Local states
  const [currentRound, setCurrentRound] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [snapshots, setSnapshots] = useState<any[]>([])
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [hasExistingResult, setHasExistingResult] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [currentMeeting, setCurrentMeeting] = useState<any>(null)

  // Check if running on client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Data loading effect
  useEffect(() => {
    if (!isClient || !isInitialLoad) return

    const checkUrlMeetingId = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search)
        const urlMeetingId = urlParams.get('meeting')
        
        if (urlMeetingId) {
          const { createSupabaseClient, getCurrentMeetingId, setCurrentMeetingId, getUserMeetings } = await import('@/utils/database')
          const supabase = createSupabaseClient()
          
          if (supabase) {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
              const userMeetings = await getUserMeetings(user.id)
              const targetMeeting = userMeetings.find(m => m.id === urlMeetingId)
              
              if (targetMeeting) {
                setCurrentMeetingId(urlMeetingId)
                console.log('URL에서 모임 설정됨:', urlMeetingId)
              }
            }
          }
          
          // URL에서 meeting 파라미터 제거
          window.history.replaceState({}, document.title, window.location.pathname)
        }
      } catch (error) {
        console.error('URL 모임 ID 처리 중 오류:', error)
      }
    }

    const loadData = async () => {
      try {
        const {
          getCurrentMeetingId,
          getCurrentMeeting,
          getParticipants,
          getGroupingResult,
          getGroupSettings
        } = await import('@/utils/database')
        
        const meetingId = getCurrentMeetingId()
        if (!meetingId) {
          console.log('활성 모임이 없습니다.')
          setIsInitialLoad(false)
          return
        }

        const meeting = await getCurrentMeeting()
        setCurrentMeeting(meeting)
        
        console.log('📥 Supabase에서 데이터 로딩 중...')
        
        const [participants, groupingResult, groupSettings] = await Promise.all([
          getParticipants(),
          getGroupingResult(),
          getGroupSettings()
        ])

        console.log('🔍 로드된 데이터:', {
          participantsCount: participants.length,
          hasGroupingResult: !!groupingResult,
          groupSettingsLoaded: !!groupSettings,
          groupSettings: groupSettings
        })
        
        setHasExistingResult(!!groupingResult)
        
        // 참가자 데이터 설정
        if (participants.length > 0) {
          const currentRound = groupingResult?.round ? groupingResult.round + 1 : 1
          const migratedParticipants = migrateParticipantData(participants, currentRound)
          setParticipants(migratedParticipants)
          setCurrentRound(currentRound)
          console.log('✅ 참가자 데이터 로드:', migratedParticipants.length + '명')
        }
        
        // 그룹 설정 복원
        if (groupSettings) {
          console.log('저장된 그룹 설정 복원:', groupSettings)
          setGroupingMode(groupSettings.groupingMode || 'manual')
          setGroupSize(groupSettings.groupSize || 4)
          setNumGroups(groupSettings.numGroups || 6)
          setCustomGroupSizes(groupSettings.customGroupSizes || Array(groupSettings.numGroups || 6).fill(groupSettings.groupSize || 4))
          
          // 성비 설정 복원
          if (groupSettings.customGroupGenders) {
            setCustomGroupGenders(groupSettings.customGroupGenders)
          } else {
            const localGenders = localStorage.getItem('seatAssigner_customGroupGenders')
            if (localGenders) {
              try {
                setCustomGroupGenders(JSON.parse(localGenders))
              } catch (e) {
                const numGroups = groupSettings.numGroups || 6
                const defaultMale = Math.ceil((groupSettings.groupSize || 4) * 0.6)
                const defaultFemale = (groupSettings.groupSize || 4) - defaultMale
                setCustomGroupGenders(Array(numGroups).fill({maleCount: defaultMale, femaleCount: defaultFemale}))
              }
            } else {
              const numGroups = groupSettings.numGroups || 6
              const defaultMale = Math.ceil((groupSettings.groupSize || 4) * 0.6)
              const defaultFemale = (groupSettings.groupSize || 4) - defaultMale
              setCustomGroupGenders(Array(numGroups).fill({maleCount: defaultMale, femaleCount: defaultFemale}))
            }
          }
          
          setEnableGenderRatio(groupSettings.enableGenderRatio || false)
        } else {
          // localStorage에서 설정 복원 시도
          const localGroupSizes = localStorage.getItem('seatAssigner_customGroupSizes')
          const localNumGroups = localStorage.getItem('seatAssigner_numGroups')
          const localGroupSize = localStorage.getItem('seatAssigner_groupSize')
          
          if (localGroupSizes) {
            try {
              setCustomGroupSizes(JSON.parse(localGroupSizes))
            } catch (e) {
              const numGroups = localNumGroups ? parseInt(localNumGroups) : 6
              const groupSize = localGroupSize ? parseInt(localGroupSize) : 4
              setCustomGroupSizes(Array(numGroups).fill(groupSize))
            }
          } else {
            const numGroups = localNumGroups ? parseInt(localNumGroups) : 6
            const groupSize = localGroupSize ? parseInt(localGroupSize) : 4
            setCustomGroupSizes(Array(numGroups).fill(groupSize))
          }
        }
        
        setGroupSettingsLoaded(true)
      } catch (error) {
        console.error('❌ 데이터 로딩 중 오류:', error)
      } finally {
        setIsInitialLoad(false)
      }
    }

    checkUrlMeetingId().then(loadData)
  }, [isClient, isInitialLoad, setParticipants, setGroupingMode, setGroupSize, setNumGroups, setCustomGroupSizes, setCustomGroupGenders, setEnableGenderRatio, setGroupSettingsLoaded])

  // Save settings when they change
  useEffect(() => {
    if (!isInitialLoad && groupSettingsLoaded) {
      saveGroupSettings()
    }
  }, [groupingMode, groupSize, numGroups, customGroupSizes, customGroupGenders, enableGenderRatio, isInitialLoad, groupSettingsLoaded, saveGroupSettings])

  // Grouping function
  const handleGrouping = async () => {
    if (participants.length < 2) {
      alert('최소 2명 이상의 참가자가 필요합니다.')
      return
    }

    if (groupingMode === 'manual') {
      const totalCustomSize = customGroupSizes.reduce((sum, size) => sum + size, 0)
      if (participants.length > totalCustomSize) {
        alert(`참가자 수(${participants.length}명)가 설정된 그룹 총 인원(${totalCustomSize}명)보다 많습니다. 그룹 설정을 확인해주세요.`)
        return
      }
    }

    setIsLoading(true)
    
    try {
      const groupSizeParam = groupingMode === 'auto' ? groupSize : customGroupSizes
      
      // 성비 제약 조건 준비
      let genderConstraints: GenderConstraint[] | undefined = undefined
      console.log('🔍 성비 설정 체크:', { groupingMode, enableGenderRatio, customGroupGenders })
      
      if (groupingMode === 'manual' && enableGenderRatio) {
        genderConstraints = customGroupGenders.map(gender => ({
          maleCount: gender.maleCount,
          femaleCount: gender.femaleCount
        }))
        console.log('🎯 성비 제약 조건 적용:', genderConstraints)
      } else {
        console.log('❌ 성비 제약 조건 비활성화 - groupingMode:', groupingMode, 'enableGenderRatio:', enableGenderRatio)
      }
      
      const result = createOptimalGroups(participants, groupSizeParam, currentRound, genderConstraints)
      const updatedParticipants = updateMeetingHistory(participants, result.groups, currentRound)
      
      const nextRound = currentRound + 1
      
      // Supabase 저장
      const { getCurrentMeetingId, saveParticipants, saveGroupingResult } = await import('@/utils/database')
      const meetingId = getCurrentMeetingId()
      
      if (meetingId) {
        await Promise.all([
          saveParticipants(updatedParticipants),
          saveGroupingResult(result)
        ])
        console.log('✅ 그룹핑 결과 저장 완료')
      }
      
      setParticipants(updatedParticipants)
      setCurrentRound(nextRound)
      
      router.push('/result')
    } catch (error) {
      console.error('그룹핑 중 오류:', error)
      alert('그룹핑 중 오류가 발생했습니다: ' + (error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  // Regroup current round
  const regroupCurrentRound = async () => {
    if (participants.length < 2) return

    setIsLoading(true)
    
    try {
      const reGroupRound = currentRound - 1
      
      // 현재 라운드 기록을 제거한 참가자들
      const participantsForRegroup = participants.map(p => {
        const newMeetingsByRound = { ...p.meetingsByRound }
        delete newMeetingsByRound[reGroupRound]
        
        const allMet = new Set<string>()
        Object.values(newMeetingsByRound).forEach(roundMeetings => {
          if (Array.isArray(roundMeetings)) {
            roundMeetings.forEach(personId => allMet.add(personId))
          }
        })
        const newAllMetPeople = Array.from(allMet)
        
        return {
          ...p,
          meetingsByRound: newMeetingsByRound,
          allMetPeople: newAllMetPeople
        }
      })

      const groupSizeParam = groupingMode === 'auto' ? groupSize : customGroupSizes
      let genderConstraints: GenderConstraint[] | undefined = undefined
      if (groupingMode === 'manual' && enableGenderRatio) {
        genderConstraints = customGroupGenders.map(gender => ({
          maleCount: gender.maleCount,
          femaleCount: gender.femaleCount
        }))
      }

      const result = createOptimalGroups(participantsForRegroup, groupSizeParam, reGroupRound, genderConstraints)
      const updatedParticipants = updateMeetingHistory(participantsForRegroup, result.groups, reGroupRound)

      // Supabase 저장
      const { saveParticipants, saveGroupingResult } = await import('@/utils/database')
      await Promise.all([
        saveParticipants(updatedParticipants),
        saveGroupingResult(result)
      ])

      setParticipants(updatedParticipants)
      router.push('/result')
    } catch (error) {
      console.error('재그룹핑 중 오류:', error)
      alert('재그룹핑 중 오류가 발생했습니다: ' + (error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  // Export data
  const handleExportData = async () => {
    try {
      const jsonData = await exportToJSON()
      const blob = new Blob([jsonData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `socialingSeatAssigner_${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      alert('데이터가 JSON 파일로 내보내졌습니다!')
    } catch (error) {
      console.error('데이터 내보내기 실패:', error)
      alert('데이터 내보내기에 실패했습니다.')
    }
  }

  // Import data
  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const fileContent = await file.text()
      const result = await importFromJSON(fileContent)
      
      if (result.success) {
        alert('데이터가 성공적으로 가져와졌습니다!')
        
        // 결과가 있는지 확인
        const { getGroupingResult } = await import('@/utils/database')
        const groupingResult = await getGroupingResult()
        setHasExistingResult(!!groupingResult)
        
        // 페이지 새로고침으로 데이터 다시 로드
        window.location.reload()
      } else {
        alert(`데이터 가져오기 실패: ${result.error}`)
      }
    } catch (error) {
      console.error('데이터 가져오기 실패:', error)
      alert('데이터 가져오기에 실패했습니다.')
    }
    event.target.value = ''
  }

  // Restore snapshot
  const handleRestoreSnapshot = async (snapshotId: number) => {
    if (!confirm('이 스냅샷으로 복원하시겠습니까? 현재 데이터가 덮어씌워집니다.')) return
    
    try {
      const success = await restoreSnapshot(snapshotId)
      if (success) {
        alert('스냅샷이 복원되었습니다!')
        
        // 결과가 있는지 확인
        const { getGroupingResult } = await import('@/utils/database')
        const groupingResult = await getGroupingResult()
        setHasExistingResult(!!groupingResult)
        
        // 페이지 새로고침으로 데이터 다시 로드
        window.location.reload()
      } else {
        alert('스냅샷 복원에 실패했습니다.')
      }
    } catch (error) {
      console.error('스냅샷 복원 실패:', error)
      alert('스냅샷 복원에 실패했습니다.')
    }
  }

  // Refresh snapshots
  const refreshSnapshots = async () => {
    try {
      const allSnapshots = await getSnapshots()
      setSnapshots(allSnapshots)
    } catch (error) {
      console.error('스냅샷 새로고침 실패:', error)
    }
  }

  // New meeting
  const handleNewMeeting = async () => {
    const confirmMsg = '새 모임을 시작하면 현재 모든 데이터가 삭제됩니다.\n' +
                      '이 작업은 되돌릴 수 없습니다.\n\n' +
                      '계속하시겠습니까?'
    
    if (!confirm(confirmMsg)) return
    
    try {
      const { clearCurrentMeetingData } = await import('@/utils/database')
      const cleared = await clearCurrentMeetingData()
      
      if (cleared) {
        alert('새 모임이 시작되었습니다!')
        window.location.reload()
      } else {
        alert('새 모임 시작에 실패했습니다.')
      }
    } catch (error) {
      console.error('새 모임 시작 실패:', error)
      alert('새 모임 시작에 실패했습니다.')
    }
  }

  const handleAddParticipant = async (participantData: {
    name: string
    gender: 'male' | 'female'
    mbti: 'extrovert' | 'introvert'
  }) => {
    await addParticipant(participantData)
  }

  const handleBulkAdd = async (bulkText: string) => {
    await bulkAddParticipants(bulkText)
  }

  // Don't render anything on server side
  if (!isClient) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🪑 소셜링 좌석 배정 도구
          </h1>
          <p className="text-gray-600">
            참가자들의 새로운 만남을 최적화하는 스마트한 그룹 배치 도구
          </p>
          {currentMeeting && (
            <div className="mt-2 text-sm text-blue-600">
              현재 모임: {currentMeeting.name}
            </div>
          )}
        </div>

        <div className="space-y-8">
          {/* 참가자 관리 */}
          <ParticipantManager
            participants={participants}
            onAddParticipant={handleAddParticipant}
            onRemoveParticipant={removeParticipant}
            onBulkAdd={handleBulkAdd}
            currentRound={currentRound}
          />

          {/* 그룹 설정 */}
          <GroupingSettings
            groupingMode={groupingMode}
            groupSize={groupSize}
            numGroups={numGroups}
            customGroupSizes={customGroupSizes}
            customGroupGenders={customGroupGenders}
            enableGenderRatio={enableGenderRatio}
            participantCount={participants.length}
            onGroupingModeChange={setGroupingMode}
            onGroupSizeChange={setGroupSize}
            onNumGroupsChange={handleNumGroupsChange}
            onCustomGroupSizeChange={handleGroupSizeChange}
            onCustomGroupMaleCountChange={handleGroupMaleCountChange}
            onCustomGroupFemaleCountChange={handleGroupFemaleCountChange}
            onEnableGenderRatioChange={setEnableGenderRatio}
          />

          {/* 그룹핑 액션 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <GroupingActions
              participantCount={participants.length}
              hasExistingResult={hasExistingResult}
              isLoading={isLoading}
              onStartGrouping={handleGrouping}
              onRegroupCurrent={regroupCurrentRound}
              onViewResults={() => router.push('/result')}
              groupingMode={groupingMode}
              customGroupSizes={customGroupSizes}
            />
          </div>

          {/* 백업 관리 */}
          <BackupManager
            snapshots={snapshots}
            onExportData={handleExportData}
            onImportData={handleImportData}
            onRestoreSnapshot={handleRestoreSnapshot}
            onRefreshSnapshots={refreshSnapshots}
            onNewMeeting={handleNewMeeting}
          />
        </div>
      </div>
    </div>
  )
}