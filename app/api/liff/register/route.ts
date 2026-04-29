import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { name, lineUserId, displayName } = await request.json();

    if (!name || !lineUserId) {
      return NextResponse.json({ error: 'name and lineUserId are required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // 既存チェック
    const { data: existing } = await supabase
      .from('staff')
      .select('id, is_approved')
      .eq('line_user_id', lineUserId)
      .single();

    if (existing) {
      if (existing.is_approved) {
        return NextResponse.json({ state: 'approved' });
      }
      return NextResponse.json({ state: 'pending' });
    }

    // 施設IDを取得（最初の施設を使用）
    const { data: facility } = await supabase
      .from('facilities')
      .select('id')
      .limit(1)
      .single();

    if (!facility) {
      return NextResponse.json({ error: '施設が登録されていません' }, { status: 400 });
    }

    // 新規スタッフ登録（未承認）
    const { error } = await supabase.from('staff').insert({
      facility_id: facility.id,
      line_user_id: lineUserId,
      name: name.trim(),
      display_name: displayName ?? name.trim(),
      role: 'staff',
      is_active: true,
      is_approved: false,
    });

    if (error) throw error;

    return NextResponse.json({ state: 'pending' }, { status: 201 });
  } catch (err) {
    console.error('[LIFF register error]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
