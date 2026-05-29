export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          avatar_url: string | null
          city: string | null
          city_lat: number | null
          city_lng: number | null
          couple_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name: string
          avatar_url?: string | null
          city?: string | null
          city_lat?: number | null
          city_lng?: number | null
          couple_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          display_name?: string
          avatar_url?: string | null
          city?: string | null
          city_lat?: number | null
          city_lng?: number | null
          couple_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      couples: {
        Row: {
          id: string
          user1_id: string
          user2_id: string | null
          invite_code: string
          invite_expires_at: string
          next_reunion_at: string | null
          status: 'pending' | 'active'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user1_id: string
          user2_id?: string | null
          invite_code: string
          invite_expires_at: string
          next_reunion_at?: string | null
          status?: 'pending' | 'active'
          created_at?: string
          updated_at?: string
        }
        Update: {
          user2_id?: string | null
          next_reunion_at?: string | null
          status?: 'pending' | 'active'
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          couple_id: string
          title: string
          completed: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          couple_id: string
          title: string
          completed?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          completed?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      reunions: {
        Row: {
          id: string
          couple_id: string
          reunion_date: string
          comment: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          couple_id: string
          reunion_date: string
          comment?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          reunion_date?: string
          comment?: string | null
        }
        Relationships: []
      }
      reunion_photos: {
        Row: {
          id: string
          reunion_id: string
          storage_path: string
          display_order: number
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          reunion_id: string
          storage_path: string
          display_order?: number
          created_by: string
          created_at?: string
        }
        Update: {
          display_order?: number
        }
        Relationships: []
      }
      weather_cache: {
        Row: {
          id: string
          city: string
          temperature: number
          condition: string
          condition_icon: string
          lat: number
          lng: number
          fetched_at: string
        }
        Insert: {
          id?: string
          city: string
          temperature: number
          condition: string
          condition_icon: string
          lat: number
          lng: number
          fetched_at?: string
        }
        Update: {
          temperature?: number
          condition?: string
          condition_icon?: string
          lat?: number
          lng?: number
          fetched_at?: string
        }
        Relationships: []
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Couple = Database['public']['Tables']['couples']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']
export type Reunion = Database['public']['Tables']['reunions']['Row']
export type ReunionPhoto = Database['public']['Tables']['reunion_photos']['Row']
export type WeatherCache = Database['public']['Tables']['weather_cache']['Row']
