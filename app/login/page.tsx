'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'ログインに失敗しました');
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError('ネットワークエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-engao-text mb-1.5">
          メールアドレス
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full border border-engao-border rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-engao-green"
          placeholder="admin@example.com"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-engao-text mb-1.5">
          パスワード
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full border border-engao-border rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-engao-green"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <p className="text-sm text-engao-danger bg-engao-danger-light rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-engao-green text-white font-bold py-4 rounded-xl text-sm disabled:opacity-50 active:scale-95 transition-all"
      >
        {loading ? 'ログイン中...' : 'ログイン'}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-engao-bg flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-engao-border shadow-sm w-full max-w-sm p-8 space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-engao-green-light flex items-center justify-center">
            <span className="text-2xl">🏠</span>
          </div>
          <h1 className="text-2xl font-bold text-engao-green">えんがお</h1>
          <p className="text-sm text-engao-sub mt-1">管理者ログイン</p>
        </div>

        <Suspense fallback={<div className="text-center text-sm text-engao-sub">読み込み中...</div>}>
          <LoginForm />
        </Suspense>

        <p className="text-xs text-engao-sub text-center">
          ※ 管理者から発行されたアカウントでログインしてください
        </p>
      </div>
    </div>
  );
}
