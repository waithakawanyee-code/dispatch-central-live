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
      admin_assignment_overrides: {
        Row: {
          created_at: string
          driver_id: string | null
          driver_name: string
          id: string
          override_at: string
          override_by: string | null
          owner_driver_id: string | null
          owner_driver_name: string | null
          reason: string | null
          vehicle_id: string
          vehicle_unit: string
        }
        Insert: {
          created_at?: string
          driver_id?: string | null
          driver_name: string
          id?: string
          override_at?: string
          override_by?: string | null
          owner_driver_id?: string | null
          owner_driver_name?: string | null
          reason?: string | null
          vehicle_id: string
          vehicle_unit: string
        }
        Update: {
          created_at?: string
          driver_id?: string | null
          driver_name?: string
          id?: string
          override_at?: string
          override_by?: string | null
          owner_driver_id?: string | null
          owner_driver_name?: string | null
          reason?: string | null
          vehicle_id?: string
          vehicle_unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_assignment_overrides_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_assignment_overrides_owner_driver_id_fkey"
            columns: ["owner_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_assignment_overrides_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_acknowledgements: {
        Row: {
          acknowledged_at: string
          acknowledged_by: string
          alert_id: string
          id: string
        }
        Insert: {
          acknowledged_at?: string
          acknowledged_by: string
          alert_id: string
          id?: string
        }
        Update: {
          acknowledged_at?: string
          acknowledged_by?: string
          alert_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_acknowledgements_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: true
            referencedRelation: "queue_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
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
      cleaning_queue_items: {
        Row: {
          cleaned_at: string | null
          cleaned_by: string | null
          created_at: string
          created_by: string | null
          dispatcher_notes: string | null
          id: string
          out_at: string | null
          position: number
          queue_id: string
          status: Database["public"]["Enums"]["queue_item_status"]
          urgency: Database["public"]["Enums"]["queue_item_urgency"]
          vehicle_id: string
        }
        Insert: {
          cleaned_at?: string | null
          cleaned_by?: string | null
          created_at?: string
          created_by?: string | null
          dispatcher_notes?: string | null
          id?: string
          out_at?: string | null
          position: number
          queue_id: string
          status?: Database["public"]["Enums"]["queue_item_status"]
          urgency?: Database["public"]["Enums"]["queue_item_urgency"]
          vehicle_id: string
        }
        Update: {
          cleaned_at?: string | null
          cleaned_by?: string | null
          created_at?: string
          created_by?: string | null
          dispatcher_notes?: string | null
          id?: string
          out_at?: string | null
          position?: number
          queue_id?: string
          status?: Database["public"]["Enums"]["queue_item_status"]
          urgency?: Database["public"]["Enums"]["queue_item_urgency"]
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleaning_queue_items_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "cleaning_queues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaning_queue_items_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      cleaning_queues: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          queue_date: string
          queue_type: Database["public"]["Enums"]["queue_type"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          queue_date: string
          queue_type: Database["public"]["Enums"]["queue_type"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          queue_date?: string
          queue_type?: Database["public"]["Enums"]["queue_type"]
        }
        Relationships: []
      }
      damage_photos: {
        Row: {
          damage_report_id: string
          id: string
          storage_path: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          damage_report_id: string
          id?: string
          storage_path: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          damage_report_id?: string
          id?: string
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "damage_photos_damage_report_id_fkey"
            columns: ["damage_report_id"]
            isOneToOne: false
            referencedRelation: "damage_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      damage_reports: {
        Row: {
          damage_location: string | null
          damage_type: Database["public"]["Enums"]["damage_type"]
          id: string
          notes: string | null
          queue_item_id: string | null
          started_at: string
          started_by: string
          status: Database["public"]["Enums"]["damage_status"]
          submitted_at: string | null
          vehicle_id: string
        }
        Insert: {
          damage_location?: string | null
          damage_type: Database["public"]["Enums"]["damage_type"]
          id?: string
          notes?: string | null
          queue_item_id?: string | null
          started_at?: string
          started_by: string
          status?: Database["public"]["Enums"]["damage_status"]
          submitted_at?: string | null
          vehicle_id: string
        }
        Update: {
          damage_location?: string | null
          damage_type?: Database["public"]["Enums"]["damage_type"]
          id?: string
          notes?: string | null
          queue_item_id?: string | null
          started_at?: string
          started_by?: string
          status?: Database["public"]["Enums"]["damage_status"]
          submitted_at?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "damage_reports_queue_item_id_fkey"
            columns: ["queue_item_id"]
            isOneToOne: false
            referencedRelation: "cleaning_queue_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "damage_reports_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_schedules: {
        Row: {
          created_at: string
          day_of_week: number
          driver_id: string
          end_time: string | null
          id: string
          is_any_hours: boolean
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
          is_any_hours?: boolean
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
          is_any_hours?: boolean
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
          amtrak_notes: string | null
          amtrak_primary: boolean
          amtrak_trained: boolean
          bph_notes: string | null
          bph_primary: boolean
          bph_trained: boolean
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
          amtrak_notes?: string | null
          amtrak_primary?: boolean
          amtrak_trained?: boolean
          bph_notes?: string | null
          bph_primary?: boolean
          bph_trained?: boolean
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
          amtrak_notes?: string | null
          amtrak_primary?: boolean
          amtrak_trained?: boolean
          bph_notes?: string | null
          bph_primary?: boolean
          bph_trained?: boolean
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
      maintenance_issue_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      maintenance_issue_options: {
        Row: {
          category_id: string
          created_at: string
          id: string
          is_active: boolean
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_issue_options_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "maintenance_issue_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_issue_templates: {
        Row: {
          created_at: string
          default_details: string | null
          id: string
          is_active: boolean
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_details?: string | null
          id?: string
          is_active?: boolean
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_details?: string | null
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["profile_role"]
        }
        Insert: {
          active?: boolean
          created_at?: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["profile_role"]
        }
        Update: {
          active?: boolean
          created_at?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["profile_role"]
        }
        Relationships: []
      }
      queue_alerts: {
        Row: {
          alert_level: Database["public"]["Enums"]["alert_level"]
          alert_message: string | null
          created_at: string
          created_by: string | null
          id: string
          queue_item_id: string
          resolved_at: string | null
        }
        Insert: {
          alert_level?: Database["public"]["Enums"]["alert_level"]
          alert_message?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          queue_item_id: string
          resolved_at?: string | null
        }
        Update: {
          alert_level?: Database["public"]["Enums"]["alert_level"]
          alert_message?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          queue_item_id?: string
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "queue_alerts_queue_item_id_fkey"
            columns: ["queue_item_id"]
            isOneToOne: false
            referencedRelation: "cleaning_queue_items"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_vehicle_segments: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          segment_in_at: string
          segment_out_at: string | null
          shift_id: string
          vehicle_id: string | null
          vehicle_unit: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          segment_in_at?: string
          segment_out_at?: string | null
          shift_id: string
          vehicle_id?: string | null
          vehicle_unit: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          segment_in_at?: string
          segment_out_at?: string | null
          shift_id?: string
          vehicle_id?: string | null
          vehicle_unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_vehicle_segments_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_vehicle_segments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          created_at: string
          created_by: string | null
          driver_id: string
          driver_name: string
          exception_flags: Json | null
          id: string
          notes: string | null
          punch_in_at: string
          punch_out_at: string | null
          updated_at: string
          updated_by: string | null
          vehicle_unit: string | null
          workday_date: string
          workday_override: boolean
          workday_override_at: string | null
          workday_override_by: string | null
          workday_override_reason: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          driver_id: string
          driver_name: string
          exception_flags?: Json | null
          id?: string
          notes?: string | null
          punch_in_at?: string
          punch_out_at?: string | null
          updated_at?: string
          updated_by?: string | null
          vehicle_unit?: string | null
          workday_date?: string
          workday_override?: boolean
          workday_override_at?: string | null
          workday_override_by?: string | null
          workday_override_reason?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          driver_id?: string
          driver_name?: string
          exception_flags?: Json | null
          id?: string
          notes?: string | null
          punch_in_at?: string
          punch_out_at?: string | null
          updated_at?: string
          updated_by?: string | null
          vehicle_unit?: string | null
          workday_date?: string
          workday_override?: boolean
          workday_override_at?: string | null
          workday_override_by?: string | null
          workday_override_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shifts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      shuttle_schedules: {
        Row: {
          created_at: string
          day_of_week: number
          driver_id: string
          end_time: string | null
          id: string
          program: string
          shift_number: number
          start_time: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          driver_id: string
          end_time?: string | null
          id?: string
          program: string
          shift_number?: number
          start_time?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          driver_id?: string
          end_time?: string | null
          id?: string
          program?: string
          shift_number?: number
          start_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shuttle_schedules_driver_id_fkey"
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
      vehicle_status_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          idempotency_key: string | null
          occurred_at: string
          payload_json: Json | null
          source: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          idempotency_key?: string | null
          occurred_at?: string
          payload_json?: Json | null
          source: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          idempotency_key?: string | null
          occurred_at?: string
          payload_json?: Json | null
          source?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_status_events_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          always_clean: boolean
          always_clean_exempt: boolean
          assigned_driver_id: string | null
          classification: Database["public"]["Enums"]["vehicle_classification"]
          clean_status: Database["public"]["Enums"]["clean_status"]
          clean_status_source: string | null
          clean_status_updated_at: string | null
          created_at: string
          current_maintenance_event_id: string | null
          dirty_reason: string | null
          driver: string | null
          has_car_wash_subscription: boolean
          id: string
          last_marked_dirty_at: string | null
          last_wash_at: string | null
          mileage: number | null
          notes: string | null
          phone: string | null
          primary_category: Database["public"]["Enums"]["vehicle_primary_category"]
          released_as_fleet_until: string | null
          status: Database["public"]["Enums"]["vehicle_status"]
          unit: string
          updated_at: string
          vehicle_type: Database["public"]["Enums"]["vehicle_type"] | null
        }
        Insert: {
          always_clean?: boolean
          always_clean_exempt?: boolean
          assigned_driver_id?: string | null
          classification?: Database["public"]["Enums"]["vehicle_classification"]
          clean_status?: Database["public"]["Enums"]["clean_status"]
          clean_status_source?: string | null
          clean_status_updated_at?: string | null
          created_at?: string
          current_maintenance_event_id?: string | null
          dirty_reason?: string | null
          driver?: string | null
          has_car_wash_subscription?: boolean
          id?: string
          last_marked_dirty_at?: string | null
          last_wash_at?: string | null
          mileage?: number | null
          notes?: string | null
          phone?: string | null
          primary_category?: Database["public"]["Enums"]["vehicle_primary_category"]
          released_as_fleet_until?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          unit: string
          updated_at?: string
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"] | null
        }
        Update: {
          always_clean?: boolean
          always_clean_exempt?: boolean
          assigned_driver_id?: string | null
          classification?: Database["public"]["Enums"]["vehicle_classification"]
          clean_status?: Database["public"]["Enums"]["clean_status"]
          clean_status_source?: string | null
          clean_status_updated_at?: string | null
          created_at?: string
          current_maintenance_event_id?: string | null
          dirty_reason?: string | null
          driver?: string | null
          has_car_wash_subscription?: boolean
          id?: string
          last_marked_dirty_at?: string | null
          last_wash_at?: string | null
          mileage?: number | null
          notes?: string | null
          phone?: string | null
          primary_category?: Database["public"]["Enums"]["vehicle_primary_category"]
          released_as_fleet_until?: string | null
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
      workdays: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          notes: string | null
          status: string
          workday_date: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          notes?: string | null
          status?: string
          workday_date: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          notes?: string | null
          status?: string
          workday_date?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["profile_role"]
      }
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
      has_profile_role: {
        Args: {
          _role: Database["public"]["Enums"]["profile_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_dispatcher_or_admin: { Args: never; Returns: boolean }
      is_washer: { Args: never; Returns: boolean }
    }
    Enums: {
      alert_level: "URGENT"
      app_role: "admin" | "dispatcher" | "washer"
      clean_status: "clean" | "dirty" | "unknown"
      damage_status: "OPEN" | "SUBMITTED" | "CLOSED"
      damage_type: "SCRATCH" | "DENT" | "INTERIOR" | "GLASS" | "OTHER"
      driver_status: "unconfirmed" | "confirmed" | "on_the_clock" | "done"
      maintenance_category:
        | "mechanical"
        | "electrical"
        | "tire"
        | "body"
        | "cleaning"
        | "other"
      maintenance_priority: "low" | "medium" | "high" | "critical"
      profile_role: "ADMIN" | "DISPATCHER" | "WASHER" | "USER"
      queue_item_status: "PENDING" | "CLEAN"
      queue_item_urgency: "NORMAL" | "HIGH" | "CRITICAL"
      queue_type: "SPECIALTY" | "GENERAL"
      ticket_status: "open" | "in_progress" | "waiting_parts" | "closed"
      vehicle_classification: "house" | "take_home" | "fleet"
      vehicle_primary_category: "above_all" | "specialty"
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
      alert_level: ["URGENT"],
      app_role: ["admin", "dispatcher", "washer"],
      clean_status: ["clean", "dirty", "unknown"],
      damage_status: ["OPEN", "SUBMITTED", "CLOSED"],
      damage_type: ["SCRATCH", "DENT", "INTERIOR", "GLASS", "OTHER"],
      driver_status: ["unconfirmed", "confirmed", "on_the_clock", "done"],
      maintenance_category: [
        "mechanical",
        "electrical",
        "tire",
        "body",
        "cleaning",
        "other",
      ],
      maintenance_priority: ["low", "medium", "high", "critical"],
      profile_role: ["ADMIN", "DISPATCHER", "WASHER", "USER"],
      queue_item_status: ["PENDING", "CLEAN"],
      queue_item_urgency: ["NORMAL", "HIGH", "CRITICAL"],
      queue_type: ["SPECIALTY", "GENERAL"],
      ticket_status: ["open", "in_progress", "waiting_parts", "closed"],
      vehicle_classification: ["house", "take_home", "fleet"],
      vehicle_primary_category: ["above_all", "specialty"],
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
