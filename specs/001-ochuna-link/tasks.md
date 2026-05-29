# Tasks: Ochuna Link

**Input**: Design documents from `/specs/001-ochuna-link/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md

**Organization**: タスクはユーザーストーリー単位で整理されており、各ストーリーを独立して実装・テスト可能。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可（異なるファイル・依存なし）
- **[Story]**: 対応ユーザーストーリー（US1〜US5）
- 各タスクに具体的なファイルパスを記載

---

## Phase 1: Setup（プロジェクト初期化）

**Purpose**: Next.js プロジェクトの初期構造作成と共通設定

- [x] T001 Next.js 14 プロジェクトを作成（TypeScript・Tailwind・App Router・src/）し、ルートに package.json を生成する
- [x] T002 依存関係をインストール: `@supabase/supabase-js`, `@supabase/ssr` を package.json に追加する
- [x] T003 [P] ESLint + Prettier の設定ファイルを `.eslintrc.json`, `.prettierrc` として作成する
- [x] T004 [P] 環境変数テンプレート `.env.example` を作成し、`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENWEATHERMAP_API_KEY` の4変数を定義する
- [x] T005 plan.md のプロジェクト構造に従い `src/app`, `src/components`, `src/lib`, `src/types`, `supabase/migrations` の各ディレクトリを作成する

**Checkpoint**: `npm run dev` が起動し localhost:3000 で Next.js デフォルト画面が表示されること ✓

---

## Phase 2: Foundational（ブロッキング前提条件）

**Purpose**: すべてのユーザーストーリーに必要なコアインフラ

**⚠️ CRITICAL**: このフェーズが完了するまでユーザーストーリーの実装を開始できない

- [x] T006 `supabase/migrations/001_initial_schema.sql` を作成し、data-model.md のテーブル定義（profiles, couples, tasks, reunions, reunion_photos, weather_cache）を SQL で記述する
- [x] T007 `supabase/migrations/002_rls_policies.sql` を作成し、data-model.md のすべての RLS ポリシーを記述する（カップルメンバーのみアクセス可能なポリシー含む）
- [x] T008 [P] `src/lib/supabase/client.ts` を作成し、ブラウザ用 Supabase クライアント（`createBrowserClient`）を実装する
- [x] T009 [P] `src/lib/supabase/server.ts` を作成し、Server Component 用 Supabase クライアント（`createServerClient` with cookies）を実装する
- [x] T010 `src/types/database.ts` に Supabase テーブルの型定義（`Database` 型、各テーブルの Row/Insert/Update 型）を手動または `supabase gen types` で作成する
- [x] T011 `src/app/layout.tsx` に共通レイアウトを実装し、Tailwind の base スタイルと日本語フォント（Noto Sans JP）を適用する
- [x] T012 `src/middleware.ts` を作成し、Supabase Auth セッションのリフレッシュと、未認証ユーザーを `/login` にリダイレクトする保護を実装する
- [x] T013 `supabase/migrations/003_storage_bucket.sql` を作成し、`reunion-photos` プライベートバケットと Storage RLS ポリシー（カップルメンバーのみアクセス可）を定義する

**Checkpoint**: Supabase ダッシュボードで全テーブルが作成され、未認証でダッシュボードにアクセスすると `/login` にリダイレクトされること ✓

---

## Phase 3: User Story 1 - ペアリング設定（P1）🎯 MVP

**Goal**: ユーザーがアカウントを作成し、招待コードでパートナーと接続できる

**Independent Test**: 2つのアカウントを作成し、招待コードでペアリングが完了してダッシュボードが表示されること

### Implementation

- [x] T014 [P] [US1] `src/lib/invite-code.ts` を作成し、6桁英数字の招待コード生成関数（`generateInviteCode`）と有効期限チェック関数（`isCodeExpired`）を実装する
- [x] T015 [P] [US1] `src/app/(auth)/register/page.tsx` を作成し、メールアドレス・パスワード・表示名の入力フォームと Supabase Auth `signUp` 呼び出しを実装する
- [x] T016 [P] [US1] `src/app/(auth)/login/page.tsx` を作成し、メールアドレス・パスワードのログインフォームと Supabase Auth `signInWithPassword` 呼び出しを実装する
- [x] T017 [P] [US1] `src/app/(auth)/reset-password/page.tsx` を作成し、メールアドレス入力フォームと Supabase Auth `resetPasswordForEmail` 呼び出しを実装する（FR-019）
- [x] T018 [US1] `src/app/onboarding/page.tsx` を作成し、プロフィール設定（表示名・都市名）の入力フォームと `profiles` テーブルへの UPSERT を実装する（T014 依存）
- [x] T019 [US1] `src/app/onboarding/invite/page.tsx` を作成し、「招待コードを発行する」と「パートナーのコードを入力する」の2つのフローを実装する。発行側は `couples` テーブルへ INSERT・コード表示、入力側は `couples` テーブルを検索して `user2_id` を更新・両ユーザーの `profiles.couple_id` をセットする（T014, T018 依存）
- [x] T020 [US1] `src/app/(app)/layout.tsx` を作成し、ペアリング済みチェック（`profiles.couple_id` が null の場合 `/onboarding` にリダイレクト）を実装する（T019 依存）
- [x] T021 [US1] `src/app/(app)/dashboard/page.tsx` の骨格を作成し、ペアリング済みの両ユーザーの表示名・プロフィール画像を取得して表示するレイアウトを実装する（T020 依存）

**Checkpoint**: 2ユーザーが3分以内にペアリングを完了し、共有ダッシュボードの骨格が表示されること（SC-001）✓

---

## Phase 4: User Story 2 - 再会カウントダウン（P2）

**Goal**: 次の再会日を設定し、リアルタイムカウントダウンを2人で共有できる

**Independent Test**: 一方が再会日を設定すると、もう一方の画面に即座にカウントダウンが表示されること

### Implementation

- [x] T022 [P] [US2] `src/components/countdown/CountdownTimer.tsx` を作成し、`next_reunion_at` から「あと○日○時間○分」をリアルタイムで計算・表示するクライアントコンポーネントを実装する（1分ごとに自動更新、SC-002）
- [x] T023 [P] [US2] `src/components/countdown/ReunionDatePicker.tsx` を作成し、日付入力フォームと `couples.next_reunion_at` を更新する処理を実装する
- [x] T024 [US2] `src/app/(app)/dashboard/page.tsx` に CountdownTimer と ReunionDatePicker を統合し、Supabase Realtime で `couples` テーブルの `UPDATE` イベントを購読して再会日変更をリアルタイム反映する（contracts/api.md のチャンネル仕様に従う）（T022, T023 依存）

**Checkpoint**: 片方が再会日を変更すると、5秒以内にもう一方の画面のカウントダウンが更新されること（SC-004）✓

---

## Phase 5: User Story 3 - 天気・距離の確認（P3）

**Goal**: お互いの都市の現在の天気と2人の距離をダッシュボードで表示できる

**Independent Test**: 両パートナーの都市が設定された状態でダッシュボードに天気・距離が表示されること

### Implementation

- [x] T025 [P] [US3] `src/app/api/weather/route.ts` を作成し、`city` クエリパラメータを受け取り `weather_cache` テーブルを確認（10分以内なら返す）、期限切れなら OpenWeatherMap API を呼び出して `weather_cache` を UPSERT する Next.js Route Handler を実装する（contracts/api.md の仕様に従う）
- [x] T026 [P] [US3] `src/lib/weather.ts` を作成し、`/api/weather` を呼び出す `fetchWeather(city: string)` 関数を実装する
- [x] T027 [P] [US3] `src/lib/distance.ts` を作成し、2点の緯度経度を受け取って直線距離（km）を返す `calculateDistance(lat1, lng1, lat2, lng2)` 関数を Haversine 公式で実装する
- [x] T028 [P] [US3] `src/components/weather/WeatherCard.tsx` を作成し、都市名・天気・気温・アイコンを表示するコンポーネントを実装する（未設定時は「都市を設定してください」案内、API エラー時はフォールバックメッセージを表示）
- [x] T029 [P] [US3] `src/components/distance/DistanceBadge.tsx` を作成し、2都市間の距離（km）を表示するコンポーネントを実装する（`calculateDistance` を使用）
- [x] T030 [US3] `src/app/(app)/dashboard/page.tsx` に WeatherCard（両パートナー分）と DistanceBadge を統合し、ページロード時に `/api/weather` を呼び出す処理を実装する（T025〜T029 依存）

**Checkpoint**: 両パートナーの都市を設定した状態でダッシュボードに天気・気温・距離が表示され、天気データが10分以内のキャッシュを使用すること（SC-003）✓

---

## Phase 6: User Story 4 - やることリストの共有（P4）

**Goal**: 共有タスクリストにアイテムを追加・編集・完了・削除でき、変更がリアルタイムで反映される

**Independent Test**: 一方がタスクを追加・編集・完了・削除すると、5秒以内にもう一方の画面に反映されること

### Implementation

- [x] T031 [P] [US4] `src/components/tasks/TaskItem.tsx` を作成し、タスクの表示・チェックボックス（完了切り替え）・テキスト編集（インライン編集）・削除ボタンを持つコンポーネントを実装する
- [x] T032 [P] [US4] `src/components/tasks/TaskList.tsx` を作成し、タスクの一覧表示（追加順）と新規タスク入力フォームを持つコンポーネントを実装する
- [x] T033 [US4] `src/app/(app)/tasks/page.tsx` を作成し、`tasks` テーブルのデータ取得（`couple_id` フィルタ）と TaskList コンポーネントの統合を実装する（T031, T032 依存）
- [x] T034 [US4] `src/app/(app)/tasks/page.tsx` に Supabase Realtime の `tasks` テーブル購読（INSERT/UPDATE/DELETE）を追加し、パートナーの変更をリアルタイムで反映する（contracts/api.md のチャンネル仕様に従う）（T033 依存）

**Checkpoint**: 両パートナーが同時にタスクページを開き、片方の操作が5秒以内に反映されること（SC-004）✓

---

## Phase 7: User Story 5 - 再会写真の記録（P5）

**Goal**: 再会の記録（日付・写真・コメント）を投稿し、アルバムとして閲覧できる

**Independent Test**: 再会記録を投稿するとアルバムページに表示され、両パートナーが閲覧できること

### Implementation

- [x] T035 [P] [US5] `src/components/album/ReunionCard.tsx` を作成し、再会日・コメント・写真サムネイル一覧を表示するカードコンポーネントを実装する
- [x] T036 [P] [US5] `src/components/album/AlbumGrid.tsx` を作成し、ReunionCard の一覧を新着順に表示するグリッドコンポーネントを実装する
- [x] T037 [P] [US5] `src/app/(app)/album/new/page.tsx` を作成し、再会日・コメント・写真複数枚アップロード（10MB 制限チェック含む）のフォームを実装する。写真は Supabase Storage の `reunion-photos/{couple_id}/{reunion_id}/` パスにアップロードし、`reunions` + `reunion_photos` テーブルへ INSERT する（T013 依存）
- [x] T038 [US5] `src/app/(app)/album/page.tsx` を作成し、`reunions` と `reunion_photos` テーブルのデータを取得して AlbumGrid コンポーネントで表示する。Supabase Storage の署名付き URL（1時間有効）を生成して画像表示する（T035, T036, T037 依存）

**Checkpoint**: 再会記録に写真を添付して投稿するとアルバムに表示され、両パートナーが閲覧できること ✓

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: 全ストーリーにまたがる改善・接続解除・レスポンシブ対応

- [x] T039 [P] `src/app/(app)/settings/page.tsx` を作成し、表示名・プロフィール画像・都市名の変更フォームと `profiles` テーブルへの UPDATE を実装する（FR-013）
- [x] T040 `src/app/(app)/settings/page.tsx` に接続解除（アカウント解除）フォームを追加し、確認ダイアログ → `couples` レコード削除（CASCADE で tasks/reunions/reunion_photos も削除）→ Supabase Storage の `reunion-photos/{couple_id}/` 一括削除 → 両ユーザーの `profiles.couple_id` を NULL に戻す処理を実装する（FR-014, FR-015, FR-016）（T039 依存）
- [x] T041 [P] 全ページにローディングスピナーと Suspense Boundary を追加し、3秒以内の表示（SC-006）を確認する（`src/app/(app)/*/loading.tsx` を作成）
- [x] T042 [P] 全コンポーネントに Tailwind のレスポンシブクラス（`sm:`, `md:`, `lg:`）を適用し、スマートフォン・タブレット・PCでの表示を確認する（SC-007）
- [x] T043 [P] `src/app/(app)/dashboard/page.tsx` に直近の予定（当日・翌日タスク、カウントダウン）をまとめた Quick View セクションを追加する
- [x] T044 全 API Route・サーバーアクションのエラーハンドリングを確認し、ユーザーフレンドリーなエラーメッセージを統一する（日本語）

**Checkpoint**: quickstart.md の手順に従い環境を構築し、ペアリングから全機能が動作することを確認する（SC-001〜SC-007）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: 依存なし、即座に開始可能
- **Phase 2 (Foundational)**: Phase 1 完了後 — **すべてのユーザーストーリーをブロック**
- **Phase 3 (US1)**: Phase 2 完了後 — **US2〜US5 もブロック**（ペアリング基盤が前提）
- **Phase 4 (US2)**: Phase 3 完了後（ダッシュボードの骨格が必要）
- **Phase 5 (US3)**: Phase 3 完了後（並列実行可）
- **Phase 6 (US4)**: Phase 3 完了後（並列実行可）
- **Phase 7 (US5)**: Phase 3 + T013（Storage バケット）完了後（並列実行可）
- **Phase 8 (Polish)**: Phase 3〜7 の各ストーリーが完了後

---

## Implementation Strategy

### MVP First（User Story 1 のみ）

1. Phase 1: Setup 完了 ✓
2. Phase 2: Foundational 完了 ✓
3. Phase 3: US1 ペアリング設定 完了 ✓

### Incremental Delivery

1. Setup + Foundational → 基盤完成 ✓
2. US1 → ペアリング完了（MVP デモ可）✓
3. US2 → カウントダウン追加 ✓
4. US3 → 天気・距離追加 ✓
5. US4 → タスクリスト追加 ✓
6. US5 → アルバム追加 ✓
7. Polish → 残り T042〜T044

---

## Notes

- [P] = 異なるファイル・依存なし → 並列実行可能
- [USn] = 対応ユーザーストーリー（spec.md の優先度と一致）
- Phase 8 の T042〜T044 は UI改善・エラーハンドリング強化のため、Supabase 接続後に実施推奨
