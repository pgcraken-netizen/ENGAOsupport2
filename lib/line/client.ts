import { messagingApi } from '@line/bot-sdk';
import type { messagingApi as MessagingApiTypes } from '@line/bot-sdk';

export type LineMessage = MessagingApiTypes.Message;

let _lineClient: messagingApi.MessagingApiClient | null = null;

export function getLineClient(): messagingApi.MessagingApiClient {
  if (!_lineClient) {
    _lineClient = new messagingApi.MessagingApiClient({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
    });
  }
  return _lineClient;
}

export async function replyWithFallback(
  replyToken: string,
  userId: string,
  messages: LineMessage | LineMessage[],
  groupId?: string          // グループに送る場合はgroupIdを渡す（フォールバック先）
): Promise<void> {
  const client = getLineClient();
  const msgArray = Array.isArray(messages) ? messages : [messages];
  try {
    await client.replyMessage({ replyToken, messages: msgArray });
  } catch (replyErr) {
    // replyTokenが期限切れの場合はpushにフォールバック
    // グループメッセージの場合はgroupIdへ、なければuserIdへ
    const pushTarget = groupId ?? userId;
    console.warn('[line] replyMessage failed, fallback push to:', pushTarget, String(replyErr).substring(0, 80));
    try {
      await client.pushMessage({ to: pushTarget, messages: msgArray });
    } catch (pushErr) {
      console.error('[line] pushMessage also failed:', String(pushErr).substring(0, 200));
      throw pushErr;
    }
  }
}

export async function pushMessage(
  userId: string,
  messages: LineMessage | LineMessage[]
): Promise<void> {
  const client = getLineClient();
  const msgArray = Array.isArray(messages) ? messages : [messages];
  await client.pushMessage({ to: userId, messages: msgArray });
}

export async function getLineProfile(userId: string) {
  const client = getLineClient();
  return client.getProfile(userId);
}
