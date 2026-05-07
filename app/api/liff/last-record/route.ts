import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// GET /api/liff/last-record?patientId={id}&facilityId={id}
// 利用者の最新確定記録を返す（スコアのデフォルト値として使用）
export async function GET(request: NextRequest) {
  const patientId  = request.nextUrl.searchParams.get('patientId');
  const facilityId = request.nextUrl.searchParams.get('facilityId');

  if (!patientId || !facilityId) {
    return NextResponse.json({ record: null });
  }

  const supabase = createServiceClient();

  const { data: record } = await supabase
    .from('records')
    .select('meal, health, excretion, hydration, comment')
    .eq('patient_id', patientId)
    .eq('facility_id', facilityId)
    .eq('status', 'confirmed')
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ record: record ?? null });
}
