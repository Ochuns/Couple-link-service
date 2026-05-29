# Implementation Plan: Ochuna Link

**Branch**: `001-ochuna-link` | **Date**: 2026-05-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-ochuna-link/spec.md`

---

## Summary

遠距離カップル向けWebアプリ「Ochuna Link」の実装計画。Next.js (App Router) + Supabase をベースに、ペアリング・再会カウントダウン・天気/距離表示・共有タスクリスト・再会アルバムの5機能を実装する。Supabase Realtime によるリアルタイム同期が中核技術となる。

---

## Technical Context

**Language/Version**: TypeScript 5.x

**Primary Dependencies**:
- Next.js 14 (App Router)
- Supabase JS Client v2
- Tailwind CSS v3
- OpenWeatherMap API (無料枠)

**Storage**: Supabase PostgreSQL（データ）+ Supabase Storage（写真ファイル）

**Testing**: Jest + React Testing Library（ユニット）、Playwright（E2E）

**Target Platform**: Web（モバイルファースト・レスポンシブ）、Vercel デプロイ

**Project Type**: Web application（Next.js フルスタック）

**Performance Goals**:
- ダッシュボード初期表示: 3秒以内
- Realtime 同期遅延: 5秒以内
- 写真アップロード（5MB以下）: 10秒以内

**Constraints**:
- OpenWeatherMap 無料枠: 1,000 calls/day → サーバー側キャッシュ（10分間）で対応
- Supabase 無料枠: 500MB DB、1GB Storage、50MB ファイル上限
- 招待コード有効期限: 24時間

**Scale/Scope**: MVP（2ユーザー/カップル、数十カップル規模）

---

## Constitution Check

プロジェクト憲法は未設定のためゲートチェックをスキップ。

---

## Project Structure

### Documentation (this feature)

```text
specs/001-ochuna-link/
├── plan.md              # This file
├── research.md          # Phase 0: 技術選定の根拠
├── data-model.md        # Phase 1: DB スキーマ・エンティティ設計
├── contracts/
│   ├── api.md           # Phase 1: Next.js API Routes 仕様
│   └── realtime.md      # Phase 1: Supabase Realtime チャンネル仕様
├── quickstart.md        # Phase 1: 開発環境セットアップ手順
└── tasks.md             # Phase 2: /speckit-tasks コマンドで生成
```

### Source Code (repository root)

```text
src/
├── app/                              # Next.js App Router
│   ├── (auth)/                       # 認証ページ（未ログイン向け）
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── reset-password/page.tsx
│   ├── onboarding/                   # ペアリング前のプロフィール設定・招待コード交換
│   │   ├── page.tsx
│   │   └── invite/page.tsx
│   ├── (app)/                        # ペアリング済みユーザー向け保護ルート
│   │   ├── layout.tsx                # 認証・ペアリング状態ガード
│   │   ├── dashboard/page.tsx        # メインダッシュボード
│   │   ├── tasks/page.tsx            # やることリスト
│   │   ├── album/
│   │   │   ├── page.tsx              # 再会アルバム一覧
│   │   │   └── new/page.tsx          # 再会記録投稿
│   │   └── settings/page.tsx         # プロフィール・都市設定・接続解除
│   ├── api/
│   │   └── weather/route.ts          # OpenWeatherMap プロキシ（APIキー隠蔽）
│   └── layout.tsx
├── components/
│   ├── countdown/
│   │   └── CountdownTimer.tsx        # リアルタイムカウントダウン表示
│   ├── weather/
│   │   └── WeatherCard.tsx           # 天気・気温カード
│   ├── distance/
│   │   └── DistanceBadge.tsx         # 距離バッジ（Haversine 計算）
│   ├── tasks/
│   │   ├── TaskList.tsx
│   │   └── TaskItem.tsx
│   ├── album/
│   │   ├── AlbumGrid.tsx
│   │   └── ReunionCard.tsx
│   └── ui/                           # 共通UIコンポーネント
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # ブラウザ用 Supabase クライアント
│   │   └── server.ts                 # Server Component 用クライアント
│   ├── weather.ts                    # OpenWeatherMap API ヘルパー
│   ├── distance.ts                   # Haversine 距離計算
│   └── invite-code.ts               # 招待コード生成・検証
└── types/
    └── database.ts                   # Supabase 自動生成型定義

supabase/
├── migrations/
│   ├── 001_initial_schema.sql        # テーブル定義
│   └── 002_rls_policies.sql          # Row Level Security ポリシー
└── seed.sql                          # 開発用テストデータ

public/                               # 静的アセット
```

**Structure Decision**: Next.js App Router の単一プロジェクト構成。Supabase がバックエンドの大部分を担うため、別途バックエンドサーバーは設けない。API Routes は OpenWeatherMap プロキシのみ（APIキー保護目的）。

---

## Complexity Tracking

Constitution Check に違反なし。このセクションは該当なし。
