import { AlertSeverity, AlertType } from './record';

export interface Alert {
  id: string;
  facility_id: string;
  patient_id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  detail: Record<string, unknown>;
  is_read: boolean;
  is_resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  triggered_records: string[] | null;
  created_at: string;
  // joined
  patient?: { id: string; name: string } | null;
}

export interface AlertInput {
  patient_id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  detail?: Record<string, unknown>;
  triggered_records?: string[];
}
