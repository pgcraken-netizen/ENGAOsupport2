import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);

    const facilityId = searchParams.get('facility_id');
    const status = searchParams.get('status');
    const patientId = searchParams.get('patient_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const limit = parseInt(searchParams.get('limit') ?? '50', 10);
    const offset = parseInt(searchParams.get('offset') ?? '0', 10);

    let query = supabase
      .from('records')
      .select(`
        *,
        patient:patients(id, name, room_number),
        staff:staff!records_staff_id_fkey(id, name)
      `)
      .order('recorded_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (facilityId) query = query.eq('facility_id', facilityId);
    if (status) query = query.eq('status', status);
    if (patientId) query = query.eq('patient_id', patientId);
    if (dateFrom) query = query.gte('recorded_at', `${dateFrom}T00:00:00`);
    if (dateTo) query = query.lte('recorded_at', `${dateTo}T23:59:59`);

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({ data, count });
  } catch (err) {
    console.error('[GET records error]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createServiceClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from('records')
      .insert(body)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('[POST records error]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
