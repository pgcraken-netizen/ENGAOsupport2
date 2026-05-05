import { NextRequest, NextResponse } from 'next/server';
import { verifyLineSignature } from '@/lib/line/verify';
import { createServiceClient } from '@/lib/supabase/server';
import { parseRecord } from '@/lib/ai/parser';
import { buildConfirmFlex } from '@/lib/line/flex/confirmFlex';
import { buildEditMenuFlex, buildPatientSelectFlex, buildConditionSelectFlex } from '@/lib/line/flex/editFlex';
import { replyWithFallback, getLineClient } from '@/lib/line/client';
import { CareRecord } from '@/types/record';
import { Patient } from '@/types/patient';

export const runtime = 'nodejs';

interface LineTextMessage {
  type: 'message';
  replyToken: string;
  source: { userId: string; type: string };
  message: { type: 'text'; id: string; text: string };
}

interface LinePostbackEvent {
  type: 'postback';
  replyToken: string;
  source: { userId: string; type: string };
  postback: { data: string };
}

interface LineFollowEvent {
  type: 'follow';
  replyToken: string;
  source: { userId: string };
}

type LineEvent = LineTextMessage | LinePostbackEvent | LineFollowEvent;

async function resolveStaff(lineUserId: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('staff')
    .select('*')
    .eq('line_user_id', lineUserId)
    .single();
  return data;
}

async function getDefaultFacilityId(): Promise<string | null> {
  const supabase = createServiceClient();
  const { data } = await supabase.from('facilities').select('id').limit(1).single();
  return data?.id ?? null;
}

async function handleTextMessage(event: LineTextMessage) {
  const { replyToken, source, message } = event;
  const lineUserId = source.userId;
  const text = message.text;

  // 10文字未満は無視
  if (text.length < 10) return;

  // コマンド判定
  if (text === '未確定' || text === '申し送り') {
    await replyWithFallback(replyToken, lineUserId, {
      type: 'text',
      text: '管理画面からご確認ください。',
    });
    return;
  }

  const supabase = createServiceClient();

  // スタッフ・施設特定
  const staff = await resolveStaff(lineUserId);
  const facilityId = staff?.facility_id ?? (await getDefaultFacilityId());
  if (!facilityId) {
    await replyWithFallback(replyToken, lineUserId, {
      type: 'text',
      text: 'システムエラーが発生しました。管理者にお問い合わせください。',
    });
    return;
  }

  // LINEプロファイル取得（名前）
  let displayName = staff?.name ?? null;
  try {
    const client = getLineClient();
    const profile = await client.getProfile(lineUserId);
    displayName = displayName ?? profile.displayName;
  } catch {
    // プロファイル取得失敗は無視
  }

  // AI構造化処理（5段階スコア含む）
  const parseResult = await parseRecord(text, facilityId).catch(() => ({
    patient_name_in_text: null,
    patient_candidates: [],
    care_tags: [],
    meal: null,
    health: null,
    excretion: null,
    hydration: null,
    condition: null,
    condition_detail: null,
    confidence: 0,
    is_incident: false,
    incident_keywords: [],
    parse_notes: null,
    ai_raw_output: {},
  }));

  // draft保存
  const { data: record, error } = await supabase
    .from('records')
    .insert({
      facility_id: facilityId,
      status: 'draft',
      staff_id: staff?.id ?? null,
      line_user_id: lineUserId,
      line_display_name: displayName,
      patient_id: null,
      patient_candidates: parseResult.patient_candidates,
      care_tags: parseResult.care_tags,
      meal: parseResult.meal ?? null,
      health: parseResult.health ?? null,
      excretion: parseResult.excretion ?? null,
      hydration: parseResult.hydration ?? null,
      condition: parseResult.condition,
      condition_detail: parseResult.condition_detail,
      original_text: text,
      confidence: parseResult.confidence,
      ai_raw_output: parseResult.ai_raw_output,
      is_incident: parseResult.is_incident,
      incident_keywords: parseResult.incident_keywords,
      line_message_id: message.id,
      recorded_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !record) {
    console.error('[DB insert error]', error);
    await replyWithFallback(replyToken, lineUserId, {
      type: 'text',
      text: '記録の保存に失敗しました。もう一度お試しください。',
    });
    return;
  }

  // Flex Message送信（5スコア入り）
  const flex = buildConfirmFlex(record as CareRecord);
  await replyWithFallback(replyToken, lineUserId, flex as unknown as Parameters<typeof replyWithFallback>[2]);
}

async function handlePostback(event: LinePostbackEvent) {
  const { replyToken, source, postback } = event;
  const lineUserId = source.userId;

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(postback.data);
  } catch {
    return;
  }

  const supabase = createServiceClient();
  const action = data.action as string;
  const recordId = data.record_id as string;

  switch (action) {
    case 'confirm': {
      const patientId = data.patient_id as string | null;
      await supabase
        .from('records')
        .update({
          status: 'confirmed',
          patient_id: patientId,
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', recordId);
      await replyWithFallback(replyToken, lineUserId, {
        type: 'text',
        text: '✅ 記録を確定しました。',
      });
      break;
    }

    case 'edit_open': {
      const flex = buildEditMenuFlex(recordId);
      await replyWithFallback(replyToken, lineUserId, flex as unknown as Parameters<typeof replyWithFallback>[2]);
      break;
    }

    case 'edit_patient': {
      const { data: facilityData } = await supabase
        .from('records')
        .select('facility_id')
        .eq('id', recordId)
        .single();
      const facilityId = facilityData?.facility_id as string;
      const { data: patients } = await supabase
        .from('patients')
        .select('*')
        .eq('facility_id', facilityId)
        .eq('is_active', true)
        .order('name');
      const flex = buildPatientSelectFlex(recordId, (patients ?? []) as Patient[]);
      await replyWithFallback(replyToken, lineUserId, flex as unknown as Parameters<typeof replyWithFallback>[2]);
      break;
    }

    case 'edit_patient_confirm': {
      const patientId = data.patient_id as string;
      await supabase
        .from('records')
        .update({ patient_id: patientId, updated_at: new Date().toISOString() })
        .eq('id', recordId);
      const { data: updated } = await supabase
        .from('records')
        .select('*')
        .eq('id', recordId)
        .single();
      if (updated) {
        const flex = buildConfirmFlex(updated as CareRecord);
        await replyWithFallback(replyToken, lineUserId, flex as unknown as Parameters<typeof replyWithFallback>[2]);
      }
      break;
    }

    case 'edit_condition': {
      const flex = buildConditionSelectFlex(recordId);
      await replyWithFallback(replyToken, lineUserId, flex as unknown as Parameters<typeof replyWithFallback>[2]);
      break;
    }

    case 'edit_condition_confirm': {
      const condition = data.condition as string;
      await supabase
        .from('records')
        .update({ condition, updated_at: new Date().toISOString() })
        .eq('id', recordId);
      const { data: updated } = await supabase
        .from('records')
        .select('*')
        .eq('id', recordId)
        .single();
      if (updated) {
        const flex = buildConfirmFlex(updated as CareRecord);
        await replyWithFallback(replyToken, lineUserId, flex as unknown as Parameters<typeof replyWithFallback>[2]);
      }
      break;
    }
  }
}

async function handleFollow(event: LineFollowEvent) {
  const { replyToken, source } = event;
  await replyWithFallback(replyToken, source.userId, {
    type: 'text',
    text: 'えんがおサポートへようこそ！\n\nLINEグループに介護記録を投稿するだけで自動整理します。\n\n例）\n「小高さん 食事8割 体調良好 排泄正常 水分普通 特変なし」\n\nAIが内容を読み取り、確認メッセージをお送りします。',
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const signature = request.headers.get('x-line-signature');
  if (!signature) {
    return new NextResponse('Missing signature', { status: 401 });
  }

  const body = await request.text();
  const isValid = verifyLineSignature(body, signature, process.env.LINE_CHANNEL_SECRET ?? '');
  if (!isValid) {
    return new NextResponse('Invalid signature', { status: 401 });
  }

  let payload: { events: LineEvent[] };
  try {
    payload = JSON.parse(body);
  } catch {
    return new NextResponse('Invalid JSON', { status: 400 });
  }

  for (const event of payload.events ?? []) {
    try {
      if (event.type === 'message' && (event as LineTextMessage).message?.type === 'text') {
        await handleTextMessage(event as LineTextMessage);
      } else if (event.type === 'postback') {
        await handlePostback(event as LinePostbackEvent);
      } else if (event.type === 'follow') {
        await handleFollow(event as LineFollowEvent);
      }
    } catch (err) {
      console.error('[Event handling error]', err);
    }
  }

  return new NextResponse('OK', { status: 200 });
}
