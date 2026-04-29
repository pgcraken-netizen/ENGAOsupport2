'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Patient } from '@/types/patient';
import { ChevronRight } from 'lucide-react';

export default function LiffPatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const staffName = typeof window !== 'undefined'
    ? sessionStorage.getItem('liff_staff_name') ?? ''
    : '';

  useEffect(() => {
    fetch('/api/patients')
      .then(r => r.json())
      .then(d => setPatients((d.data ?? []).filter((p: Patient) => p.is_active)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="liff-page">
      {/* ヘッダー */}
      <div className="bg-engao-green px-4 py-4">
        <h1 className="text-white font-bold text-lg">えんがお 記録</h1>
        {staffName && (
          <p className="text-white/80 text-sm mt-0.5">{staffName} さん</p>
        )}
      </div>

      <div className="px-4 py-4">
        <p className="text-sm text-engao-sub mb-3 font-medium">記録する利用者を選んでください</p>

        {loading ? (
          <div className="space-y-3">
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
              <button
                key={patient.id}
                onClick={() => router.push(`/liff/record/${patient.id}`)}
                className="w-full bg-white rounded-xl border border-engao-border px-4 py-4 flex items-center justify-between active:scale-98 active:bg-engao-green-light transition-all text-left"
              >
                <div>
                  <span className="font-bold text-engao-text text-base">{patient.name}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {patient.room_number && (
                      <span className="text-xs text-engao-sub">{patient.room_number}号室</span>
                    )}
                    {patient.care_level && (
                      <span className="text-xs bg-engao-green-light text-engao-green-dark px-1.5 py-0.5 rounded">
                        要介護{patient.care_level}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-engao-sub flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
