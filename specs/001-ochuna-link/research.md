# Research: Ochuna Link

**Branch**: `001-ochuna-link` | **Date**: 2026-05-29

---

## 技術選定の根拠

### 1. フロントエンドフレームワーク: Next.js 14 (App Router)

- **Decision**: Next.js 14 App Router + TypeScript + Tailwind CSS
- **Rationale**:
  - App Router の Server Components でダッシュボードの初期表示を高速化できる
  - Vercel との親和性が高くデプロイが最も手軽
  - TypeScript で Supabase の型定義と連携できる
- **Alternatives considered**:
  - Vite + React SPA: Vercel との相性は良いが、SSR の恩恵がない
  - Remix: App Router と思想が近いが学習コストが高い

---

### 2. バックエンド/DB: Supabase

- **Decision**: Supabase（PostgreSQL + Auth + Realtime + Storage）
- **Rationale**:
  - 認証・DB・Realtime・ファイルストレージが一体で提供されており、仕様のリアルタイム同期要件（FR-018）を追加実装なしで満たせる
  - Row Level Security (RLS) でカップル単位のデータ分離をDB層で保証できる
  - 無料枠: 500MB DB / 1GB Storage / 50K MAU が MVP スケールに十分
  - パスワードリセット（FR-019）も Auth 組み込み機能で対応可
- **Alternatives considered**:
  - Firebase: Realtime Database は有力だが PostgreSQL の関係モデルが今回の設計に適合する
  - PlanetScale + Pusher: 組み合わせが必要でセットアップコストが高い

---

### 3. Realtime 同期戦略

- **Decision**: Supabase Realtime（PostgreSQL Changes サブスクリプション）
- **Rationale**:
  - `tasks`・`couples`（再会日）テーブルの変更をクライアントに WebSocket で配信できる
  - アプリ内通知のみ（FR-017）という仕様に完全合致し、プッシュ通知実装が不要
  - ブラウザがアクティブな間のみ接続されるため、仕様通りの動作になる
- **Pattern**:
  ```
  supabase
    .channel('couple:<couple_id>')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: 'couple_id=eq.<id>' }, handler)
    .subscribe()
  ```

---

### 4. 天気情報: OpenWeatherMap API

- **Decision**: OpenWeatherMap Current Weather API（無料枠）
- **Rationale**:
  - 都市名で現在天気を取得できる（GPS不要）
  - 無料枠 1,000 calls/day を超えないようにサーバー側で 10分間キャッシュ（`weather_cache` テーブル）
  - API キーは Next.js API Route でプロキシして隠蔽（ブラウザに公開しない）
- **Endpoint**: `GET https://api.openweathermap.org/data/2.5/weather?q={city}&units=metric&lang=ja`
- **Alternatives considered**:
  - WeatherAPI.com: 無料枠が多いが OpenWeatherMap の方が情報が豊富
  - wttr.in: 無認証だが商用利用の制約あり

---

### 5. 距離計算: Haversine 公式（クライアントサイド）

- **Decision**: クライアントサイドの Haversine 公式で都市間直線距離を計算
- **Rationale**:
  - 外部 API 不要でコストゼロ
  - 仕様通り「おおよその直線距離」であり、精度要件を満たす
  - 都市名 → 緯度経度のマッピングは OpenWeatherMap のレスポンスに含まれる座標を利用
- **Haversine formula**:
  ```
  Δlat = lat2 - lat1
  Δlon = lon2 - lon1
  a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlon/2)
  c = 2 × atan2(√a, √(1-a))
  d = R × c  (R = 6371 km)
  ```

---

### 6. 招待コード設計

- **Decision**: 6桁英数字（大文字）のランダムコード、有効期限 24時間
- **Rationale**:
  - 6桁で 36^6 ≈ 2.1億通り。MVPスケールで衝突リスクは無視できる
  - 24時間有効期限により古いコードが蓄積しない
  - ユーザーが手入力しやすいシンプルなフォーマット
- **Generation**: `crypto.randomBytes(3).toString('hex').toUpperCase()` → 6桁 hex

---

### 7. 写真ストレージ戦略

- **Decision**: Supabase Storage（private バケット、カップルID単位でパス管理）
- **Storage path pattern**: `reunion-photos/{couple_id}/{reunion_id}/{filename}`
- **Rationale**:
  - RLS と連携してカップルメンバーのみアクセス可能にできる
  - Supabase Storage の 50MB ファイルサイズ上限が仕様の 10MB 制限より大きく問題ない
  - 接続解除時に `{couple_id}/` 配下を一括削除できる
- **Alternatives considered**:
  - Cloudinary: 機能が豊富だが外部サービス依存が増える
  - S3 直接: 設定コストが高い

---

### 8. 認証フロー

- **Decision**: Supabase Auth（Email + Password）+ pkce フロー
- **Flows**:
  1. 新規登録 → メール確認 → プロフィール設定 → 招待コード交換
  2. ログイン → ペアリング済みなら Dashboard、未ペアリングなら Onboarding
  3. パスワードリセット → メールのリンク → 新パスワード設定
- **Session**: Supabase Auth が localStorage に保存。Next.js middleware でセッション検証

---

## 未解決事項（Deferred）

- ストレージ上限の具体的な数値（v1リリース前に決定予定）
- E2Eテストの範囲（Playwright でのハッピーパスのみ vs 全フロー）
