-- 004: Webhook重複処理防止テーブル
-- LINE Webhookのリトライによる多重送信を防ぐため、
-- line_message_id を PRIMARY KEY で保存し、
-- 同じIDが来たら 23505 エラーで即リターンする

CREATE TABLE IF NOT EXISTS webhook_log (
  line_message_id TEXT PRIMARY KEY,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 古いログは7日後に自動削除（必要に応じてpg_cronで実行）
-- DELETE FROM webhook_log WHERE created_at < NOW() - INTERVAL '7 days';
