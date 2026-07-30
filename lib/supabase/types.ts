// Hand-written to mirror supabase/migrations/0001_init.sql and 0002_calendar_connections.sql.
// Regenerate with `npx supabase gen types typescript --project-id cpuxjofpolmpxhlhnsel --schema public`
// once the Supabase CLI is linked, and diff against this file for drift.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AssignmentStatus = "not_started" | "in_progress" | "done";
export type AssignmentPriority = "low" | "medium" | "high";
export type FocusResult = "completed" | "partial";
export type FocusSessionSource = "timer" | "manual";
export type PlanStatus = "draft" | "active" | "cancelled";
export type WarningStatus = "open" | "handled" | "dismissed";
export type CalendarSyncStatus = "never" | "ok" | "error";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          target_gpa: number | null;
          weekly_availability_hours: number;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          target_gpa?: number | null;
          weekly_availability_hours?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          target_gpa?: number | null;
          weekly_availability_hours?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      courses: {
        Row: {
          id: string;
          user_id: string;
          code: string | null;
          name: string;
          credits: number;
          semester: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          code?: string | null;
          name: string;
          credits: number;
          semester: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          code?: string | null;
          name?: string;
          credits?: number;
          semester?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      assignments: {
        Row: {
          id: string;
          user_id: string;
          course_id: string | null;
          title: string;
          due_at: string;
          weight: number;
          score: number | null;
          priority: AssignmentPriority;
          status: AssignmentStatus;
          progress: number;
          notes: string | null;
          reminder_at: string | null;
          archived_at: string | null;
          recurrence_group_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id?: string | null;
          title: string;
          due_at: string;
          weight: number;
          score?: number | null;
          priority: AssignmentPriority;
          status?: AssignmentStatus;
          progress?: number;
          notes?: string | null;
          reminder_at?: string | null;
          archived_at?: string | null;
          recurrence_group_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string | null;
          title?: string;
          due_at?: string;
          weight?: number;
          score?: number | null;
          priority?: AssignmentPriority;
          status?: AssignmentStatus;
          progress?: number;
          notes?: string | null;
          reminder_at?: string | null;
          archived_at?: string | null;
          recurrence_group_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      class_blocks: {
        Row: {
          id: string;
          user_id: string;
          course_id: string | null;
          gcal_event_id: string | null;
          title: string;
          location: string | null;
          start_at: string;
          end_at: string;
          synced_at: string;
          is_all_day: boolean;
          notes: string | null;
          reminder_minutes_before: number | null;
          recurrence_group_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id?: string | null;
          gcal_event_id?: string | null;
          title: string;
          location?: string | null;
          start_at: string;
          end_at: string;
          synced_at?: string;
          is_all_day?: boolean;
          notes?: string | null;
          reminder_minutes_before?: number | null;
          recurrence_group_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string | null;
          gcal_event_id?: string | null;
          title?: string;
          location?: string | null;
          start_at?: string;
          end_at?: string;
          synced_at?: string;
          is_all_day?: boolean;
          notes?: string | null;
          reminder_minutes_before?: number | null;
          recurrence_group_id?: string | null;
        };
        Relationships: [];
      };
      focus_sessions: {
        Row: {
          id: string;
          user_id: string;
          // Phase 4.1: nullable since migration 0012 — assignment_id goes
          // null (not cascade-deleted) when the assignment it was logged
          // against is later deleted, preserving streak/minute history.
          assignment_id: string | null;
          started_at: string;
          ended_at: string;
          duration_seconds: number;
          result: FocusResult;
          source: FocusSessionSource;
        };
        Insert: {
          id?: string;
          user_id: string;
          assignment_id?: string | null;
          started_at: string;
          ended_at: string;
          duration_seconds: number;
          result: FocusResult;
          source?: FocusSessionSource;
        };
        Update: {
          id?: string;
          user_id?: string;
          assignment_id?: string | null;
          started_at?: string;
          ended_at?: string;
          duration_seconds?: number;
          result?: FocusResult;
          source?: FocusSessionSource;
        };
        Relationships: [];
      };
      grades: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          semester: string;
          grade_point: number;
          credit_hours: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          semester: string;
          grade_point: number;
          credit_hours: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          semester?: string;
          grade_point?: number;
          credit_hours?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      study_plans: {
        Row: {
          id: string;
          user_id: string;
          week_start: string;
          status: PlanStatus;
          input_snapshot: Json;
          generated_at: string;
          confirmed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          week_start: string;
          status?: PlanStatus;
          input_snapshot: Json;
          generated_at?: string;
          confirmed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          week_start?: string;
          status?: PlanStatus;
          input_snapshot?: Json;
          generated_at?: string;
          confirmed_at?: string | null;
        };
        Relationships: [];
      };
      study_sessions: {
        Row: {
          id: string;
          plan_id: string;
          assignment_id: string | null;
          start_at: string;
          end_at: string;
          reason: string | null;
          gcal_event_id: string | null;
        };
        Insert: {
          id?: string;
          plan_id: string;
          assignment_id?: string | null;
          start_at: string;
          end_at: string;
          reason?: string | null;
          gcal_event_id?: string | null;
        };
        Update: {
          id?: string;
          plan_id?: string;
          assignment_id?: string | null;
          start_at?: string;
          end_at?: string;
          reason?: string | null;
          gcal_event_id?: string | null;
        };
        Relationships: [];
      };
      risk_scores: {
        Row: {
          id: string;
          user_id: string;
          score_date: string;
          workload_factor: number;
          overdue_factor: number;
          focus_factor: number;
          score: number;
          computed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          score_date: string;
          workload_factor: number;
          overdue_factor: number;
          focus_factor: number;
          score: number;
          computed_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          score_date?: string;
          workload_factor?: number;
          overdue_factor?: number;
          focus_factor?: number;
          score?: number;
          computed_at?: string;
        };
        Relationships: [];
      };
      risk_warnings: {
        Row: {
          id: string;
          user_id: string;
          risk_score_id: string;
          status: WarningStatus;
          action_taken: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          risk_score_id: string;
          status?: WarningStatus;
          action_taken?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          risk_score_id?: string;
          status?: WarningStatus;
          action_taken?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          kind: string;
          title: string;
          body: string | null;
          scheduled_at: string | null;
          delivered_at: string | null;
          read_at: string | null;
          push_status: string | null;
          assignment_id: string | null;
          class_block_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          kind: string;
          title: string;
          body?: string | null;
          scheduled_at?: string | null;
          delivered_at?: string | null;
          read_at?: string | null;
          push_status?: string | null;
          assignment_id?: string | null;
          class_block_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          kind?: string;
          title?: string;
          body?: string | null;
          scheduled_at?: string | null;
          delivered_at?: string | null;
          read_at?: string | null;
          push_status?: string | null;
          assignment_id?: string | null;
          class_block_id?: string | null;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      google_calendar_connections: {
        Row: {
          user_id: string;
          refresh_token: string;
          access_token: string | null;
          access_token_expires_at: string | null;
          scope: string;
          connected_at: string;
          last_synced_at: string | null;
          last_sync_status: CalendarSyncStatus;
          last_sync_error: string | null;
        };
        Insert: {
          user_id: string;
          refresh_token: string;
          access_token?: string | null;
          access_token_expires_at?: string | null;
          scope: string;
          connected_at?: string;
          last_synced_at?: string | null;
          last_sync_status?: CalendarSyncStatus;
          last_sync_error?: string | null;
        };
        Update: {
          user_id?: string;
          refresh_token?: string;
          access_token?: string | null;
          access_token_expires_at?: string | null;
          scope?: string;
          connected_at?: string;
          last_synced_at?: string | null;
          last_sync_status?: CalendarSyncStatus;
          last_sync_error?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      assignment_status: AssignmentStatus;
      assignment_priority: AssignmentPriority;
      focus_result: FocusResult;
      focus_session_source: FocusSessionSource;
      plan_status: PlanStatus;
      warning_status: WarningStatus;
      calendar_sync_status: CalendarSyncStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
