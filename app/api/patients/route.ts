import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const facilityId = searchParams.get('facility_id');
    const name       = searchParams.get('name');
    const limit      = parseInt(searchParams.get('limit') ?? '200', 10);

    let query = supabase
      .from('patients')
      .select('*, facility:facilities(id, name)')
      .eq('is_active', true)
      .order('name')
      .limit(limit);

    if (facilityId) query = query.eq('facility_id', facilityId);
    if (name) query = query.ilike('name', `%${name}%`);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[GET patients error]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createServiceClient();
    const body = await request.json();

    // facility_id が未指定なら最初の施設を使用
    if (!body.facility_id) {
      const { data: fac } = await supabase.from('facilities').select('id').limit(1).single();
      body.facility_id = fac?.id;
    }

    const { data, error } = await supabase
      .from('patients')
      .insert(body)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('[POST patient error]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
