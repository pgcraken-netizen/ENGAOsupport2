import { validateSignature } from '@line/bot-sdk';

export function verifyLineSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  return validateSignature(body, secret, signature);
}

export async function verifyWebhookRequest(request: Request): Promise<string> {
  const signature = request.headers.get('x-line-signature');
  if (!signature) throw new Error('Missing LINE signature');

  const body = await request.text();
  const isValid = verifyLineSignature(body, signature, process.env.LINE_CHANNEL_SECRET!);
  if (!isValid) throw new Error('Invalid LINE signature');

  return body;
}
