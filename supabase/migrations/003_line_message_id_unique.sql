-- 003: line_message_id にユニークインデックスを追加
-- LINE webhookのリトライによる重複処理を原子的に防止する
--
-- 動作:
--   - 同一 line_message_id で INSERT を試みると UNIQUE違反(23505)が発生
--   - 並行2リクエストが来ても必ず1件だけ成功する（レースコンディション解消）

CREATE UNIQUE INDEX IF NOT EXISTS records_line_message_id_unique
  ON records(line_message_id)
  WHERE line_message_id IS NOT NULL;

-- original_text にデフォルト値を設定（空文字列を許容）
ALTER TABLE records ALTER COLUMN original_text SET DEFAULT '';
