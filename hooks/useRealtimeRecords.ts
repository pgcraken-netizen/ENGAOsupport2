'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

type RecordChangeHandler = (payload: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}) => void;

/**
 * Supabase Realtime で records テーブルの変更を購読するフック。
 * INSERT/UPDATE があるたびに onchange が呼ばれる。
 */
export function useRealtimeRecords(
  facilityId: string | undefined,
  onChange: RecordChangeHandler
) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!facilityId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`records:${facilityId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'records',
          filter: `facility_id=eq.${facilityId}`,
        },
        (payload) => {
          onChangeRef.current({
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: (payload.new ?? {}) as Record<string, unknown>,
            old: (payload.old ?? {}) as Record<string, unknown>,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [facilityId]);
}

/**
 * alerts テーブルの Realtime 購読
 */
export function useRealtimeAlerts(
  facilityId: string | undefined,
  onChange: () => void
) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!facilityId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`alerts:${facilityId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
          filter: `facility_id=eq.${facilityId}`,
        },
        () => onChangeRef.current()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [facilityId]);
}
