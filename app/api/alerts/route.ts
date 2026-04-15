import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const facilityId = searchParams.get('facility_id');
    const isResolved = searchParams.get('is_resolved');

    let query = supabase
      .from('alerts')
      .select(`
        *,
        patient:patients(id, name)
      `)
      .order('created_at', { ascending: false });

    if (facilityId) query = query.eq('facility_id', facilityId);
    if (isResolved !== null) query = query.eq('is_resolved', isResolved === 'true');

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[GET alerts error]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
