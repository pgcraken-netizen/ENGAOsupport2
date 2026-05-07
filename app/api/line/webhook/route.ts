/**
 * LINE Webhook
 *
 * 記録フロー（新設計）:
 *  1. スタッフがグループに利用者名（または略称）を送信
 *  2. 前回記録をコピー or「全て健康」デフォルトで draft を作成
 *  3. scoreFormFlex（ボタン式フォーム）を返信
 *  4. スコアボタンタップ → postback(a:"ss") → DBを更新してフォーム再描画
 *  5. 「記録する」ボタン → postback(a:"sr") → confirmed に確定
 *
 * 日時・担当名は LINE プロフィールから自動取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyLineSignature } from '@/lib/line/verify';
import { createServiceClient } from '@/lib/supabase/server';
import { buildScoreFormFlex, ScoreFormState } from '@/lib/line/flex/scoreFormFlex';
import { replyWithFallback, getLineClient } from '@/lib/line/client';
import { MealScore, HealthScore, ExcretionScore, HydrationScore } from '@/types/record';

export const runtime = 'nodejs';

// ─── デフォルト値（全て健康） ─────────────────────────────────
const DEFAULT_MEAL:      MealScore      = '完食';
const DEFAULT_HEALTH:    HealthScore    = '良好';
const DEFAULT_EXCRETION: ExcretionScore = '正常';
const DEFAULT_HYDRATION: HydrationScore = '十分';

// ─── LINE イベント型 ──────────────────────────────────────────
interface LineTextMessage {
  type: 'message';
  replyToken: string;
  source: { userId: string; groupId?: string; type: string };
  message: { type: 'text'; id: string; text: string };
  webhookEventId?: string;  // LINE固有イベントID
}
interface LinePostbackEvent {
  type: 'postback';
  replyToken: string;
  source: { userId: string; groupId?: string; type: string };
  postback: { data: string };
}
interface LineFollowEvent {
  type: 'follow';
  replyToken: string;
  source: { userId: string };
}
type LineEvent = LineTextMessage | LinePostbackEvent | LineFollowEvent;

// ─── ヘルパー ─────────────────────────────────────────────────
async function getStaffAndFacility(lineUserId: string) {
  const supabase = createServiceClient();
  const { data: staff } = await supabase
    .from('staff')
    .select('*')
    .eq('line_user_id', lineUserId)
    .single();
  const facilityId =
    staff?.facility_id ??
    (await supabase.from('facilities').select('id').limit(1).single()).data?.id ?? null;
  return { staff, facilityId };
}

async function getDisplayName(
  lineUserId: string,
  groupId: string | undefined,
  staffName: string | null,
): Promise<string> {
  if (staffName) return staffName;
  try {
    const client = getLineClient();
    if (groupId) {
      const profile = await client.getGroupMemberProfile(groupId, lineUserId);
      return profile.displayName;
    } else {
      const profile = await client.getProfile(lineUserId);
      return profile.displayName;
    }
  } catch {
    return '不明';
  }
}

/** 利用者名テキストからDB検索（スペース区切りで各トークンを試す） */
async function findPatient(text: string, facilityId: string) {
  const supabase = createServiceClient();
  // 全角・半角スペースで分割して各トークンを試す
  const tokens = text.trim().split(/[\s　]+/);
  for (const token of tokens) {
    const query = token.replace(/さん|様|くん|ちゃん$/g, '');
    if (query.length < 2) continue;
    const { data } = await supabase
      .from('patients')
      .select('*')
      .eq('facility_id', facilityId)
      .eq('is_active', true)
      .ilike('name', `%${query}%`)
      .limit(1);
    if (data?.[0]) return { patient: data[0], matchedToken: token };
  }
  return null;
}

/** 利用者の最新確定記録を取得 */
async function getLastRecord(patientId: string, facilityId: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('records')
    .select('meal,health,excretion,hydration,care_tags')
    .eq('patient_id', patientId)
    .eq('facility_id', facilityId)
    .eq('status', 'confirmed')
    .order('recorded_at', { ascending: false })
    .limit(1);
  return data?.[0] ?? null;
}

/** draft レコードを作成して ID を返す */
async function createDraftRecord(params: {
  facilityId: string;
  staffId: string | null;
  patientId: string;
  lineUserId: string;
  displayName: string;
  originalText: string;
  meal: MealScore;
  health: HealthScore;
  excretion: ExcretionScore;
  hydration: HydrationScore;
}) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('records')
    .insert({
      facility_id: params.facilityId,
      patient_id: params.patientId,
      staff_id: params.staffId,
      line_user_id: params.lineUserId,
      line_display_name: params.displayName,
      status: 'draft',
      meal: params.meal,
      health: params.health,
      excretion: params.excretion,
      hydration: params.hydration,
      care_tags: [],
      original_text: params.originalText,
      confidence: 1,
      is_incident: false,
      incident_keywords: [],
      patient_candidates: [],
      recorded_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── メッセージ処理 ───────────────────────────────────────────
async function handleTextMessage(event: LineTextMessage) {
  const { replyToken, source, message } = event;
  const lineUserId = source.userId;
  const groupId = source.groupId;
  const text = message.text.trim();

  const lineMessageId = message.id;  // LINEメッセージ固有ID
  console.log('[webhook] text received:', JSON.stringify({ text, lineUserId, groupId, lineMessageId }));

  // 空・コマンド系は無視
  if (!text || text === '未確定' || text === '申し送り') return;

  // ボット自身の返信パターンを除外（グループpushMessageのエコーによる無限ループ防止）
  const BOT_REPLY_PREFIXES = ['📋', '✅', '利用者名が見つかりませんでした', 'システムエラー', '記録の作成に失敗'];
  if (BOT_REPLY_PREFIXES.some(p => text.startsWith(p))) {
    console.log('[webhook] skipping bot own message (loop prevention)');
    return;
  }

  // ── LINEメッセージIDで重複除去 ────────────────────────────────
  // LINEはwebhookが5秒以内に返らないとリトライするため同一メッセージが複数回届く場合がある
  // original_text に "line_msg:<id>" を保存し、重複チェックに使用（スキーマ変更不要）
  {
    const supabaseDedup = createServiceClient();
    const sentinelKey = `line_msg:${lineMessageId}`;
    const { data: dup } = await supabaseDedup
      .from('records')
      .select('id')
      .eq('original_text', sentinelKey)
      .maybeSingle();
    if (dup) {
      console.log('[webhook] duplicate LINE message, skipping:', lineMessageId);
      return;
    }
  }
  // ────────────────────────────────────────────────────────────────

  const { staff, facilityId } = await getStaffAndFacility(lineUserId);
  console.log('[webhook] staff:', staff?.id ?? 'null', 'facilityId:', facilityId ?? 'null');

  if (!facilityId) {
    console.error('[webhook] facilityId not found');
    await replyWithFallback(replyToken, lineUserId, {
      type: 'text',
      text: 'システムエラー: 施設情報が見つかりません。管理者にお問い合わせください。',
    });
    return;
  }

  const displayName = await getDisplayName(lineUserId, groupId, staff?.name ?? null);

  // 利用者名マッチング（20文字以内なら検索）
  if (text.length <= 20) {
    const result = await findPatient(text, facilityId);
    console.log('[webhook] findPatient result:', result ? result.patient.name : 'null');
    if (result) {
      const { patient } = result;
      // 前回記録をコピー or デフォルト
      console.log('[webhook] getLastRecord for patientId:', patient.id);
      const last = await getLastRecord(patient.id, facilityId);
      console.log('[webhook] last record:', last ? JSON.stringify(last) : 'null');

      let meal      = (last?.meal      as MealScore)      ?? DEFAULT_MEAL;
      let health    = (last?.health    as HealthScore)    ?? DEFAULT_HEALTH;
      let excretion = (last?.excretion as ExcretionScore) ?? DEFAULT_EXCRETION;
      let hydration = (last?.hydration as HydrationScore) ?? DEFAULT_HYDRATION;
      // 直近5分以内に同一ユーザー・同一利用者のドラフトがあれば再利用（重複作成防止）
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: existingDraft } = await createServiceClient()
        .from('records')
        .select('id, meal, health, excretion, hydration')
        .eq('patient_id', patient.id)
        .eq('line_user_id', lineUserId)
        .eq('status', 'draft')
        .gte('created_at', fiveMinAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingDraft) {
        console.log('[webhook] reusing existing draft:', existingDraft.id);
        // 既存ドラフトのスコアを上書き（最新の前回コピーを反映）
        meal      = (existingDraft.meal      as MealScore)      ?? meal;
        health    = (existingDraft.health    as HealthScore)    ?? health;
        excretion = (existingDraft.excretion as ExcretionScore) ?? excretion;
        hydration = (existingDraft.hydration as HydrationScore) ?? hydration;
        // 既存ドラフトがある = すでにreplyMessage済み → pushMessageフォールバックは使わない
        // （LINEリトライで二重送信しないために replyMessage のみ試行）
      }

      console.log('[webhook] creating draft... facilityId:', facilityId, 'patientId:', patient.id);
      const draft = existingDraft ?? await createDraftRecord({
        facilityId,
        staffId:      staff?.id ?? null,
        patientId:    patient.id,
        lineUserId,
        displayName,
        originalText: `line_msg:${lineMessageId}`,  // 重複防止キー兼originalText
        meal, health, excretion, hydration,
      }).catch((e) => { console.error('[webhook] createDraft error:', e?.message ?? e, JSON.stringify(e)); return null; });

      console.log('[webhook] draft result:', draft ? draft.id : 'null (failed)');

      if (!draft) {
        await replyWithFallback(replyToken, lineUserId, {
          type: 'text',
          text: '記録の作成に失敗しました。もう一度お試しください。',
        }, groupId);
        return;
      }

      const formState: ScoreFormState = {
        recordId:       draft.id,
        patientName:    patient.name,
        staffName:      displayName,
        meal, health, excretion, hydration,
        isFromPrevious: !!last,
      };

      console.log('[webhook] building flex message...');
      let flex;
      try {
        flex = buildScoreFormFlex(formState);
        console.log('[webhook] flex built, altText:', flex.altText);
      } catch (fe) {
        console.error('[webhook] buildScoreFormFlex error:', fe);
        await replyWithFallback(replyToken, lineUserId, {
          type: 'text',
          text: `📋 ${patient.name}さん\n食事:${meal} 健康:${health} 排泄:${excretion} 水分:${hydration}\n（フォームエラーのためテキスト表示）`,
        }, groupId);
        return;
      }

      const isNewDraft = !existingDraft;
      console.log('[webhook] sending reply... replyToken prefix:', replyToken?.substring(0, 8), 'groupId:', groupId ?? 'none', 'isNewDraft:', isNewDraft);
      try {
        await replyWithFallback(
          replyToken,
          lineUserId,
          flex as unknown as Parameters<typeof replyWithFallback>[2],
          isNewDraft ? groupId : undefined,  // 新規ドラフトのみgroupIdフォールバック使用（再利用時は二重送信防止）
        );
        console.log('[webhook] reply sent successfully');
      } catch (re) {
        if (isNewDraft) {
          // 新規ドラフトの場合のみテキストフォールバック
          console.error('[webhook] replyWithFallback error:', re);
          try {
            await replyWithFallback(replyToken, lineUserId, {
              type: 'text',
              text: `📋 ${patient.name}さん\n食事:${meal} 健康:${health} 排泄:${excretion} 水分:${hydration}\n（送信エラーのためテキスト表示）`,
            }, groupId);
            console.log('[webhook] text fallback sent');
          } catch (te) {
            console.error('[webhook] text fallback also failed:', te);
          }
        } else {
          console.log('[webhook] reply for existing draft failed (likely duplicate webhook), suppressed');
        }
      }
      return;
    }
  }

  // 利用者名が見つからない場合
  const supabase = createServiceClient();
  const { data: patients } = await supabase
    .from('patients')
    .select('name')
    .eq('facility_id', facilityId)
    .eq('is_active', true)
    .order('name')
    .limit(10);
  const nameList = (patients ?? []).map((p) => `・${p.name}`).join('\n');

  await replyWithFallback(replyToken, lineUserId, {
    type: 'text',
    text: `利用者名が見つかりませんでした。\n以下の名前（または一部）を送ってください:\n\n${nameList}`,
  }, groupId);
}

// ─── ポストバック処理 ─────────────────────────────────────────
async function handlePostback(event: LinePostbackEvent) {
  const { replyToken, source, postback } = event;
  const lineUserId = source.userId;
  const groupId = source.groupId;

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(postback.data);
  } catch {
    return;
  }

  const action   = data.a as string;
  const recordId = data.r as string;
  if (!recordId) return;

  const supabase = createServiceClient();

  // ── スコアボタンタップ: フォーム再描画 ──
  if (action === 'ss') {
    const field = data.f as string;
    const value = data.v as string;

    // DB更新
    await supabase
      .from('records')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', recordId);

    // 最新状態を取得してフォーム再描画
    const { data: rec } = await supabase
      .from('records')
      .select('*, patient:patients(name), staff:staff!records_staff_id_fkey(name)')
      .eq('id', recordId)
      .single();
    if (!rec) return;

    const { staff } = await getStaffAndFacility(lineUserId);
    const displayName = await getDisplayName(lineUserId, groupId, (rec as Record<string,unknown> & {staff?: {name?:string}})?.staff?.name ?? staff?.name ?? null);

    const formState: ScoreFormState = {
      recordId,
      patientName:    (rec as Record<string,unknown> & {patient?: {name?:string}})?.patient?.name ?? '不明',
      staffName:      displayName,
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
    return;
  }

  // ── 記録する（確定） ──
  if (action === 'sr') {
    const { data: rec } = await supabase
      .from('records')
      .select('*, patient:patients(name)')
      .eq('id', recordId)
      .single();
    if (!rec) return;

    await supabase
      .from('records')
      .update({
        status:       'confirmed',
        confirmed_at: new Date().toISOString(),
        updated_at:   new Date().toISOString(),
      })
      .eq('id', recordId);

    const patientName = (rec as Record<string,unknown> & {patient?: {name?:string}})?.patient?.name ?? '利用者';
    const scores = [
      `🍽 食事: ${rec.meal ?? '－'}`,
      `💊 健康: ${rec.health ?? '－'}`,
      `🚽 排泄: ${rec.excretion ?? '－'}`,
      `💧 水分: ${rec.hydration ?? '－'}`,
    ].join('\n');

    await replyWithFallback(replyToken, lineUserId, {
      type: 'text',
      text: `✅ ${patientName}さんの記録を保存しました\n\n${scores}`,
    }, groupId);
  }
}

// ─── フォロー ─────────────────────────────────────────────────
async function handleFollow(event: LineFollowEvent) {
  const { replyToken, source } = event;
  await replyWithFallback(replyToken, source.userId, {
    type: 'text',
    text: 'えんがおサポートへようこそ！\n\nLINEグループに利用者名を送るだけで記録フォームが開きます。\n\n例）「田中」「小高さん」\n\n日時・担当名は自動取得します。変化があった部分だけボタンで変更してください。',
  });
}

// ─── POST エントリポイント ────────────────────────────────────
export async function POST(request: NextRequest): Promise<NextResponse> {
  const signature = request.headers.get('x-line-signature');
  if (!signature) return new NextResponse('Missing signature', { status: 401 });

  const body = await request.text();
  const isValid = verifyLineSignature(body, signature, process.env.LINE_CHANNEL_SECRET ?? '');
  if (!isValid) return new NextResponse('Invalid signature', { status: 401 });

  let payload: { events: LineEvent[] };
  try {
    payload = JSON.parse(body);
  } catch {
    return new NextResponse('Invalid JSON', { status: 400 });
  }

  // イベントを順次処理（awaitで確実に実行）
  // Vercelサーバーレスではfire-and-forgetは関数終了で打ち切られるため同期処理が安全
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
      console.error('[Webhook error]', err);
    }
  }

  return new NextResponse('OK', { status: 200 });
}
