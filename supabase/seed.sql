-- 開発・テスト用シードデータ

-- 施設
INSERT INTO facilities (name, code) VALUES
  ('えんがお施設', 'ENGAO_001')
ON CONFLICT (code) DO NOTHING;

-- 利用者
WITH fac AS (SELECT id FROM facilities WHERE code = 'ENGAO_001')
INSERT INTO patients (facility_id, name, name_kana, aliases, room_number, care_level)
SELECT
  fac.id,
  p.name,
  p.name_kana,
  p.aliases,
  p.room_number,
  p.care_level
FROM fac, (VALUES
  ('山田太郎', 'やまだたろう', ARRAY['山田さん', 'たろちゃん']::text[], '101', '3'),
  ('鈴木花子', 'すずきはなこ', ARRAY['鈴木さん', 'はなちゃん']::text[], '102', '2'),
  ('田中一郎', 'たなかいちろう', ARRAY['田中さん']::text[], '201', '4'),
  ('佐藤幸子', 'さとうさちこ', ARRAY['佐藤さん', 'さっちゃん']::text[], '202', '3')
) AS p(name, name_kana, aliases, room_number, care_level)
ON CONFLICT DO NOTHING;

-- 職員
WITH fac AS (SELECT id FROM facilities WHERE code = 'ENGAO_001')
INSERT INTO staff (facility_id, name, name_kana, role)
SELECT fac.id, s.name, s.name_kana, s.role
FROM fac, (VALUES
  ('管理者', 'かんりしゃ', 'admin'),
  ('佐藤スタッフ', 'さとうすたっふ', 'staff'),
  ('田中スタッフ', 'たなかすたっふ', 'staff')
) AS s(name, name_kana, role)
ON CONFLICT DO NOTHING;
