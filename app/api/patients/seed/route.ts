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

    // Get or create default facility
    let facilityId: string;
    const { data: existing } = await supabase
      .from('facilities')
      .select('id')
      .order('created_at')
      .limit(1)
      .single();

    if (existing?.id) {
      facilityId = existing.id;
    } else {
      const { data: created, error } = await supabase
        .from('facilities')
        .insert({ name: '一般社団法人えんがお', code: 'engao', settings: {} })
        .select('id')
        .single();
      if (error || !created) throw error ?? new Error('facility creation failed');
      facilityId = created.id;
    }

    // Delete existing patients for this facility to avoid duplicates
    await supabase.from('patients').delete().eq('facility_id', facilityId);

    const rows = PATIENTS.map(p => ({
      facility_id: facilityId,
      name: p.name,
      notes: p.notes,
      is_active: true,
      aliases: [],
    }));

    const { data, error } = await supabase.from('patients').insert(rows).select();
    if (error) throw error;

    return NextResponse.json({ inserted: data?.length ?? 0, facility_id: facilityId });
  } catch (err) {
    console.error('[seed patients error]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
