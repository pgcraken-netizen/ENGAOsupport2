import OpenAI from 'openai';
import { Patient } from '@/types/patient';
import { ParseResult, PatientCandidate } from '@/types/record';
import { buildParseUserPrompt, PARSE_SYSTEM_PROMPT } from './prompts';
import { validateParseOutput } from './validator';
import { createServiceClient } from '@/lib/supabase/server';

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

// 簡易文字列類似度（Jaccard係数ベース）
function calculateSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;

  // 部分一致チェック
  if (a.includes(b) || b.includes(a)) return 0.9;

  const setA = new Set(a.split(''));
  const setB = new Set(b.split(''));
  const arrA = Array.from(setA);
  const intersection = arrA.filter((c) => setB.has(c)).length;
  const union = new Set(Array.from(setA).concat(Array.from(setB))).size;
  return union === 0 ? 0 : intersection / union;
}

export function resolvePatient(
  nameInText: string | null,
  patients: Patient[]
): PatientCandidate[] {
  if (!nameInText) return [];

  return patients
    .map((patient) => {
      const allNames = [patient.name, patient.name_kana, ...patient.aliases].filter(Boolean) as string[];
      const score = Math.max(...allNames.map((name) => calculateSimilarity(nameInText, name)));
      return { id: patient.id, name: patient.name, score };
    })
    .filter((p) => p.score > 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

export async function getActivePatientsForFacility(facilityId: string): Promise<Patient[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('facility_id', facilityId)
    .eq('is_active', true);
  if (error) throw error;
  return (data ?? []) as Patient[];
}

export async function getCareTagsForFacility(facilityId: string): Promise<string[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('care_tag_master')
    .select('name')
    .or(`facility_id.is.null,facility_id.eq.${facilityId}`)
    .eq('is_active', true)
    .order('display_order');
  return (data ?? []).map((d: { name: string }) => d.name);
}

export async function parseRecord(
  text: string,
  facilityId: string
): Promise<ParseResult> {
  const [patients, careTags] = await Promise.all([
    getActivePatientsForFacility(facilityId),
    getCareTagsForFacility(facilityId),
  ]);

  const openai = getOpenAI();

  let rawOutput: Record<string, unknown> = {};

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o',
      messages: [
        { role: 'system', content: PARSE_SYSTEM_PROMPT },
        { role: 'user', content: buildParseUserPrompt(text, patients, careTags) },
      ],
      temperature: 0,
      response_format: { type: 'json_object' },
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content ?? '{}';
    rawOutput = JSON.parse(content);
  } catch (err) {
    console.error('[AI parse error]', err);
    // AIが失敗してもフォールバックで続行
  }

  const validated = validateParseOutput(rawOutput);
  const patientCandidates = resolvePatient(validated.patient_name_in_text ?? null, patients);

  return {
    patient_name_in_text: validated.patient_name_in_text ?? null,
    patient_candidates: patientCandidates,
    care_tags: validated.care_tags ?? [],
    condition: (validated.condition ?? null) as import('@/types/record').Condition | null,
    condition_detail: validated.condition_detail ?? null,
    confidence: validated.confidence ?? 0,
    is_incident: validated.is_incident ?? false,
    incident_keywords: validated.incident_keywords ?? [],
    parse_notes: validated.parse_notes ?? null,
    ai_raw_output: rawOutput,
  };
}
