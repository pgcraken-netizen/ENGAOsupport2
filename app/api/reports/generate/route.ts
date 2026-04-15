import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { generateDailyReport } from '@/lib/analysis/reportGenerator';
import { todayString } from '@/lib/utils/dateUtils';

export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { facility_id, report_date, shift = 'all' } = body;

    if (!facility_id) {
      return NextResponse.json({ error: 'facility_id is required' }, { status: 400 });
    }

    const date = report_date ?? todayString();
    const reportData = await generateDailyReport(facility_id, date, shift);

    // DBに保存（上書き）
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('daily_reports')
      .upsert({
        facility_id,
        report_date: date,
        shift,
        content: reportData.summary,
        content_json: reportData,
        generated_by: 'ai',
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, report: data, content: reportData });
  } catch (err) {
    console.error('[Report generate error]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
