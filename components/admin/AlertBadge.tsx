import { Alert } from '@/types/alert';
import { formatRelative } from '@/lib/utils/dateUtils';
import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';

interface AlertBadgeProps {
  alert: Alert;
  onResolve?: (id: string) => void;
}

const severityConfig = {
  info: {
    icon: Info,
    color: 'text-yellow-700',
    bg: 'bg-yellow-50 border-yellow-200',
    label: '観察',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-orange-700',
    bg: 'bg-orange-50 border-orange-200',
    label: '注意',
  },
  critical: {
    icon: ShieldAlert,
    color: 'text-red-700',
    bg: 'bg-red-50 border-red-200',
    label: '警告',
  },
};

export function AlertBadge({ alert, onResolve }: AlertBadgeProps) {
  const config = severityConfig[alert.severity] ?? severityConfig.info;
  const Icon = config.icon;

  return (
    <div className={`border rounded-xl p-3 flex items-start gap-3 ${config.bg} ${alert.is_resolved ? 'opacity-50' : ''}`}>
      <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${config.color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold ${config.color}`}>{config.label}</span>
          {alert.patient && (
            <span className="text-xs text-engao-sub font-medium">{alert.patient.name}</span>
          )}
          {alert.is_resolved && (
            <span className="text-xs text-engao-sub">（解決済）</span>
          )}
        </div>
        <p className="text-sm text-engao-text mt-0.5">{alert.message}</p>
        <p className="text-xs text-engao-sub mt-1">{formatRelative(alert.created_at)}</p>
      </div>
      {onResolve && !alert.is_resolved && (
        <button
          onClick={() => onResolve(alert.id)}
          className="text-xs text-engao-sub hover:text-engao-text underline flex-shrink-0 mt-0.5"
        >
          解決
        </button>
      )}
    </div>
  );
}
