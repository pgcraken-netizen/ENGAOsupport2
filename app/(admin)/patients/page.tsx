'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { Patient } from '@/types/patient';
import { UserPlus, ChevronRight, Home } from 'lucide-react';

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', name_kana: '', room_number: '', care_level: '', aliases: '' });
  const [saving, setSaving] = useState(false);

  const fetchPatients = async () => {
    setLoading(true);
    fetch('/api/patients')
      .then(r => r.json())
      .then(d => setPatients(d.data ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPatients(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const fRes = await fetch('/api/patients');
      const fData = await fRes.json();
      const facilityId = fData.data?.[0]?.facility_id;

      const aliasArray = form.aliases
        ? form.aliases.split(/[,、]+/).map((s: string) => s.trim()).filter(Boolean)
        : [];

      await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facility_id: facilityId,
          name: form.name.trim(),
          name_kana: form.name_kana.trim() || null,
          room_number: form.room_number.trim() || null,
          care_level: form.care_level || null,
          aliases: aliasArray,
        }),
      });
      setForm({ name: '', name_kana: '', room_number: '', care_level: '', aliases: '' });
      setShowForm(false);
      fetchPatients();
    } finally {
      setSaving(false);
    }
  };

  const CARE_LEVELS = ['1', '2', '3', '4', '5', '要支援1', '要支援2'];

  return (
    <div>
      <TopBar title="利用者一覧" />
      <div className="p-6 max-w-3xl space-y-4">

        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => setShowForm(!showForm)}
            className="bg-engao-green hover:bg-engao-green-dark text-white"
          >
            <UserPlus className="h-4 w-4 mr-1.5" />
            利用者追加
          </Button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl border border-engao-border p-5">
            <h3 className="text-sm font-bold text-engao-text mb-4">利用者追加</h3>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-engao-sub block mb-1">氏名 *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="山田 太郎"
                    className="w-full border border-engao-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-engao-green"
                  />
                </div>
                <div>
                  <label className="text-xs text-engao-sub block mb-1">ふりがな</label>
                  <input
                    type="text"
                    value={form.name_kana}
                    onChange={e => setForm(f => ({ ...f, name_kana: e.target.value }))}
                    placeholder="やまだ たろう"
                    className="w-full border border-engao-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-engao-green"
                  />
                </div>
                <div>
                  <label className="text-xs text-engao-sub block mb-1">部屋番号</label>
                  <input
                    type="text"
                    value={form.room_number}
                    onChange={e => setForm(f => ({ ...f, room_number: e.target.value }))}
                    placeholder="101"
                    className="w-full border border-engao-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-engao-green"
                  />
                </div>
                <div>
                  <label className="text-xs text-engao-sub block mb-1">要介護度</label>
                  <select
                    value={form.care_level}
                    onChange={e => setForm(f => ({ ...f, care_level: e.target.value }))}
                    className="w-full border border-engao-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-engao-green"
                  >
                    <option value="">未設定</option>
                    {CARE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-engao-sub block mb-1">別称（カンマ区切り）</label>
                <input
                  type="text"
                  value={form.aliases}
                  onChange={e => setForm(f => ({ ...f, aliases: e.target.value }))}
                  placeholder="山田さん, たろちゃん"
                  className="w-full border border-engao-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-engao-green"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" size="sm" disabled={saving}
                  className="bg-engao-green hover:bg-engao-green-dark text-white">
                  {saving ? '追加中...' : '追加'}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                  キャンセル
                </Button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-white rounded-xl animate-pulse border border-engao-border" />
            ))}
          </div>
        ) : patients.length === 0 ? (
          <div className="text-center py-12 text-engao-sub text-sm">
            利用者が登録されていません
          </div>
        ) : (
          <div className="space-y-2">
            {patients.map(patient => (
              <Link key={patient.id} href={`/patients/${patient.id}`}>
                <div className="bg-white rounded-xl border border-engao-border px-4 py-3 flex items-center gap-3 hover:border-engao-green transition-colors cursor-pointer">
                  <div className="w-10 h-10 rounded-full bg-engao-green-light flex items-center justify-center flex-shrink-0">
                    <Home className="h-4 w-4 text-engao-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-engao-text">{patient.name}</span>
                      {patient.room_number && (
                        <span className="text-xs text-engao-sub">{patient.room_number}号室</span>
                      )}
                      {patient.care_level && (
                        <span className="text-xs bg-engao-green-light text-engao-green-dark px-1.5 py-0.5 rounded">
                          要介護{patient.care_level}
                        </span>
                      )}
                    </div>
                    {patient.aliases.length > 0 && (
                      <p className="text-xs text-engao-sub mt-0.5">別称: {patient.aliases.join('、')}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-engao-sub flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
