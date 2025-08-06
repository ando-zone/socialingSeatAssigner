import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

// 환경변수 체크
const isSupabaseConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

// 환경변수 상태 확인 (개발 모드에서만, 키는 노출하지 않음)
if (process.env.NODE_ENV === 'development') {
  console.log('🔍 Supabase Configuration:', {
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    isConfigured: isSupabaseConfigured
  })
}

// 클라이언트 사이드용 Supabase 클라이언트
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// 브라우저 클라이언트용 Supabase 클라이언트
export const createSupabaseClient = () => {
  if (!isSupabaseConfigured) {
    console.warn('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.')
    return null
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

export { isSupabaseConfigured }

// 데이터베이스 타입 정의
export interface Database {
  public: {
    Tables: {
      meetings: {
        Row: {
          id: string
          user_id: string
          name: string
          current_round: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          current_round?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          current_round?: number
          created_at?: string
          updated_at?: string
        }
      }
      participants: {
        Row: {
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
        Insert: {
          id?: string
          meeting_id: string
          name: string
          gender: 'male' | 'female'
          mbti: 'extrovert' | 'introvert'
          meetings_by_round?: Record<string, string[]>
          all_met_people?: string[]
          group_history?: number[]
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