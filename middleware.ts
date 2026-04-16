import { NextRequest, NextResponse } from 'next/server';

// 認証不要なパス（前方一致）
const PUBLIC_PATHS = [
  '/login',
  '/api/line/',          // LINE Webhook・Action
  '/api/auth/',          // ログイン・ログアウト
  '/api/cron/',          // Cron jobs (Bearer認証で保護)
  '/_next/',
  '/favicon.ico',
];

// 認証が必要なページパス
const PROTECTED_PAGE_PATHS = [
  '/dashboard',
  '/records',
  '/patients',
  '/alerts',
  '/reports',
  '/staff',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths はそのまま通す
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // ルートパスはリダイレクト
  if (pathname === '/') {
    return NextResponse.next();
  }

  // 管理画面ページのみ認証チェック（APIはチェックしない）
  const isProtectedPage = PROTECTED_PAGE_PATHS.some((p) =>
    pathname === p || pathname.startsWith(`${p}/`)
  );

  if (!isProtectedPage) {
    return NextResponse.next();
  }

  const token = request.cookies.get('session-token')?.value;

  // 開発環境ではスキップ
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // _next/static, _next/image, favicon.ico は除外
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};
