# Data Model: Ochuna Link

**Branch**: `001-ochuna-link` | **Date**: 2026-05-29

---

## エンティティ一覧

| エンティティ | テーブル名 | 説明 |
|---|---|---|
| User | `profiles` | ユーザープロフィール（Supabase auth.users の拡張） |
| Couple | `couples` | カップルの接続関係・招待コード・再会日 |
| Task | `tasks` | 共有やることリスト |
| Reunion | `reunions` | 再会記録 |
| ReunionPhoto | `reunion_photos` | 再会記録に紐づく写真（Storage パス） |
| WeatherCache | `weather_cache` | 天気情報のサーバーサイドキャッシュ |

---

## テーブル定義

### profiles

`auth.users` の拡張テーブル。ユーザー登録時にトリガーで自動作成。

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | UUID | PK, FK → auth.users | Supabase Auth ユーザーID |
| `display_name` | TEXT | NOT NULL | 表示名 |
| `avatar_url` | TEXT | nullable | プロフィール画像（Storage URL）|
| `city` | TEXT | nullable | 設定都市名（天気・距離計算用）|
| `city_lat` | NUMERIC(9,6) | nullable | 都市の緯度（OpenWeatherMap から取得）|
| `city_lng` | NUMERIC(9,6) | nullable | 都市の経度（OpenWeatherMap から取得）|
| `couple_id` | UUID | FK → couples, nullable | 接続中カップルID |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | |

**State transitions**:
- `couple_id = NULL` → 未ペアリング（Onboarding 状態）
- `couple_id IS NOT NULL` → ペアリング済み（Dashboard アクセス可）

---

### couples

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `user1_id` | UUID | NOT NULL, FK → profiles | 招待コードを発行したユーザー |
| `user2_id` | UUID | nullable, FK → profiles | 招待コードを使用したユーザー（ペアリング完了後にセット）|
| `invite_code` | TEXT | UNIQUE, NOT NULL | 6桁英数字招待コード |
| `invite_expires_at` | TIMESTAMPTZ | NOT NULL | 招待コード有効期限（発行から24時間）|
| `next_reunion_at` | TIMESTAMPTZ | nullable | 次の再会予定日時 |
| `status` | TEXT | CHECK ('pending', 'active') | pending: 未ペアリング / active: ペアリング済み |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | |

**State transitions**:
- `status = 'pending'`: user1 のみ。invite_code 有効
- `status = 'active'`: user2 が invite_code 入力後。両ユーザーの `couple_id` にセット

**接続解除時**:
1. `couples` レコード削除
2. `profiles.couple_id` を両ユーザーで NULL にセット
3. `tasks`・`reunions`・`reunion_photos` を CASCADE で削除
4. Supabase Storage の `reunion-photos/{couple_id}/` を削除

---

### tasks

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | UUID | PK | |
| `couple_id` | UUID | NOT NULL, FK → couples ON DELETE CASCADE | |
| `title` | TEXT | NOT NULL | タスクのテキスト（編集可能）|
| `completed` | BOOLEAN | DEFAULT FALSE | 完了状態 |
| `created_by` | UUID | NOT NULL, FK → profiles | 作成者 |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | 追加順ソート用 |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | |

**Realtime**: `tasks` テーブルへのすべての変更（INSERT/UPDATE/DELETE）をカップルメンバーにサブスクライブ

---

### reunions

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | UUID | PK | |
| `couple_id` | UUID | NOT NULL, FK → couples ON DELETE CASCADE | |
| `reunion_date` | DATE | NOT NULL | 再会日付 |
| `comment` | TEXT | nullable | 一言コメント |
| `created_by` | UUID | NOT NULL, FK → profiles | 投稿者 |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | 新着順ソート用 |

---

### reunion_photos

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | UUID | PK | |
| `reunion_id` | UUID | NOT NULL, FK → reunions ON DELETE CASCADE | |
| `storage_path` | TEXT | NOT NULL | Supabase Storage のオブジェクトパス |
| `display_order` | INTEGER | DEFAULT 0 | 写真の表示順 |
| `created_by` | UUID | NOT NULL, FK → profiles | アップロード者 |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |

**Storage path pattern**: `reunion-photos/{couple_id}/{reunion_id}/{uuid}.{ext}`

---

### weather_cache

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | UUID | PK | |
| `city` | TEXT | UNIQUE, NOT NULL | 都市名（正規化済み）|
| `temperature` | NUMERIC(5,1) | NOT NULL | 気温（℃）|
| `condition` | TEXT | NOT NULL | 天気状態（日本語）|
| `condition_icon` | TEXT | NOT NULL | OpenWeatherMap アイコンコード |
| `lat` | NUMERIC(9,6) | NOT NULL | 都市の緯度（Haversine 計算用）|
| `lng` | NUMERIC(9,6) | NOT NULL | 都市の経度（Haversine 計算用）|
| `fetched_at` | TIMESTAMPTZ | DEFAULT NOW() | 最終取得時刻（10分以内なら再利用）|

---

## Row Level Security (RLS) ポリシー

| テーブル | 操作 | ポリシー |
|---|---|---|
| `profiles` | SELECT | 認証済みユーザーは全プロフィール閲覧可 |
| `profiles` | UPDATE | 自分のプロフィールのみ更新可 |
| `couples` | SELECT | couple に属するユーザーのみ閲覧可 |
| `couples` | INSERT | 認証済みユーザーは新規作成可 |
| `couples` | UPDATE/DELETE | couple に属するユーザーのみ操作可 |
| `tasks` | ALL | couple メンバーのみ CRUD 可 |
| `reunions` | ALL | couple メンバーのみ CRUD 可 |
| `reunion_photos` | ALL | couple メンバーのみ CRUD 可 |
| `weather_cache` | SELECT | 認証済みユーザーは閲覧可 |
| `weather_cache` | INSERT/UPDATE | サービスロールのみ（API Route 経由）|

---

## ER 図（テキスト）

```
auth.users
    │
    └──< profiles >──< couples >──< tasks
                                │
                                └──< reunions >──< reunion_photos

weather_cache (独立テーブル、couples に非依存)
```
