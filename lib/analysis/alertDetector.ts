import { createServiceClient } from '@/lib/supabase/server';
import { Alert, AlertInput } from '@/types/alert';
import { Patient } from '@/types/patient';
import { CareRecord } from '@/types/record';

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

async function getPatientRecordsForDate(
  patientId: string,
  date: Date
): Promise<CareRecord[]> {
  const supabase = createServiceClient();
  const dateStr = date.toISOString().split('T')[0];
  const { data } = await supabase
    .from('records')
    .select('*')
    .eq('patient_id', patientId)
    .gte('recorded_at', `${dateStr}T00:00:00`)
    .lt('recorded_at', `${dateStr}T23:59:59`)
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
    .not('condition', 'is', null)
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
    .lt('recorded_at', `${dateStr}T23:59:59`);
  return (data ?? []) as CareRecord[];
}

async function saveAlertsIfNotExists(
  facilityId: string,
  alerts: AlertInput[]
): Promise<Alert[]> {
  if (alerts.length === 0) return [];
  const supabase = createServiceClient();
  const today = new Date().toISOString().split('T')[0];

  const newAlerts: Alert[] = [];
  for (const alert of alerts) {
    // 当日同じタイプのアラートが既に存在するか確認
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

export async function detectAlerts(facilityId: string): Promise<Alert[]> {
  const today = new Date();
  const alerts: AlertInput[] = [];
  const patients = await getActivePatientsForFacility(facilityId);

  for (const patient of patients) {
    // A. 記録未記入検知
    const todayRecords = await getPatientRecordsForDate(patient.id, today);
    if (todayRecords.length === 0) {
      alerts.push({
        patient_id: patient.id,
        type: 'no_record',
        severity: 'info',
        message: `${patient.name}：本日の記録がありません`,
      });
    }

    // B. 3回連続ネガティブ状態
    const recentRecords = await getRecentRecords(patient.id, 3);
    const negativeConditions = ['不良', '要観察'];
    if (
      recentRecords.length >= 3 &&
      recentRecords.every((r) => negativeConditions.includes(r.condition ?? ''))
    ) {
      alerts.push({
        patient_id: patient.id,
        type: 'negative_streak',
        severity: 'warning',
        message: `${patient.name}：${recentRecords[0].condition}状態が3回連続で記録されています`,
        detail: { conditions: recentRecords.map((r) => r.condition) },
        triggered_records: recentRecords.map((r) => r.id),
      });
    }

    // C. インシデント検知
    const incidentRecords = await getIncidentRecordsToday(patient.id, today);
    for (const record of incidentRecords) {
      alerts.push({
        patient_id: patient.id,
        type: 'incident',
        severity: 'critical',
        message: `${patient.name}：${record.incident_keywords.join('・')}が報告されています`,
        triggered_records: [record.id],
      });
    }
  }

  return await saveAlertsIfNotExists(facilityId, alerts);
}
