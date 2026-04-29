import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { computeAlertLevel, isAnomaly, MealRating, HealthRating, ExcretionRating, HydrationRating } from '@/types/record';

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
    const alertLevel = searchParams.get('alert_level');
    const inputMode = searchParams.get('input_mode');
    const limit = parseInt(searchParams.get('limit') ?? '50', 10);
    const offset = parseInt(searchParams.get('offset') ?? '0', 10);

    let query = supabase
      .from('records')
      .select(`
        *,
        patient:patients(id, name, room_number),
        staff:staff(id, name)
      `)
      .order('recorded_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (facilityId) query = query.eq('facility_id', facilityId);
    if (status) query = query.eq('status', status);
    if (patientId) query = query.eq('patient_id', patientId);
    if (dateFrom) query = query.gte('recorded_at', `${dateFrom}T00:00:00`);
    if (dateTo) query = query.lte('recorded_at', `${dateTo}T23:59:59`);
    if (alertLevel) query = query.eq('alert_level', alertLevel);
    if (inputMode) query = query.eq('input_mode', inputMode);

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

    // LIFFからの直接入力の場合、アラートレベルを計算
    let alertLevel = body.alert_level ?? '正常';

    if (body.input_mode === 'liff' && body.patient_id) {
      const meal = body.meal as MealRating | null;
      const health = body.health as HealthRating | null;
      const excretion = body.excretion as ExcretionRating | null;
      const hydration = body.hydration as HydrationRating | null;

      // 直近2件の記録を取得して連続異常カウント
      const { data: recentRecords } = await supabase
        .from('records')
        .select('meal, health, excretion, hydration, alert_level')
        .eq('patient_id', body.patient_id)
        .eq('status', 'confirmed')
        .order('recorded_at', { ascending: false })
        .limit(2);

      let consecutiveAnomalies = 0;
      if (recentRecords) {
        for (const rec of recentRecords) {
          if (isAnomaly(rec.meal, rec.health, rec.excretion, rec.hydration)) {
            consecutiveAnomalies++;
          } else {
            break;
          }
        }
      }

      alertLevel = computeAlertLevel(meal, health, excretion, hydration, consecutiveAnomalies);
    }

    // 施設IDがない場合はデフォルト施設を使用
    let facilityId = body.facility_id;
    if (!facilityId) {
      const { data: facility } = await supabase
        .from('facilities')
        .select('id')
        .limit(1)
        .single();
      facilityId = facility?.id;
    }

    const insertData = {
      ...body,
      facility_id: facilityId,
      alert_level: alertLevel,
      original_text: body.original_text ?? '',
      recorded_at: body.recorded_at ?? new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('records')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('[POST records error]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
