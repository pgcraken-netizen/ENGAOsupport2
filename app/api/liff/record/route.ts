import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { messagingApi } from '@line/bot-sdk';

export const runtime = 'nodejs';

// LINE push通知（グループIDが施設に保存されていれば送信）
async function notifyGroup(
  facilityId: string,
  patientName: string,
  staffName: string,
  meal: string, health: string, excretion: string, hydration: string,
  comment: string | null,
  action: 'created' | 'updated',
) {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!accessToken) return;

  const supabase = createServiceClient();
  const { data: facility } = await supabase
    .from('facilities')
    .select('line_group_id')
    .eq('id', facilityId)
    .maybeSingle();

  const groupId = facility?.line_group_id;
  if (!groupId) return;  // グループ未設定はスキップ

  const isWarning =
    ['少量','拒否'].includes(meal) ||
    ['不良','発熱','要受診'].includes(health) ||
    ['軟便','下痢','なし'].includes(excretion) ||
    ['少量','拒否'].includes(hydration);

  const emoji  = isWarning ? '⚠️' : '✅';
  const label  = action === 'updated' ? '（本日分を更新）' : '';
  const scores = `🍽 食事: ${meal}　💊 健康: ${health}\n🚽 排泄: ${excretion}　💧 水分: ${hydration}`;
  const text   = `${emoji} ${patientName}さんの記録 ${label}\n担当: ${staffName}\n\n${scores}${comment ? `\n📝 ${comment}` : ''}`;

  try {
    const client = new messagingApi.MessagingApiClient({ channelAccessToken: accessToken });
    await client.pushMessage({ to: groupId, messages: [{ type: 'text', text }] });
    console.log('[liff/record] group notified:', groupId);
  } catch (err) {
    console.error('[liff/record] group notify failed:', err);
    // 通知失敗は無視（記録自体は成功）
  }
}

// POST /api/liff/record
export async function POST(request: NextRequest) {
  let body: {
    lineUserId: string;
    displayName: string;
    facilityId: string;
    staffId?: string | null;
    patientId: string;
    meal: string;
    health: string;
    excretion: string;
    hydration: string;
    comment?: string | null;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const { lineUserId, displayName, facilityId, staffId, patientId, meal, health, excretion, hydration, comment } = body;

  if (!lineUserId || !facilityId || !patientId || !meal || !health || !excretion || !hydration) {
    return NextResponse.json({ error: 'missing required fields' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // 利用者名を取得（通知用）
  const { data: patient } = await supabase
    .from('patients')
    .select('name')
    .eq('id', patientId)
    .maybeSingle();
  const patientName = patient?.name ?? '不明';

  // 当日 (0時〜) の既存記録を検索（上書きのため）
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: existing } = await supabase
    .from('records')
    .select('id')
    .eq('patient_id', patientId)
    .eq('facility_id', facilityId)
    .gte('recorded_at', todayStart.toISOString())
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const now = new Date().toISOString();
  let recordId: string;
  let action: 'created' | 'updated';

  if (existing) {
    // 当日分が既存 → 上書き
    const { error } = await supabase
      .from('records')
      .update({
        meal, health, excretion, hydration,
        comment:           comment ?? null,
        status:            'confirmed',
        line_user_id:      lineUserId,
        line_display_name: displayName,
        staff_id:          staffId ?? null,
        confirmed_at:      now,
        updated_at:        now,
      })
      .eq('id', existing.id);

    if (error) {
      console.error('[liff/record] update error:', JSON.stringify(error));
      return NextResponse.json({ error: 'update failed', detail: error.message, code: error.code }, { status: 500 });
    }
    recordId = existing.id;
    action   = 'updated';
  } else {
    // 新規作成
    const { data: created, error: insertError } = await supabase
      .from('records')
      .insert({
        facility_id:        facilityId,
        patient_id:         patientId,
        staff_id:           staffId ?? null,
        line_user_id:       lineUserId,
        line_display_name:  displayName,
        status:             'confirmed',
        meal, health, excretion, hydration,
        comment:            comment ?? null,
        original_text:      `[LIFF] ${meal}/${health}/${excretion}/${hydration}`,
        recorded_at:        now,
        confirmed_at:       now,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[liff/record] insert error:', JSON.stringify(insertError));
      return NextResponse.json({ error: 'insert failed', detail: insertError.message, code: insertError.code }, { status: 500 });
    }
    recordId = created.id;
    action   = 'created';
  }

  // グループ通知（非同期・失敗無視）
  notifyGroup(facilityId, patientName, displayName, meal, health, excretion, hydration, comment ?? null, action)
    .catch(e => console.error('[liff/record] notify error:', e));

  return NextResponse.json({ success: true, recordId, action });
}
