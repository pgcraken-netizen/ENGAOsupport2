import { NextRequest, NextResponse } from 'next/server';
import { detectAlerts } from '@/lib/analysis/alertDetector';

export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { facility_id } = body;

    if (!facility_id) {
      return NextResponse.json({ error: 'facility_id is required' }, { status: 400 });
    }

    const alerts = await detectAlerts(facility_id);
    return NextResponse.json({ success: true, alerts_created: alerts.length, alerts });
  } catch (err) {
    console.error('[Alert check error]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
