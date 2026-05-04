'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Patient } from '@/types/patient';

interface PatientWithFacility extends Patient {
  facility?: { id: string; name: string } | null;
}

interface FacilityGroup {
  facility_id:   string;
  facility_name: string;
  patients:      Patient[];
}

export default function InputSelectPage() {
  const router  = useRouter();
  const [groups,     setGroups]     = useState<FacilityGroup[]>([]);
  const [staffName,  setStaffName]  = useState('');
  const [staffSaved, setStaffSaved] = useState(false);
  const [loading,    setLoading]    = useState(true);

  // localStorage からスタッフ名を復元
  useEffect(() => {
    const saved = localStorage.getItem('engao-staff-name');
    if (saved) { setStaffName(saved); setStaffSaved(true); }
  }, []);

  useEffect(() => {
    fetch('/api/patients?limit=200')
      .then(r => r.json())
      .then(d => {
        const patients: PatientWithFacility[] = d.data ?? [];
        const map = new Map<string, FacilityGroup>();
        patients.forEach(p => {
          const fid = p.facility_id;
          if (!map.has(fid)) {
            map.set(fid, {
              facility_id:   fid,
              facility_name: p.facility?.name ?? '施設',
              patients:      [],
            });
          }
          map.get(fid)!.patients.push(p);
        });
        setGroups(Array.from(map.values()));
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSaveStaff = () => {
    if (!staffName.trim()) return;
    localStorage.setItem('engao-staff-name', staffName.trim());
    setStaffSaved(true);
  };

  const handleSelect = (patientId: string) => {
    router.push(`/input/${patientId}`);
  };

  const homeLabel = (name: string) => {
    if (name.includes('つむぎ'))     return 'つむぎ';
    if (name.includes('ひととなり')) return 'ひととなり';
    if (name.includes('むすび'))     return 'むすび';
    return name;
  };

  return (
    <div className="min-h-screen bg-engao-bg pb-10">
      {/* ヘッダー */}
      <header className="bg-engao-green text-white px-4 py-4 shadow">
        <h1 className="text-lg font-bold tracking-wide">えんがお</h1>
        <p className="text-xs text-green-100 mt-0.5">記録入力</p>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-5">

        {/* スタッフ名 */}
        {!staffSaved ? (
          <div className="bg-white rounded-2xl shadow-sm border border-engao-border p-5">
            <p className="text-sm font-medium text-engao-text mb-3">担当スタッフ名を入力してください</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={staffName}
                onChange={e => setStaffName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveStaff(); }}
                placeholder="例: 山田 花子"
                className="flex-1 border border-engao-border rounded-lg px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-engao-green"
              />
              <button
                onClick={handleSaveStaff}
                className="bg-engao-green text-white px-4 py-2.5 rounded-lg text-sm font-medium"
              >
                確定
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-engao-green-light border border-engao-green rounded-xl px-4 py-3">
            <span className="text-sm text-engao-green font-medium">担当: {staffName}</span>
            <button onClick={() => setStaffSaved(false)} className="text-xs text-engao-sub underline">
              変更
            </button>
          </div>
        )}

        {/* 利用者選択 */}
        {staffSaved && (
          <>
            <p className="text-sm font-medium text-engao-text px-1">記録する利用者を選んでください</p>

            {loading ? (
              <div className="text-center py-12 text-engao-sub text-sm">読み込み中...</div>
            ) : (
              groups.map(group => (
                <div key={group.facility_id} className="space-y-2">
                  <h2 className="text-xs font-semibold text-engao-sub uppercase tracking-wider px-1">
                    ホーム {homeLabel(group.facility_name)}
                  </h2>
                  {group.patients.map(patient => (
                    <button
                      key={patient.id}
                      onClick={() => handleSelect(patient.id)}
                      className="w-full bg-white rounded-xl border border-engao-border shadow-sm
                                 px-4 py-4 text-left flex items-center justify-between
                                 active:bg-engao-green-light transition-colors"
                    >
                      <div>
                        <span className="text-base font-medium text-engao-text">{patient.name}</span>
                        {patient.room_number && (
                          <span className="text-xs text-engao-sub ml-2">{patient.room_number}号室</span>
                        )}
                      </div>
                      <svg className="w-5 h-5 text-engao-sub" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
