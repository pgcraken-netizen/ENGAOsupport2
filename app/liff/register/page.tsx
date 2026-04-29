'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPending = searchParams.get('state') === 'pending';

  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  if (isPending || done) {
    return (
      <div className="text-center py-12 px-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-engao-orange-light flex items-center justify-center">
          <span className="text-2xl">⏳</span>
        </div>
        <h2 className="text-lg font-bold text-engao-text mb-2">承認待ちです</h2>
        <p className="text-sm text-engao-sub leading-relaxed">
          管理者が承認するまでしばらくお待ちください。
          <br />
          承認後、再度アプリを開いてください。
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const lineUserId = sessionStorage.getItem('liff_line_user_id') ?? '';
      const displayName = sessionStorage.getItem('liff_display_name') ?? '';
      const res = await fetch('/api/liff/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), lineUserId, displayName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '登録に失敗しました');
        return;
      }
      setDone(true);
    } catch {
      setError('ネットワークエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-6 py-8 space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-engao-green-light flex items-center justify-center">
          <span className="text-2xl">👤</span>
        </div>
        <h2 className="text-xl font-bold text-engao-text">初回登録</h2>
        <p className="text-sm text-engao-sub mt-1">あなたのお名前を入力してください</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-engao-text mb-1.5">
            氏名
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="山田 花子"
            className="w-full border border-engao-border rounded-xl px-4 py-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-engao-green"
          />
        </div>

        {error && (
          <p className="text-sm text-engao-danger bg-engao-danger-light rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full bg-engao-green text-white font-bold py-4 rounded-xl text-base disabled:opacity-50 active:scale-95 transition-all"
        >
          {loading ? '送信中...' : '登録申請する'}
        </button>
      </form>

      <p className="text-xs text-engao-sub text-center">
        ※ 管理者の承認後に利用可能になります
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="liff-page">
      <div className="bg-engao-green px-4 py-4 flex items-center">
        <h1 className="text-white font-bold text-lg">えんがお スタッフ登録</h1>
      </div>
      <Suspense fallback={<div className="p-8 text-center text-engao-sub">読み込み中...</div>}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
