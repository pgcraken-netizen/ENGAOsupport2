# えんがお 介護記録支援システム

グループホーム「えんがお」向け介護記録支援システムです。  
LINEミニアプリ（LIFF）によるスタッフ入力 + 管理者向けWebダッシュボードで構成されています。

---

## 機能概要

| 機能 | 説明 |
|------|------|
| LINEミニアプリ（LIFF） | スタッフがLINEから食事・健康・排泄・水分を5段階で記録 |
| 管理ダッシュボード | 記録一覧・アラート・利用者別タイムライン |
| アラート自動検知 | 観察→注意→警告の3段階、連続異常を自動判定 |
| A4帳票出力 | 利用者別の介護記録報告書をブラウザ印刷でPDF保存 |
| AI申し送り生成 | OpenAI GPTによるシフト申し送り文の自動作成 |
| CSV出力 | 記録データのCSVダウンロード（Excel対応） |
| スタッフ承認フロー | LINEからの登録申請を管理者が承認 |

---

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. 環境変数の設定

```bash
cp .env.example .env.local
```

`.env.local` を開き、以下の値を設定します：

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase プロジェクトURL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase Service Role Key |
| `LINE_CHANNEL_ACCESS_TOKEN` | ✅ | LINE Bot チャネルアクセストークン |
| `LINE_CHANNEL_SECRET` | ✅ | LINE Bot チャネルシークレット |
| `NEXT_PUBLIC_LIFF_ID` | ✅ | LINE LIFF アプリID |
| `OPENAI_API_KEY` | ✅ | OpenAI API Key（AI申し送り用） |
| `OPENAI_MODEL` | ─ | 使用モデル（デフォルト: gpt-4o-mini） |
| `CRON_SECRET` | ─ | Cron認証用シークレット |

### 3. Supabase データベースのセットアップ

Supabase の SQL エディタで以下のマイグレーションを順番に実行します：

```
supabase/migrations/001_initial.sql
supabase/migrations/002_liff.sql
```

### 4. 開発サーバー起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開いてください。

---

## ディレクトリ構成

```
app/
  (admin)/          # 管理者向けWebアプリ
    dashboard/      # ダッシュボード
    patients/       # 利用者管理
    records/        # 記録一覧・詳細
    alerts/         # アラート管理
    reports/        # 帳票・AI申し送り
    staff/          # スタッフ管理
  liff/             # LINEミニアプリ（スタッフ向け）
    patients/       # 利用者選択画面
    record/[id]/    # 記録入力画面
    confirm/        # 確認・保存画面
    register/       # スタッフ初回登録
  api/              # APIルート
supabase/
  migrations/       # DBマイグレーション
components/
  admin/            # 管理画面コンポーネント
  liff/             # LIFFコンポーネント
  layout/           # レイアウト
  ui/               # 汎用UIコンポーネント
```

---

## LINEミニアプリの設定

1. [LINE Developers](https://developers.line.biz/) でチャネル（LINEログイン）を作成
2. LIFF アプリを追加し、エンドポイントURLに `https://your-domain.vercel.app/liff` を設定
3. LIFF ID を `NEXT_PUBLIC_LIFF_ID` に設定
4. スタッフに LIFF URL を共有

スタッフの登録フロー：
1. LINEでミニアプリURLを開く
2. 氏名を入力して登録申請
3. 管理者が `/staff` ページから承認
4. 承認後、記録入力が可能に

---

## Vercel デプロイ

1. このリポジトリをVercelにインポート
2. **Framework Preset** を `Next.js` に設定（重要）
3. 環境変数を Vercel の Project Settings > Environment Variables に設定
4. デプロイ

---

## 法人情報

**一般社団法人えんがお**  
代表：濱野将行  
〒324-0051 栃木県大田原市山の手1-9-10  
TEL: 0287-33-9110
