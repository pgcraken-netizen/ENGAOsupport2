import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const facilityId = searchParams.get('facility_id');

    let query = supabase
      .from('records')
      .select(`
        *,
        patient:patients(id, name, room_number),
        staff:staff(id, name)
      `)
      .eq('status', 'draft')
      .order('recorded_at', { ascending: false });

    if (facilityId) query = query.eq('facility_id', facilityId);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[GET drafts error]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 一括確定
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createServiceClient();
    const body = await request.json();
    const { record_ids } = body;

    if (!Array.isArray(record_ids) || record_ids.length === 0) {
      return NextResponse.json({ error: 'record_ids is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('records')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in('id', record_ids)
      .eq('status', 'draft')
      .select();

    if (error) throw error;
    return NextResponse.json({ success: true, confirmed: data?.length ?? 0 });
  } catch (err) {
    console.error('[Bulk confirm error]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
