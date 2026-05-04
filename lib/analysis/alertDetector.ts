import { createServiceClient } from '@/lib/supabase/server';
import { Alert, AlertInput } from '@/types/alert';
import { Patient } from '@/types/patient';
import { CareRecord, MEAL_NEGATIVE, HEALTH_NEGATIVE, HYDRATION_NEGATIVE } from '@/types/record';

// ─── DB アクセス ───────────────────────────────────────────────

async function getActivePatientsForFacility(facilityId: string): Promise<Patient[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('facility_id', facilityId)
    .eq('is_active', true);
  if (error) throw error;
  return (data ?? []) as Patient[];
}

async function getPatientRecordsForDate(patientId: string, date: Date): Promise<CareRecord[]> {
  const supabase = createServiceClient();
  const dateStr = date.toISOString().split('T')[0];
  const { data } = await supabase
    .from('records')
    .select('*')
    .eq('patient_id', patientId)
    .gte('recorded_at', `${dateStr}T00:00:00`)
    .lt('recorded_at',  `${dateStr}T23:59:59`)
    .eq('status', 'confirmed');
  return (data ?? []) as CareRecord[];
}

async function getRecentRecords(patientId: string, count: number): Promise<CareRecord[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('records')
    .select('*')
    .eq('patient_id', patientId)
    .eq('status', 'confirmed')
    .order('recorded_at', { ascending: false })
    .limit(count);
  return (data ?? []) as CareRecord[];
}

async function getIncidentRecordsToday(patientId: string, date: Date): Promise<CareRecord[]> {
  const supabase = createServiceClient();
  const dateStr = date.toISOString().split('T')[0];
  const { data } = await supabase
    .from('records')
    .select('*')
    .eq('patient_id', patientId)
    .eq('is_incident', true)
    .gte('recorded_at', `${dateStr}T00:00:00`)
    .lt('recorded_at',  `${dateStr}T23:59:59`);
  return (data ?? []) as CareRecord[];
}

async function saveAlertsIfNotExists(facilityId: string, alerts: AlertInput[]): Promise<Alert[]> {
  if (alerts.length === 0) return [];
  const supabase = createServiceClient();
  const today = new Date().toISOString().split('T')[0];
  const newAlerts: Alert[] = [];

  for (const alert of alerts) {
    const { data: existing } = await supabase
      .from('alerts')
      .select('id')
      .eq('facility_id', facilityId)
      .eq('patient_id', alert.patient_id)
      .eq('type', alert.type)
      .gte('created_at', `${today}T00:00:00`)
      .limit(1);

    if (!existing || existing.length === 0) {
      const { data, error } = await supabase
        .from('alerts')
        .insert({ ...alert, facility_id: facilityId })
        .select()
        .single();
      if (!error && data) newAlerts.push(data as Alert);
    }
  }
  return newAlerts;
}

// ─── スコアが「異常」かどうかの判定 ──────────────────────────

function isMealBad(r: CareRecord)      { return r.meal      != null && MEAL_NEGATIVE.includes(r.meal); }
function isHealthBad(r: CareRecord)    { return r.health    != null && HEALTH_NEGATIVE.includes(r.health); }
function isHydrationBad(r: CareRecord) { return r.hydration != null && HYDRATION_NEGATIVE.includes(r.hydration); }

/** 1件のレコードで異常スコアが何項目あるか */
function badScoreCount(r: CareRecord): number {
  let n = 0;
  if (isMealBad(r))      n++;
  if (isHealthBad(r))    n++;
  if (isHydrationBad(r)) n++;
  // 排泄は重要度高め
  if (r.excretion != null && !['正常', '普通'].includes(r.excretion)) n++;
  // 旧 condition フィールド互換
  if (r.condition != null && ['不良', '要観察'].includes(r.condition)) n++;
  return n;
}

// ─── メイン検知ロジック ───────────────────────────────────────

export async function detectAlerts(facilityId: string): Promise<Alert[]> {
  const today    = new Date();
  const alerts: AlertInput[] = [];
  const patients = await getActivePatientsForFacility(facilityId);

  for (const patient of patients) {

    // A. 本日の記録未記入
    const todayRecords = await getPatientRecordsForDate(patient.id, today);
    if (todayRecords.length === 0) {
      alerts.push({
        patient_id: patient.id,
        type:       'no_record',
        severity:   'info',
        message:    `${patient.name}：本日の記録がありません`,
      });
    }

    const recent = await getRecentRecords(patient.id, 3);
    if (recent.length === 0) continue;

    // B. 食事拒否（最新記録）
    const latest = recent[0];
    if (latest.meal === '拒否') {
      alerts.push({
        patient_id:       patient.id,
        type:             'meal_refusal',
        severity:         'warning',
        message:          `${patient.name}：食事拒否が記録されています`,
        triggered_records:[latest.id],
      });
    }

    // C. 発熱・要受診
    if (latest.health === '発熱' || latest.health === '要受診') {
      alerts.push({
        patient_id:       patient.id,
        type:             'fever',
        severity:         latest.health === '要受診' ? 'critical' : 'warning',
        message:          `${patient.name}：健康状態「${latest.health}」が報告されています`,
        triggered_records:[latest.id],
      });
    }

    // D. 複数項目同時低下（2項目以上異常）
    if (badScoreCount(latest) >= 2) {
      alerts.push({
        patient_id:       patient.id,
        type:             'condition_change',
        severity:         badScoreCount(latest) >= 3 ? 'critical' : 'warning',
        message:          `${patient.name}：複数の項目で異常が確認されました（${badScoreCount(latest)}項目）`,
        detail:           {
          meal:      latest.meal,
          health:    latest.health,
          excretion: latest.excretion,
          hydration: latest.hydration,
        },
        triggered_records:[latest.id],
      });
    }

    // E. 3回連続で異常あり → negative_streak
    if (
      recent.length >= 3 &&
      recent.every(r => badScoreCount(r) >= 1)
    ) {
      alerts.push({
        patient_id:       patient.id,
        type:             'negative_streak',
        severity:         'warning',
        message:          `${patient.name}：異常状態が3回連続で記録されています`,
        detail:           { recent_scores: recent.map(r => ({ meal: r.meal, health: r.health })) },
        triggered_records: recent.map(r => r.id),
      });
    }

    // F. インシデント（転倒等）
    const incidents = await getIncidentRecordsToday(patient.id, today);
    for (const rec of incidents) {
      alerts.push({
        patient_id:       patient.id,
        type:             'incident',
        severity:         'critical',
        message:          `${patient.name}：${rec.incident_keywords.join('・')}が報告されています`,
        triggered_records:[rec.id],
      });
    }

    // G. タグ「転倒リスク」の記録
    if (latest.care_tags?.includes('転倒リスク')) {
      alerts.push({
        patient_id: patient.id,
        type:       'incident',
        severity:   'warning',
        message:    `${patient.name}：転倒リスクのタグが記録されています`,
        triggered_records:[latest.id],
      });
    }
  }

  return await saveAlertsIfNotExists(facilityId, alerts);
}
