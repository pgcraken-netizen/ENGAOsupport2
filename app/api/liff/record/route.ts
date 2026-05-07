import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// POST /api/liff/record
// LIFFフォームから記録を保存（当日分があれば上書き、なければ新規作成）
export async function POST(request: NextRequest) {
  let body: {
    lineUserId: string;
    displayName: string;
    facilityId: string;
    staffId?: string | null;
    patientId: string;
    meal: string;
    health: string;
    excretion: string;
    hydration: string;
    comment?: string | null;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const { lineUserId, displayName, facilityId, staffId, patientId, meal, health, excretion, hydration, comment } = body;

  if (!lineUserId || !facilityId || !patientId || !meal || !health || !excretion || !hydration) {
    return NextResponse.json({ error: 'missing required fields' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // 当日 (0時〜) の既存記録を検索（上書きのため）
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: existing } = await supabase
    .from('records')
    .select('id')
    .eq('patient_id', patientId)
    .eq('facility_id', facilityId)
    .gte('recorded_at', todayStart.toISOString())
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const now = new Date().toISOString();

  if (existing) {
    // 当日分が既存 → 上書き
    const { error } = await supabase
      .from('records')
      .update({
        meal,
        health,
        excretion,
        hydration,
        comment:          comment ?? null,
        status:           'confirmed',
        line_user_id:     lineUserId,
        line_display_name: displayName,
        staff_id:         staffId ?? null,
        confirmed_at:     now,
        updated_at:       now,
      })
      .eq('id', existing.id);

    if (error) {
      console.error('[liff/record] update error:', error);
      return NextResponse.json({ error: 'update failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, recordId: existing.id, action: 'updated' });
  }

  // 新規作成
  const { data: created, error: insertError } = await supabase
    .from('records')
    .insert({
      facility_id:        facilityId,
      patient_id:         patientId,
      staff_id:           staffId ?? null,
      line_user_id:       lineUserId,
      line_display_name:  displayName,
      status:             'confirmed',
      meal,
      health,
      excretion,
      hydration,
      comment:            comment ?? null,
      original_text:      `[LIFF] ${meal}/${health}/${excretion}/${hydration}`,
      care_tags:          [],
      confidence:         1,
      is_incident:        false,
      incident_keywords:  [],
      patient_candidates: [],
      recorded_at:        now,
      confirmed_at:       now,
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('[liff/record] insert error:', insertError);
    return NextResponse.json({ error: 'insert failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true, recordId: created.id, action: 'created' });
}
