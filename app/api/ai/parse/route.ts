import { NextRequest, NextResponse } from 'next/server';
import { parseRecord } from '@/lib/ai/parser';

export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { text, facility_id } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }
    if (!facility_id) {
      return NextResponse.json({ error: 'facility_id is required' }, { status: 400 });
    }

    const result = await parseRecord(text, facility_id);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error('[AI parse API error]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
