import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'
import type { Participant, GroupingResult } from './grouping'

export interface Meeting {
  id: string
  user_id: string
  name: string
  current_round: number
  created_at: string
  updated_at: string
}

export interface DBParticipant {
  id: string
  meeting_id: string
  name: string
  gender: 'male' | 'female'
  mbti: 'extrovert' | 'introvert'
  meetings_by_round: Record<string, string[]>
  all_met_people: string[]
  group_history: number[]
  created_at: string
  updated_at: string
}

export interface DBGroupingResult {
  id: string
  meeting_id: string
  round: number
  groups: any
  summary: any
  created_at: string
  updated_at: string
}

export interface GroupSettings {
  id: string
  meeting_id: string
  grouping_mode: 'auto' | 'manual'
  group_size: number
  num_groups: number
  custom_group_sizes: number[]
  created_at: string
  updated_at: string
}

export interface Snapshot {
  id: string
  meeting_id: string
  snapshot_id: number
  event_type: string
  description: string
  data: any
  timestamp: string
  created_at: string
}

// 현재 활성 모임 ID를 관리하는 상태
let currentMeetingId: string | null = null

export const setCurrentMeetingId = (meetingId: string) => {
  currentMeetingId = meetingId
}

export const getCurrentMeetingId = (): string | null => {
  return currentMeetingId
}

export const clearCurrentMeetingId = () => {
  currentMeetingId = null
}

// ===== 모임(Meeting) 관련 함수들 =====

export const createMeeting = async (name: string, userId: string): Promise<Meeting | null> => {
  if (!isSupabaseConfigured) {
    console.error('Supabase가 설정되지 않았습니다. 모임 생성이 불가능합니다.')
    return null
  }

  const supabase = createSupabaseClient()
  if (!supabase) return null
  
  try {
    const { data, error } = await supabase
      .from('meetings')
      .insert({
        user_id: userId,
        name,
        current_round: 1
      })
      .select()
      .single()

    if (error) throw error
    
    setCurrentMeetingId(data.id)
    return data
  } catch (error) {
    console.error('모임 생성 중 오류:', error)
    return null
  }
}

export const getUserMeetings = async (userId: string): Promise<Meeting[]> => {
  const supabase = createSupabaseClient()
  if (!supabase) return []
  
  try {
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('모임 목록 조회 중 오류:', error)
    return []
  }
}

export const updateMeetingRound = async (meetingId: string, round: number): Promise<boolean> => {
  const supabase = createSupabaseClient()
  if (!supabase) return false
  
  try {
    const { error } = await supabase
      .from('meetings')
      .update({ 
        current_round: round,
        updated_at: new Date().toISOString()
      })
      .eq('id', meetingId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('모임 라운드 업데이트 중 오류:', error)
    return false
  }
}

// ===== 참가자(Participants) 관련 함수들 =====

export const saveParticipants = async (participants: Participant[]): Promise<boolean> => {
  const meetingId = getCurrentMeetingId()
  if (!meetingId) return false
  
  const supabase = createSupabaseClient()
  if (!supabase) return false
  
  try {
    // 기존 참가자들 삭제
    await supabase
      .from('participants')
      .delete()
      .eq('meeting_id', meetingId)

    // 새 참가자들 추가
    if (participants.length > 0) {
      const dbParticipants = participants.map(p => ({
        id: p.id,
        meeting_id: meetingId,
        name: p.name,
        gender: p.gender,
        mbti: p.mbti,
        meetings_by_round: p.meetingsByRound,
        all_met_people: p.allMetPeople,
        group_history: p.groupHistory
      }))

      const { error } = await supabase
        .from('participants')
        .insert(dbParticipants)

      if (error) throw error
    }

    return true
  } catch (error) {
    console.error('참가자 저장 중 오류:', error)
    return false
  }
}

export const getParticipants = async (): Promise<Participant[]> => {
  const meetingId = getCurrentMeetingId()
  if (!meetingId) return []
  
  const supabase = createSupabaseClient()
  if (!supabase) return []
  
  try {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('meeting_id', meetingId)

    if (error) throw error

    return (data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      gender: p.gender,
      mbti: p.mbti,
      meetingsByRound: p.meetings_by_round || {},
      allMetPeople: p.all_met_people || [],
      groupHistory: p.group_history || []
    }))
  } catch (error) {
    console.error('참가자 조회 중 오류:', error)
    return []
  }
}

// ===== 그룹 배치 결과(GroupingResult) 관련 함수들 =====

export const saveGroupingResult = async (result: GroupingResult): Promise<boolean> => {
  const meetingId = getCurrentMeetingId()
  if (!meetingId) return false
  
  const supabase = createSupabaseClient()
  if (!supabase) return false
  
  try {
    // 기존 결과 삭제
    await supabase
      .from('grouping_results')
      .delete()
      .eq('meeting_id', meetingId)

    // 새 결과 저장
    const { error } = await supabase
      .from('grouping_results')
      .insert({
        meeting_id: meetingId,
        round: result.round,
        groups: result.groups,
        summary: result.summary
      })

    if (error) throw error
    return true
  } catch (error) {
    console.error('그룹 배치 결과 저장 중 오류:', error)
    return false
  }
}

export const getGroupingResult = async (): Promise<GroupingResult | null> => {
  const meetingId = getCurrentMeetingId()
  if (!meetingId) return null
  
  const supabase = createSupabaseClient()
  if (!supabase) return null
  
  try {
    const { data, error } = await supabase
      .from('grouping_results')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) throw error

    // 데이터가 없으면 null 반환 (그룹 배치가 아직 안 된 경우)
    if (!data || data.length === 0) {
      console.log('그룹 배치 결과가 없습니다.')
      return null
    }

    const result = data[0]
    return {
      groups: result.groups,
      round: result.round,
      summary: result.summary
    }
  } catch (error) {
    console.error('그룹 배치 결과 조회 중 오류:', error)
    return null
  }
}

// ===== 이탈 참가자(ExitedParticipants) 관련 함수들 =====

export const saveExitedParticipants = async (exitedParticipants: {[id: string]: {name: string, gender: 'male' | 'female'}}): Promise<boolean> => {
  const meetingId = getCurrentMeetingId()
  if (!meetingId) return false
  
  const supabase = createSupabaseClient()
  if (!supabase) return false
  
  try {
    // 기존 이탈 참가자들 삭제
    await supabase
      .from('exited_participants')
      .delete()
      .eq('meeting_id', meetingId)

    // 새 이탈 참가자들 추가
    const exitedList = Object.entries(exitedParticipants).map(([participantId, info]) => ({
      meeting_id: meetingId,
      participant_id: participantId,
      name: info.name,
      gender: info.gender
    }))

    if (exitedList.length > 0) {
      const { error } = await supabase
        .from('exited_participants')
        .insert(exitedList)

      if (error) throw error
    }

    return true
  } catch (error) {
    console.error('이탈 참가자 저장 중 오류:', error)
    return false
  }
}

export const getExitedParticipants = async (): Promise<{[id: string]: {name: string, gender: 'male' | 'female'}}> => {
  const meetingId = getCurrentMeetingId()
  if (!meetingId) return {}
  
  const supabase = createSupabaseClient()
  if (!supabase) return {}
  
  try {
    const { data, error } = await supabase
      .from('exited_participants')
      .select('*')
      .eq('meeting_id', meetingId)

    if (error) throw error

    const result: {[id: string]: {name: string, gender: 'male' | 'female'}} = {}
    data?.forEach((item: any) => {
      result[item.participant_id] = {
        name: item.name,
        gender: item.gender
      }
    })

    return result
  } catch (error) {
    console.error('이탈 참가자 조회 중 오류:', error)
    return {}
  }
}

// ===== 그룹 설정(GroupSettings) 관련 함수들 =====

export const saveGroupSettings = async (settings: {
  groupingMode: 'auto' | 'manual'
  groupSize: number
  numGroups: number
  customGroupSizes: number[]
}): Promise<boolean> => {
  const meetingId = getCurrentMeetingId()
  if (!meetingId) return false
  
  const supabase = createSupabaseClient()
  if (!supabase) return false
  
  try {
    // 기존 설정 삭제
    await supabase
      .from('group_settings')
      .delete()
      .eq('meeting_id', meetingId)

    // 새 설정 저장
    const { error } = await supabase
      .from('group_settings')
      .insert({
        meeting_id: meetingId,
        grouping_mode: settings.groupingMode,
        group_size: settings.groupSize,
        num_groups: settings.numGroups,
        custom_group_sizes: settings.customGroupSizes
      })

    if (error) throw error
    return true
  } catch (error) {
    console.error('그룹 설정 저장 중 오류:', error)
    return false
  }
}

export const getGroupSettings = async (): Promise<{
  groupingMode: 'auto' | 'manual'
  groupSize: number
  numGroups: number
  customGroupSizes: number[]
} | null> => {
  const meetingId = getCurrentMeetingId()
  if (!meetingId) return null
  
  const supabase = createSupabaseClient()
  if (!supabase) return null
  
  try {
    const { data, error } = await supabase
      .from('group_settings')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) throw error

    // 데이터가 없으면 null 반환 (새로운 모임의 경우)
    if (!data || data.length === 0) {
      console.log('그룹 설정이 없습니다. 기본값을 사용합니다.')
      return null
    }

    const settings = data[0]
    return {
      groupingMode: settings.grouping_mode,
      groupSize: settings.group_size,
      numGroups: settings.num_groups,
      customGroupSizes: settings.custom_group_sizes
    }
  } catch (error) {
    console.error('그룹 설정 조회 중 오류:', error)
    return null
  }
}

// ===== 스냅샷(Snapshots) 관련 함수들 =====

export const saveSnapshot = async (snapshotId: number, eventType: string, description: string, data: any): Promise<boolean> => {
  const meetingId = getCurrentMeetingId()
  if (!meetingId) {
    console.warn('❌ DB 스냅샷 저장 건너뜀: 활성 모임이 없습니다. 로컬스토리지만 사용.')
    return false
  }
  
  const supabase = createSupabaseClient()
  if (!supabase) {
    console.warn('❌ DB 스냅샷 저장 건너뜀: Supabase 클라이언트가 없습니다.')
    return false
  }
  
  try {
    console.log('💾 DB 스냅샷 저장 시도:', { meetingId, eventType, description, snapshotId })
    
    const { error } = await supabase
      .from('snapshots')
      .insert({
        meeting_id: meetingId,
        snapshot_id: snapshotId,
        event_type: eventType,
        description,
        data,
        timestamp: new Date().toISOString()
      })

    if (error) {
      console.error('❌ DB 스냅샷 저장 실패 - Supabase 에러:', error)
      throw error
    }
    
    console.log('✅ DB 스냅샷 저장 성공!')
    return true
  } catch (error) {
    console.error('❌ DB 스냅샷 저장 중 예외 발생:', error)
    return false
  }
}

export const getSnapshots = async (): Promise<Snapshot[]> => {
  const meetingId = getCurrentMeetingId()
  if (!meetingId) return []
  
  const supabase = createSupabaseClient()
  if (!supabase) return []
  
  try {
    const { data, error } = await supabase
      .from('snapshots')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('snapshot_id', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('스냅샷 조회 중 오류:', error)
    return []
  }
}

export const restoreFromSnapshot = async (snapshotId: number): Promise<any | null> => {
  const meetingId = getCurrentMeetingId()
  if (!meetingId) return null
  
  const supabase = createSupabaseClient()
  if (!supabase) return null
  
  try {
    const { data, error } = await supabase
      .from('snapshots')
      .select('*')
      .eq('meeting_id', meetingId)
      .eq('snapshot_id', snapshotId)
      .limit(1)

    if (error) throw error
    
    if (!data || data.length === 0) {
      console.log('해당 스냅샷을 찾을 수 없습니다:', snapshotId)
      return null
    }
    
    return data[0].data
  } catch (error) {
    console.error('스냅샷 복원 중 오류:', error)
    return null
  }
}

// ===== 모임 선택/생성 유틸리티 =====

export const startNewMeeting = async (name: string, userId: string): Promise<string | null> => {
  const meeting = await createMeeting(name, userId)
  if (meeting) {
    setCurrentMeetingId(meeting.id)
    return meeting.id
  }
  return null
}

export const selectMeeting = async (meetingId: string): Promise<boolean> => {
  setCurrentMeetingId(meetingId)
  return true
}

// 모임 완전 삭제 (모든 관련 데이터 포함)
export const deleteMeeting = async (meetingId: string): Promise<boolean> => {
  if (!isSupabaseConfigured) {
    console.error('Supabase가 설정되지 않았습니다. 모임 삭제가 불가능합니다.')
    return false
  }
  
  const supabase = createSupabaseClient()
  if (!supabase) return false
  
  try {
    console.log('🗑️ 모임 삭제 시작:', meetingId)
    
    // 모든 관련 데이터 삭제 (스냅샷 포함)
    const deletePromises = [
      supabase.from('participants').delete().eq('meeting_id', meetingId),
      supabase.from('grouping_results').delete().eq('meeting_id', meetingId),
      supabase.from('group_settings').delete().eq('meeting_id', meetingId),
      supabase.from('exited_participants').delete().eq('meeting_id', meetingId),
      supabase.from('snapshots').delete().eq('meeting_id', meetingId),
      // 마지막으로 모임 자체 삭제
      supabase.from('meetings').delete().eq('id', meetingId)
    ]
    
    const results = await Promise.all(deletePromises)
    
    // 삭제 결과 확인
    for (const result of results) {
      if (result.error) {
        console.error('❌ 모임 삭제 중 일부 오류:', result.error)
        throw result.error
      }
    }
    
    // 삭제된 모임이 현재 선택된 모임이면 초기화
    if (getCurrentMeetingId() === meetingId) {
      setCurrentMeetingId('')
    }
    
    console.log('✅ 모임 삭제 완료:', meetingId)
    return true
  } catch (error) {
    console.error('❌ 모임 삭제 중 오류:', error)
    return false
  }
}

// 현재 모임의 모든 데이터 삭제 (새로운 모임 시작 시 사용)
export const clearCurrentMeetingData = async (): Promise<boolean> => {
  const meetingId = getCurrentMeetingId()
  if (!meetingId) return true // 활성 모임이 없으면 성공으로 처리
  
  const supabase = createSupabaseClient()
  if (!supabase) return false
  
  try {
    // 참가자, 그룹핑 결과, 그룹 설정, 퇴장 참가자 데이터 삭제 (스냅샷은 백업으로 보존)
    const deletePromises = [
      supabase.from('participants').delete().eq('meeting_id', meetingId),
      supabase.from('grouping_results').delete().eq('meeting_id', meetingId),
      supabase.from('group_settings').delete().eq('meeting_id', meetingId),
      supabase.from('exited_participants').delete().eq('meeting_id', meetingId),
      // 모임의 라운드도 1로 리셋
      supabase.from('meetings').update({ current_round: 1 }).eq('id', meetingId)
    ]
    
    const results = await Promise.all(deletePromises)
    
    // 삭제 결과 확인
    for (const result of results) {
      if (result.error) {
        console.error('❌ 데이터 삭제 중 일부 오류:', result.error)
        throw result.error
      }
    }
    
    console.log('✅ 모임 데이터 삭제 완료:', meetingId)
    return true
  } catch (error) {
    console.error('❌ 모임 데이터 삭제 중 오류:', error)
    return false
  }
} 