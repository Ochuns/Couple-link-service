'use client'

// ごはんシェア機能のメインコンポーネント
// 投稿フォームと投稿一覧（フィード）を管理する
// Supabase Realtime でパートナーの新着投稿をリアルタイムに受信する

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import MealCard from './MealCard'
import type { MealPost, MealReaction } from '@/types/database'

// 投稿データ + 署名付きURL + リアクション情報をまとめた型
type PostWithExtras = MealPost & { signedUrl: string; reactions: MealReaction[] }

interface Props {
  initialPosts: PostWithExtras[] // サーバーサイドで取得した初期投稿一覧
  coupleId: string               // カップルID（Realtime フィルタリングに使用）
  currentUserId: string          // ログイン中のユーザーID
}

// アップロード可能な最大ファイルサイズ（10MB）
const MAX_SIZE = 10 * 1024 * 1024

export default function MealFeed({ initialPosts, coupleId, currentUserId }: Props) {
  // 投稿一覧の状態管理
  const [posts, setPosts] = useState<PostWithExtras[]>(initialPosts)

  // 投稿フォームの各フィールドの状態
  const [dishName, setDishName] = useState('')      // 料理名
  const [memo, setMemo] = useState('')              // 一言キャプション
  const [recipe, setRecipe] = useState('')          // 作り方（複数行）
  const [togetherFlag, setTogetherFlag] = useState(false) // 一緒に食べたか
  const [file, setFile] = useState<File | null>(null)     // 選択された画像ファイル
  const [preview, setPreview] = useState<string | null>(null) // プレビュー用のURLオブジェクト

  // UI の状態
  const [error, setError] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)
  const [filterFavorites, setFilterFavorites] = useState(false) // お気に入りフィルター
  const [showForm, setShowForm] = useState(false) // 投稿フォームの表示/非表示

  // ファイル入力要素への参照（投稿後にリセットするために使用）
  const fileRef = useRef<HTMLInputElement>(null)

  // Supabase Realtime でパートナーの新着投稿を受信する
  // パートナーが投稿した場合のみ、フィードに追加する（自分の投稿は handlePost 内で追加済み）
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`couple:${coupleId}:meals`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'meal_posts',
          filter: `couple_id=eq.${coupleId}`,
        },
        async (payload) => {
          const newPost = payload.new as MealPost
          // 自分の投稿は handlePost 内で既にフィードに追加しているのでスキップ
          if (newPost.created_by === currentUserId) return
          // 写真を表示するための署名付きURLを取得（1時間有効）
          const { data } = await supabase.storage
            .from('meal-photos')
            .createSignedUrl(newPost.photo_path, 3600)
          setPosts(prev => [
            { ...newPost, signedUrl: data?.signedUrl ?? '', reactions: [] },
            ...prev,
          ])
        }
      )
      .subscribe()

    // コンポーネントが画面から消えたときにチャンネルを解除する（メモリリーク防止）
    return () => { supabase.removeChannel(channel) }
  }, [coupleId, currentUserId])

  // ユーザーが画像ファイルを選択したときの処理
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] // 選択されたファイルを取得
    if (!f) return
    // ファイルサイズが10MBを超える場合はエラーを表示して中止
    if (f.size > MAX_SIZE) {
      setError('10MBを超えるファイルはアップロードできません')
      return
    }
    setError(null)
    setFile(f)
    // ブラウザ内でプレビュー表示するためのURLを生成
    setPreview(URL.createObjectURL(f))
  }

  // 投稿ボタンを押したときの処理
  async function handlePost(e: React.FormEvent) {
    e.preventDefault() // フォームのデフォルト送信（ページリロード）を防ぐ
    if (!file) return   // 画像が選択されていなければ何もしない
    setPosting(true)
    setError(null)

    const supabase = createClient()

    // ファイルパスを「カップルID/ランダムなUUID.拡張子」の形式で生成（衝突を防ぐため）
    const ext = file.name.split('.').pop()
    const path = `${coupleId}/${crypto.randomUUID()}.${ext}`

    // Supabase Storage に画像をアップロード
    const { error: uploadErr } = await supabase.storage
      .from('meal-photos')
      .upload(path, file)
    if (uploadErr) {
      setError('アップロードに失敗しました')
      setPosting(false)
      return
    }

    // データベースに投稿データを保存（dish_name・memo・recipe なども含む）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: postData } = await (supabase.from('meal_posts') as any)
      .insert({
        couple_id: coupleId,
        photo_path: path,
        dish_name: dishName || null,    // 空文字の場合は null として保存
        memo: memo || null,
        recipe: recipe || null,
        together_flag: togetherFlag,
        created_by: currentUserId,
      })
      .select()
      .single()

    if (postData) {
      // 保存した投稿の写真を表示するための署名付きURLを取得
      const { data: signedData } = await supabase.storage
        .from('meal-photos')
        .createSignedUrl(path, 3600)
      // フィードの先頭に新しい投稿を追加
      setPosts(prev => [
        { ...(postData as MealPost), signedUrl: signedData?.signedUrl ?? '', reactions: [] },
        ...prev,
      ])
    }

    // フォームの状態をすべてリセット
    setFile(null)
    setPreview(null)
    setDishName('')
    setMemo('')
    setRecipe('')
    setTogetherFlag(false)
    if (fileRef.current) fileRef.current.value = ''
    setPosting(false)
    setShowForm(false) // 投稿後にフォームを閉じる
  }

  // 投稿を削除したときにフィードから除去する
  function handleDelete(id: string) {
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  // 投稿を編集して保存したときに、フィード内の該当カードを更新する
  function handleUpdate(id: string, fields: Pick<MealPost, 'dish_name' | 'memo' | 'recipe' | 'together_flag'>) {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, ...fields } : p))
  }

  // ハートボタンを押したときにリアクション状態を更新する
  function handleLike(postId: string, liked: boolean, reactionId: string | null) {
    setPosts(prev =>
      prev.map(p => {
        if (p.id !== postId) return p
        if (!liked) {
          // ハートを外した場合：該当のリアクションを削除
          return { ...p, reactions: p.reactions.filter(r => r.id !== reactionId) }
        }
        // ハートを押した場合：新しいリアクションを追加
        return {
          ...p,
          reactions: [
            ...p.reactions,
            {
              id: reactionId!,
              meal_post_id: postId,
              user_id: currentUserId,
              emoji: '❤️',
              created_at: new Date().toISOString(),
            },
          ],
        }
      })
    )
  }

  // フィルターの状態に応じて表示する投稿を絞り込む
  const displayedPosts = filterFavorites
    ? posts.filter(p => p.reactions.some(r => r.user_id === currentUserId))
    : posts

  // 自分がハートを押した投稿の数
  const favoriteCount = posts.filter(p =>
    p.reactions.some(r => r.user_id === currentUserId)
  ).length

  return (
    <div className="space-y-5">

      {/* 新規投稿ボタン（フォームが閉じているときに表示） */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-2xl py-3 transition-colors"
        >
          <span className="text-lg">📷</span>
          ごはんを投稿する
        </button>
      )}

      {/* 投稿フォーム（showForm が true のときに表示） */}
      {showForm && (
        <form
          onSubmit={handlePost}
          className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
        >
          {/* フォームのヘッダー */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <button
              type="button"
              onClick={() => { setShowForm(false); setFile(null); setPreview(null) }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              キャンセル
            </button>
            <span className="text-sm font-semibold text-gray-800">新しい投稿</span>
            <button
              type="submit"
              disabled={!file || posting}
              className="text-sm font-semibold text-primary-600 disabled:opacity-40 hover:text-primary-700"
            >
              {posting ? '投稿中...' : 'シェアする'}
            </button>
          </div>

          {/* 画像選択エリア */}
          {preview ? (
            <div className="relative aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="プレビュー" className="w-full h-full object-cover" />
              {/* 画像をリセットするボタン */}
              <button
                type="button"
                onClick={() => {
                  setFile(null)
                  setPreview(null)
                  if (fileRef.current) fileRef.current.value = ''
                }}
                className="absolute top-2 right-2 bg-black/50 text-white w-8 h-8 rounded-full text-sm flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          ) : (
            // 写真が選択されていないときは点線のアップロードエリアを表示
            <label className="block border-b border-gray-100 p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors">
              <span className="text-5xl block mb-2">📷</span>
              <span className="text-sm text-gray-400">タップして写真を選択（必須）</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          )}

          {/* テキスト入力エリア */}
          <div className="p-4 space-y-3">
            {/* 料理名の入力 */}
            <input
              type="text"
              value={dishName}
              onChange={e => setDishName(e.target.value)}
              placeholder="料理名（例：チキンカレー）"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-400"
            />

            {/* 一言キャプションの入力 */}
            <input
              type="text"
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder="一言コメント（任意）"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />

            {/* 作り方の入力（複数行テキストエリア） */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                🍳 作り方（任意）
              </label>
              <textarea
                value={recipe}
                onChange={e => setRecipe(e.target.value)}
                placeholder={`例：\n1. 玉ねぎを炒める\n2. 鶏肉を加えて色が変わるまで炒める\n3. カレールーを入れて10分煮込む`}
                rows={5}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
              />
            </div>

            {/* 一緒に食べたかどうかのチェックボックス */}
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={togetherFlag}
                onChange={e => setTogetherFlag(e.target.checked)}
                className="w-4 h-4 accent-primary-600"
              />
              <span className="text-sm text-gray-600">🍽️ 一緒に食べたよ</span>
            </label>

            {/* エラーメッセージ */}
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        </form>
      )}

      {/* お気に入り・全件フィルターボタン */}
      {posts.length > 0 && (
        <div className="flex gap-2">
          <button
            onClick={() => setFilterFavorites(false)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
              !filterFavorites
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            すべて（{posts.length}）
          </button>
          <button
            onClick={() => setFilterFavorites(true)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
              filterFavorites
                ? 'bg-pink-500 text-white border-pink-500'
                : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            ❤️ お気に入り（{favoriteCount}）
          </button>
        </div>
      )}

      {/* 投稿フィード */}
      {displayedPosts.length === 0 ? (
        // 投稿がない場合の空状態メッセージ
        <div className="text-center py-12 text-gray-400">
          {filterFavorites ? (
            <>
              <div className="text-5xl mb-3">🤍</div>
              <p className="text-sm">お気に入りの投稿はまだありません</p>
              <p className="text-xs mt-1">気に入った投稿にハートを押してみましょう</p>
            </>
          ) : (
            <>
              <div className="text-5xl mb-3">🍜</div>
              <p className="text-sm">まだ投稿がありません</p>
              <p className="text-xs mt-1">食事の写真を投稿してみましょう</p>
            </>
          )}
        </div>
      ) : (
        // 投稿カードの一覧（2カラムグリッドで表示）
        <div className="grid grid-cols-2 gap-3">
          {displayedPosts.map(post => (
            <MealCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              onDelete={handleDelete}
              onLike={handleLike}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}
    </div>
  )
}
