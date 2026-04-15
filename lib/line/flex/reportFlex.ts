import { FlexMessage } from '@/types/flex';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface ReportItem {
  patient_name: string;
  priority: 'normal' | 'attention' | 'urgent';
  text: string;
}

interface ReportData {
  summary: string;
  items: ReportItem[];
  notes?: string;
  report_date: string;
  shift: string;
}

const shiftLabel: Record<string, string> = {
  morning: '日勤',
  afternoon: '準夜勤',
  night: '夜勤',
  all: '全シフト',
};

const priorityColor: Record<string, string> = {
  normal: '#333333',
  attention: '#F39C12',
  urgent: '#E74C3C',
};

export function buildReportFlex(report: ReportData): FlexMessage {
  const dateLabel = format(new Date(report.report_date), 'M月d日', { locale: ja });
  const shift = shiftLabel[report.shift] ?? report.shift;

  return {
    type: 'flex',
    altText: `${dateLabel} ${shift} 申し送り`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#2C3E50',
        paddingAll: '14px',
        contents: [
          { type: 'text', text: `${dateLabel} ${shift} 申し送り`, color: '#FFFFFF', weight: 'bold', size: 'md' },
          { type: 'text', text: report.summary, color: '#BDC3C7', size: 'xs', wrap: true, margin: 'sm' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '14px',
        spacing: 'md',
        contents: report.items.map((item) => ({
          type: 'box',
          layout: 'vertical',
          spacing: 'xs',
          contents: [
            {
              type: 'text',
              text: item.patient_name,
              weight: 'bold',
              size: 'sm',
              color: priorityColor[item.priority] ?? '#333333',
            },
            { type: 'text', text: item.text, size: 'sm', wrap: true, color: '#555555' },
          ],
        })),
      },
      ...(report.notes
        ? {
            footer: {
              type: 'box',
              layout: 'vertical',
              backgroundColor: '#F5F5F5',
              paddingAll: '12px',
              contents: [
                { type: 'text', text: '注記', size: 'xs', color: '#888888' },
                { type: 'text', text: report.notes, size: 'sm', wrap: true },
              ],
            },
          }
        : {}),
    },
  } as unknown as FlexMessage;
}
