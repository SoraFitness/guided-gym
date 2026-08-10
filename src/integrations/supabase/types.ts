export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      body_scans: {
        Row: {
          created_at: string;
          id: string;
          result: Json;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          result: Json;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          result?: Json;
          user_id?: string;
        };
        Relationships: [];
      };
      scan_quota_usage: {
        Row: {
          created_at: string;
          id: number;
          period_start: string;
          scan_type: string;
          submission_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: never;
          period_start: string;
          scan_type: string;
          submission_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: never;
          period_start?: string;
          scan_type?: string;
          submission_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      coach_user_memory: {
        Row: {
          memories: Json;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          memories?: Json;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          memories?: Json;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_app_state: {
        Row: {
          key: string;
          updated_at: string;
          user_id: string;
          value: Json;
        };
        Insert: {
          key: string;
          updated_at?: string;
          user_id: string;
          value?: Json;
        };
        Update: {
          key?: string;
          updated_at?: string;
          user_id?: string;
          value?: Json;
        };
        Relationships: [];
      };
      coach_messages: {
        Row: {
          created_at: string;
          id: string;
          parts: Json;
          role: string;
          thread_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          parts: Json;
          role: string;
          thread_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          parts?: Json;
          role?: string;
          thread_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "coach_messages_thread_id_fkey";
            columns: ["thread_id"];
            isOneToOne: false;
            referencedRelation: "coach_threads";
            referencedColumns: ["id"];
          },
        ];
      };
      coach_threads: {
        Row: {
          created_at: string;
          id: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          title?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      daily_activity: {
        Row: {
          activity_on: string;
          created_at: string;
          id: string;
          recovery_score: number;
          sleep_hours: number;
          steps: number;
          user_id: string;
        };
        Insert: {
          activity_on?: string;
          created_at?: string;
          id?: string;
          recovery_score?: number;
          sleep_hours?: number;
          steps?: number;
          user_id: string;
        };
        Update: {
          activity_on?: string;
          created_at?: string;
          id?: string;
          recovery_score?: number;
          sleep_hours?: number;
          steps?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      food_logs: {
        Row: {
          calories: number;
          carbs_g: number;
          created_at: string;
          entry: Json | null;
          fat_g: number;
          id: string;
          logged_at: string | null;
          logged_on: string;
          meal: string;
          name: string;
          protein_g: number;
          user_id: string;
        };
        Insert: {
          calories?: number;
          carbs_g?: number;
          created_at?: string;
          entry?: Json | null;
          fat_g?: number;
          id?: string;
          logged_at?: string | null;
          logged_on?: string;
          meal?: string;
          name: string;
          protein_g?: number;
          user_id: string;
        };
        Update: {
          calories?: number;
          carbs_g?: number;
          created_at?: string;
          entry?: Json | null;
          fat_g?: number;
          id?: string;
          logged_at?: string | null;
          logged_on?: string;
          meal?: string;
          name?: string;
          protein_g?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          id: string;
          kind: string;
          link_to: string | null;
          read_at: string | null;
          title: string;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          id?: string;
          kind?: string;
          link_to?: string | null;
          read_at?: string | null;
          title: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          id?: string;
          kind?: string;
          link_to?: string | null;
          read_at?: string | null;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      progress_photos: {
        Row: {
          created_at: string;
          id: string;
          image_path: string;
          notes: string | null;
          photo_type: string;
          taken_on: string;
          updated_at: string;
          user_id: string;
          weight_kg: number | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          image_path: string;
          notes?: string | null;
          photo_type: string;
          taken_on?: string;
          updated_at?: string;
          user_id: string;
          weight_kg?: number | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          image_path?: string;
          notes?: string | null;
          photo_type?: string;
          taken_on?: string;
          updated_at?: string;
          user_id?: string;
          weight_kg?: number | null;
        };
        Relationships: [];
      };
      user_profiles: {
        Row: {
          age: number | null;
          created_at: string;
          current_weight_kg: number | null;
          demo_model_preference: string;
          display_name: string;
          experience: string;
          gender: string;
          goal: string;
          goal_weight_kg: number | null;
          height_cm: number | null;
          profile: Json;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          age?: number | null;
          created_at?: string;
          current_weight_kg?: number | null;
          demo_model_preference?: string;
          display_name?: string;
          experience: string;
          gender: string;
          goal: string;
          goal_weight_kg?: number | null;
          height_cm?: number | null;
          profile?: Json;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          age?: number | null;
          created_at?: string;
          current_weight_kg?: number | null;
          demo_model_preference?: string;
          display_name?: string;
          experience?: string;
          gender?: string;
          goal?: string;
          goal_weight_kg?: number | null;
          height_cm?: number | null;
          profile?: Json;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_goals: {
        Row: {
          created_at: string;
          daily_calorie_target: number;
          daily_carbs_g_target: number;
          daily_fat_g_target: number;
          daily_protein_g_target: number;
          daily_step_target: number;
          goal_weight_kg: number | null;
          starting_weight_kg: number | null;
          timezone: string;
          updated_at: string;
          user_id: string;
          weekly_workout_target: number;
        };
        Insert: {
          created_at?: string;
          daily_calorie_target?: number;
          daily_carbs_g_target?: number;
          daily_fat_g_target?: number;
          daily_protein_g_target?: number;
          daily_step_target?: number;
          goal_weight_kg?: number | null;
          starting_weight_kg?: number | null;
          timezone?: string;
          updated_at?: string;
          user_id: string;
          weekly_workout_target?: number;
        };
        Update: {
          created_at?: string;
          daily_calorie_target?: number;
          daily_carbs_g_target?: number;
          daily_fat_g_target?: number;
          daily_protein_g_target?: number;
          daily_step_target?: number;
          goal_weight_kg?: number | null;
          starting_weight_kg?: number | null;
          timezone?: string;
          updated_at?: string;
          user_id?: string;
          weekly_workout_target?: number;
        };
        Relationships: [];
      };
      weekly_reports: {
        Row: {
          achievements: Json;
          ai_summary: string | null;
          average_calories: number;
          average_protein_g: number;
          calorie_adherence: number;
          consistency_score: number;
          created_at: string;
          ending_weight_kg: number | null;
          finalized_at: string | null;
          id: string;
          is_finalized: boolean;
          next_week_plan: Json;
          overall_score: number;
          planned_workouts: number;
          protein_hit_days: number;
          starting_weight_kg: number | null;
          top_muscle_groups: string[];
          total_reps: number;
          total_sets: number;
          total_volume_kg: number;
          updated_at: string;
          user_id: string;
          week_end: string;
          week_start: string;
          weight_change_kg: number | null;
          workouts_completed: number;
        };
        Insert: {
          achievements?: Json;
          ai_summary?: string | null;
          average_calories?: number;
          average_protein_g?: number;
          calorie_adherence?: number;
          consistency_score?: number;
          created_at?: string;
          ending_weight_kg?: number | null;
          finalized_at?: string | null;
          id?: string;
          is_finalized?: boolean;
          next_week_plan?: Json;
          overall_score?: number;
          planned_workouts?: number;
          protein_hit_days?: number;
          starting_weight_kg?: number | null;
          top_muscle_groups?: string[];
          total_reps?: number;
          total_sets?: number;
          total_volume_kg?: number;
          updated_at?: string;
          user_id: string;
          week_end: string;
          week_start: string;
          weight_change_kg?: number | null;
          workouts_completed?: number;
        };
        Update: {
          achievements?: Json;
          ai_summary?: string | null;
          average_calories?: number;
          average_protein_g?: number;
          calorie_adherence?: number;
          consistency_score?: number;
          created_at?: string;
          ending_weight_kg?: number | null;
          finalized_at?: string | null;
          id?: string;
          is_finalized?: boolean;
          next_week_plan?: Json;
          overall_score?: number;
          planned_workouts?: number;
          protein_hit_days?: number;
          starting_weight_kg?: number | null;
          top_muscle_groups?: string[];
          total_reps?: number;
          total_sets?: number;
          total_volume_kg?: number;
          updated_at?: string;
          user_id?: string;
          week_end?: string;
          week_start?: string;
          weight_change_kg?: number | null;
          workouts_completed?: number;
        };
        Relationships: [];
      };
      weight_logs: {
        Row: {
          created_at: string;
          id: string;
          logged_on: string;
          user_id: string;
          weight_kg: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          logged_on?: string;
          user_id: string;
          weight_kg: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          logged_on?: string;
          user_id?: string;
          weight_kg?: number;
        };
        Relationships: [];
      };
      workout_logs: {
        Row: {
          calories: number;
          completed_at: string | null;
          created_at: string;
          duration_min: number;
          id: string;
          is_pr: boolean;
          muscle_groups: string[];
          name: string;
          notes: string | null;
          performed_on: string;
          pr_note: string | null;
          session: Json | null;
          started_at: string | null;
          total_reps: number;
          total_sets: number;
          total_volume_kg: number;
          unit: string;
          updated_at: string;
          user_id: string;
          workout_id: string | null;
        };
        Insert: {
          calories?: number;
          completed_at?: string | null;
          created_at?: string;
          duration_min?: number;
          id?: string;
          is_pr?: boolean;
          muscle_groups?: string[];
          name: string;
          notes?: string | null;
          performed_on?: string;
          pr_note?: string | null;
          session?: Json | null;
          started_at?: string | null;
          total_reps?: number;
          total_sets?: number;
          total_volume_kg?: number;
          unit?: string;
          updated_at?: string;
          user_id: string;
          workout_id?: string | null;
        };
        Update: {
          calories?: number;
          completed_at?: string | null;
          created_at?: string;
          duration_min?: number;
          id?: string;
          is_pr?: boolean;
          muscle_groups?: string[];
          name?: string;
          notes?: string | null;
          performed_on?: string;
          pr_note?: string | null;
          session?: Json | null;
          started_at?: string | null;
          total_reps?: number;
          total_sets?: number;
          total_volume_kg?: number;
          unit?: string;
          updated_at?: string;
          user_id?: string;
          workout_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      claim_scan_quota: {
        Args: { p_scan_type: string; p_submission_id: string };
        Returns: {
          allowed: boolean;
          limit_count: number;
          remaining: number;
          resets_at: string;
          used: number;
        }[];
      };
      get_scan_quota: {
        Args: { p_scan_type: string };
        Returns: {
          allowed: boolean;
          limit_count: number;
          remaining: number;
          resets_at: string;
          used: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
