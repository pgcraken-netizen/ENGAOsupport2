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
  messages: LineMessage | LineMessage[]
): Promise<void> {
  const client = getLineClient();
  const msgArray = Array.isArray(messages) ? messages : [messages];
  try {
    await client.replyMessage({ replyToken, messages: msgArray });
  } catch {
    // replyTokenが期限切れの場合はpushにフォールバック
    await client.pushMessage({ to: userId, messages: msgArray });
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
