export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          alert_tier: Database["public"]["Enums"]["alert_tier"]
          created_at: string
          id: string
          patient_id: string
          risk_score: number
          status: Database["public"]["Enums"]["alert_status"]
          top_features: Json | null
          updated_at: string
        }
        Insert: {
          alert_tier: Database["public"]["Enums"]["alert_tier"]
          created_at?: string
          id?: string
          patient_id: string
          risk_score: number
          status?: Database["public"]["Enums"]["alert_status"]
          top_features?: Json | null
          updated_at?: string
        }
        Update: {
          alert_tier?: Database["public"]["Enums"]["alert_tier"]
          created_at?: string
          id?: string
          patient_id?: string
          risk_score?: number
          status?: Database["public"]["Enums"]["alert_status"]
          top_features?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      interventions: {
        Row: {
          action: string
          alert_id: string
          created_at: string
          created_by: string
          id: string
          notes: string | null
          patient_id: string
        }
        Insert: {
          action: string
          alert_id: string
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          patient_id: string
        }
        Update: {
          action?: string
          alert_id?: string
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interventions_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      labs: {
        Row: {
          bun: number | null
          calcium: number | null
          created_at: string
          creatinine: number | null
          fio2: number | null
          glucose: number | null
          hgb: number | null
          id: string
          lactate: number | null
          paco2: number | null
          patient_id: string
          ph: number | null
          platelets: number | null
          potassium: number | null
          recorded_at: string
          wbc: number | null
        }
        Insert: {
          bun?: number | null
          calcium?: number | null
          created_at?: string
          creatinine?: number | null
          fio2?: number | null
          glucose?: number | null
          hgb?: number | null
          id?: string
          lactate?: number | null
          paco2?: number | null
          patient_id: string
          ph?: number | null
          platelets?: number | null
          potassium?: number | null
          recorded_at?: string
          wbc?: number | null
        }
        Update: {
          bun?: number | null
          calcium?: number | null
          created_at?: string
          creatinine?: number | null
          fio2?: number | null
          glucose?: number | null
          hgb?: number | null
          id?: string
          lactate?: number | null
          paco2?: number | null
          patient_id?: string
          ph?: number | null
          platelets?: number | null
          potassium?: number | null
          recorded_at?: string
          wbc?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "labs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          admission_time: string
          age: number
          created_at: string
          gender: string
          id: string
          patient_id: string
          updated_at: string
        }
        Insert: {
          admission_time?: string
          age: number
          created_at?: string
          gender: string
          id?: string
          patient_id: string
          updated_at?: string
        }
        Update: {
          admission_time?: string
          age?: number
          created_at?: string
          gender?: string
          id?: string
          patient_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      vitals: {
        Row: {
          created_at: string
          dbp: number | null
          hr: number | null
          id: string
          map: number | null
          o2sat: number | null
          patient_id: string
          recorded_at: string
          resp: number | null
          sbp: number | null
          temp: number | null
        }
        Insert: {
          created_at?: string
          dbp?: number | null
          hr?: number | null
          id?: string
          map?: number | null
          o2sat?: number | null
          patient_id: string
          recorded_at?: string
          resp?: number | null
          sbp?: number | null
          temp?: number | null
        }
        Update: {
          created_at?: string
          dbp?: number | null
          hr?: number | null
          id?: string
          map?: number | null
          o2sat?: number | null
          patient_id?: string
          recorded_at?: string
          resp?: number | null
          sbp?: number | null
          temp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vitals_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      alert_status: "active" | "under_investigation" | "confirmed" | "rejected"
      alert_tier: "green" | "yellow" | "red"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      alert_status: ["active", "under_investigation", "confirmed", "rejected"],
      alert_tier: ["green", "yellow", "red"],
    },
  },
} as const
