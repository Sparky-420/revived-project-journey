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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      phase1_bags: {
        Row: {
          actual_weight_kg: number
          bag_code: string
          batch_id: string
          created_at: string
          entered_cold_room_at: string
          id: string
          status: string
          target_weight_kg: number
        }
        Insert: {
          actual_weight_kg: number
          bag_code: string
          batch_id: string
          created_at?: string
          entered_cold_room_at?: string
          id?: string
          status?: string
          target_weight_kg: number
        }
        Update: {
          actual_weight_kg?: number
          bag_code?: string
          batch_id?: string
          created_at?: string
          entered_cold_room_at?: string
          id?: string
          status?: string
          target_weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "phase1_bags_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "phase1_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      phase1_batches: {
        Row: {
          clean_weight_kg: number
          created_at: string
          gross_weight_kg: number
          id: string
          lot_number: string
          operator_id: string
          operator_name: string | null
          premix_cure_salt_g: number
          premix_dose_g_per_kg: number
          premix_salt_g: number
          premix_sugar_g: number
          premix_total_g: number
          waste_weight_kg: number
        }
        Insert: {
          clean_weight_kg?: number
          created_at?: string
          gross_weight_kg: number
          id?: string
          lot_number: string
          operator_id?: string
          operator_name?: string | null
          premix_cure_salt_g?: number
          premix_dose_g_per_kg: number
          premix_salt_g?: number
          premix_sugar_g?: number
          premix_total_g?: number
          waste_weight_kg?: number
        }
        Update: {
          clean_weight_kg?: number
          created_at?: string
          gross_weight_kg?: number
          id?: string
          lot_number?: string
          operator_id?: string
          operator_name?: string | null
          premix_cure_salt_g?: number
          premix_dose_g_per_kg?: number
          premix_salt_g?: number
          premix_sugar_g?: number
          premix_total_g?: number
          waste_weight_kg?: number
        }
        Relationships: []
      }
      phase2_batches: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          cured_weight_kg: number
          finished_weight_kg: number | null
          garlic_g: number
          guajillo_g: number
          id: string
          lot_number: string
          meat_weight_kg: number
          operator_id: string
          operator_name: string
          paprika_g: number
          premix_weight_kg: number
          quality_name: string | null
          quality_notes: string | null
          scale_weights_kg: number[]
          spices_g: number
          status: string
          theoretical_weight_kg: number
          water_ml: number
          water_pct: number
          yield_pct: number | null
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          cured_weight_kg: number
          finished_weight_kg?: number | null
          garlic_g: number
          guajillo_g: number
          id?: string
          lot_number: string
          meat_weight_kg: number
          operator_id?: string
          operator_name: string
          paprika_g: number
          premix_weight_kg: number
          quality_name?: string | null
          quality_notes?: string | null
          scale_weights_kg?: number[]
          spices_g: number
          status?: string
          theoretical_weight_kg: number
          water_ml: number
          water_pct: number
          yield_pct?: number | null
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          cured_weight_kg?: number
          finished_weight_kg?: number | null
          garlic_g?: number
          guajillo_g?: number
          id?: string
          lot_number?: string
          meat_weight_kg?: number
          operator_id?: string
          operator_name?: string
          paprika_g?: number
          premix_weight_kg?: number
          quality_name?: string | null
          quality_notes?: string | null
          scale_weights_kg?: number[]
          spices_g?: number
          status?: string
          theoretical_weight_kg?: number
          water_ml?: number
          water_pct?: number
          yield_pct?: number | null
        }
        Relationships: []
      }
      phase2_sources: {
        Row: {
          bag_code: string
          bag_id: string
          cured_weight_kg: number
          entered_cold_room_at: string
          id: string
          meat_weight_kg: number
          phase2_batch_id: string
          reception_name: string | null
          source_lot: string
        }
        Insert: {
          bag_code: string
          bag_id: string
          cured_weight_kg: number
          entered_cold_room_at: string
          id?: string
          meat_weight_kg: number
          phase2_batch_id: string
          reception_name?: string | null
          source_lot: string
        }
        Update: {
          bag_code?: string
          bag_id?: string
          cured_weight_kg?: number
          entered_cold_room_at?: string
          id?: string
          meat_weight_kg?: number
          phase2_batch_id?: string
          reception_name?: string | null
          source_lot?: string
        }
        Relationships: [
          {
            foreignKeyName: "phase2_sources_bag_id_fkey"
            columns: ["bag_id"]
            isOneToOne: true
            referencedRelation: "phase1_bags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phase2_sources_phase2_batch_id_fkey"
            columns: ["phase2_batch_id"]
            isOneToOne: false
            referencedRelation: "phase2_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      close_phase2: {
        Args: { p_batch_id: string; p_notes?: string; p_quality_name: string }
        Returns: undefined
      }
      has_any_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      phase2_scale: {
        Args: { p_batch_id: string; p_remove_index?: number; p_weight?: number }
        Returns: undefined
      }
      start_phase2: {
        Args: {
          p_bag_ids: string[]
          p_operator_name: string
          p_water_pct: number
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "owner" | "supervisor" | "operator"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["owner", "supervisor", "operator"],
    },
  },
} as const
