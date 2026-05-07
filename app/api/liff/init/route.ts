import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// GET /api/liff/init?userId={lineUserId}
// LIFFページ初期化: スタッフ情報・施設の利用者一覧・本日記録済み患者IDを返す
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: staff } = await supabase
    .from('staff')
    .select('id, name, facility_id')
    .eq('line_user_id', userId)
    .maybeSingle();

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

  // 本日（0時〜）記録済みの患者ID一覧
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: todayRecords } = await supabase
    .from('records')
    .select('patient_id')
    .eq('facility_id', facilityId)
    .gte('recorded_at', todayStart.toISOString());

  const seen = new Set<string>();
  const recordedToday: string[] = [];
  for (const r of (todayRecords ?? [])) {
    if (!seen.has(r.patient_id)) { seen.add(r.patient_id); recordedToday.push(r.patient_id); }
  }

  return NextResponse.json({
    facilityId,
    staffId:       staff?.id   ?? null,
    staffName:     staff?.name ?? null,
    patients:      patients ?? [],
    recordedToday,              // 本日記録済みの patient_id 配列
  });
}
