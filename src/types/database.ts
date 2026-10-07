// Supabase database types for the `public` schema.
// Regenerate after schema changes:
//   supabase gen types typescript --linked --schema public > src/types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      app_settings: {
        Row: {
          id: boolean
          late_grace_minutes: number
          timezone: string
          updated_at: string
          window_after_min: number
          window_before_min: number
        }
        Insert: {
          id?: boolean
          late_grace_minutes?: number
          timezone?: string
          updated_at?: string
          window_after_min?: number
          window_before_min?: number
        }
        Update: {
          id?: boolean
          late_grace_minutes?: number
          timezone?: string
          updated_at?: string
          window_after_min?: number
          window_before_min?: number
        }
        Relationships: []
      }
      attendance: {
        Row: {
          created_at: string
          id: string
          is_late: boolean
          note: string | null
          proof_of_attendance: string | null
          proof_resource_type: string | null
          session: Database["public"]["Enums"]["attendance_session"]
          status: Database["public"]["Enums"]["attendance_status"]
          updated_at: string
          user_id: string
          work_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_late?: boolean
          note?: string | null
          proof_of_attendance?: string | null
          proof_resource_type?: string | null
          session: Database["public"]["Enums"]["attendance_session"]
          status: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
          user_id: string
          work_date: string
        }
        Update: {
          created_at?: string
          id?: string
          is_late?: boolean
          note?: string | null
          proof_of_attendance?: string | null
          proof_resource_type?: string | null
          session?: Database["public"]["Enums"]["attendance_session"]
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
          user_id?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          must_change_password: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string
          id: string
          must_change_password?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          must_change_password?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id?: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_requests: {
        Row: {
          created_at: string
          id: string
          items: Json
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["request_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          items: Json
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          approved_at: string
          end_time: string
          is_working_day: boolean
          start_time: string
          user_id: string
          weekday: number
        }
        Insert: {
          approved_at?: string
          end_time?: string
          is_working_day?: boolean
          start_time?: string
          user_id: string
          weekday: number
        }
        Update: {
          approved_at?: string
          end_time?: string
          is_working_day?: boolean
          start_time?: string
          user_id?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "schedules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      attendance_days: {
        Row: {
          check_in_at: string | null
          check_out_at: string | null
          is_late: boolean | null
          status: Database["public"]["Enums"]["attendance_status"] | null
          user_id: string | null
          work_date: string | null
          worked_hours: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      attendance_series: {
        Args: {
          p_from: string
          p_granularity: string
          p_to: string
          p_user_id?: string | null
        }
        Returns: {
          absent: number
          attendance_rate: number | null
          attended: number
          avg_worked_hours: number | null
          bucket: string
          excused: number
          late: number
          scheduled: number
          sick: number
          worked_hours: number
        }[]
      }
      employee_summary: {
        Args: { p_from: string; p_to: string }
        Returns: {
          absent: number
          attendance_rate: number | null
          attended: number
          email: string
          excused: number
          full_name: string
          has_pending_request: boolean
          has_schedule: boolean
          late: number
          role: Database["public"]["Enums"]["user_role"]
          scheduled: number
          sick: number
          user_id: string
          username: string | null
          worked_hours: number
        }[]
      }
      review_schedule_request: {
        Args: { p_approve: boolean; p_note?: string | null; p_request_id: string }
        Returns: undefined
      }
      today_summary: {
        Args: { p_date?: string | null }
        Returns: {
          attendance_rate: number | null
          checked_in: number
          checked_out: number
          excused: number
          expected: number
          late: number
          not_present: number
          sick: number
          work_date: string
        }[]
      }
    }
    Enums: {
      attendance_session: "check_in" | "check_out"
      attendance_status: "attend" | "excused" | "sick" | "absence"
      request_status: "pending" | "approved" | "rejected"
      user_role: "admin" | "admin_qr" | "active_employee" | "inactive_employee"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]
export type Views<T extends keyof PublicSchema["Views"]> = PublicSchema["Views"][T]["Row"]
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]
export type FunctionReturns<T extends keyof PublicSchema["Functions"]> =
  PublicSchema["Functions"][T]["Returns"]
