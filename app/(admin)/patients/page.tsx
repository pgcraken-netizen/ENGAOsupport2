'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent } from '@/components/ui/card';
import { Patient } from '@/types/patient';

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/patients')
      .then((r) => r.json())
      .then((d) => setPatients(d.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <TopBar title="利用者一覧" />
      <div className="p-6 max-w-3xl">
        {loading ? (
          <div className="text-center py-12 text-gray-500 text-sm">読み込み中...</div>
        ) : (
          <div className="grid gap-3">
            {patients.map((patient) => (
              <Link key={patient.id} href={`/patients/${patient.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{patient.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {patient.room_number ? `${patient.room_number}号室` : '部屋未設定'}
                          {patient.care_level ? ` ・ 要介護${patient.care_level}` : ''}
                        </p>
                        {patient.aliases.length > 0 && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            別称: {patient.aliases.join('、')}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-blue-600">詳細 →</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
