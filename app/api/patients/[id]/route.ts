import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const includeRecords = searchParams.get('include_records') === 'true';

    const { data: patient, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let records = null;
    if (includeRecords) {
      const { data } = await supabase
        .from('records')
        .select('*, staff:staff(id, name)')
        .eq('patient_id', params.id)
        .eq('status', 'confirmed')
        .order('recorded_at', { ascending: false })
        .limit(100);
      records = data;
    }

    return NextResponse.json({ data: patient, records });
  } catch (err) {
    console.error('[GET patient error]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const supabase = createServiceClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from('patients')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err) {
    console.error('[PATCH patient error]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
