import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const facilityId = searchParams.get('facility_id');

    let query = supabase
      .from('staff')
      .select('*')
      .order('name');

    if (facilityId) query = query.eq('facility_id', facilityId);

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
    const { facility_id, name, name_kana, role = 'staff', line_user_id, is_approved = true } = body;

    if (!facility_id || !name) {
      return NextResponse.json({ error: 'facility_id and name are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('staff')
      .insert({ facility_id, name, name_kana, role, line_user_id, is_approved })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('[POST staff error]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
