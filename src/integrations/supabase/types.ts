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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      call_outs: {
        Row: {
          call_out_date: string
          created_at: string
          created_by: string | null
          driver_id: string
          driver_name: string
          id: string
          note: string | null
        }
        Insert: {
          call_out_date?: string
          created_at?: string
          created_by?: string | null
          driver_id: string
          driver_name: string
          id?: string
          note?: string | null
        }
        Update: {
          call_out_date?: string
          created_at?: string
          created_by?: string | null
          driver_id?: string
          driver_name?: string
          id?: string
          note?: string | null
        }
        Relationships: []
      }
      driver_schedules: {
        Row: {
          created_at: string
          day_of_week: number
          driver_id: string
          end_time: string | null
          id: string
          is_off: boolean
          note: string | null
          start_time: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          driver_id: string
          end_time?: string | null
          id?: string
          is_off?: boolean
          note?: string | null
          start_time?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          driver_id?: string
          end_time?: string | null
          id?: string
          is_off?: boolean
          note?: string | null
          start_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_schedules_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          address: string | null
          code: string | null
          created_at: string
          default_vehicle: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_name_2: string | null
          emergency_contact_phone: string | null
          emergency_contact_phone_2: string | null
          emergency_contact_relationship: string | null
          emergency_contact_relationship_2: string | null
          has_cdl: boolean
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          report_time: string | null
          status: Database["public"]["Enums"]["driver_status"]
          updated_at: string
          vehicle: string | null
        }
        Insert: {
          address?: string | null
          code?: string | null
          created_at?: string
          default_vehicle?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_name_2?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_phone_2?: string | null
          emergency_contact_relationship?: string | null
          emergency_contact_relationship_2?: string | null
          has_cdl?: boolean
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          report_time?: string | null
          status?: Database["public"]["Enums"]["driver_status"]
          updated_at?: string
          vehicle?: string | null
        }
        Update: {
          address?: string | null
          code?: string | null
          created_at?: string
          default_vehicle?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_name_2?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_phone_2?: string | null
          emergency_contact_relationship?: string | null
          emergency_contact_relationship_2?: string | null
          has_cdl?: boolean
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          report_time?: string | null
          status?: Database["public"]["Enums"]["driver_status"]
          updated_at?: string
          vehicle?: string | null
        }
        Relationships: []
      }
      future_assignments: {
        Row: {
          assignment_date: string
          created_at: string
          created_by: string | null
          driver_id: string
          driver_name: string
          id: string
          report_time: string | null
          vehicle: string | null
        }
        Insert: {
          assignment_date: string
          created_at?: string
          created_by?: string | null
          driver_id: string
          driver_name: string
          id?: string
          report_time?: string | null
          vehicle?: string | null
        }
        Update: {
          assignment_date?: string
          created_at?: string
          created_by?: string | null
          driver_id?: string
          driver_name?: string
          id?: string
          report_time?: string | null
          vehicle?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "future_assignments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      status_history: {
        Row: {
          changed_at: string
          entity_id: string
          entity_name: string
          entity_type: string
          field_changed: string
          id: string
          new_value: string
          old_value: string | null
        }
        Insert: {
          changed_at?: string
          entity_id: string
          entity_name: string
          entity_type: string
          field_changed: string
          id?: string
          new_value: string
          old_value?: string | null
        }
        Update: {
          changed_at?: string
          entity_id?: string
          entity_name?: string
          entity_type?: string
          field_changed?: string
          id?: string
          new_value?: string
          old_value?: string | null
        }
        Relationships: []
      }
      time_punches: {
        Row: {
          created_at: string
          driver_id: string
          driver_name: string
          id: string
          notes: string | null
          punch_time: string
          punch_type: string
          punched_by: string | null
        }
        Insert: {
          created_at?: string
          driver_id: string
          driver_name: string
          id?: string
          notes?: string | null
          punch_time?: string
          punch_type: string
          punched_by?: string | null
        }
        Update: {
          created_at?: string
          driver_id?: string
          driver_name?: string
          id?: string
          notes?: string | null
          punch_time?: string
          punch_type?: string
          punched_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_punches_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicle_assignment_history: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          created_at: string
          driver_id: string | null
          driver_name: string
          id: string
          unassigned_at: string | null
          vehicle_id: string
          vehicle_unit: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          driver_id?: string | null
          driver_name: string
          id?: string
          unassigned_at?: string | null
          vehicle_id: string
          vehicle_unit: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          driver_id?: string | null
          driver_name?: string
          id?: string
          unassigned_at?: string | null
          vehicle_id?: string
          vehicle_unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_assignment_history_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_assignment_history_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_maintenance_events: {
        Row: {
          actual_back_in_service_at: string | null
          closed_at: string | null
          created_at: string
          created_by: string | null
          expected_back_in_service_at: string | null
          id: string
          notes: string | null
          opened_at: string
          vehicle_id: string
        }
        Insert: {
          actual_back_in_service_at?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          expected_back_in_service_at?: string | null
          id?: string
          notes?: string | null
          opened_at?: string
          vehicle_id: string
        }
        Update: {
          actual_back_in_service_at?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          expected_back_in_service_at?: string | null
          id?: string
          notes?: string | null
          opened_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_maintenance_events_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_maintenance_issues: {
        Row: {
          created_at: string
          created_by: string | null
          details: string | null
          id: string
          maintenance_event_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          details?: string | null
          id?: string
          maintenance_event_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          details?: string | null
          id?: string
          maintenance_event_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_maintenance_issues_maintenance_event_id_fkey"
            columns: ["maintenance_event_id"]
            isOneToOne: false
            referencedRelation: "vehicle_maintenance_events"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_service_tickets: {
        Row: {
          assigned_to_user_id: string | null
          category: Database["public"]["Enums"]["maintenance_category"]
          closed_at: string | null
          created_at: string
          description: string
          estimated_completion_at: string | null
          id: string
          priority: Database["public"]["Enums"]["maintenance_priority"]
          requested_by_user_id: string | null
          ticket_status: Database["public"]["Enums"]["ticket_status"]
          title: string
          vehicle_id: string
        }
        Insert: {
          assigned_to_user_id?: string | null
          category?: Database["public"]["Enums"]["maintenance_category"]
          closed_at?: string | null
          created_at?: string
          description: string
          estimated_completion_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["maintenance_priority"]
          requested_by_user_id?: string | null
          ticket_status?: Database["public"]["Enums"]["ticket_status"]
          title: string
          vehicle_id: string
        }
        Update: {
          assigned_to_user_id?: string | null
          category?: Database["public"]["Enums"]["maintenance_category"]
          closed_at?: string | null
          created_at?: string
          description?: string
          estimated_completion_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["maintenance_priority"]
          requested_by_user_id?: string | null
          ticket_status?: Database["public"]["Enums"]["ticket_status"]
          title?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_service_tickets_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          assigned_driver_id: string | null
          classification: Database["public"]["Enums"]["vehicle_classification"]
          clean_status: Database["public"]["Enums"]["clean_status"]
          created_at: string
          current_maintenance_event_id: string | null
          driver: string | null
          id: string
          mileage: number | null
          notes: string | null
          status: Database["public"]["Enums"]["vehicle_status"]
          unit: string
          updated_at: string
          vehicle_type: Database["public"]["Enums"]["vehicle_type"] | null
        }
        Insert: {
          assigned_driver_id?: string | null
          classification?: Database["public"]["Enums"]["vehicle_classification"]
          clean_status?: Database["public"]["Enums"]["clean_status"]
          created_at?: string
          current_maintenance_event_id?: string | null
          driver?: string | null
          id?: string
          mileage?: number | null
          notes?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          unit: string
          updated_at?: string
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"] | null
        }
        Update: {
          assigned_driver_id?: string | null
          classification?: Database["public"]["Enums"]["vehicle_classification"]
          clean_status?: Database["public"]["Enums"]["clean_status"]
          created_at?: string
          current_maintenance_event_id?: string | null
          driver?: string | null
          id?: string
          mileage?: number | null
          notes?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          unit?: string
          updated_at?: string
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_current_maintenance_event_id_fkey"
            columns: ["current_maintenance_event_id"]
            isOneToOne: false
            referencedRelation: "vehicle_maintenance_events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_users_with_roles: {
        Args: never
        Returns: {
          created_at: string
          email: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "dispatcher"
      clean_status: "clean" | "dirty"
      driver_status:
        | "available"
        | "on-route"
        | "break"
        | "offline"
        | "off"
        | "scheduled"
        | "assigned"
        | "working"
        | "unassigned"
        | "punched-out"
      maintenance_category:
        | "mechanical"
        | "electrical"
        | "tire"
        | "body"
        | "cleaning"
        | "other"
      maintenance_priority: "low" | "medium" | "high" | "critical"
      ticket_status: "open" | "in_progress" | "waiting_parts" | "closed"
      vehicle_classification: "house" | "take_home"
      vehicle_status: "active" | "out-of-service"
      vehicle_type:
        | "sedan_volvo"
        | "sedan_aviator"
        | "suv"
        | "exec_transit"
        | "sprinter_limo"
        | "stretch_limo"
        | "28_shuttle"
        | "37_shuttle"
        | "39_shuttle"
        | "56_mc"
        | "32_limo_bus"
        | "trolley"
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
      app_role: ["admin", "dispatcher"],
      clean_status: ["clean", "dirty"],
      driver_status: [
        "available",
        "on-route",
        "break",
        "offline",
        "off",
        "scheduled",
        "assigned",
        "working",
        "unassigned",
        "punched-out",
      ],
      maintenance_category: [
        "mechanical",
        "electrical",
        "tire",
        "body",
        "cleaning",
        "other",
      ],
      maintenance_priority: ["low", "medium", "high", "critical"],
      ticket_status: ["open", "in_progress", "waiting_parts", "closed"],
      vehicle_classification: ["house", "take_home"],
      vehicle_status: ["active", "out-of-service"],
      vehicle_type: [
        "sedan_volvo",
        "sedan_aviator",
        "suv",
        "exec_transit",
        "sprinter_limo",
        "stretch_limo",
        "28_shuttle",
        "37_shuttle",
        "39_shuttle",
        "56_mc",
        "32_limo_bus",
        "trolley",
      ],
    },
  },
} as const
