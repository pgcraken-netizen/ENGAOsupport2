import { NextRequest, NextResponse } from 'next/server';

// 認証不要なパス
const PUBLIC_PATHS = [
  '/login',
  '/api/line/webhook',
  '/api/line/action',
  '/api/auth/login',
  '/api/cron',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public pathは認証スキップ
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 管理画面・API は認証必須
  const isProtected =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/records') ||
    pathname.startsWith('/patients') ||
    pathname.startsWith('/alerts') ||
    pathname.startsWith('/reports') ||
    pathname.startsWith('/staff') ||
    pathname.startsWith('/api/auth/logout') ||
    pathname.startsWith('/api/records') ||
    pathname.startsWith('/api/patients') ||
    pathname.startsWith('/api/alerts') ||
    pathname.startsWith('/api/reports') ||
    pathname.startsWith('/api/ai') ||
    pathname.startsWith('/api/staff');

  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get('session-token')?.value;

  // 開発環境ではトークンなしでも通す（本番では削除推奨）
  if (process.env.NODE_ENV === 'development' && !token) {
    return NextResponse.next();
  }

  if (!token) {
    // APIリクエストには401を返す
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
