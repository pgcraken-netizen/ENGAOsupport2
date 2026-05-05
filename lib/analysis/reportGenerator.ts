import OpenAI from 'openai';
import { createServiceClient } from '@/lib/supabase/server';
import { REPORT_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { CareRecord } from '@/types/record';

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function generateDailyReport(facilityId: string, reportDate: string, shift = 'all') {
  const supabase = createServiceClient();

  // その日の確定済み記録を取得
  const { data: records } = await supabase
    .from('records')
    .select(`
      *,
      patient:patients(id, name, room_number),
      staff:staff!records_staff_id_fkey(id, name)
    `)
    .eq('facility_id', facilityId)
    .eq('status', 'confirmed')
    .gte('recorded_at', `${reportDate}T00:00:00`)
    .lt('recorded_at', `${reportDate}T23:59:59`)
    .order('recorded_at');

  if (!records || records.length === 0) {
    return { summary: '本日の記録はありません', items: [], notes: null };
  }

  // 利用者別にグループ化
  const grouped = (records as CareRecord[]).reduce<Record<string, CareRecord[]>>((acc, r) => {
    const name = r.patient?.name ?? '不明';
    if (!acc[name]) acc[name] = [];
    acc[name].push(r);
    return acc;
  }, {});

  const summaryText = Object.entries(grouped)
    .map(([name, recs]) => {
      const tags = Array.from(new Set(recs.flatMap((r) => r.care_tags))).join('、');
      const condition = recs[recs.length - 1]?.condition ?? '未記録';
      const incidents = recs.filter((r) => r.is_incident);
      return `${name}（${tags}、状態: ${condition}${incidents.length > 0 ? '、インシデントあり' : ''}）`;
    })
    .join('\n');

  try {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o',
      messages: [
        { role: 'system', content: REPORT_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `以下の当日記録サマリーから申し送りを生成してください:\n${summaryText}`,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content ?? '{}';
    return JSON.parse(content);
  } catch (err) {
    console.error('[Report generation error]', err);
    return {
      summary: `本日${Object.keys(grouped).length}名の記録があります`,
      items: Object.entries(grouped).map(([name, recs]) => ({
        patient_name: name,
        priority: recs.some((r) => r.is_incident) ? 'urgent' : 'normal',
        text: recs.map((r) => r.condition_detail ?? r.care_tags.join('・')).join('。'),
      })),
      notes: null,
    };
  }
}
