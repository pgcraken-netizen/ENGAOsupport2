import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const PATIENTS = [
  { name: '小高純雄', notes: 'つむぎ' },
  { name: '中村真一', notes: 'つむぎ' },
  { name: '伊藤靖彦', notes: 'つむぎ' },
  { name: '須永翔大', notes: 'つむぎ' },
  { name: '大野次男', notes: 'つむぎ' },
  { name: '井上靖則', notes: 'つむぎ' },
  { name: '古谷真悠', notes: 'ひととなり' },
  { name: '福田有希', notes: 'ひととなり' },
  { name: '尾引里美', notes: 'ひととなり' },
  { name: '菰方加代子', notes: 'ひととなり' },
  { name: '後藤彩香', notes: 'ひととなり' },
  { name: '佐藤瑠南', notes: 'ひととなり' },
  { name: '花塚有紗', notes: 'むすび' },
  { name: '福田勝徳', notes: 'むすび' },
  { name: '國井文隆', notes: 'むすび' },
  { name: '石下竜哉', notes: 'むすび' },
  { name: '大宮司透', notes: 'むすび' },
];

export async function POST(): Promise<NextResponse> {
  try {
    const supabase = createServiceClient();

    // Get or create default facility (upsert to avoid duplicate code error)
    const { data: facility, error: facilityError } = await supabase
      .from('facilities')
      .upsert(
        { name: '一般社団法人えんがお', code: 'engao', settings: {} },
        { onConflict: 'code' }
      )
      .select('id')
      .single();

    if (facilityError || !facility) {
      const msg = facilityError?.message ?? 'facility creation failed';
      return NextResponse.json({ error: `施設の作成に失敗: ${msg}` }, { status: 500 });
    }

    const facilityId = facility.id;

    // Delete existing patients for this facility to avoid duplicates
    await supabase.from('patients').delete().eq('facility_id', facilityId);

    const rows = PATIENTS.map(p => ({
      facility_id: facilityId,
      name: p.name,
      notes: p.notes,
      is_active: true,
      aliases: [],
    }));

    const { data, error: insertError } = await supabase
      .from('patients')
      .insert(rows)
      .select();

    if (insertError) {
      return NextResponse.json(
        { error: `利用者の登録に失敗: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ inserted: data?.length ?? 0, facility_id: facilityId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error('[seed patients error]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
