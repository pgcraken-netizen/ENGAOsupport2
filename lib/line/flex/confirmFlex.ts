import { CareRecord } from '@/types/record';
import { FlexMessage } from '@/types/flex';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

function formatTime(dateStr: string): string {
  return format(new Date(dateStr), 'MM/dd HH:mm', { locale: ja });
}

// スコアの「要注意」判定
const BAD_MEAL = ['拒否'];
const BAD_HEALTH = ['発熱', '要受診'];
const BAD_EXCRETION = ['下痢'];
const BAD_HYDRATION = ['拒否'];

function scoreColor(value: string | null, badList: string[]): string {
  if (!value) return '#888888';
  return badList.includes(value) ? '#E74C3C' : '#27AE60';
}

function buildScoreRow(label: string, value: string | null, badList: string[]) {
  const color = scoreColor(value, badList);
  return {
    type: 'box' as const,
    layout: 'horizontal' as const,
    paddingTop: '4px',
    paddingBottom: '4px',
    contents: [
      {
        type: 'text' as const,
        text: label,
        size: 'sm' as const,
        color: '#888888',
        flex: 2,
      },
      {
        type: 'box' as const,
        layout: 'vertical' as const,
        flex: 3,
        backgroundColor: value ? (badList.includes(value) ? '#FDECEA' : '#EBF5EB') : '#F5F5F5',
        cornerRadius: '4px',
        paddingStart: '8px',
        paddingEnd: '8px',
        paddingTop: '2px',
        paddingBottom: '2px',
        contents: [
          {
            type: 'text' as const,
            text: value ?? '—',
            size: 'sm' as const,
            color,
            weight: badList.includes(value ?? '') ? 'bold' as const : 'regular' as const,
          },
        ],
      },
    ],
  };
}

function buildTagRow(tags: string[]) {
  if (tags.length === 0) return null;
  return {
    type: 'box' as const,
    layout: 'horizontal' as const,
    paddingTop: '4px',
    contents: [
      { type: 'text' as const, text: 'タグ', size: 'sm' as const, color: '#888888', flex: 2 },
      {
        type: 'box' as const,
        layout: 'horizontal' as const,
        flex: 5,
        spacing: 'xs' as const,
        flexWrap: true,
        contents: tags.map((tag) => ({
          type: 'box' as const,
          layout: 'vertical' as const,
          backgroundColor: '#FDF3E0',
          cornerRadius: '4px',
          paddingStart: '6px',
          paddingEnd: '6px',
          paddingTop: '2px',
          paddingBottom: '2px',
          contents: [
            { type: 'text' as const, text: tag, size: 'xxs' as const, color: '#B7791F' },
          ],
        })),
      },
    ],
  };
}

export function buildConfirmFlex(record: CareRecord): FlexMessage {
  const candidates = record.patient_candidates as Array<{ id: string; name: string; score: number }>;
  const topCandidate = candidates?.[0];
  const r = record as CareRecord & {
    meal?: string | null;
    health?: string | null;
    excretion?: string | null;
    hydration?: string | null;
  };

  // スコアの要注意フラグ
  const hasWarning =
    BAD_MEAL.includes(r.meal ?? '') ||
    BAD_HEALTH.includes(r.health ?? '') ||
    BAD_EXCRETION.includes(r.excretion ?? '') ||
    BAD_HYDRATION.includes(r.hydration ?? '');

  const headerColor = hasWarning ? '#C0392B' : '#6BA368';
  const statusText = hasWarning ? '⚠️ 要確認' : '✅ 記録確認';

  const tagRow = buildTagRow(record.care_tags ?? []);
  const comment = r.condition_detail ?? null;

  return {
    type: 'flex',
    altText: `記録確認: ${topCandidate?.name ?? '利用者不明'}${hasWarning ? '【要確認】' : ''}`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'horizontal',
        backgroundColor: headerColor,
        paddingAll: '14px',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            flex: 1,
            contents: [
              { type: 'text', text: statusText, color: '#FFFFFF', size: 'sm', weight: 'bold' },
              { type: 'text', text: formatTime(record.recorded_at), color: '#FFFFFF', size: 'xxs', margin: 'xs' },
            ],
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '14px',
        spacing: 'sm',
        contents: [
          // 利用者名
          {
            type: 'box',
            layout: 'horizontal',
            backgroundColor: '#F5F5F5',
            cornerRadius: '6px',
            paddingAll: '10px',
            contents: [
              { type: 'text', text: '👤', size: 'md', flex: 0 },
              {
                type: 'box',
                layout: 'vertical',
                flex: 1,
                paddingStart: '8px',
                contents: [
                  { type: 'text', text: topCandidate?.name ?? '利用者を確認してください', size: 'md',
                    weight: 'bold', color: topCandidate ? '#333333' : '#E74C3C', wrap: true },
                  { type: 'text', text: `担当: ${record.line_display_name ?? '—'}`, size: 'xxs', color: '#888888', margin: 'xs' },
                ],
              },
            ],
          },
          // 仕切り
          { type: 'separator', margin: 'sm' },
          // 4スコア
          buildScoreRow('🍽 食事', r.meal ?? null, BAD_MEAL),
          buildScoreRow('💊 健康', r.health ?? null, BAD_HEALTH),
          buildScoreRow('🚽 排泄', r.excretion ?? null, BAD_EXCRETION),
          buildScoreRow('💧 水分', r.hydration ?? null, BAD_HYDRATION),
          // タグ（あれば）
          ...(tagRow ? [{ type: 'separator' as const, margin: 'sm' }, tagRow] : []),
          // コメント（あれば）
          ...(comment ? [{
            type: 'box' as const,
            layout: 'vertical' as const,
            backgroundColor: '#FFFBF0',
            cornerRadius: '6px',
            paddingAll: '8px',
            margin: 'sm',
            contents: [
              { type: 'text' as const, text: '📝 ' + comment, size: 'sm' as const, color: '#555555', wrap: true },
            ],
          }] : []),
          // 元テキスト
          { type: 'separator' as const, margin: 'sm' },
          {
            type: 'box' as const,
            layout: 'vertical' as const,
            contents: [
              { type: 'text' as const, text: record.original_text, size: 'xxs' as const, color: '#AAAAAA', wrap: true },
            ],
          },
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
            color: headerColor,
            height: 'sm',
            flex: 2,
          },
        ],
      },
    },
  } as unknown as FlexMessage;
}
