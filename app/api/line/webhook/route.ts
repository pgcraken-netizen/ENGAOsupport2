/**
 * LINE Webhook - 完全リライト
 *
 * 重複除去の仕組み:
 *   records テーブルの line_message_id カラムに UNIQUE インデックスを付与。
 *   テキストメッセージ受信時、line_message_id を含む INSERT を即座に実行。
 *   → 成功: 新規メッセージ → 処理継続
 *   → UNIQUE違反(23505): LINEのリトライ/重複 → 即座に 200 を返して終了
 *
 *   これは DB レベルで原子的に保証されるため、
 *   並行 2 リクエストが来ても必ず 1 件だけ処理される。
 *
 * スコア編集フロー:
 *   ボタンタップ → postback(a:"ss") → DB更新 → フォーム再描画
 *   確定ボタン  → postback(a:"sr") → confirmed に変更 → 完了メッセージ
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyLineSignature } from '@/lib/line/verify';
import { createServiceClient } from '@/lib/supabase/server';
import { buildScoreFormFlex, ScoreFormState } from '@/lib/line/flex/scoreFormFlex';
import { replyWithFallback, getLineClient } from '@/lib/line/client';
import type { MealScore, HealthScore, ExcretionScore, HydrationScore } from '@/types/record';

export const runtime = 'nodejs';

// ── デフォルト値（全て健康） ─────────────────────────────────────
const DEFAULT_MEAL:      MealScore      = '完食';
const DEFAULT_HEALTH:    HealthScore    = '良好';
const DEFAULT_EXCRETION: ExcretionScore = '正常';
const DEFAULT_HYDRATION: HydrationScore = '十分';

// ── LINE イベント型 ──────────────────────────────────────────────
interface TextMessageEvent {
  type: 'message';
  replyToken: string;
  source: { userId: string; groupId?: string; type: string };
  message: { type: 'text'; id: string; text: string };
}
interface PostbackEvent {
  type: 'postback';
  replyToken: string;
  source: { userId: string; groupId?: string };
  postback: { data: string };
}
interface FollowEvent {
  type: 'follow';
  replyToken: string;
  source: { userId: string };
}
type LineEvent = TextMessageEvent | PostbackEvent | FollowEvent;

// ── ヘルパー関数 ─────────────────────────────────────────────────

async function getFacilityAndStaff(lineUserId: string) {
  const supabase = createServiceClient();
  const { data: staff } = await supabase
    .from('staff')
    .select('id, name, facility_id')
    .eq('line_user_id', lineUserId)
    .maybeSingle();

  const facilityId =
    staff?.facility_id ??
    (await supabase.from('facilities').select('id').limit(1).maybeSingle()).data?.id ??
    null;

  return { staff, facilityId };
}

async function getDisplayName(
  lineUserId: string,
  groupId?: string,
  staffName?: string | null,
): Promise<string> {
  if (staffName) return staffName;
  try {
    const client = getLineClient();
    const profile = groupId
      ? await client.getGroupMemberProfile(groupId, lineUserId)
      : await client.getProfile(lineUserId);
    return profile.displayName;
  } catch {
    return '不明';
  }
}

async function findPatient(text: string, facilityId: string) {
  const supabase = createServiceClient();
  const tokens = text.trim().split(/[\s　]+/);
  for (const token of tokens) {
    const query = token.replace(/さん|様|くん|ちゃん$/g, '');
    if (query.length < 2) continue;
    const { data } = await supabase
      .from('patients')
      .select('id, name, room_number')
      .eq('facility_id', facilityId)
      .eq('is_active', true)
      .ilike('name', `%${query}%`)
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }
  return null;
}

async function getLastConfirmedScores(patientId: string, facilityId: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('records')
    .select('meal, health, excretion, hydration')
    .eq('patient_id', patientId)
    .eq('facility_id', facilityId)
    .eq('status', 'confirmed')
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

// ── テキストメッセージ処理 ────────────────────────────────────────

async function handleTextMessage(event: TextMessageEvent) {
  const { replyToken, source, message } = event;
  const lineUserId = source.userId;
  const groupId    = source.groupId;
  const text       = message.text.trim();
  const lineMessageId = message.id;

  console.log('[webhook] text:', JSON.stringify({ text: text.substring(0, 50), lineUserId, lineMessageId }));

  // 空・コマンド系は無視
  if (!text || text === '未確定' || text === '申し送り') return;

  // ボット自身のメッセージをスキップ（安全策）
  const BOT_PREFIXES = ['📋', '✅', '⚠️', '利用者名が見つかりません', 'システムエラー', '記録の作成に失敗', 'えんがおサポートへようこそ'];
  if (BOT_PREFIXES.some(p => text.startsWith(p))) {
    console.log('[webhook] skipping bot message');
    return;
  }

  // 利用者名として使えない長文はスキップ
  if (text.length > 20) return;

  // ── 施設・スタッフ取得 ──────────────────────────────────────────
  const { staff, facilityId } = await getFacilityAndStaff(lineUserId);
  if (!facilityId) {
    console.error('[webhook] facilityId not found');
    await replyWithFallback(replyToken, lineUserId, {
      type: 'text',
      text: 'システムエラー: 施設情報が見つかりません。管理者に連絡してください。',
    });
    return;
  }

  const displayName = await getDisplayName(lineUserId, groupId, staff?.name);

  // ── 利用者検索 ─────────────────────────────────────────────────
  const patient = await findPatient(text, facilityId);
  if (!patient) {
    const supabase = createServiceClient();
    const { data: patients } = await supabase
      .from('patients')
      .select('name')
      .eq('facility_id', facilityId)
      .eq('is_active', true)
      .order('name')
      .limit(10);
    const list = (patients ?? []).map(p => `・${p.name}`).join('\n');
    await replyWithFallback(replyToken, lineUserId, {
      type: 'text',
      text: `利用者名が見つかりませんでした。\n以下の名前（一部でも可）を送ってください:\n\n${list}`,
    }, groupId);
    return;
  }

  // ── 前回スコア取得（デフォルト値のベース） ─────────────────────
  const last      = await getLastConfirmedScores(patient.id, facilityId);
  const meal      = (last?.meal      ?? DEFAULT_MEAL)      as MealScore;
  const health    = (last?.health    ?? DEFAULT_HEALTH)    as HealthScore;
  const excretion = (last?.excretion ?? DEFAULT_EXCRETION) as ExcretionScore;
  const hydration = (last?.hydration ?? DEFAULT_HYDRATION) as HydrationScore;

  // ── ATOMIC INSERT（重複除去の核心） ────────────────────────────
  // UNIQUE インデックス (line_message_id WHERE NOT NULL) により
  // 並行リクエストが来ても INSERT は 1 件だけ成功する
  const supabase = createServiceClient();
  const { data: draft, error: insertError } = await supabase
    .from('records')
    .insert({
      facility_id:        facilityId,
      line_message_id:    lineMessageId,   // ← UNIQUEキー（重複除去）
      original_text:      text,            // ← 実際のメッセージテキスト
      status:             'draft',
      patient_id:         patient.id,
      staff_id:           staff?.id ?? null,
      line_user_id:       lineUserId,
      line_display_name:  displayName,
      meal,
      health,
      excretion,
      hydration,
      care_tags:          [],
      confidence:         1,
      is_incident:        false,
      incident_keywords:  [],
      patient_candidates: [],
      recorded_at:        new Date().toISOString(),
    })
    .select('id')
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      // UNIQUE違反 = LINEのリトライによる重複 → 即座にスキップ
      console.log('[webhook] duplicate line_message_id, skipping:', lineMessageId);
      return;
    }
    console.error('[webhook] insert error:', insertError.message, insertError.code);
    await replyWithFallback(replyToken, lineUserId, {
      type: 'text',
      text: '記録の作成に失敗しました。もう一度お試しください。',
    }, groupId);
    return;
  }

  console.log('[webhook] draft created:', draft.id, 'for patient:', patient.name);

  // ── Flex フォーム送信 ──────────────────────────────────────────
  const formState: ScoreFormState = {
    recordId:      draft.id,
    patientName:   patient.name,
    staffName:     displayName,
    meal,
    health,
    excretion,
    hydration,
    isFromPrevious: !!last,
  };

  try {
    const flex = buildScoreFormFlex(formState);
    await replyWithFallback(
      replyToken,
      lineUserId,
      flex as unknown as Parameters<typeof replyWithFallback>[2],
      groupId,
    );
    console.log('[webhook] flex form sent, recordId:', draft.id);
  } catch (err) {
    console.error('[webhook] reply error:', err);
    try {
      await replyWithFallback(replyToken, lineUserId, {
        type: 'text',
        text: `📋 ${patient.name}さん\n食事:${meal} 健康:${health} 排泄:${excretion} 水分:${hydration}\n（フォーム表示エラーのためテキスト表示）`,
      }, groupId);
    } catch { /* ignore */ }
  }
}

// ── ポストバック処理 ──────────────────────────────────────────────

async function handlePostback(event: PostbackEvent) {
  const { replyToken, source, postback } = event;
  const lineUserId = source.userId;
  const groupId    = source.groupId;

  let parsed: Record<string, string>;
  try {
    parsed = JSON.parse(postback.data);
  } catch {
    return;
  }

  const action   = parsed.a;
  const recordId = parsed.r;
  if (!action || !recordId) return;

  const supabase = createServiceClient();

  // ── スコアボタンタップ: DB更新 → フォーム再描画 ──────────────
  if (action === 'ss') {
    const field = parsed.f;  // 'meal' | 'health' | 'excretion' | 'hydration'
    const value = parsed.v;
    if (!field || !value) return;

    const ALLOWED_FIELDS = ['meal', 'health', 'excretion', 'hydration'];
    if (!ALLOWED_FIELDS.includes(field)) return;

    console.log('[webhook] score update:', { recordId, field, value });

    // DB更新
    const { error: updateError } = await supabase
      .from('records')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', recordId)
      .eq('status', 'draft');

    if (updateError) {
      console.error('[webhook] score update error:', updateError.message);
      return;
    }

    // 最新レコード取得
    const { data: rec } = await supabase
      .from('records')
      .select('id, meal, health, excretion, hydration, patient_id, line_display_name')
      .eq('id', recordId)
      .maybeSingle();

    if (!rec) return;

    // 利用者名取得
    const { data: patient } = await supabase
      .from('patients')
      .select('name')
      .eq('id', rec.patient_id)
      .maybeSingle();

    const displayName = await getDisplayName(lineUserId, groupId, rec.line_display_name);

    const formState: ScoreFormState = {
      recordId,
      patientName:   patient?.name ?? '不明',
      staffName:     displayName,
      meal:      (rec.meal      ?? DEFAULT_MEAL)      as MealScore,
      health:    (rec.health    ?? DEFAULT_HEALTH)    as HealthScore,
      excretion: (rec.excretion ?? DEFAULT_EXCRETION) as ExcretionScore,
      hydration: (rec.hydration ?? DEFAULT_HYDRATION) as HydrationScore,
      isFromPrevious: false,
    };

    const flex = buildScoreFormFlex(formState);
    await replyWithFallback(
      replyToken,
      lineUserId,
      flex as unknown as Parameters<typeof replyWithFallback>[2],
      groupId,
    );
    console.log('[webhook] form redrawn after score update:', { field, value });
    return;
  }

  // ── 記録する（確定） ─────────────────────────────────────────
  if (action === 'sr') {
    const { data: rec } = await supabase
      .from('records')
      .select('id, meal, health, excretion, hydration, patient_id, status')
      .eq('id', recordId)
      .maybeSingle();

    if (!rec) return;

    // 二重確定を防止
    if (rec.status === 'confirmed') {
      await replyWithFallback(replyToken, lineUserId, {
        type: 'text',
        text: 'この記録はすでに確定済みです。',
      }, groupId);
      return;
    }

    await supabase
      .from('records')
      .update({
        status:       'confirmed',
        confirmed_at: new Date().toISOString(),
        updated_at:   new Date().toISOString(),
      })
      .eq('id', recordId);

    const { data: patient } = await supabase
      .from('patients')
      .select('name')
      .eq('id', rec.patient_id)
      .maybeSingle();

    const scores = [
      `🍽 食事: ${rec.meal      ?? '－'}`,
      `💊 健康: ${rec.health    ?? '－'}`,
      `🚽 排泄: ${rec.excretion ?? '－'}`,
      `💧 水分: ${rec.hydration ?? '－'}`,
    ].join('\n');

    await replyWithFallback(replyToken, lineUserId, {
      type: 'text',
      text: `✅ ${patient?.name ?? '利用者'}さんの記録を保存しました\n\n${scores}`,
    }, groupId);

    console.log('[webhook] record confirmed:', recordId);
  }
}

// ── フォロー処理 ──────────────────────────────────────────────────

async function handleFollow(event: FollowEvent) {
  await replyWithFallback(event.replyToken, event.source.userId, {
    type: 'text',
    text: 'えんがおサポートへようこそ！\n\nLINEグループに利用者名を送るだけで記録フォームが開きます。\n\n例）「田中」「小高さん」\n\n日時・担当名は自動取得します。変化があった部分だけボタンで変更してください。',
  });
}

// ── POST エントリポイント ─────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  const signature = request.headers.get('x-line-signature');
  if (!signature) return new NextResponse('Missing signature', { status: 401 });

  const body = await request.text();
  if (!verifyLineSignature(body, signature, process.env.LINE_CHANNEL_SECRET ?? '')) {
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
      if (event.type === 'message' && (event as TextMessageEvent).message?.type === 'text') {
        await handleTextMessage(event as TextMessageEvent);
      } else if (event.type === 'postback') {
        await handlePostback(event as PostbackEvent);
      } else if (event.type === 'follow') {
        await handleFollow(event as FollowEvent);
      }
    } catch (err) {
      console.error('[webhook] unhandled error:', err);
    }
  }

  return new NextResponse('OK', { status: 200 });
}
