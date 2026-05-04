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

// ─── 5段階評価 ────────────────────────────────────────────────
export type MealScore      = '完食' | '8割' | '半分' | '少量' | '拒否';
export type HealthScore    = '良好' | '普通' | '不良' | '発熱' | '要受診';
export type ExcretionScore = '正常' | '普通' | '軟便' | '下痢' | 'なし';
export type HydrationScore = '十分' | '普通' | '少量' | '拒否' | '未確認';

/** スコアが「良好」かどうかを判定するユーティリティ */
export const MEAL_NEGATIVE: MealScore[]      = ['少量', '拒否'];
export const HEALTH_NEGATIVE: HealthScore[]  = ['不良', '発熱', '要受診'];
export const EXCRETION_NEGATIVE: ExcretionScore[] = ['軟便', '下痢', 'なし'];
export const HYDRATION_NEGATIVE: HydrationScore[] = ['少量', '拒否'];

export const MEAL_OPTIONS: MealScore[]      = ['完食', '8割', '半分', '少量', '拒否'];
export const HEALTH_OPTIONS: HealthScore[]  = ['良好', '普通', '不良', '発熱', '要受診'];
export const EXCRETION_OPTIONS: ExcretionScore[] = ['正常', '普通', '軟便', '下痢', 'なし'];
export const HYDRATION_OPTIONS: HydrationScore[] = ['十分', '普通', '少量', '拒否', '未確認'];

export const SCORE_LABELS = {
  meal:      '食事',
  health:    '健康',
  excretion: '排泄',
  hydration: '水分',
} as const;

export const CARE_TAGS = [
  '転倒リスク',
  '食欲低下',
  '服薬',
  '家族連絡',
  'その他',
] as const;

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
  // ─── 新: 5段階評価フィールド ───────────────────
  meal: MealScore | null;
  health: HealthScore | null;
  excretion: ExcretionScore | null;
  hydration: HydrationScore | null;
  comment: string | null;
  // ────────────────────────────────────────────────
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
