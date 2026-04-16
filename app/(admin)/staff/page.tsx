'use client';

import { useEffect, useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Trash2 } from 'lucide-react';

interface StaffMember {
  id: string;
  name: string;
  name_kana: string | null;
  role: string;
  line_user_id: string | null;
  display_name: string | null;
  is_active: boolean;
}

const roleLabel: Record<string, string> = {
  admin: '管理者',
  leader: 'リーダー',
  staff: 'スタッフ',
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

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    try {
      // 最初の施設IDを取得
      const pRes = await fetch('/api/patients?limit=1');
      const pData = await pRes.json();
      const facilityId = pData.data?.[0]?.facility_id;
      if (!facilityId) {
        alert('施設が見つかりません');
        return;
      }
      await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facility_id: facilityId, name: newName.trim(), role: newRole }),
      });
      setNewName('');
      setShowForm(false);
      fetchStaff();
    } finally {
      setSaving(false);
    }
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

  return (
    <div>
      <TopBar title="スタッフ管理" />
      <div className="p-6 max-w-3xl space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            <UserPlus className="h-4 w-4 mr-1.5" />
            スタッフ追加
          </Button>
        </div>

        {showForm && (
          <Card>
            <CardContent className="pt-4">
              <form onSubmit={handleAdd} className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 block mb-1">氏名</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="山田 花子"
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">権限</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                  >
                    <option value="staff">スタッフ</option>
                    <option value="leader">リーダー</option>
                    <option value="admin">管理者</option>
                  </select>
                </div>
                <Button type="submit" disabled={saving} size="sm">
                  {saving ? '追加中...' : '追加'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                  キャンセル
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>スタッフ一覧</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-gray-400 text-center py-8">読み込み中...</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {staffList.map((s) => (
                  <div key={s.id} className="py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{s.name}</span>
                        <Badge variant={s.role === 'admin' ? 'default' : 'secondary'}>
                          {roleLabel[s.role] ?? s.role}
                        </Badge>
                        {!s.is_active && (
                          <Badge variant="outline">無効</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {s.line_user_id ? (
                          <span className="text-xs text-green-600">LINE連携済</span>
                        ) : (
                          <span className="text-xs text-gray-400">LINE未連携</span>
                        )}
                        {s.display_name && (
                          <span className="text-xs text-gray-400">表示名: {s.display_name}</span>
                        )}
                      </div>
                    </div>
                    {s.is_active && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeactivate(s.id, s.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>LINE連携について</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600 space-y-2">
              <p>
                スタッフがLINEボットを友だち追加すると、LINE IDが自動的に記録に紐付けられます。
              </p>
              <p>
                管理者メニューからスタッフのLINE IDを手動設定することもできます。
              </p>
              <div className="bg-blue-50 rounded-lg p-3 mt-3">
                <p className="text-xs font-medium text-blue-800">LINE連携手順</p>
                <ol className="text-xs text-blue-700 mt-1 space-y-0.5 list-decimal list-inside">
                  <li>スタッフがボットを友だち追加</li>
                  <li>LINEグループにボットを招待</li>
                  <li>グループに投稿するとスタッフとして記録される</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
