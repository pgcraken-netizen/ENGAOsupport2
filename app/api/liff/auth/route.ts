import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const lineUserId = searchParams.get('lineUserId');

    if (!lineUserId) {
      return NextResponse.json({ error: 'lineUserId required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: staff, error } = await supabase
      .from('staff')
      .select('id, name, role, is_approved')
      .eq('line_user_id', lineUserId)
      .eq('is_active', true)
      .single();

    if (error || !staff) {
      return NextResponse.json({ state: 'unregistered' });
    }

    if (!staff.is_approved) {
      return NextResponse.json({ state: 'pending', name: staff.name });
    }

    return NextResponse.json({
      state: 'approved',
      staffId: staff.id,
      name: staff.name,
      role: staff.role,
    });
  } catch (err) {
    console.error('[LIFF auth error]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
