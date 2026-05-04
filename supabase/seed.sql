-- えんがお シードデータ（実際の利用者・スタッフ構成）

-- ホーム（施設）3棟
INSERT INTO facilities (name, code) VALUES
  ('えんがお　つむぎ',      'ENGAO_TSUMGI'),
  ('えんがお　ひととなり',  'ENGAO_HITO'),
  ('えんがお　むすび',      'ENGAO_MUSUBI')
ON CONFLICT (code) DO NOTHING;

-- つむぎ 利用者 (6名)
WITH fac AS (SELECT id FROM facilities WHERE code = 'ENGAO_TSUMGI')
INSERT INTO patients (facility_id, name, name_kana, aliases, room_number)
SELECT fac.id, p.name, p.kana, p.aliases, p.room
FROM fac, (VALUES
  ('小高純雄',   'おだかすみお',   ARRAY['小高さん']::text[],   '101'),
  ('中村真一',   'なかむらしんいち', ARRAY['中村さん']::text[], '102'),
  ('伊藤靖彦',   'いとうやすひこ', ARRAY['伊藤さん']::text[],  '103'),
  ('須永翔大',   'すながしょうた', ARRAY['須永さん']::text[],  '104'),
  ('大野次男',   'おおのつぎお',   ARRAY['大野さん']::text[],  '105'),
  ('井上靖則',   'いのうえやすのり', ARRAY['井上さん']::text[], '106')
) AS p(name, kana, aliases, room)
ON CONFLICT DO NOTHING;

-- ひととなり 利用者 (7名)
WITH fac AS (SELECT id FROM facilities WHERE code = 'ENGAO_HITO')
INSERT INTO patients (facility_id, name, name_kana, aliases, room_number)
SELECT fac.id, p.name, p.kana, p.aliases, p.room
FROM fac, (VALUES
  ('古谷真悠',   'ふるやまゆ',     ARRAY['古谷さん']::text[],    '201'),
  ('福田有希',   'ふくだゆき',     ARRAY['福田さん']::text[],    '202'),
  ('尾引里美',   'おびきさとみ',   ARRAY['尾引さん']::text[],    '203'),
  ('菰方加代子', 'こもかたかよこ', ARRAY['菰方さん']::text[],    '204'),
  ('後藤彩香',   'ごとうあやか',   ARRAY['後藤さん']::text[],    '205'),
  ('佐藤瑠南',   'さとうるな',     ARRAY['佐藤さん']::text[],    '206'),
  ('花塚有紗',   'はなつかありさ', ARRAY['花塚さん']::text[],    '207')
) AS p(name, kana, aliases, room)
ON CONFLICT DO NOTHING;

-- むすび 利用者 (4名)
WITH fac AS (SELECT id FROM facilities WHERE code = 'ENGAO_MUSUBI')
INSERT INTO patients (facility_id, name, name_kana, aliases, room_number)
SELECT fac.id, p.name, p.kana, p.aliases, p.room
FROM fac, (VALUES
  ('福田勝徳',   'ふくだかつのり', ARRAY['福田さん']::text[],    '301'),
  ('國井文隆',   'くにいふみたか', ARRAY['國井さん']::text[],    '302'),
  ('石下竜哉',   'いしおりたつや', ARRAY['石下さん']::text[],    '303'),
  ('大宮司透',   'おおみやじとおる', ARRAY['大宮司さん']::text[], '304')
) AS p(name, kana, aliases, room)
ON CONFLICT DO NOTHING;

-- 共通スタッフ（管理者）
WITH fac AS (SELECT id FROM facilities WHERE code = 'ENGAO_TSUMGI')
INSERT INTO staff (facility_id, name, name_kana, role)
SELECT fac.id, s.name, s.kana, s.role
FROM fac, (VALUES
  ('管理者', 'かんりしゃ', 'admin')
) AS s(name, kana, role)
ON CONFLICT DO NOTHING;

-- 管理者ログイン用Supabase Authユーザー（Supabase Dashboardで手動作成が必要）
-- Email: admin@engao.local  Password: （ダッシュボードで設定）
