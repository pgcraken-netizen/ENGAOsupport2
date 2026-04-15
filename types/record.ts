export type RecordStatus = 'draft' | 'confirmed' | 'rejected';
export type Condition = '良好' | '普通' | '不良' | '要観察';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertType =
  | 'no_record'
  | 'condition_change'
  | 'negative_streak'
  | 'incident'
  | 'meal_refusal'
  | 'fever';

export interface PatientCandidate {
  id: string;
  name: string;
  score: number;
}

export interface CareRecord {
  id: string;
  facility_id: string;
  status: RecordStatus;
  staff_id: string | null;
  line_user_id: string | null;
  line_display_name: string | null;
  patient_id: string | null;
  patient_candidates: PatientCandidate[];
  care_tags: string[];
  condition: Condition | null;
  condition_detail: string | null;
  original_text: string;
  confidence: number;
  ai_raw_output: Record<string, unknown> | null;
  is_incident: boolean;
  incident_keywords: string[];
  recorded_at: string;
  confirmed_at: string | null;
  confirmed_by: string | null;
  created_at: string;
  updated_at: string;
  // joined fields
  patient?: { id: string; name: string; room_number: string | null } | null;
  staff?: { id: string; name: string } | null;
}

export interface ParseResult {
  patient_name_in_text: string | null;
  patient_candidates: PatientCandidate[];
  care_tags: string[];
  condition: Condition | null;
  condition_detail: string | null;
  confidence: number;
  is_incident: boolean;
  incident_keywords: string[];
  parse_notes: string | null;
  ai_raw_output: Record<string, unknown>;
}
