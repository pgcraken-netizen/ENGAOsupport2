import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// Returns the default facility, creating it if it doesn't exist
export async function GET(): Promise<NextResponse> {
  try {
    const supabase = createServiceClient();

    const { data: existing, error: fetchError } = await supabase
      .from('facilities')
      .select('*')
      .order('created_at')
      .limit(1)
      .single();

    if (existing && !fetchError) {
      return NextResponse.json({ data: existing });
    }

    // No facility exists — create the default one
    const { data: created, error: createError } = await supabase
      .from('facilities')
      .insert({
        name: '一般社団法人えんがお',
        code: 'engao',
        settings: {},
      })
      .select()
      .single();

    if (createError) throw createError;
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    console.error('[GET facilities error]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
