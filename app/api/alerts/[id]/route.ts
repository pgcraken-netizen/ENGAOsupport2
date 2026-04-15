import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const supabase = createServiceClient();
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if ('is_read' in body) updateData.is_read = body.is_read;
    if ('is_resolved' in body) {
      updateData.is_resolved = body.is_resolved;
      if (body.is_resolved) {
        updateData.resolved_at = new Date().toISOString();
      }
    }

    const { data, error } = await supabase
      .from('alerts')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err) {
    console.error('[PATCH alert error]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
