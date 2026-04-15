import { CareRecord } from '@/types/record';
import { FlexMessage } from '@/types/flex';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

function formatTime(dateStr: string): string {
  return format(new Date(dateStr), 'MM/dd HH:mm', { locale: ja });
}

function buildInfoRow(label: string, value: string, valueColor = '#333333') {
  return {
    type: 'box' as const,
    layout: 'horizontal' as const,
    contents: [
      { type: 'text' as const, text: label, size: 'sm' as const, color: '#888888', flex: 2 },
      { type: 'text' as const, text: value || '未設定', size: 'sm' as const, color: valueColor, flex: 5, wrap: true },
    ],
  };
}

function buildTagRow(label: string, tags: string[]) {
  return {
    type: 'box' as const,
    layout: 'horizontal' as const,
    contents: [
      { type: 'text' as const, text: label, size: 'sm' as const, color: '#888888', flex: 2 },
      {
        type: 'box' as const,
        layout: 'horizontal' as const,
        flex: 5,
        spacing: 'xs' as const,
        contents:
          tags.length > 0
            ? tags.map((tag) => ({
                type: 'box' as const,
                layout: 'vertical' as const,
                backgroundColor: '#EBF4FF',
                cornerRadius: '4px',
                paddingStart: '6px',
                paddingEnd: '6px',
                paddingTop: '2px',
                paddingBottom: '2px',
                contents: [
                  { type: 'text' as const, text: tag, size: 'xxs' as const, color: '#1A56DB' },
                ],
              }))
            : [{ type: 'text' as const, text: '未設定', size: 'sm' as const, color: '#888888' }],
      },
    ],
  };
}

function buildConditionRow(condition: string | null) {
  const conditionMap: Record<string, string> = {
    良好: '#27AE60',
    普通: '#F39C12',
    不良: '#E74C3C',
    要観察: '#8E44AD',
  };
  const color = condition ? (conditionMap[condition] || '#888888') : '#888888';
  return buildInfoRow('状態', condition || '未設定', color);
}

export function buildConfirmFlex(record: CareRecord): FlexMessage {
  const confidenceColor = record.confidence >= 0.8 ? '#27AE60' : '#F39C12';
  const confidenceLabel = record.confidence >= 0.8 ? '高精度' : '要確認';
  const candidates = record.patient_candidates as Array<{ id: string; name: string; score: number }>;
  const topCandidate = candidates?.[0];

  return {
    type: 'flex',
    altText: `記録確認: ${topCandidate?.name ?? '利用者不明'}`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'horizontal',
        backgroundColor: '#1A56DB',
        paddingAll: '16px',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            flex: 1,
            contents: [
              { type: 'text', text: '記録確認', color: '#FFFFFF', size: 'xs', weight: 'bold' },
              { type: 'text', text: formatTime(record.recorded_at), color: '#BFD7FF', size: 'xxs' },
            ],
          },
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: confidenceLabel, color: confidenceColor, size: 'xxs', align: 'end' },
            ],
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '16px',
        spacing: 'md',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#F5F5F5',
            cornerRadius: '8px',
            paddingAll: '10px',
            contents: [
              { type: 'text', text: '元の投稿', size: 'xxs', color: '#888888' },
              { type: 'text', text: record.original_text, size: 'sm', color: '#333333', wrap: true },
            ],
          },
          buildInfoRow(
            '利用者',
            topCandidate?.name ?? '未特定',
            topCandidate ? '#333333' : '#E53E3E'
          ),
          buildInfoRow('担当', record.line_display_name ?? '取得中'),
          buildTagRow('ケア', record.care_tags),
          buildConditionRow(record.condition),
        ],
      },
      footer: {
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        paddingAll: '12px',
        contents: [
          {
            type: 'button',
            action: {
              type: 'postback',
              label: '修正',
              data: JSON.stringify({ action: 'edit_open', record_id: record.id }),
            },
            style: 'secondary',
            height: 'sm',
            flex: 1,
          },
          {
            type: 'button',
            action: {
              type: 'postback',
              label: 'この内容で記録',
              data: JSON.stringify({
                action: 'confirm',
                record_id: record.id,
                patient_id: topCandidate?.id ?? null,
              }),
            },
            style: 'primary',
            color: '#1A56DB',
            height: 'sm',
            flex: 2,
          },
        ],
      },
    },
  } as unknown as FlexMessage;
}
