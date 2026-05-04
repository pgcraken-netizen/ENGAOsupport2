import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const facilityId = searchParams.get('facility_id');
    const name       = searchParams.get('name');

    let query = supabase
      .from('staff')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (facilityId) query = query.eq('facility_id', facilityId);
    if (name) query = query.ilike('name', `%${name}%`);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[GET staff error]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createServiceClient();
    const body = await request.json();
    const { facility_id, name, name_kana, role = 'staff', line_user_id } = body;

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    // facility_id 未指定なら最初の施設を使用
    let fid = facility_id;
    if (!fid) {
      const { data: fac } = await supabase.from('facilities').select('id').limit(1).single();
      fid = fac?.id;
    }

    const { data, error } = await supabase
      .from('staff')
      .insert({ facility_id: fid, name, name_kana, role, line_user_id })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('[POST staff error]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
