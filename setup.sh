#!/bin/bash
# ============================================================
#  えんがお Support 2 — 一発セットアップスクリプト
#  実行: bash setup.sh
# ============================================================
set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

echo -e "${GREEN}==============================${NC}"
echo -e "${GREEN}  えんがお Support 2 セットアップ${NC}"
echo -e "${GREEN}==============================${NC}\n"

# Supabase設定ページを開く
echo -e "${YELLOW}[1/4] Supabaseのプロジェクト設定を開きます...${NC}"
open "https://supabase.com/dashboard/project/zmcioceflncxxkwobsqv/settings/api"
echo ""
echo "  ブラウザの「Project URL」と「anon key」「service_role key」を確認してください。"
echo ""

# 入力受付
read -p "  ▶ Project URL (https://zmcioceflncxxkwobsqv.supabase.co のはず): " SUPABASE_URL
SUPABASE_URL=${SUPABASE_URL:-"https://zmcioceflncxxkwobsqv.supabase.co"}

read -p "  ▶ anon public key (eyJ...): " SUPABASE_ANON_KEY
read -p "  ▶ service_role secret key (eyJ...): " SUPABASE_SERVICE_KEY

# LINE・OpenAI設定（任意）
echo ""
read -p "  ▶ OPENAI_API_KEY (スキップはEnter): " OPENAI_KEY
read -p "  ▶ LINE_CHANNEL_ACCESS_TOKEN (スキップはEnter): " LINE_TOKEN
read -p "  ▶ LINE_CHANNEL_SECRET (スキップはEnter): " LINE_SECRET

echo ""
echo -e "${YELLOW}[2/4] Vercel環境変数を設定中...${NC}"

VERCEL_BIN="$HOME/.npm-global/bin/vercel"
if [ ! -f "$VERCEL_BIN" ]; then VERCEL_BIN="vercel"; fi

# Vercelにenv変数をセット（production + preview）
for ENV in production preview; do
  echo "  -> $ENV 環境に設定中"
  echo "$SUPABASE_URL"      | $VERCEL_BIN env add NEXT_PUBLIC_SUPABASE_URL      $ENV --force 2>/dev/null || true
  echo "$SUPABASE_ANON_KEY" | $VERCEL_BIN env add NEXT_PUBLIC_SUPABASE_ANON_KEY $ENV --force 2>/dev/null || true
  echo "$SUPABASE_SERVICE_KEY" | $VERCEL_BIN env add SUPABASE_SERVICE_ROLE_KEY  $ENV --force 2>/dev/null || true
  if [ -n "$OPENAI_KEY" ]; then
    echo "$OPENAI_KEY" | $VERCEL_BIN env add OPENAI_API_KEY $ENV --force 2>/dev/null || true
  fi
  if [ -n "$LINE_TOKEN" ]; then
    echo "$LINE_TOKEN"  | $VERCEL_BIN env add LINE_CHANNEL_ACCESS_TOKEN $ENV --force 2>/dev/null || true
    echo "$LINE_SECRET" | $VERCEL_BIN env add LINE_CHANNEL_SECRET       $ENV --force 2>/dev/null || true
  fi
  CRON_SECRET=$(openssl rand -hex 16)
  echo "$CRON_SECRET" | $VERCEL_BIN env add CRON_SECRET $ENV --force 2>/dev/null || true
done

echo ""
echo -e "${YELLOW}[3/4] SupabaseにSQLマイグレーションを実行中...${NC}"

# 002_add_care_fields.sql を Supabase REST API経由で実行
SQL=$(cat "$(dirname "$0")/supabase/migrations/002_add_care_fields.sql")
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SQL" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')}")

if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "201" ]; then
  echo -e "  ${GREEN}✓ マイグレーション実行成功${NC}"
else
  # fallback: psqlがあれば使う
  echo "  REST API経由の実行に失敗 (${RESPONSE})。Supabase SQLエディタで手動実行してください:"
  echo "  https://supabase.com/dashboard/project/zmcioceflncxxkwobsqv/sql/new"
  echo ""
  # SQLをクリップボードにコピー
  cat "$(dirname "$0")/supabase/migrations/002_add_care_fields.sql" | pbcopy
  echo -e "  ${YELLOW}→ 002_add_care_fields.sql をクリップボードにコピーしました${NC}"
  open "https://supabase.com/dashboard/project/zmcioceflncxxkwobsqv/sql/new"
  read -p "  SQLエディタに貼り付けて実行後、Enterを押してください..."
fi

echo ""
echo -e "${YELLOW}[4/4] シードデータを投入中...${NC}"

SEED_SQL=$(cat "$(dirname "$0")/supabase/seed.sql")
SEED_RESP=$(curl -s -o /dev/null -w "%{http_code}" \
  "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SEED_SQL" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')}")

if [ "$SEED_RESP" = "200" ] || [ "$SEED_RESP" = "201" ]; then
  echo -e "  ${GREEN}✓ シードデータ投入成功 (17名の利用者データ)${NC}"
else
  cat "$(dirname "$0")/supabase/seed.sql" | pbcopy
  echo -e "  ${YELLOW}→ seed.sql をクリップボードにコピーしました。SQLエディタに貼り付けて実行してください${NC}"
  open "https://supabase.com/dashboard/project/zmcioceflncxxkwobsqv/sql/new"
  read -p "  実行後、Enterを押してください..."
fi

echo ""
echo -e "${GREEN}=============================="
echo -e "  ✓ セットアップ完了！"
echo -e ""
echo -e "  次のステップ:"
echo -e "  1. Vercelで再デプロイ: vercel deploy --prod"
echo -e "  2. アプリURL: https://enga-osupport2.vercel.app"
echo -e "  3. スタッフ入力画面: https://enga-osupport2.vercel.app/input"
echo -e "=============================="
echo -e "${NC}"
