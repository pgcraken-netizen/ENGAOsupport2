'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { initLiff, getLiffProfile, checkStaffStatus } from '@/lib/liff/client';

export default function LiffEntryPage() {
  const router = useRouter();
  const [message, setMessage] = useState('読み込み中...');

  useEffect(() => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID ?? '';

    async function init() {
      try {
        const liff = await initLiff(liffId);
        if (!liff) {
          setMessage('LIFFの初期化に失敗しました');
          return;
        }

        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href });
          return;
        }

        const profile = await getLiffProfile();
        if (!profile) {
          setMessage('プロフィールの取得に失敗しました');
          return;
        }

        const status = await checkStaffStatus(profile.userId);

        if (status.state === 'approved') {
          sessionStorage.setItem('liff_staff_id', status.staffId);
          sessionStorage.setItem('liff_staff_name', status.name);
          sessionStorage.setItem('liff_line_user_id', profile.userId);
          sessionStorage.setItem('liff_display_name', profile.displayName);
          router.replace('/liff/patients');
        } else if (status.state === 'pending') {
          router.replace('/liff/register?state=pending');
        } else {
          sessionStorage.setItem('liff_line_user_id', profile.userId);
          sessionStorage.setItem('liff_display_name', profile.displayName);
          router.replace('/liff/register');
        }
      } catch (e) {
        console.error(e);
        setMessage('初期化エラーが発生しました');
      }
    }

    init();
  }, [router]);

  return (
    <div className="liff-page flex items-center justify-center">
      <div className="text-center p-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-engao-green-light flex items-center justify-center">
          <span className="text-2xl">🏠</span>
        </div>
        <h1 className="text-xl font-bold text-engao-text mb-2">えんがお</h1>
        <p className="text-sm text-engao-sub">{message}</p>
        <div className="mt-4 flex justify-center">
          <div className="w-6 h-6 border-2 border-engao-green border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    </div>
  );
}
