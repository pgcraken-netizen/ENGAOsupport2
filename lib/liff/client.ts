export type LiffProfile = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
};

export type StaffStatus =
  | { state: 'approved'; staffId: string; name: string; role: string }
  | { state: 'pending'; name: string }
  | { state: 'unregistered' };

let _liff: typeof import('@line/liff').default | null = null;

export async function getLiff() {
  if (typeof window === 'undefined') return null;
  if (_liff) return _liff;
  try {
    const mod = await import('@line/liff');
    _liff = mod.default;
    return _liff;
  } catch {
    return null;
  }
}

export async function initLiff(liffId: string): Promise<typeof import('@line/liff').default | null> {
  const liff = await getLiff();
  if (!liff) return null;
  await liff.init({ liffId });
  return liff;
}

export async function getLiffProfile(): Promise<LiffProfile | null> {
  const liff = await getLiff();
  if (!liff || !liff.isLoggedIn()) return null;
  try {
    return await liff.getProfile();
  } catch {
    return null;
  }
}

export async function checkStaffStatus(lineUserId: string): Promise<StaffStatus> {
  const res = await fetch(`/api/liff/auth?lineUserId=${encodeURIComponent(lineUserId)}`);
  if (!res.ok) return { state: 'unregistered' };
  const data = await res.json();
  return data as StaffStatus;
}

export function closeLiffWindow() {
  getLiff().then(liff => {
    if (liff && liff.isInClient()) liff.closeWindow();
  });
}
