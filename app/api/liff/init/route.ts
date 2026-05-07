import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// GET /api/liff/init?userId={lineUserId}
// LIFFページ初期化: スタッフ情報・施設の利用者一覧を返す
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // スタッフ情報を取得
  const { data: staff } = await supabase
    .from('staff')
    .select('id, name, facility_id')
    .eq('line_user_id', userId)
    .maybeSingle();

  // 施設ID（スタッフに紐付くか、最初の施設）
  const facilityId =
    staff?.facility_id ??
    (await supabase.from('facilities').select('id').limit(1).maybeSingle()).data?.id ??
    null;

  if (!facilityId) {
    return NextResponse.json({ error: 'facility not found' }, { status: 404 });
  }

  // 利用者一覧（room_number 順）
  const { data: patients } = await supabase
    .from('patients')
    .select('id, name, room_number')
    .eq('facility_id', facilityId)
    .eq('is_active', true)
    .order('room_number', { ascending: true, nullsFirst: false });

  return NextResponse.json({
    facilityId,
    staffId:   staff?.id   ?? null,
    staffName: staff?.name ?? null,
    patients:  patients ?? [],
  });
}
