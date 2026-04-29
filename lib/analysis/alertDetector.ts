import { createServiceClient } from '@/lib/supabase/server';
import { Alert, AlertInput } from '@/types/alert';
import { Patient } from '@/types/patient';
import { CareRecord, isAnomaly, AlertLevel } from '@/types/record';

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

    // B. 5段階評価ベースの連続異常検知
    const recentRecords = await getRecentRecords(patient.id, 3);

    let consecutiveAnomaly = 0;
    for (const rec of recentRecords) {
      const hasAnomaly = isAnomaly(rec.meal, rec.health, rec.excretion, rec.hydration)
        || ['不良', '要観察'].includes(rec.condition ?? '');
      if (hasAnomaly) consecutiveAnomaly++;
      else break;
    }

    const alertLevel: AlertLevel =
      consecutiveAnomaly >= 3 ? '警告' :
      consecutiveAnomaly >= 2 ? '注意' :
      consecutiveAnomaly >= 1 ? '観察' : '正常';

    if (alertLevel !== '正常' && recentRecords.length > 0) {
      const severity = alertLevel === '警告' ? 'critical' : alertLevel === '注意' ? 'warning' : 'info';
      alerts.push({
        patient_id: patient.id,
        type: 'negative_streak',
        severity,
        message: `${patient.name}：${consecutiveAnomaly}回連続で異常が記録されています（${alertLevel}）`,
        detail: { streak: consecutiveAnomaly, alertLevel },
        triggered_records: recentRecords.slice(0, consecutiveAnomaly).map(r => r.id),
      });
    }

    // C. インシデント検知
    const incidentRecords = await getIncidentRecordsToday(patient.id, today);
    for (const record of incidentRecords) {
      if (record.incident_keywords?.length) {
        alerts.push({
          patient_id: patient.id,
          type: 'incident',
          severity: 'critical',
          message: `${patient.name}：${record.incident_keywords.join('・')}が報告されています`,
          triggered_records: [record.id],
        });
      }
    }
  }

  return await saveAlertsIfNotExists(facilityId, alerts);
}
