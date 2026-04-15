-- ENGAO Support 2 初期マイグレーション

-- 施設テーブル
CREATE TABLE IF NOT EXISTS facilities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  line_group_id TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 職員テーブル
CREATE TABLE IF NOT EXISTS staff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id UUID REFERENCES facilities(id) NOT NULL,
  line_user_id TEXT UNIQUE,
  name TEXT NOT NULL,
  name_kana TEXT,
  display_name TEXT,
  role TEXT DEFAULT 'staff' CHECK (role IN ('staff', 'leader', 'admin')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 利用者テーブル
CREATE TABLE IF NOT EXISTS patients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id UUID REFERENCES facilities(id) NOT NULL,
  name TEXT NOT NULL,
  name_kana TEXT,
  aliases TEXT[] DEFAULT '{}',
  room_number TEXT,
  care_level TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 介護記録テーブル
CREATE TABLE IF NOT EXISTS records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id UUID REFERENCES facilities(id) NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'rejected')),
  staff_id UUID REFERENCES staff(id),
  line_user_id TEXT,
  line_display_name TEXT,
  patient_id UUID REFERENCES patients(id),
  patient_candidates JSONB DEFAULT '[]',
  care_tags TEXT[] DEFAULT '{}',
  condition TEXT CHECK (condition IN ('良好', '普通', '不良', '要観察')),
  condition_detail TEXT,
  original_text TEXT NOT NULL,
  confidence FLOAT DEFAULT 0,
  ai_raw_output JSONB,
  line_message_id TEXT,
  line_reply_token TEXT,
  flex_message_id TEXT,
  is_incident BOOLEAN DEFAULT FALSE,
  incident_keywords TEXT[] DEFAULT '{}',
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_records_facility_status ON records(facility_id, status);
CREATE INDEX IF NOT EXISTS idx_records_patient_date ON records(patient_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_records_staff ON records(staff_id);
CREATE INDEX IF NOT EXISTS idx_records_recorded_at ON records(recorded_at DESC);

-- アラートテーブル
CREATE TABLE IF NOT EXISTS alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id UUID REFERENCES facilities(id) NOT NULL,
  patient_id UUID REFERENCES patients(id) NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'no_record', 'condition_change', 'negative_streak',
    'incident', 'meal_refusal', 'fever'
  )),
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  message TEXT NOT NULL,
  detail JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES staff(id),
  resolved_at TIMESTAMPTZ,
  triggered_records UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 申し送りテーブル
CREATE TABLE IF NOT EXISTS daily_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id UUID REFERENCES facilities(id) NOT NULL,
  report_date DATE NOT NULL,
  shift TEXT CHECK (shift IN ('morning', 'afternoon', 'night', 'all')),
  content TEXT NOT NULL,
  content_json JSONB,
  generated_by TEXT DEFAULT 'ai',
  reviewed_by UUID REFERENCES staff(id),
  reviewed_at TIMESTAMPTZ,
  line_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(facility_id, report_date, shift)
);

-- ケアタグマスタ
CREATE TABLE IF NOT EXISTS care_tag_master (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id UUID REFERENCES facilities(id),
  name TEXT NOT NULL,
  category TEXT CHECK (category IN ('meal', 'hygiene', 'activity', 'medical', 'other')),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

-- 初期ケアタグデータ
INSERT INTO care_tag_master (name, category, display_order) VALUES
  ('食事介助', 'meal', 1),
  ('水分補給', 'meal', 2),
  ('経管栄養', 'meal', 3),
  ('排泄介助', 'hygiene', 4),
  ('オムツ交換', 'hygiene', 5),
  ('入浴介助', 'hygiene', 6),
  ('清拭', 'hygiene', 7),
  ('口腔ケア', 'hygiene', 8),
  ('体位変換', 'medical', 9),
  ('服薬介助', 'medical', 10),
  ('バイタル測定', 'medical', 11),
  ('レクリエーション', 'activity', 12),
  ('機能訓練', 'activity', 13),
  ('外出支援', 'activity', 14),
  ('見守り', 'other', 15),
  ('声かけ', 'other', 16)
ON CONFLICT DO NOTHING;

-- RLS設定
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

-- Service role bypass policy (for API routes using service key)
CREATE POLICY "service_role_all" ON records FOR ALL USING (true);
CREATE POLICY "service_role_all" ON patients FOR ALL USING (true);
CREATE POLICY "service_role_all" ON staff FOR ALL USING (true);
CREATE POLICY "service_role_all" ON alerts FOR ALL USING (true);
CREATE POLICY "service_role_all" ON daily_reports FOR ALL USING (true);
