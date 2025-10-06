export type Database = {
  public: {
    Tables: {
      daily_notes: {
        Row: {
          id: string
          created_at: string
          note: string | null
          date: string
          user_id: string
        }
        Insert: {
          id?: string
          created_at?: string
          note?: string | null
          date: string
          user_id?: string
        }
        Update: {
          id?: string
          created_at?: string
          note?: string | null
          date?: string
          user_id?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'admin' | 'user'
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: 'admin' | 'user'
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: 'admin' | 'user'
        }
      }
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
          user_id: string
          creator_email: string
          creator_name: string | null
          status: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
          user_id: string
          creator_email: string
          creator_name?: string | null
          status?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
          user_id?: string
          creator_email?: string
          creator_name?: string | null
          status?: string
        }
      }
      project_members: {
        Row: {
          id: string
          project_id: string
          user_id: string
          role: 'owner' | 'member' | 'viewer'
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          role?: 'owner' | 'member' | 'viewer'
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          role?: 'owner' | 'member' | 'viewer'
          created_at?: string
        }
      }
    }
    Functions: {
      get_projects_for_user: {
        Args: {
          p_user_id: string
          p_user_email: string
        }
        Returns: {
          id: string
          name: string
          description: string | null
          created_at: string
          user_id: string
          creator_email: string
          creator_name: string | null
          status: string
        }[]
      }
    }
  }
}