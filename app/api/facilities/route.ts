import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// Returns the default facility, creating it if it doesn't exist
export async function GET(): Promise<NextResponse> {
  try {
    const supabase = createServiceClient();

    const { data: existing } = await supabase
      .from('facilities')
      .select('*')
      .order('created_at')
      .limit(1)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ data: existing });
    }

    // No facility exists — upsert the default one (handles duplicate code gracefully)
    const { data: created, error: createError } = await supabase
      .from('facilities')
      .upsert({ name: '一般社団法人えんがお', code: 'engao', settings: {} }, { onConflict: 'code' })
      .select()
      .single();

    if (createError) throw createError;
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error('[GET facilities error]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
