# Quickstart: Ochuna Link 開発環境セットアップ

**Branch**: `001-ochuna-link` | **Date**: 2026-05-29

---

## 前提条件

- Node.js 20+
- npm / pnpm
- Supabase CLI（`npm install -g supabase`）
- OpenWeatherMap の無料 API キー（https://openweathermap.org/api）

---

## セットアップ手順

### 1. プロジェクト初期化

```bash
npx create-next-app@latest ochuna-link \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*"
cd ochuna-link
```

### 2. 依存関係のインストール

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install -D @types/node
```

### 3. Supabase プロジェクト作成

1. https://supabase.com でプロジェクトを新規作成
2. Project URL と anon key を取得

### 4. 環境変数の設定

```bash
cp .env.example .env.local
```

`.env.local` に以下を設定:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENWEATHERMAP_API_KEY=your-api-key
```

### 5. Supabase マイグレーションの適用

```bash
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

または Supabase ダッシュボードの SQL エディタで `supabase/migrations/` のファイルを順番に実行。

### 6. Supabase 型定義の生成

```bash
npx supabase gen types typescript --project-id your-project-ref > src/types/database.ts
```

### 7. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 でアプリが起動します。

---

## Vercel デプロイ

1. GitHub にリポジトリを作成して push（任意）
2. Vercel でプロジェクトをインポート
3. Environment Variables に `.env.local` の内容を設定
4. Deploy

---

## OpenWeatherMap API キーの取得

1. https://openweathermap.org/api で無料アカウント作成
2. API Keys ページで Default キーをコピー
3. `.env.local` の `OPENWEATHERMAP_API_KEY` に設定
4. 無料枠: 1,000 calls/day（サーバーキャッシュで十分）
