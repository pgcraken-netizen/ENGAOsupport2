/**
 * LINE Webhook
 *
 * 記録フロー（LIFF方式）:
 *   LINEリッチメニュー「健康記録」→ LIFFページが開く
 *   → 利用者選択 → スコア入力 → 記録ボタン
 *
 * このWebhookの役割:
 *   - グループに利用者名が送られたら LIFFリンクボタンで返信
 *   - NEXT_PUBLIC_LIFF_ID が未設定の場合はフォールバックテキスト
 *   - フォロー時のウェルカムメッセージ
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyLineSignature } from '@/lib/line/verify';
import { createServiceClient } from '@/lib/supabase/server';
import { replyWithFallback } from '@/lib/line/client';

export const runtime = 'nodejs';

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

// ── ヘルパー ─────────────────────────────────────────────────────

async function getFacilityId(lineUserId: string): Promise<string | null> {
  const supabase = createServiceClient();
  const { data: staff } = await supabase
    .from('staff')
    .select('facility_id')
    .eq('line_user_id', lineUserId)
    .maybeSingle();
  return staff?.facility_id ??
    (await supabase.from('facilities').select('id').limit(1).maybeSingle()).data?.id ?? null;
}

async function findPatient(text: string, facilityId: string) {
  const supabase = createServiceClient();
  const tokens = text.trim().split(/[\s　]+/);
  for (const token of tokens) {
    const query = token.replace(/さん|様|くん|ちゃん$/g, '');
    if (query.length < 2) continue;
    const { data } = await supabase
      .from('patients')
      .select('id, name')
      .eq('facility_id', facilityId)
      .eq('is_active', true)
      .ilike('name', `%${query}%`)
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }
  return null;
}


// ── LIFFリンクFlex（利用者名が一致した場合の返信） ─────────────

function buildLiffLinkFlex(patientName: string, liffUrl: string) {
  return {
    type: 'flex',
    altText: `📋 ${patientName}さんの健康記録フォーム`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'md',
        backgroundColor: '#6BA368',
        contents: [
          {
            type: 'text',
            text: `📋 ${patientName}さん`,
            weight: 'bold',
            size: 'md',
            color: '#FFFFFF',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'md',
        contents: [
          {
            type: 'text',
            text: '下のボタンから健康記録フォームを開いてください。',
            size: 'sm',
            color: '#555555',
            wrap: true,
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
            color: '#6BA368',
            action: {
              type: 'uri',
              label: '記録フォームを開く',
              uri: liffUrl,
            },
          },
        ],
      },
    },
  };
}

// ── テキストメッセージ処理 ────────────────────────────────────────

async function handleTextMessage(event: TextMessageEvent) {
  const { replyToken, source, message } = event;
  const lineUserId = source.userId;
  const groupId    = source.groupId;
  const text       = message.text.trim();

  // ボット自身のメッセージ・コマンド系はスキップ
  if (!text || text.length > 20) return;
  const BOT_PREFIXES = ['📋', '✅', '⚠️', '利用者名が', 'システムエラー', '記録の作成', 'えんがおサポート'];
  if (BOT_PREFIXES.some(p => text.startsWith(p))) return;

  const facilityId = await getFacilityId(lineUserId);
  if (!facilityId) return;

  const patient = await findPatient(text, facilityId);

  const liffId  = process.env.NEXT_PUBLIC_LIFF_ID;
  const liffUrl = liffId ? `https://liff.line.me/${liffId}` : null;

  if (patient) {
    if (liffUrl) {
      // ── LIFFが設定済み: リンクボタンで返信 ──
      await replyWithFallback(
        replyToken,
        lineUserId,
        buildLiffLinkFlex(patient.name, liffUrl) as unknown as Parameters<typeof replyWithFallback>[2],
        groupId,
      );
    } else {
      // ── LIFFが未設定: テキストで案内 ──
      await replyWithFallback(replyToken, lineUserId, {
        type: 'text',
        text: `${patient.name}さんが見つかりました。\n管理者にLIFF IDの設定を依頼してください。`,
      }, groupId);
    }
    return;
  }

  // 利用者が見つからない場合
  if (!liffUrl) return;  // LIFF未設定時はスルー

  const supabase = createServiceClient();
  const { data: patients } = await supabase
    .from('patients')
    .select('name')
    .eq('facility_id', facilityId)
    .eq('is_active', true)
    .order('name')
    .limit(8);
  const list = (patients ?? []).map(p => `・${p.name}`).join('\n');

  await replyWithFallback(replyToken, lineUserId, {
    type: 'text',
    text: `利用者名が見つかりませんでした。\n\n記録フォームはリッチメニューから開けます。\n\n登録名:\n${list}`,
  }, groupId);
}

// ── フォロー処理 ──────────────────────────────────────────────────

async function handleFollow(event: FollowEvent) {
  const liffId  = process.env.NEXT_PUBLIC_LIFF_ID;
  const liffUrl = liffId ? `https://liff.line.me/${liffId}` : null;

  const text = liffUrl
    ? `えんがおサポートへようこそ！\n\n健康記録はリッチメニューの「健康記録」ボタンから入力できます。\n\nまたはこちらから: ${liffUrl}`
    : 'えんがおサポートへようこそ！\n\n管理者にLIFF IDの設定を依頼してください。';

  await replyWithFallback(event.replyToken, event.source.userId, { type: 'text', text });
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
      } else if (event.type === 'follow') {
        await handleFollow(event as FollowEvent);
      }
      // postbackは不要になったためスキップ
    } catch (err) {
      console.error('[webhook] error:', err);
    }
  }

  return new NextResponse('OK', { status: 200 });
}
