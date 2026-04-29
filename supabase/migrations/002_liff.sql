-- LIFF / 5段階評価 対応マイグレーション

-- スタッフに承認フラグ追加
ALTER TABLE staff ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS pending_name TEXT;

-- 管理者・承認済みスタッフは自動承認
UPDATE staff SET is_approved = TRUE WHERE role IN ('admin', 'leader');

-- 記録テーブルに5段階評価カラム追加
ALTER TABLE records ADD COLUMN IF NOT EXISTS meal TEXT
  CHECK (meal IN ('完食', '8割', '半分', '少量', '拒否'));
ALTER TABLE records ADD COLUMN IF NOT EXISTS health TEXT
  CHECK (health IN ('良好', '普通', 'やや不調', '不調', '重不調'));
ALTER TABLE records ADD COLUMN IF NOT EXISTS excretion TEXT
  CHECK (excretion IN ('正常', '少量', '不規則', '困難', 'なし'));
ALTER TABLE records ADD COLUMN IF NOT EXISTS hydration TEXT
  CHECK (hydration IN ('十分', '普通', '少ない', 'わずか', '拒否'));
ALTER TABLE records ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE records ADD COLUMN IF NOT EXISTS alert_level TEXT DEFAULT '正常'
  CHECK (alert_level IN ('正常', '観察', '注意', '警告'));

-- 記録入力モード（liff = LIFF直接入力, line_bot = 旧LINEBot）
ALTER TABLE records ADD COLUMN IF NOT EXISTS input_mode TEXT DEFAULT 'line_bot'
  CHECK (input_mode IN ('liff', 'line_bot', 'admin'));

-- デフォルト値設定（既存レコードに対して）
UPDATE records SET alert_level = '正常' WHERE alert_level IS NULL;

-- ケアタグマスタに仕様書記載タグを追加
INSERT INTO care_tag_master (name, category, display_order) VALUES
  ('転倒リスク', 'other', 20),
  ('食欲低下', 'meal', 21),
  ('服薬', 'medical', 22),
  ('家族連絡', 'other', 23),
  ('その他', 'other', 99)
ON CONFLICT DO NOTHING;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_records_alert_level ON records(patient_id, alert_level);
CREATE INDEX IF NOT EXISTS idx_records_input_mode ON records(input_mode);
CREATE INDEX IF NOT EXISTS idx_staff_approved ON staff(is_approved);
