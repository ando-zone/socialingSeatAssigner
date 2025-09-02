/**
 * Supabase Database Layer for Socialing Seat Assigner
 * 
 * 이 모듈은 Supabase PostgreSQL 데이터베이스와 상호작용하는 모든 함수들을 포함합니다.
 * 로컬스토리지를 폴백으로 사용하여 오프라인에서도 작동할 수 있도록 설계되었습니다.
 * 
 * 주요 기능:
 * - 모임(Meeting) 관리: 생성, 조회, 수정, 삭제
 * - 참가자(Participant) 관리: CRUD 작업 및 만남 히스토리 추적
 * - 그룹 배치 결과(GroupingResult) 저장/조회
 * - 백업/복원을 위한 스냅샷 시스템
 * - 그룹 설정 저장/복원
 */

import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'
import type { Participant, GroupingResult } from './grouping'

/**
 * 모임 정보를 나타내는 인터페이스
 * Supabase의 meetings 테이블과 대응됩니다.
 */
export interface Meeting {
  id: string                 // UUID 기본키
  user_id: string           // 모임 생성자 (auth.users 외래키)
  name: string              // 모임 이름
  current_round: number     // 현재 진행 중인 라운드 번호
  created_at: string        // 생성일시
  updated_at: string        // 최종 수정일시
}

/**
 * 데이터베이스에 저장되는 참가자 정보 인터페이스
 * Supabase의 participants 테이블과 대응됩니다.
 * 
 * grouping.ts의 Participant 인터페이스와 필드명이 다른 이유:
 * - 데이터베이스는 snake_case 명명 규칙 사용
 * - 애플리케이션 코드는 camelCase 명명 규칙 사용
 */
export interface DBParticipant {
  id: string                                    // 참가자 고유 ID (문자열)
  meeting_id: string                           // 소속 모임 ID
  name: string                                // 참가자 이름
  gender: 'male' | 'female'                   // 성별
  mbti: 'extrovert' | 'introvert'             // MBTI 외향/내향 구분
  meetings_by_round: Record<string, string[]>  // 라운드별 만난 사람들의 ID 목록
  all_met_people: string[]                    // 전체 만난 사람들의 ID 목록 (중복 제거)
  group_history: number[]                     // 각 라운드별 그룹 번호 히스토리
  created_at: string                          // 생성일시
  updated_at: string                          // 최종 수정일시
}

/**
 * 그룹 배치 결과를 데이터베이스에 저장하는 인터페이스
 * Supabase의 grouping_results 테이블과 대응됩니다.
 */
export interface DBGroupingResult {
  id: string         // UUID 기본키
  meeting_id: string // 소속 모임 ID
  round: number      // 라운드 번호
  groups: any        // 그룹 배치 결과 (JSON 형태로 저장)
  summary: any       // 배치 결과 요약 통계 (JSON 형태로 저장)
  created_at: string // 생성일시
  updated_at: string // 최종 수정일시
}

/**
 * 그룹 설정 정보를 저장하는 인터페이스
 * 사용자가 설정한 그룹 배치 옵션들을 저장합니다.
 */
export interface GroupSettings {
  id: string                        // UUID 기본키
  meeting_id: string               // 소속 모임 ID
  grouping_mode: 'auto' | 'manual' // 그룹 배치 모드
  group_size: number               // 자동 모드에서의 그룹 크기
  num_groups: number               // 수동 모드에서의 그룹 개수
  custom_group_sizes: number[]     // 수동 모드에서 각 그룹별 크기
  created_at: string               // 생성일시
  updated_at: string               // 최종 수정일시
}

/**
 * 백업/복원을 위한 스냅샷 정보 인터페이스
 * 특정 시점의 애플리케이션 상태를 저장합니다.
 */
export interface Snapshot {
  id: string           // UUID 기본키
  meeting_id: string   // 소속 모임 ID
  snapshot_id: number  // 스냅샷 순번 (증가하는 정수)
  event_type: string   // 이벤트 타입 (participant_add, group_generation 등)
  description: string  // 사용자가 볼 수 있는 설명
  data: any           // 해당 시점의 전체 애플리케이션 상태 (JSON)
  timestamp: string   // 이벤트 발생 시각
  created_at: string  // 데이터베이스 저장 시각
}

/**
 * 현재 활성 모임 ID를 관리하는 전역 상태
 * 애플리케이션 세션 동안 어떤 모임에서 작업 중인지 추적합니다.
 * 
 * 주의: 이는 클라이언트 사이드 상태이므로 페이지 새로고침 시 초기화됩니다.
 * 실제 모임 선택은 URL 파라미터나 사용자 선택을 통해 복원됩니다.
 */
let currentMeetingId: string | null = null

/**
 * 현재 활성 모임 ID를 설정합니다.
 * @param meetingId - 설정할 모임의 UUID
 */
export const setCurrentMeetingId = (meetingId: string) => {
  currentMeetingId = meetingId
}

/**
 * 현재 활성 모임 ID를 반환합니다.
 * @returns 현재 모임 ID 또는 null (설정되지 않은 경우)
 */
export const getCurrentMeetingId = (): string | null => {
  return currentMeetingId
}

/**
 * 현재 활성 모임 ID를 초기화합니다.
 * 로그아웃이나 모임 삭제 시 사용됩니다.
 */
export const clearCurrentMeetingId = () => {
  currentMeetingId = null
}

// ===== 모임(Meeting) 관련 함수들 =====
// 모임 생성, 조회, 수정, 삭제 등 모임 라이프사이클 관리

/**
 * 새로운 모임을 생성합니다.
 * 
 * @param name - 모임 이름
 * @param userId - 모임을 생성할 사용자의 ID
 * @returns 생성된 모임 정보 또는 null (실패 시)
 * 
 * 동작 과정:
 * 1. Supabase 설정 확인
 * 2. meetings 테이블에 새 레코드 삽입
 * 3. 생성된 모임을 현재 활성 모임으로 설정
 */
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

/**
 * 특정 사용자의 모든 모임 목록을 조회합니다.
 * 
 * @param userId - 조회할 사용자의 ID
 * @param sortBy - 정렬 기준 (name, created_at, updated_at)
 * @param sortOrder - 정렬 순서 (asc: 오름차순, desc: 내림차순)
 * @returns 사용자의 모임 목록 배열
 * 
 * 기본 정렬: 최근 수정된 순서 (updated_at desc)
 * 모임 선택 화면에서 사용됩니다.
 */
export const getUserMeetings = async (
  userId: string, 
  sortBy: 'name' | 'created_at' | 'updated_at' = 'updated_at',
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<Meeting[]> => {
  const supabase = createSupabaseClient()
  if (!supabase) return []
  
  try {
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('user_id', userId)
      .order(sortBy, { ascending: sortOrder === 'asc' })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('모임 목록 조회 중 오류:', error)
    return []
  }
}

/**
 * 현재 활성화된 모임의 상세 정보를 조회합니다.
 * 
 * @returns 현재 모임 정보 또는 null (모임이 없거나 조회 실패 시)
 * 
 * 현재 모임 ID는 전역 상태로 관리되며,
 * 이 함수는 해당 ID로 데이터베이스에서 최신 정보를 가져옵니다.
 */
export const getCurrentMeeting = async (): Promise<Meeting | null> => {
  const supabase = createSupabaseClient()
  if (!supabase || !currentMeetingId) return null
  
  try {
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', currentMeetingId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('현재 모임 조회 중 오류:', error)
    return null
  }
}

/**
 * 모임의 현재 라운드 번호를 업데이트합니다.
 * 
 * @param meetingId - 업데이트할 모임의 ID
 * @param round - 새로운 라운드 번호
 * @returns 성공 여부
 * 
 * 그룹 배치가 완료된 후 다음 라운드로 진행할 때 호출됩니다.
 * updated_at 필드도 함께 갱신됩니다.
 */
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
// 참가자 데이터의 생성, 조회, 수정, 삭제 및 만남 히스토리 관리

/**
 * 참가자 목록을 데이터베이스에 저장합니다.
 * 
 * @param participants - 저장할 참가자 배열
 * @returns 저장 성공 여부
 * 
 * 동작 방식:
 * 1. 기존 참가자 데이터를 모두 삭제 (TRUNCATE 방식)
 * 2. 새로운 참가자 데이터를 모두 삽입
 * 3. camelCase → snake_case 필드명 변환 처리
 * 
 * 주의: 전체 교체 방식이므로 대용량 데이터에서는 성능 이슈가 있을 수 있습니다.
 */
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

/**
 * 현재 모임의 모든 참가자를 조회합니다.
 * 
 * @returns 참가자 배열 (조회 실패 시 빈 배열)
 * 
 * 동작 과정:
 * 1. 현재 활성 모임 ID 확인
 * 2. 해당 모임의 참가자들만 조회
 * 3. snake_case → camelCase 필드명 변환
 * 4. 만남 히스토리 데이터 복원
 */
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
// 유전 알고리즘으로 생성된 그룹 배치 결과의 저장 및 조회

/**
 * 그룹 배치 결과를 데이터베이스에 저장합니다.
 * 
 * @param result - 저장할 그룹 배치 결과
 * @returns 저장 성공 여부
 * 
 * 저장되는 데이터:
 * - groups: 각 그룹의 멤버 구성 및 통계
 * - summary: 전체 배치의 품질 지표 (균형 점수, 새로운 만남 수 등)
 * - round: 해당 라운드 번호
 * 
 * 기존 결과는 삭제되고 새 결과로 교체됩니다 (단일 결과만 유지).
 */
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

/**
 * 현재 모임의 최신 그룹 배치 결과를 조회합니다.
 * 
 * @returns 그룹 배치 결과 또는 null (아직 배치되지 않은 경우)
 * 
 * 최신 결과만 반환하며, 여러 번 재배치된 경우 가장 최근 것을 가져옵니다.
 * 결과 페이지와 메인 페이지에서 기존 배치 여부 확인에 사용됩니다.
 */
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
// 중도에 모임을 떠난 참가자들의 정보를 관리 (통계 및 백업 목적)

/**
 * 모임에서 이탈한 참가자들의 정보를 저장합니다.
 * 
 * @param exitedParticipants - 이탈 참가자 정보 (키: 참가자ID, 값: 이름과 성별)
 * @returns 저장 성공 여부
 * 
 * 용도:
 * - 통계 집계 시 전체 참여 인원 파악
 * - 복원 시 누가 언제 떠났는지 추적
 * - 성별 균형 계산에 활용
 * 
 * 저장 방식: 기존 데이터 삭제 후 전체 재삽입
 */
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

/**
 * 현재 모임에서 이탈한 참가자들의 정보를 조회합니다.
 * 
 * @returns 이탈 참가자 정보 객체 (키: 참가자ID, 값: 이름과 성별)
 * 
 * 반환 형태:
 * {
 *   "participant_id_1": { name: "홍길동", gender: "male" },
 *   "participant_id_2": { name: "김영희", gender: "female" }
 * }
 */
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
// 사용자가 설정한 그룹 배치 옵션들의 저장 및 복원

/**
 * 그룹 배치 설정을 데이터베이스에 저장합니다.
 * 
 * @param settings - 저장할 그룹 설정 객체
 * @param settings.groupingMode - 배치 모드 ('auto': 동일 크기, 'manual': 개별 설정)
 * @param settings.groupSize - 자동 모드에서 사용할 그룹 크기
 * @param settings.numGroups - 수동 모드에서 사용할 그룹 개수
 * @param settings.customGroupSizes - 수동 모드에서 각 그룹별 크기 배열
 * @param settings.customGroupGenders - 각 그룹별 성별 구성 (남성/여성 수)
 * @param settings.enableGenderRatio - 성별 비율 제약 활성화 여부
 * @returns 저장 성공 여부
 * 
 * 마이그레이션 고려사항:
 * - 기본 설정은 항상 저장
 * - 새로운 필드(성별 관련)는 스키마 업데이트 후 저장 시도
 * - 실패해도 기본 기능은 동작하도록 설계
 */
export const saveGroupSettings = async (settings: {
  groupingMode: 'auto' | 'manual'
  groupSize: number
  numGroups: number
  customGroupSizes: number[]
  customGroupGenders: {maleCount: number, femaleCount: number}[]
  enableGenderRatio: boolean
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

    // 새 설정 저장 - 먼저 기본 설정만으로 시도
    let insertData: any = {
      meeting_id: meetingId,
      grouping_mode: settings.groupingMode,
      group_size: settings.groupSize,
      num_groups: settings.numGroups,
      custom_group_sizes: settings.customGroupSizes
    }
    
    let { error } = await supabase
      .from('group_settings')
      .insert(insertData)
    
    // 기본 설정 저장에 성공했고, 새로운 컬럼이 있다면 업데이트 시도
    if (!error) {
      try {
        const updateData: any = {}
        if (settings.customGroupGenders) {
          updateData.custom_group_genders = settings.customGroupGenders
        }
        if (settings.enableGenderRatio !== undefined) {
          updateData.enable_gender_ratio = settings.enableGenderRatio
        }
        
        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase
            .from('group_settings')
            .update(updateData)
            .eq('meeting_id', meetingId)
          
          if (updateError) {
            console.log('성비 설정 저장 건너뜀 (마이그레이션 필요):', updateError.message)
          }
        }
      } catch (updateErr) {
        console.log('성비 설정 업데이트 건너뜀 (마이그레이션 필요)')
      }
    }

    if (error) throw error
    return true
  } catch (error) {
    console.error('그룹 설정 저장 중 오류:', error)
    return false
  }
}

/**
 * 현재 모임의 그룹 설정을 조회합니다.
 * 
 * @returns 그룹 설정 객체 또는 null (설정이 없는 경우)
 * 
 * 반환값이 null인 경우 호출자는 기본값을 사용해야 합니다.
 * 설정은 사용자가 변경할 때마다 자동으로 저장되며,
 * 페이지 새로고침 시 이 함수로 복원됩니다.
 * 
 * 마이그레이션 고려:
 * - 기존 데이터에 없는 필드는 기본값으로 설정
 * - 스키마 변경에 대응하여 안전하게 처리
 */
export const getGroupSettings = async (): Promise<{
  groupingMode: 'auto' | 'manual'
  groupSize: number
  numGroups: number
  customGroupSizes: number[]
  customGroupGenders: {maleCount: number, femaleCount: number}[]
  enableGenderRatio: boolean
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
      customGroupSizes: settings.custom_group_sizes,
      customGroupGenders: settings.custom_group_genders || [
        {maleCount: 7, femaleCount: 5}, {maleCount: 7, femaleCount: 5}, {maleCount: 7, femaleCount: 5}, 
        {maleCount: 7, femaleCount: 5}, {maleCount: 7, femaleCount: 5}, {maleCount: 7, femaleCount: 5}
      ],
      enableGenderRatio: settings.enable_gender_ratio || false
    }
  } catch (error) {
    console.error('그룹 설정 조회 중 오류:', error)
    return null
  }
}

// ===== 스냅샷(Snapshots) 관련 함수들 =====
// 시점별 데이터 백업 및 복원 시스템

/**
 * 특정 시점의 애플리케이션 상태를 스냅샷으로 저장합니다.
 * 
 * @param snapshotId - 스냅샷 순번 (증가하는 정수)
 * @param eventType - 이벤트 타입 (participant_add, group_generation, round_complete 등)
 * @param description - 사용자에게 표시될 설명
 * @param data - 저장할 애플리케이션 상태 데이터
 * @returns 저장 성공 여부
 * 
 * 자동 스냅샷 생성 시점:
 * - 참가자 추가/삭제
 * - 그룹 배치 실행
 * - 수동 그룹 변경
 * - 라운드 완료
 * 
 * 스냅샷은 복원 기능과 데이터 무결성 보장을 위해 사용됩니다.
 */
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

/**
 * 현재 모임의 모든 스냅샷을 조회합니다.
 * 
 * @returns 스냅샷 배열 (시간순 정렬)
 * 
 * 백업/복원 UI에서 사용자가 복원할 시점을 선택할 수 있도록
 * 스냅샷 목록을 제공합니다.
 * 
 * 정렬: snapshot_id 오름차순 (시간순)
 */
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

/**
 * 특정 스냅샷의 데이터를 조회하여 복원에 사용할 데이터를 반환합니다.
 * 
 * @param snapshotId - 복원할 스냅샷의 ID
 * @returns 해당 시점의 애플리케이션 상태 데이터 또는 null
 * 
 * 주의: 이 함수는 데이터만 반환하며, 실제 복원은 backup.ts의
 * restoreSnapshot 함수에서 처리합니다.
 */
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
// 상위 레벨에서 사용하는 편의 함수들

/**
 * 새로운 모임을 생성하고 현재 활성 모임으로 설정합니다.
 * 
 * @param name - 모임 이름
 * @param userId - 사용자 ID
 * @returns 생성된 모임의 ID 또는 null (실패 시)
 * 
 * createMeeting의 래퍼 함수로, 모임 생성과 동시에
 * 현재 활성 모임으로 설정하는 작업을 한 번에 처리합니다.
 */
export const startNewMeeting = async (name: string, userId: string): Promise<string | null> => {
  const meeting = await createMeeting(name, userId)
  if (meeting) {
    setCurrentMeetingId(meeting.id)
    return meeting.id
  }
  return null
}

/**
 * 기존 모임을 현재 활성 모임으로 선택합니다.
 * 
 * @param meetingId - 선택할 모임의 ID
 * @returns 항상 true (현재는 실패 케이스가 없음)
 * 
 * 사용자가 모임 목록에서 특정 모임을 선택할 때 호출됩니다.
 * 추후 권한 확인 로직이 추가될 수 있습니다.
 */
export const selectMeeting = async (meetingId: string): Promise<boolean> => {
  setCurrentMeetingId(meetingId)
  return true
}

/**
 * 모임을 완전히 삭제합니다 (모든 관련 데이터 포함).
 * 
 * @param meetingId - 삭제할 모임의 ID
 * @returns 삭제 성공 여부
 * 
 * 삭제되는 데이터:
 * 1. participants (참가자)
 * 2. grouping_results (그룹 배치 결과)
 * 3. group_settings (그룹 설정)
 * 4. exited_participants (이탈 참가자)
 * 5. snapshots (백업 스냅샷)
 * 6. meetings (모임 자체)
 * 
 * CASCADE 삭제를 통해 관련 데이터가 자동 삭제되지만,
 * 명시적으로 순서대로 삭제하여 안전성을 보장합니다.
 * 
 * 주의: 이 작업은 되돌릴 수 없습니다.
 */
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
      clearCurrentMeetingId()
    }
    
    console.log('✅ 모임 삭제 완료:', meetingId)
    return true
  } catch (error) {
    console.error('❌ 모임 삭제 중 오류:', error)
    return false
  }
}

/**
 * 모임의 이름을 변경합니다.
 * 
 * @param meetingId - 이름을 변경할 모임의 ID
 * @param newName - 새로운 모임 이름
 * @returns 변경 성공 여부
 * 
 * 검증:
 * - 빈 문자열이나 공백만 있는 이름은 거부
 * - 자동으로 앞뒤 공백 제거
 * 
 * updated_at 필드도 함께 갱신됩니다.
 */
export const updateMeetingName = async (meetingId: string, newName: string): Promise<boolean> => {
  if (!isSupabaseConfigured) {
    console.error('Supabase가 설정되지 않았습니다. 모임 이름 변경이 불가능합니다.')
    return false
  }
  
  const supabase = createSupabaseClient()
  if (!supabase) return false
  
  if (!newName.trim()) {
    console.error('모임 이름이 비어있습니다.')
    return false
  }
  
  try {
    console.log('✏️ 모임 이름 변경 시작:', { meetingId, newName })
    
    const { error } = await supabase
      .from('meetings')
      .update({ 
        name: newName.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', meetingId)
    
    if (error) {
      console.error('❌ 모임 이름 변경 실패:', error)
      throw error
    }
    
    console.log('✅ 모임 이름 변경 완료:', newName)
    return true
  } catch (error) {
    console.error('❌ 모임 이름 변경 중 오류:', error)
    return false
  }
}

/**
 * 현재 모임의 데이터를 초기화합니다 (새로운 모임 시작).
 * 
 * @returns 초기화 성공 여부
 * 
 * 삭제되는 데이터:
 * - participants (참가자)
 * - grouping_results (그룹 배치 결과)
 * - group_settings (그룹 설정)
 * - exited_participants (이탈 참가자)
 * 
 * 보존되는 데이터:
 * - snapshots (백업 기록은 유지)
 * - meetings (모임 자체는 유지, 라운드만 1로 리셋)
 * 
 * 이는 같은 모임에서 완전히 새로 시작할 때 사용되며,
 * 모임 자체를 삭제하는 deleteMeeting과는 다릅니다.
 */
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