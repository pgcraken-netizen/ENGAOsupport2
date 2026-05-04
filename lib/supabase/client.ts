'use client';

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    // 環境変数未設定時は Realtime 機能を無効化（管理画面は動作継続）
    console.warn('[Supabase] NEXT_PUBLIC_SUPABASE_URL or ANON_KEY is not set. Realtime disabled.');
    // ダミー設定で生成（Realtime購読は失敗するが画面は表示される）
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'placeholder-anon-key'
    );
  }

  return createBrowserClient(supabaseUrl.replace(/\/$/, ''), supabaseKey);
}
