import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { detectAlerts } from '@/lib/analysis/alertDetector';

export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Cron認証
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const { data: facilities } = await supabase.from('facilities').select('id');

    const results = [];
    for (const facility of facilities ?? []) {
      const alerts = await detectAlerts(facility.id);
      results.push({ facility_id: facility.id, alerts_created: alerts.length });
    }

    return NextResponse.json({ success: true, results });
  } catch (err) {
    console.error('[Cron check-alerts error]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
