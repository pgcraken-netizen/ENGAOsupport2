import { format, formatDistance } from 'date-fns';
import { ja } from 'date-fns/locale';

export function formatDateTime(dateStr: string): string {
  return format(new Date(dateStr), 'yyyy/MM/dd HH:mm', { locale: ja });
}

export function formatDate(dateStr: string): string {
  return format(new Date(dateStr), 'yyyy/MM/dd', { locale: ja });
}

export function formatTime(dateStr: string): string {
  return format(new Date(dateStr), 'HH:mm', { locale: ja });
}

export function formatRelative(dateStr: string): string {
  return formatDistance(new Date(dateStr), new Date(), { addSuffix: true, locale: ja });
}

export function todayString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}
