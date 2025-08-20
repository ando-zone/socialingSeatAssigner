import { useState, useCallback } from 'react'

interface GroupingSettings {
  groupingMode: 'auto' | 'manual'
  groupSize: number
  numGroups: number
  customGroupSizes: number[]
  customGroupGenders: { maleCount: number; femaleCount: number }[]
  enableGenderRatio: boolean
}

export function useGroupingSettings() {
  const [groupingMode, setGroupingMode] = useState<'auto' | 'manual'>('manual')
  const [groupSize, setGroupSize] = useState(4)
  const [numGroups, setNumGroups] = useState(6)
  const [customGroupSizes, setCustomGroupSizes] = useState<number[]>([12, 12, 12, 12, 12, 12])
  const [customGroupGenders, setCustomGroupGenders] = useState<{maleCount: number, femaleCount: number}[]>([
    {maleCount: 7, femaleCount: 5}, {maleCount: 7, femaleCount: 5}, {maleCount: 7, femaleCount: 5},
    {maleCount: 7, femaleCount: 5}, {maleCount: 7, femaleCount: 5}, {maleCount: 7, femaleCount: 5}
  ])
  const [enableGenderRatio, setEnableGenderRatio] = useState(false)
  const [groupSettingsLoaded, setGroupSettingsLoaded] = useState(false)

  const handleNumGroupsChange = useCallback((newNumGroups: number) => {
    setNumGroups(newNumGroups)
    const newSizes = [...customGroupSizes]
    const newGenders = [...customGroupGenders]
    
    // 그룹 수가 증가한 경우 새 그룹 추가
    while (newSizes.length < newNumGroups) {
      const lastSize = newSizes.length > 0 ? newSizes[newSizes.length - 1] : groupSize
      // 마지막 그룹의 성비를 기반으로 비율 계산
      const lastGender = newGenders.length > 0 ? newGenders[newGenders.length - 1] : null
      let newGender
      
      if (lastGender && lastGender.maleCount + lastGender.femaleCount > 0) {
        // 기존 그룹의 성비 비율을 유지
        const maleRatio = lastGender.maleCount / (lastGender.maleCount + lastGender.femaleCount)
        const newMaleCount = Math.round(lastSize * maleRatio)
        const newFemaleCount = lastSize - newMaleCount
        newGender = { maleCount: newMaleCount, femaleCount: newFemaleCount }
      } else {
        // 기본 비율 (6:4 = 남성:여성)
        const newMaleCount = Math.ceil(lastSize * 0.6)
        const newFemaleCount = lastSize - newMaleCount
        newGender = { maleCount: newMaleCount, femaleCount: newFemaleCount }
      }
      
      newSizes.push(lastSize)
      newGenders.push(newGender)
    }
    
    // 그룹 수가 감소한 경우 초과 그룹 제거
    while (newSizes.length > newNumGroups) {
      newSizes.pop()
      newGenders.pop()
    }
    
    setCustomGroupSizes(newSizes)
    setCustomGroupGenders(newGenders)
  }, [customGroupSizes, customGroupGenders, groupSize])

  const handleGroupSizeChange = useCallback((groupIndex: number, newSize: number) => {
    const newSizes = [...customGroupSizes]
    newSizes[groupIndex] = Math.max(1, newSize)
    setCustomGroupSizes(newSizes)
    
    // 성비 설정이 활성화된 경우 성비도 조정
    if (enableGenderRatio) {
      const newGenders = [...customGroupGenders]
      const currentGender = newGenders[groupIndex]
      const currentTotal = currentGender.maleCount + currentGender.femaleCount
      
      if (currentTotal !== newSize) {
        // 기존 비율을 유지하면서 새 크기에 맞춤
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
  }, [customGroupSizes, customGroupGenders, enableGenderRatio])

  const handleGroupMaleCountChange = useCallback((groupIndex: number, newMaleCount: number) => {
    const newGenders = [...customGroupGenders]
    const groupSize = customGroupSizes[groupIndex]
    const maxMale = Math.max(0, Math.min(groupSize, newMaleCount))
    const newFemaleCount = groupSize - maxMale
    
    newGenders[groupIndex] = {
      maleCount: maxMale,
      femaleCount: newFemaleCount
    }
    setCustomGroupGenders(newGenders)
  }, [customGroupGenders, customGroupSizes])

  const handleGroupFemaleCountChange = useCallback((groupIndex: number, newFemaleCount: number) => {
    const newGenders = [...customGroupGenders]
    const groupSize = customGroupSizes[groupIndex]
    const maxFemale = Math.max(0, Math.min(groupSize, newFemaleCount))
    const newMaleCount = groupSize - maxFemale
    
    newGenders[groupIndex] = {
      maleCount: newMaleCount,
      femaleCount: maxFemale
    }
    setCustomGroupGenders(newGenders)
  }, [customGroupGenders, customGroupSizes])

  const saveGroupSettings = useCallback(async () => {
    const groupSettings = {
      groupingMode,
      groupSize,
      numGroups,
      customGroupSizes,
      customGroupGenders,
      enableGenderRatio
    }
    
    try {
      const { saveGroupSettings: saveSettings } = await import('@/utils/database')
      await saveSettings(groupSettings)
      
      // localStorage에도 백업 저장
      localStorage.setItem('seatAssigner_groupingMode', groupingMode)
      localStorage.setItem('seatAssigner_groupSize', groupSize.toString())
      localStorage.setItem('seatAssigner_numGroups', numGroups.toString())
      localStorage.setItem('seatAssigner_customGroupSizes', JSON.stringify(customGroupSizes))
      localStorage.setItem('seatAssigner_customGroupGenders', JSON.stringify(customGroupGenders))
      localStorage.setItem('seatAssigner_enableGenderRatio', enableGenderRatio.toString())
      
      console.log('그룹 설정 저장됨 (Supabase + localStorage):', groupSettings)
    } catch (error) {
      console.error('그룹 설정 저장 실패:', error)
    }
  }, [groupingMode, groupSize, numGroups, customGroupSizes, customGroupGenders, enableGenderRatio])

  return {
    // States
    groupingMode,
    groupSize,
    numGroups,
    customGroupSizes,
    customGroupGenders,
    enableGenderRatio,
    groupSettingsLoaded,
    
    // Setters
    setGroupingMode,
    setGroupSize,
    setNumGroups,
    setCustomGroupSizes,
    setCustomGroupGenders,
    setEnableGenderRatio,
    setGroupSettingsLoaded,
    
    // Handlers
    handleNumGroupsChange,
    handleGroupSizeChange,
    handleGroupMaleCountChange,
    handleGroupFemaleCountChange,
    saveGroupSettings
  }
}