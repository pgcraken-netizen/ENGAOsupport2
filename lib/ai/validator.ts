import { Condition, MealScore, HealthScore, ExcretionScore, HydrationScore } from '@/types/record';

export interface RawParseOutput {
  patient_name_in_text?: string | null;
  care_tags?: string[];
  meal?: string | null;
  health?: string | null;
  excretion?: string | null;
  hydration?: string | null;
  condition?: string | null;
  condition_detail?: string | null;
  comment?: string | null;
  confidence?: number;
  parse_notes?: string | null;
  is_incident?: boolean;
  incident_keywords?: string[];
}

const VALID_CONDITIONS: Condition[] = ['良好', '普通', '不良', '要観察'];
const VALID_MEAL: MealScore[] = ['完食', '8割', '半分', '少量', '拒否'];
const VALID_HEALTH: HealthScore[] = ['良好', '普通', '不良', '発熱', '要受診'];
const VALID_EXCRETION: ExcretionScore[] = ['正常', '普通', '軟便', '下痢', 'なし'];
const VALID_HYDRATION: HydrationScore[] = ['十分', '普通', '少量', '拒否', '未確認'];

export function validateParseOutput(raw: unknown): RawParseOutput {
  if (!raw || typeof raw !== 'object') {
    return { confidence: 0, care_tags: [], is_incident: false, incident_keywords: [] };
  }

  const obj = raw as Record<string, unknown>;

  return {
    patient_name_in_text: typeof obj.patient_name_in_text === 'string' ? obj.patient_name_in_text : null,
    care_tags: Array.isArray(obj.care_tags) ? obj.care_tags.filter((t) => typeof t === 'string') : [],
    meal: VALID_MEAL.includes(obj.meal as MealScore) ? (obj.meal as MealScore) : null,
    health: VALID_HEALTH.includes(obj.health as HealthScore) ? (obj.health as HealthScore) : null,
    excretion: VALID_EXCRETION.includes(obj.excretion as ExcretionScore) ? (obj.excretion as ExcretionScore) : null,
    hydration: VALID_HYDRATION.includes(obj.hydration as HydrationScore) ? (obj.hydration as HydrationScore) : null,
    condition: VALID_CONDITIONS.includes(obj.condition as Condition) ? (obj.condition as Condition) : null,
    condition_detail: typeof obj.condition_detail === 'string' ? obj.condition_detail : null,
    comment: typeof obj.comment === 'string' ? obj.comment : null,
    confidence: typeof obj.confidence === 'number' ? Math.max(0, Math.min(1, obj.confidence)) : 0,
    parse_notes: typeof obj.parse_notes === 'string' ? obj.parse_notes : null,
    is_incident: typeof obj.is_incident === 'boolean' ? obj.is_incident : false,
    incident_keywords: Array.isArray(obj.incident_keywords)
      ? obj.incident_keywords.filter((k) => typeof k === 'string')
      : [],
  };
}
