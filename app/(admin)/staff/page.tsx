'use client';

import { useEffect, useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { UserPlus, Trash2, CheckCircle, Clock, Smartphone } from 'lucide-react';

interface StaffMember {
  id: string;
  name: string;
  name_kana: string | null;
  role: string;
  line_user_id: string | null;
  display_name: string | null;
  is_active: boolean;
  is_approved: boolean;
}

const roleLabel: Record<string, string> = {
  admin: '管理者',
  leader: 'リーダー',
  staff: 'スタッフ',
};

const roleColors: Record<string, string> = {
  admin: 'bg-engao-green text-white',
  leader: 'bg-engao-green-light text-engao-green-dark',
  staff: 'bg-engao-bg text-engao-sub border border-engao-border',
};

export default function StaffPage() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('staff');
  const [saving, setSaving] = useState(false);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/staff');
      const data = await res.json();
      setStaffList(data.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStaff(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const pRes = await fetch('/api/patients?limit=1');
      const pData = await pRes.json();
      const facilityId = pData.data?.[0]?.facility_id;
      if (!facilityId) { alert('施設が見つかりません'); return; }
      await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facility_id: facilityId, name: newName.trim(), role: newRole, is_approved: true }),
      });
      setNewName('');
      setShowForm(false);
      fetchStaff();
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (id: string) => {
    await fetch(`/api/staff/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_approved: true }),
    });
    fetchStaff();
  };

  const handleDeactivate = async (id: string, name: string) => {
    if (!confirm(`${name} を無効にしますか？`)) return;
    await fetch(`/api/staff/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: false }),
    });
    fetchStaff();
  };

  const pendingStaff = staffList.filter(s => s.is_active && !s.is_approved);
  const activeStaff = staffList.filter(s => s.is_active && s.is_approved);
  const inactiveStaff = staffList.filter(s => !s.is_active);

  return (
    <div>
      <TopBar title="スタッフ管理" />
      <div className="p-6 max-w-3xl space-y-4">

        <div className="flex justify-end">
          <Button
            onClick={() => setShowForm(!showForm)}
            size="sm"
            className="bg-engao-green hover:bg-engao-green-dark text-white"
          >
            <UserPlus className="h-4 w-4 mr-1.5" />
            スタッフ追加
          </Button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl border border-engao-border p-5">
            <h3 className="text-sm font-bold text-engao-text mb-4">スタッフ追加（管理者手動）</h3>
            <form onSubmit={handleAdd} className="flex gap-3 items-end flex-wrap">
              <div className="flex-1 min-w-32">
                <label className="text-xs text-engao-sub block mb-1">氏名</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="山田 花子"
                  required
                  className="w-full border border-engao-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-engao-green"
                />
              </div>
              <div>
                <label className="text-xs text-engao-sub block mb-1">権限</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  className="border border-engao-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-engao-green"
                >
                  <option value="staff">スタッフ</option>
                  <option value="leader">リーダー</option>
                  <option value="admin">管理者</option>
                </select>
              </div>
              <Button type="submit" disabled={saving} size="sm"
                className="bg-engao-green hover:bg-engao-green-dark text-white">
                {saving ? '追加中...' : '追加'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>キャンセル</Button>
            </form>
          </div>
        )}

        {/* 承認待ち */}
        {pendingStaff.length > 0 && (
          <div className="bg-white rounded-xl border border-engao-orange overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-engao-orange-light border-b border-engao-orange">
              <Clock className="h-4 w-4 text-engao-warn" />
              <span className="text-sm font-bold text-engao-warn">承認待ち ({pendingStaff.length})</span>
            </div>
            <div className="divide-y divide-engao-border">
              {pendingStaff.map(s => (
                <div key={s.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1">
                    <span className="font-medium text-engao-text">{s.name}</span>
                    {s.display_name && s.display_name !== s.name && (
                      <span className="text-xs text-engao-sub ml-2">（LINE: {s.display_name}）</span>
                    )}
                    {s.line_user_id && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Smartphone className="h-3 w-3 text-engao-green" />
                        <span className="text-xs text-engao-green">LINE連携済</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleApprove(s.id)}
                    className="flex items-center gap-1.5 bg-engao-green text-white text-xs px-3 py-1.5 rounded-full hover:bg-engao-green-dark transition-colors"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    承認
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* アクティブスタッフ */}
        <div className="bg-white rounded-xl border border-engao-border overflow-hidden">
          <div className="px-4 py-3 border-b border-engao-border">
            <span className="text-sm font-bold text-engao-text">スタッフ一覧 ({activeStaff.length})</span>
          </div>
          {loading ? (
            <div className="p-8 text-center text-engao-sub text-sm">読み込み中...</div>
          ) : activeStaff.length === 0 ? (
            <div className="p-8 text-center text-engao-sub text-sm">スタッフが登録されていません</div>
          ) : (
            <div className="divide-y divide-engao-border">
              {activeStaff.map(s => (
                <div key={s.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-engao-text">{s.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${roleColors[s.role] ?? roleColors.staff}`}>
                        {roleLabel[s.role] ?? s.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {s.line_user_id ? (
                        <span className="text-xs text-engao-green flex items-center gap-0.5">
                          <Smartphone className="h-3 w-3" />LINE連携済
                        </span>
                      ) : (
                        <span className="text-xs text-engao-sub">LINE未連携</span>
                      )}
                    </div>
                  </div>
                  <button
                    className="text-red-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-colors"
                    onClick={() => handleDeactivate(s.id, s.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* LIFF情報 */}
        <div className="bg-white rounded-xl border border-engao-border p-5">
          <h3 className="text-sm font-bold text-engao-text mb-3">LINEミニアプリ（LIFF）について</h3>
          <div className="text-sm text-engao-sub space-y-2">
            <p>スタッフは以下の手順でLINEミニアプリを使用できます：</p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-engao-sub">
              <li>LINEでミニアプリURLを開く</li>
              <li>名前を入力して登録申請</li>
              <li>管理者が上記「承認」ボタンで承認</li>
              <li>承認後、ミニアプリで記録入力が可能</li>
            </ol>
            <div className="bg-engao-green-light rounded-lg p-3 mt-3">
              <p className="text-xs font-medium text-engao-green-dark">LIFF ID設定</p>
              <p className="text-xs text-engao-green-dark mt-1">
                環境変数 <code className="bg-white px-1 rounded">NEXT_PUBLIC_LIFF_ID</code> にLIFF IDを設定してください
              </p>
            </div>
          </div>
        </div>

        {inactiveStaff.length > 0 && (
          <details className="bg-white rounded-xl border border-engao-border overflow-hidden">
            <summary className="px-4 py-3 text-sm text-engao-sub cursor-pointer">
              無効化済 ({inactiveStaff.length})
            </summary>
            <div className="divide-y divide-engao-border px-4">
              {inactiveStaff.map(s => (
                <div key={s.id} className="py-2 text-sm text-engao-sub opacity-60">
                  {s.name}
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
