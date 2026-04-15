import { FlexMessage } from '@/types/flex';
import { Patient } from '@/types/patient';

export function buildEditMenuFlex(recordId: string): FlexMessage {
  return {
    type: 'flex',
    altText: '修正項目を選択してください',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#E67E22',
        paddingAll: '12px',
        contents: [
          { type: 'text', text: '何を修正しますか？', color: '#FFFFFF', weight: 'bold' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        paddingAll: '12px',
        contents: [
          {
            type: 'button',
            action: {
              type: 'postback',
              label: '利用者を変更',
              data: JSON.stringify({ action: 'edit_patient', record_id: recordId }),
            },
            style: 'secondary',
            height: 'sm',
          },
          {
            type: 'button',
            action: {
              type: 'postback',
              label: '状態を変更',
              data: JSON.stringify({ action: 'edit_condition', record_id: recordId }),
            },
            style: 'secondary',
            height: 'sm',
          },
        ],
      },
    },
  } as unknown as FlexMessage;
}

export function buildPatientSelectFlex(recordId: string, patients: Patient[]): FlexMessage {
  return {
    type: 'flex',
    altText: '利用者を選択してください',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#E67E22',
        paddingAll: '12px',
        contents: [
          { type: 'text', text: '利用者を選択', color: '#FFFFFF', weight: 'bold' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        paddingAll: '12px',
        contents: patients.map((patient) => ({
          type: 'button',
          action: {
            type: 'postback',
            label: `${patient.name}（${patient.room_number ?? '部屋未設定'}）`,
            data: JSON.stringify({
              action: 'edit_patient_confirm',
              record_id: recordId,
              patient_id: patient.id,
            }),
          },
          style: 'secondary',
          height: 'sm',
        })),
      },
    },
  } as unknown as FlexMessage;
}

export function buildConditionSelectFlex(recordId: string): FlexMessage {
  const conditions = [
    { label: '良好', value: '良好' },
    { label: '普通', value: '普通' },
    { label: '不良', value: '不良' },
    { label: '要観察', value: '要観察' },
  ];

  return {
    type: 'flex',
    altText: '状態を選択してください',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        paddingAll: '12px',
        contents: [
          { type: 'text', text: '状態を選択', weight: 'bold', size: 'md', margin: 'md' },
          ...conditions.map((c) => ({
            type: 'button',
            action: {
              type: 'postback',
              label: c.label,
              data: JSON.stringify({
                action: 'edit_condition_confirm',
                record_id: recordId,
                condition: c.value,
              }),
            },
            style: 'secondary',
            height: 'sm',
          })),
        ],
      },
    },
  } as unknown as FlexMessage;
}
