import { Alert } from '@/types/alert';
import { FlexMessage } from '@/types/flex';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

function formatDateTime(dateStr: string): string {
  return format(new Date(dateStr), 'MM/dd HH:mm', { locale: ja });
}

export function buildAlertFlex(alert: Alert & { patient_name: string }): FlexMessage {
  const severityConfig: Record<string, { color: string; label: string }> = {
    info: { color: '#3498DB', label: '情報' },
    warning: { color: '#F39C12', label: '注意' },
    critical: { color: '#E74C3C', label: '緊急' },
  };
  const config = severityConfig[alert.severity] ?? severityConfig.info;

  return {
    type: 'flex',
    altText: `[${config.label}] ${alert.message}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'horizontal',
        backgroundColor: config.color,
        paddingAll: '12px',
        contents: [
          {
            type: 'text',
            text: `[${config.label}] ${alert.patient_name}`,
            color: '#FFFFFF',
            weight: 'bold',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '16px',
        contents: [
          { type: 'text', text: alert.message, wrap: true, size: 'md' },
          {
            type: 'text',
            text: formatDateTime(alert.created_at),
            size: 'xs',
            color: '#888888',
            margin: 'md',
          },
        ],
      },
    },
  } as unknown as FlexMessage;
}
