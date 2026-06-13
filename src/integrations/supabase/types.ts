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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assessment_questions: {
        Row: {
          assessment_id: string
          concept_id: string | null
          correct: boolean
          difficulty: number
          id: string
          user_id: string
        }
        Insert: {
          assessment_id: string
          concept_id?: string | null
          correct: boolean
          difficulty?: number
          id?: string
          user_id: string
        }
        Update: {
          assessment_id?: string
          concept_id?: string | null
          correct?: boolean
          difficulty?: number
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_questions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_questions_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          id: string
          kind: string
          notes: string | null
          score: number | null
          subject_id: string | null
          taken_at: string
          user_id: string
        }
        Insert: {
          id?: string
          kind?: string
          notes?: string | null
          score?: number | null
          subject_id?: string | null
          taken_at?: string
          user_id: string
        }
        Update: {
          id?: string
          kind?: string
          notes?: string | null
          score?: number | null
          subject_id?: string | null
          taken_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      concept_prerequisites: {
        Row: {
          concept_id: string
          created_at: string
          prerequisite_id: string
          user_id: string
        }
        Insert: {
          concept_id: string
          created_at?: string
          prerequisite_id: string
          user_id: string
        }
        Update: {
          concept_id?: string
          created_at?: string
          prerequisite_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "concept_prerequisites_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concept_prerequisites_prerequisite_id_fkey"
            columns: ["prerequisite_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
        ]
      }
      concepts: {
        Row: {
          assessment_attempts: number
          assessment_correct: number
          created_at: string
          days_since_review: number
          decay_rate: number
          failed_recalls: number
          id: string
          importance: number
          last_reviewed_at: string | null
          mastery: number
          memory_strength: number
          name: string
          review_count: number
          subject_id: string
          successful_recalls: number
          topic_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assessment_attempts?: number
          assessment_correct?: number
          created_at?: string
          days_since_review?: number
          decay_rate?: number
          failed_recalls?: number
          id?: string
          importance?: number
          last_reviewed_at?: string | null
          mastery?: number
          memory_strength?: number
          name: string
          review_count?: number
          subject_id: string
          successful_recalls?: number
          topic_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assessment_attempts?: number
          assessment_correct?: number
          created_at?: string
          days_since_review?: number
          decay_rate?: number
          failed_recalls?: number
          id?: string
          importance?: number
          last_reviewed_at?: string | null
          mastery?: number
          memory_strength?: number
          name?: string
          review_count?: number
          subject_id?: string
          successful_recalls?: number
          topic_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "concepts_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concepts_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostics: {
        Row: {
          body: string | null
          concept_id: string | null
          detected_at: string
          id: string
          kind: string
          resolved_at: string | null
          severity: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          concept_id?: string | null
          detected_at?: string
          id?: string
          kind: string
          resolved_at?: string | null
          severity?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          concept_id?: string | null
          detected_at?: string
          id?: string
          kind?: string
          resolved_at?: string | null
          severity?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnostics_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          completed: boolean
          completed_at: string | null
          concept_id: string | null
          created_at: string
          estimated_minutes: number
          id: string
          priority: string
          reason: string | null
          roi_score: number
          subject_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          concept_id?: string | null
          created_at?: string
          estimated_minutes?: number
          id?: string
          priority?: string
          reason?: string | null
          roi_score?: number
          subject_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          concept_id?: string | null
          created_at?: string
          estimated_minutes?: number
          id?: string
          priority?: string
          reason?: string | null
          roi_score?: number
          subject_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "missions_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          board: string | null
          created_at: string
          display_name: string | null
          id: string
          onboarded_at: string | null
          program: string | null
          semester: string | null
          updated_at: string
        }
        Insert: {
          board?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          onboarded_at?: string | null
          program?: string | null
          semester?: string | null
          updated_at?: string
        }
        Update: {
          board?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          onboarded_at?: string | null
          program?: string | null
          semester?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          body: string | null
          concept_id: string | null
          confidence: number
          created_at: string
          dismissed: boolean
          id: string
          impact: number
          kind: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          concept_id?: string | null
          confidence?: number
          created_at?: string
          dismissed?: boolean
          id?: string
          impact?: number
          kind: string
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          concept_id?: string | null
          confidence?: number
          created_at?: string
          dismissed?: boolean
          id?: string
          impact?: number
          kind?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          concept_id: string | null
          duration_min: number
          id: string
          kind: string
          outcome: string | null
          started_at: string
          subject_id: string | null
          user_id: string
        }
        Insert: {
          concept_id?: string | null
          duration_min?: number
          id?: string
          kind?: string
          outcome?: string | null
          started_at?: string
          subject_id?: string | null
          user_id: string
        }
        Update: {
          concept_id?: string | null
          duration_min?: number
          id?: string
          kind?: string
          outcome?: string | null
          started_at?: string
          subject_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          baseline_mastery: number
          code: string | null
          color: string
          created_at: string
          exam_weight: number
          hours_this_week: number
          id: string
          name: string
          next_assessment: string | null
          rank: number
          strategic_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          baseline_mastery?: number
          code?: string | null
          color?: string
          created_at?: string
          exam_weight?: number
          hours_this_week?: number
          id?: string
          name: string
          next_assessment?: string | null
          rank?: number
          strategic_value?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          baseline_mastery?: number
          code?: string | null
          color?: string
          created_at?: string
          exam_weight?: number
          hours_this_week?: number
          id?: string
          name?: string
          next_assessment?: string | null
          rank?: number
          strategic_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      topics: {
        Row: {
          created_at: string
          id: string
          name: string
          ordinal: number
          subject_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          ordinal?: number
          subject_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          ordinal?: number
          subject_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
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
      [_ in never]: never
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
    Enums: {},
  },
} as const
