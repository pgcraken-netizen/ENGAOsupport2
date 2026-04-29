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

export type AlertLevel = '正常' | '観察' | '注意' | '警告';
export type InputMode = 'liff' | 'line_bot' | 'admin';

// 5段階評価
export type MealRating = '完食' | '8割' | '半分' | '少量' | '拒否';
export type HealthRating = '良好' | '普通' | 'やや不調' | '不調' | '重不調';
export type ExcretionRating = '正常' | '少量' | '不規則' | '困難' | 'なし';
export type HydrationRating = '十分' | '普通' | '少ない' | 'わずか' | '拒否';

export const MEAL_OPTIONS: MealRating[] = ['完食', '8割', '半分', '少量', '拒否'];
export const HEALTH_OPTIONS: HealthRating[] = ['良好', '普通', 'やや不調', '不調', '重不調'];
export const EXCRETION_OPTIONS: ExcretionRating[] = ['正常', '少量', '不規則', '困難', 'なし'];
export const HYDRATION_OPTIONS: HydrationRating[] = ['十分', '普通', '少ない', 'わずか', '拒否'];

export const DEFAULT_TAGS = ['転倒リスク', '食欲低下', '服薬', '家族連絡', 'その他'] as const;

// 評価スコア（1=最悪, 5=最良）— アラート判定に使用
export function ratingScore(value: string, options: string[]): number {
  const idx = options.indexOf(value);
  return idx === -1 ? 3 : options.length - idx;
}

export function isAnomaly(
  meal?: MealRating | null,
  health?: HealthRating | null,
  excretion?: ExcretionRating | null,
  hydration?: HydrationRating | null,
): boolean {
  const scores = [
    meal ? ratingScore(meal, MEAL_OPTIONS) : null,
    health ? ratingScore(health, HEALTH_OPTIONS) : null,
    excretion ? ratingScore(excretion, EXCRETION_OPTIONS) : null,
    hydration ? ratingScore(hydration, HYDRATION_OPTIONS) : null,
  ].filter((s): s is number => s !== null);
  return scores.some(s => s <= 3);
}

export function computeAlertLevel(
  meal?: MealRating | null,
  health?: HealthRating | null,
  excretion?: ExcretionRating | null,
  hydration?: HydrationRating | null,
  consecutiveAnomalies = 0,
): AlertLevel {
  const scores = [
    meal ? ratingScore(meal, MEAL_OPTIONS) : null,
    health ? ratingScore(health, HEALTH_OPTIONS) : null,
    excretion ? ratingScore(excretion, EXCRETION_OPTIONS) : null,
    hydration ? ratingScore(hydration, HYDRATION_OPTIONS) : null,
  ].filter((s): s is number => s !== null);

  if (scores.length === 0) return '正常';

  const severeCount = scores.filter(s => s <= 2).length;
  const badCount = scores.filter(s => s <= 3).length;

  // 複合異常 or 連続3回以上 → 警告
  if (severeCount >= 1 || badCount >= 3 || consecutiveAnomalies >= 2) return '警告';
  // 連続2回 or 中度異常複数 → 注意
  if (consecutiveAnomalies === 1 || badCount >= 2) return '注意';
  // 単発軽度 → 観察
  if (badCount >= 1) return '観察';
  return '正常';
}

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
  // Legacy field
  condition: Condition | null;
  condition_detail: string | null;
  // 5段階評価
  meal: MealRating | null;
  health: HealthRating | null;
  excretion: ExcretionRating | null;
  hydration: HydrationRating | null;
  comment: string | null;
  alert_level: AlertLevel;
  input_mode: InputMode;
  // AI fields (legacy)
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

// LIFF入力フォームの型
export interface LiffRecordInput {
  patient_id: string;
  meal: MealRating;
  health: HealthRating;
  excretion: ExcretionRating;
  hydration: HydrationRating;
  tags: string[];
  comment: string;
}
