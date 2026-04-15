import { Alert } from '@/types/alert';
import { formatRelative } from '@/lib/utils/dateUtils';
import { AlertTriangle, Info, XCircle } from 'lucide-react';

interface AlertBadgeProps {
  alert: Alert;
  onResolve?: (id: string) => void;
}

const severityConfig = {
  info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', label: '情報' },
  warning: { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200', label: '注意' },
  critical: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200', label: '緊急' },
};

export function AlertBadge({ alert, onResolve }: AlertBadgeProps) {
  const config = severityConfig[alert.severity] ?? severityConfig.info;
  const Icon = config.icon;

  return (
    <div className={`border rounded-lg p-3 flex items-start gap-3 ${config.bg}`}>
      <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${config.color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
          <span className="text-xs text-gray-400">
            {alert.patient ? alert.patient.name : ''}
          </span>
        </div>
        <p className="text-sm text-gray-800 mt-0.5">{alert.message}</p>
        <p className="text-xs text-gray-400 mt-1">{formatRelative(alert.created_at)}</p>
      </div>
      {onResolve && !alert.is_resolved && (
        <button
          onClick={() => onResolve(alert.id)}
          className="text-xs text-gray-500 hover:text-gray-700 underline flex-shrink-0"
        >
          解決済に
        </button>
      )}
    </div>
  );
}
