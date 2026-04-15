import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createServiceClient();
    const body = await request.json();
    const { record_id, patient_id, care_tags, condition, confirmed_by_line_id } = body;

    if (!record_id) {
      return NextResponse.json({ error: 'record_id is required' }, { status: 400 });
    }

    // 確定者のstaff_idを特定
    let confirmedBy: string | null = null;
    if (confirmed_by_line_id) {
      const { data: staff } = await supabase
        .from('staff')
        .select('id')
        .eq('line_user_id', confirmed_by_line_id)
        .single();
      confirmedBy = staff?.id ?? null;
    }

    const updateData: Record<string, unknown> = {
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (patient_id) updateData.patient_id = patient_id;
    if (care_tags) updateData.care_tags = care_tags;
    if (condition) updateData.condition = condition;
    if (confirmedBy) updateData.confirmed_by = confirmedBy;

    const { data, error } = await supabase
      .from('records')
      .update(updateData)
      .eq('id', record_id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, record: data });
  } catch (err) {
    console.error('[Confirm record error]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
