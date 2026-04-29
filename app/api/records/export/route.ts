import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export const runtime = 'nodejs';

// 帳票向け表示変換
const ALERT_DISPLAY: Record<string, string> = {
  '正常': '正常', '観察': '観察', '注意': '注意', '警告': '警告',
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);

    const patientId = searchParams.get('patient_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const status = searchParams.get('status') ?? 'confirmed';
    const inputMode = searchParams.get('input_mode');

    let query = supabase
      .from('records')
      .select(`
        recorded_at,
        meal, health, excretion, hydration,
        alert_level,
        care_tags,
        comment,
        condition_detail,
        input_mode,
        status,
        patient:patients(name, room_number, care_level),
        staff:staff(name)
      `)
      .eq('status', status)
      .order('recorded_at', { ascending: true })
      .limit(500);

    if (patientId) query = query.eq('patient_id', patientId);
    if (dateFrom) query = query.gte('recorded_at', `${dateFrom}T00:00:00`);
    if (dateTo) query = query.lte('recorded_at', `${dateTo}T23:59:59`);
    if (inputMode) query = query.eq('input_mode', inputMode);

    const { data, error } = await query;
    if (error) throw error;

    const rows = data ?? [];
    const BOM = '﻿'; // Excel UTF-8対応BOM

    const headers = [
      '日付', '利用者名', '部屋番号',
      '食事', '健康', '排泄', '水分',
      '状態', 'タグ', 'コメント',
      '記録者', '入力モード',
    ].join(',');

    const lines = rows.map(r => {
      const date = format(new Date(r.recorded_at), 'yyyy/M/d', { locale: ja });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const patient = r.patient as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const staff = r.staff as any;
      const tags = Array.isArray(r.care_tags) ? r.care_tags.join('・') : '';
      const comment = (r.comment ?? r.condition_detail ?? '').replace(/"/g, '""');
      const alertDisplay = ALERT_DISPLAY[r.alert_level ?? '正常'] ?? r.alert_level ?? '正常';
      const mode = r.input_mode === 'liff' ? 'LIFF（スマホ）' : r.input_mode === 'admin' ? '管理画面' : 'LINEBot';

      return [
        date,
        patient?.name ?? '',
        patient?.room_number ?? '',
        r.meal ?? '',
        r.health ?? '',
        r.excretion ?? '',
        r.hydration ?? '',
        alertDisplay,
        tags,
        `"${comment}"`,
        staff?.name ?? '',
        mode,
      ].join(',');
    });

    const csv = BOM + headers + '\n' + lines.join('\n');
    const filename = `engao_records_${format(new Date(), 'yyyyMMdd')}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('[CSV export error]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
