/**
 * scoreFormFlex.ts
 * 利用者ごとのスコア入力フォーム Flex Message
 *
 * 動作フロー:
 *  1. スタッフが利用者名（または略称）を送信
 *  2. 前回記録をコピー（なければ「全て健康」デフォルト）してdraftを作成
 *  3. このFlexを表示 → 変化した項目だけタップ → 「記録する」で確定
 */

import {
  MealScore, HealthScore, ExcretionScore, HydrationScore,
  MEAL_OPTIONS, HEALTH_OPTIONS, EXCRETION_OPTIONS, HYDRATION_OPTIONS,
  MEAL_NEGATIVE, HEALTH_NEGATIVE, EXCRETION_NEGATIVE, HYDRATION_NEGATIVE,
} from '@/types/record';

export interface ScoreFormState {
  recordId: string;
  patientName: string;
  staffName: string;
  meal: MealScore;
  health: HealthScore;
  excretion: ExcretionScore;
  hydration: HydrationScore;
  isFromPrevious: boolean; // 前回コピーかデフォルトか
}

/** 警告スコアがあるか */
function hasWarning(state: ScoreFormState): boolean {
  return (
    MEAL_NEGATIVE.includes(state.meal) ||
    HEALTH_NEGATIVE.includes(state.health) ||
    EXCRETION_NEGATIVE.includes(state.excretion) ||
    HYDRATION_NEGATIVE.includes(state.hydration)
  );
}

/** スコアボタン1個 */
function scoreBtn(
  label: string,
  isSelected: boolean,
  isNegative: boolean,
  recordId: string,
  field: string,
  value: string,
) {
  const color = isSelected
    ? (isNegative ? '#E53E3E' : '#6BA368')
    : '#AAAAAA';
  return {
    type: 'button',
    style: isSelected ? 'primary' : 'secondary',
    color: isSelected ? color : undefined,
    height: 'sm',
    action: {
      type: 'postback',
      label,
      data: JSON.stringify({ a: 'ss', r: recordId, f: field, v: value }),
    },
    flex: 1,
    paddingAll: 'xs',
  };
}

/** スコア行（ラベル＋5ボタン） */
function scoreRow(
  icon: string,
  label: string,
  field: 'meal' | 'health' | 'excretion' | 'hydration',
  options: readonly string[],
  negatives: readonly string[],
  selected: string,
  recordId: string,
) {
  return {
    type: 'box',
    layout: 'vertical',
    spacing: 'xs',
    contents: [
      {
        type: 'text',
        text: `${icon} ${label}`,
        size: 'xs',
        weight: 'bold',
        color: '#555555',
      },
      {
        type: 'box',
        layout: 'horizontal',
        spacing: 'xs',
        contents: options.map((opt) =>
          scoreBtn(opt, opt === selected, negatives.includes(opt), recordId, field, opt)
        ),
      },
    ],
  };
}

/** フォームFlex全体を構築 */
export function buildScoreFormFlex(state: ScoreFormState) {
  const warn = hasWarning(state);
  const now = new Date();
  const dateStr = `${now.getMonth() + 1}/${now.getDate()}（${['日','月','火','水','木','金','土'][now.getDay()]}）`;
  const sourceLabel = state.isFromPrevious ? '前回コピー' : '標準テンプレート';

  return {
    type: 'flex',
    altText: `📋 ${state.patientName}さんの記録フォーム`,
    contents: {
      type: 'bubble',
      size: 'giga',
      header: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'md',
        backgroundColor: warn ? '#C53030' : '#6BA368',
        contents: [
          {
            type: 'text',
            text: `📋 ${state.patientName}さん`,
            weight: 'bold',
            size: 'lg',
            color: '#FFFFFF',
          },
          {
            type: 'text',
            text: `${dateStr}　担当: ${state.staffName}　(${sourceLabel})`,
            size: 'xxs',
            color: '#FFFFFF',
            wrap: true,
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        paddingAll: 'md',
        contents: [
          scoreRow('🍽', '食事', 'meal',      MEAL_OPTIONS,      MEAL_NEGATIVE,      state.meal,      state.recordId),
          scoreRow('💊', '健康', 'health',    HEALTH_OPTIONS,    HEALTH_NEGATIVE,    state.health,    state.recordId),
          scoreRow('🚽', '排泄', 'excretion', EXCRETION_OPTIONS, EXCRETION_NEGATIVE, state.excretion, state.recordId),
          scoreRow('💧', '水分', 'hydration', HYDRATION_OPTIONS, HYDRATION_NEGATIVE, state.hydration, state.recordId),
          {
            type: 'text',
            text: '⚠ 警告スコアは赤く表示されます',
            size: 'xxs',
            color: '#999999',
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'md',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: warn ? '#C53030' : '#6BA368',
            action: {
              type: 'postback',
              label: warn ? '⚠ この内容で記録する' : '✅ この内容で記録する',
              data: JSON.stringify({ a: 'sr', r: state.recordId }),
            },
          },
        ],
      },
    },
  };
}
