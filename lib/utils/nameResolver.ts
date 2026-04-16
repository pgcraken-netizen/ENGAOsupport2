import { Patient } from '@/types/patient';

/**
 * 表示名 or LINE display_name から施設スタッフを特定するユーティリティ
 */
export function formatPatientLabel(patient: Pick<Patient, 'name' | 'room_number' | 'care_level'>): string {
  const parts = [patient.name];
  if (patient.room_number) parts.push(`${patient.room_number}号室`);
  if (patient.care_level) parts.push(`要介護${patient.care_level}`);
  return parts.join(' · ');
}

/**
 * エイリアス含む全名称リストを返す
 */
export function getAllNames(patient: Pick<Patient, 'name' | 'name_kana' | 'aliases'>): string[] {
  return [patient.name, patient.name_kana, ...patient.aliases].filter(Boolean) as string[];
}
