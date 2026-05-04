-- 002: 食事/健康/排泄/水分の5段階評価フィールドを追加

ALTER TABLE records
  ADD COLUMN IF NOT EXISTS meal TEXT
    CHECK (meal IN ('完食', '8割', '半分', '少量', '拒否')),
  ADD COLUMN IF NOT EXISTS health TEXT
    CHECK (health IN ('良好', '普通', '不良', '発熱', '要受診')),
  ADD COLUMN IF NOT EXISTS excretion TEXT
    CHECK (excretion IN ('正常', '普通', '軟便', '下痢', 'なし')),
  ADD COLUMN IF NOT EXISTS hydration TEXT
    CHECK (hydration IN ('十分', '普通', '少量', '拒否', '未確認')),
  ADD COLUMN IF NOT EXISTS comment TEXT;

-- インデックス: 食事拒否・健康不良の検索用
CREATE INDEX IF NOT EXISTS idx_records_meal ON records(patient_id, meal) WHERE meal IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_records_health ON records(patient_id, health) WHERE health IS NOT NULL;
