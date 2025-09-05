/**
 * Supabase Configuration and Client Management for Socialing Seat Assigner
 * 
 * 이 모듈은 Supabase PostgreSQL 데이터베이스 연결을 관리합니다.
 * 환경변수 기반 설정과 타입 안전성을 보장하며, 클라이언트 생성과 
 * 데이터베이스 스키마 타입을 제공합니다.
 * 
 * 주요 기능:
 * 1. 환경변수 검증 - URL과 API 키 존재 여부 확인
 * 2. 클라이언트 생성 - 브라우저용 Supabase 클라이언트 팩토리
 * 3. 타입 정의 - TypeScript를 위한 데이터베이스 스키마 타입
 * 4. 안전한 초기화 - 설정 누락 시 null 반환으로 에러 방지
 * 
 * 데이터베이스 구조:
 * - meetings: 모임 기본 정보 및 라운드 추적
 * - participants: 참가자 정보 및 만남 히스토리
 * - grouping_results: 그룹 배치 결과 및 통계
 * - group_settings: 사용자 그룹 설정 저장
 * - exited_participants: 중도 이탈 참가자 추적
 * - snapshots: 백업/복원을 위한 상태 스냅샷
 * 
 * 보안 고려사항:
 * - 환경변수를 통한 설정으로 코드에 민감정보 노출 방지
 * - 개발 모드에서만 디버그 정보 출력 (실제 키는 노출하지 않음)
 * - 클라이언트 사이드 전용 (서버 사이드에서는 다른 설정 필요)
 */

import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

/**
 * 환경변수에서 Supabase 설정 로드
 * 운영 환경에서는 실제 값을, 개발 중에는 안전한 플레이스홀더를 사용합니다.
 * 플레이스홀더 사용으로 설정 누락 시에도 앱이 크래시되지 않습니다.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

/**
 * 환경변수 설정 완료 여부 확인
 * 두 환경변수가 모두 존재해야만 true를 반환하여 안전한 초기화를 보장합니다.
 */
const isSupabaseConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

/**
 * 개발 모드에서 환경변수 상태 디버깅
 * 보안상 실제 키 값은 노출하지 않고 존재 여부만 확인합니다.
 * 프로덕션에서는 실행되지 않아 성능에 영향을 주지 않습니다.
 */
if (process.env.NODE_ENV === 'development') {
  console.log('🔍 Supabase Configuration:', {
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    isConfigured: isSupabaseConfigured
  })
}

/**
 * 기본 Supabase 클라이언트 인스턴스
 * 환경변수가 올바르게 설정된 경우에만 클라이언트를 생성하고,
 * 그렇지 않으면 null을 반환하여 안전한 초기화를 보장합니다.
 * 컴포넌트에서 직접 import하여 사용 가능합니다.
 */
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

/**
 * 브라우저 환경 최적화 Supabase 클라이언트 팩토리
 * SSR(Server-Side Rendering) 환경을 고려한 브라우저 전용 클라이언트를 생성합니다.
 * 쿠키 기반 세션 관리와 자동 토큰 갱신을 지원합니다.
 * 
 * @returns {SupabaseClient | null} 설정이 완료된 경우 클라이언트, 아니면 null
 */
export const createSupabaseClient = () => {
  if (!isSupabaseConfigured) {
    console.warn('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.')
    return null
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

export { isSupabaseConfigured }

/**
 * 데이터베이스 스키마 타입 정의
 * PostgreSQL 테이블 구조를 TypeScript 타입으로 정의하여 타입 안전성을 보장합니다.
 * 각 테이블별로 Row(조회), Insert(삽입), Update(수정) 타입을 제공합니다.
 */
export interface Database {
  public: {
    Tables: {
      /** 모임 기본 정보 및 라운드 추적 테이블 */
      meetings: {
        Row: {
          id: string              // UUID 기본키
          user_id: string         // 모임 생성자 ID (Auth 사용자)
          name: string           // 모임 이름 (예: "12월 정모")
          current_round: number  // 현재 진행 중인 라운드 번호
          created_at: string     // 모임 생성 시각
          updated_at: string     // 마지막 수정 시각
        }
        Insert: {
          id?: string              // 선택적 UUID (자동 생성 가능)
          user_id: string         // 필수: 모임 생성자 ID
          name: string           // 필수: 모임 이름
          current_round?: number // 선택적: 초기 라운드 (기본값 1)
          created_at?: string    // 선택적: 생성 시각 (자동 설정)
          updated_at?: string    // 선택적: 수정 시각 (자동 설정)
        }
        Update: {
          id?: string              // 선택적: 수정할 모임 ID
          user_id?: string         // 선택적: 소유자 변경
          name?: string           // 선택적: 모임 이름 변경
          current_round?: number  // 선택적: 라운드 업데이트
          created_at?: string     // 선택적: 생성 시각 수정
          updated_at?: string     // 선택적: 수정 시각 업데이트
        }
      }
      /** 참가자 정보 및 만남 히스토리 테이블 */
      participants: {
        Row: {
          id: string                                    // UUID 기본키
          meeting_id: string                           // 소속 모임 ID (meetings 테이블 참조)
          name: string                                 // 참가자 이름
          gender: 'male' | 'female'                   // 성별 (그룹 밸런싱에 사용)
          mbti: 'extrovert' | 'introvert'            // MBTI 성향 (그룹 밸런싱에 사용)
          meetings_by_round: Record<string, string[]> // 라운드별 만난 사람들 기록
          all_met_people: string[]                    // 전체 만난 사람들 목록
          group_history: number[]                     // 소속했던 그룹 번호 히스토리
          is_checked_in: boolean                      // 참석 체크인 여부
          created_at: string                          // 참가자 등록 시각
          updated_at: string                          // 마지막 수정 시각
        }
        Insert: {
          id?: string
          meeting_id: string
          name: string
          gender: 'male' | 'female'
          mbti: 'extrovert' | 'introvert'
          meetings_by_round?: Record<string, string[]>
          all_met_people?: string[]
          group_history?: number[]
          is_checked_in?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          meeting_id?: string
          name?: string
          gender?: 'male' | 'female'
          mbti?: 'extrovert' | 'introvert'
          meetings_by_round?: Record<string, string[]>
          all_met_people?: string[]
          group_history?: number[]
          is_checked_in?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      grouping_results: {
        Row: {
          id: string
          meeting_id: string
          round: number
          groups: any // JSON 타입
          summary: any // JSON 타입
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          meeting_id: string
          round: number
          groups: any
          summary: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          meeting_id?: string
          round?: number
          groups?: any
          summary?: any
          created_at?: string
          updated_at?: string
        }
      }
      exited_participants: {
        Row: {
          id: string
          meeting_id: string
          participant_id: string
          name: string
          gender: 'male' | 'female'
          created_at: string
        }
        Insert: {
          id?: string
          meeting_id: string
          participant_id: string
          name: string
          gender: 'male' | 'female'
          created_at?: string
        }
        Update: {
          id?: string
          meeting_id?: string
          participant_id?: string
          name?: string
          gender?: 'male' | 'female'
          created_at?: string
        }
      }
      group_settings: {
        Row: {
          id: string
          meeting_id: string
          grouping_mode: 'auto' | 'manual'
          group_size: number
          num_groups: number
          custom_group_sizes: number[]
          custom_group_genders: {maleCount: number, femaleCount: number}[]
          enable_gender_ratio: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          meeting_id: string
          grouping_mode: 'auto' | 'manual'
          group_size?: number
          num_groups?: number
          custom_group_sizes?: number[]
          custom_group_genders?: {maleCount: number, femaleCount: number}[]
          enable_gender_ratio?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          meeting_id?: string
          grouping_mode?: 'auto' | 'manual'
          group_size?: number
          num_groups?: number
          custom_group_sizes?: number[]
          custom_group_genders?: {maleCount: number, femaleCount: number}[]
          enable_gender_ratio?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      snapshots: {
        Row: {
          id: string
          meeting_id: string
          snapshot_id: number
          event_type: string
          description: string
          data: any // JSON 타입
          timestamp: string
          created_at: string
        }
        Insert: {
          id?: string
          meeting_id: string
          snapshot_id: number
          event_type: string
          description: string
          data: any
          timestamp: string
          created_at?: string
        }
        Update: {
          id?: string
          meeting_id?: string
          snapshot_id?: number
          event_type?: string
          description?: string
          data?: any
          timestamp?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 