import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { generateDailyReport } from '@/lib/analysis/reportGenerator';
import { todayString } from '@/lib/utils/dateUtils';

export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const { data: facilities } = await supabase.from('facilities').select('id');
    const date = todayString();

    for (const facility of facilities ?? []) {
      const reportData = await generateDailyReport(facility.id, date, 'all');
      await supabase.from('daily_reports').upsert({
        facility_id: facility.id,
        report_date: date,
        shift: 'all',
        content: reportData.summary,
        content_json: reportData,
        generated_by: 'ai',
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Cron generate-report error]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
