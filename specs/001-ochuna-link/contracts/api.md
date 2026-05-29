# API Contracts: Ochuna Link

**Branch**: `001-ochuna-link` | **Date**: 2026-05-29

---

## 概要

Ochuna Link の外部インターフェースは2種類です:

1. **Next.js API Route** — OpenWeatherMap プロキシ（1エンドポイント）
2. **Supabase Realtime チャンネル** — リアルタイム同期

Supabase のデータ操作（CRUD）は Supabase JS Client で直接行うため、独自の REST API エンドポイントは設けません。

---

## 1. Next.js API Routes

### GET /api/weather

OpenWeatherMap API のプロキシ。APIキーをサーバーサイドに隠蔽し、10分間のキャッシュを提供する。

**Request**

```
GET /api/weather?city={city_name}
```

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `city` | string | ✓ | 都市名（例: `Tokyo`, `Osaka`）|

**Response 200 (キャッシュ or API 取得成功)**

```json
{
  "city": "Tokyo",
  "temperature": 22.5,
  "condition": "晴れ",
  "condition_icon": "01d",
  "lat": 35.6762,
  "lng": 139.6503,
  "cached": true,
  "fetched_at": "2026-05-29T10:00:00Z"
}
```

**Response 400 (都市名なし)**

```json
{
  "error": "city parameter is required"
}
```

**Response 404 (都市が見つからない)**

```json
{
  "error": "City not found"
}
```

**Response 502 (OpenWeatherMap 取得失敗)**

```json
{
  "error": "Weather service unavailable"
}
```

**キャッシュ戦略**:
1. `weather_cache` テーブルに city のレコードが存在し、`fetched_at` が 10分以内 → キャッシュを返す
2. キャッシュ切れまたは未存在 → OpenWeatherMap API を呼び出し、`weather_cache` を UPSERT して返す

---

## 2. Supabase Realtime チャンネル

アプリ内のリアルタイム同期は Supabase Realtime（PostgreSQL Changes）で実装します。

### チャンネル: `couple:{couple_id}`

カップル固有のチャンネル。両パートナーが同チャンネルをサブスクライブする。

**サブスクライブするテーブル変更**:

| テーブル | イベント | 用途 |
|---|---|---|
| `tasks` | INSERT, UPDATE, DELETE | タスクリストのリアルタイム同期 |
| `couples` | UPDATE | 再会日変更のリアルタイム同期 |
| `reunions` | INSERT | アルバムへの新規投稿通知 |

**クライアントサイドのサブスクリプション例**:

```typescript
const channel = supabase
  .channel(`couple:${coupleId}`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'tasks',
      filter: `couple_id=eq.${coupleId}`,
    },
    (payload) => handleTaskChange(payload)
  )
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'couples',
      filter: `id=eq.${coupleId}`,
    },
    (payload) => handleCoupleUpdate(payload)
  )
  .subscribe()
```

**接続解除時**: コンポーネントのアンマウント時に `supabase.removeChannel(channel)` でクリーンアップ。

---

## 3. Supabase Storage バケット

### バケット: `reunion-photos`（プライベート）

| 設定 | 値 |
|---|---|
| アクセス | Private（RLS で制御）|
| 最大ファイルサイズ | 10MB |
| 許可 MIME タイプ | `image/jpeg`, `image/png`, `image/webp` |

**パスパターン**: `reunion-photos/{couple_id}/{reunion_id}/{uuid}.{ext}`

**RLS ポリシー**（Storage オブジェクト）:
- SELECT: `couple_id` が自分の `profiles.couple_id` と一致するパスのみ
- INSERT: 同上
- DELETE: `created_by` が自分のみ

**署名付き URL**: 画像表示時は `supabase.storage.from('reunion-photos').createSignedUrl(path, 3600)` で1時間有効の URL を生成。
