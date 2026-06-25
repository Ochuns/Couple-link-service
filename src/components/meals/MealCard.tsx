'use client'

// ごはんシェアの投稿1件を表示するカードコンポーネント
// 自分の投稿はクリックで編集モーダルが開く

import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { MealPost, MealReaction } from '@/types/database'

interface Props {
  post: MealPost & { signedUrl: string; reactions: MealReaction[] }
  currentUserId: string
  onDelete: (id: string) => void
  onLike: (postId: string, liked: boolean, reactionId: string | null) => void
  // 編集保存後に親（MealFeed）の状態を更新するためのコールバック
  onUpdate: (id: string, fields: Pick<MealPost, 'dish_name' | 'memo' | 'recipe' | 'together_flag'>) => void
}

export default function MealCard({ post, currentUserId, onDelete, onLike, onUpdate }: Props) {
  const isOwn = post.created_by === currentUserId // 自分の投稿かどうか

  // ハートを押しているか確認
  const myLike = post.reactions.find(r => r.user_id === currentUserId)
  const liked = !!myLike

  // 作り方の展開/折りたたみ状態
  const [recipeExpanded, setRecipeExpanded] = useState(false)

  // 削除確認モーダルの表示状態
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  // 編集モーダルの開閉状態
  const [editing, setEditing] = useState(false)

  // 編集フォームの各フィールド（モーダルを開いたときに現在値で初期化する）
  const [editDishName, setEditDishName] = useState(post.dish_name ?? '')
  const [editMemo, setEditMemo] = useState(post.memo ?? '')
  const [editRecipe, setEditRecipe] = useState(post.recipe ?? '')
  const [editTogetherFlag, setEditTogetherFlag] = useState(post.together_flag)
  const [saving, setSaving] = useState(false)

  // 自分の投稿のカード（写真部分）をクリックしたときに編集モーダルを開く
  function openEdit() {
    // モーダルを開く前に、現在の投稿の値でフォームを初期化する
    setEditDishName(post.dish_name ?? '')
    setEditMemo(post.memo ?? '')
    setEditRecipe(post.recipe ?? '')
    setEditTogetherFlag(post.together_flag)
    setEditing(true)
  }

  // 保存ボタンを押したときの処理
  async function handleSave() {
    setSaving(true)
    const supabase = createClient()

    // データベースの投稿レコードを更新する
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('meal_posts') as any)
      .update({
        dish_name: editDishName || null,  // 空文字は null として保存
        memo: editMemo || null,
        recipe: editRecipe || null,
        together_flag: editTogetherFlag,
      })
      .eq('id', post.id)

    // 親コンポーネントの状態を更新して画面に即時反映する
    onUpdate(post.id, {
      dish_name: editDishName || null,
      memo: editMemo || null,
      recipe: editRecipe || null,
      together_flag: editTogetherFlag,
    })

    setSaving(false)
    setEditing(false)
  }

  // ハートボタンを押したときの処理
  async function handleLike() {
    const supabase = createClient()
    if (liked && myLike) {
      onLike(post.id, false, myLike.id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('meal_reactions') as any).delete().eq('id', myLike.id)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('meal_reactions') as any)
        .insert({ meal_post_id: post.id, user_id: currentUserId, emoji: '❤️' })
        .select()
        .single()
      if (data) onLike(post.id, true, (data as MealReaction).id)
    }
  }

  // 削除ボタンを押したときの処理
  async function handleDelete() {
    onDelete(post.id)
    const supabase = createClient()
    await supabase.storage.from('meal-photos').remove([post.photo_path])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('meal_posts') as any).delete().eq('id', post.id)
  }

  const timeStr = new Date(post.created_at).toLocaleString('ja-JP', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const likeCount = post.reactions.length

  return (
    <>
      {/* ---- カード本体 ---- */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">

        {/* ヘッダー：日時・バッジ・削除ボタン */}
        <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-gray-50">
          <span className="text-[10px] text-gray-400">{timeStr}</span>
          <div className="flex items-center gap-1.5">
            {isOwn && (
              <button
                onClick={() => setConfirmingDelete(true)}
                className="text-gray-300 hover:text-red-400 text-[10px] transition-colors"
                aria-label="投稿を削除"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* 写真エリア
            自分の投稿の場合は右上に ✏️ アイコンを表示してタップで編集できることを示す */}
        <div
          className={`relative aspect-square ${isOwn ? 'cursor-pointer' : ''}`}
          onClick={isOwn ? openEdit : undefined}
        >
          <Image src={post.signedUrl} alt="ごはん写真" fill className="object-cover" />
          {/* 自分の投稿だけ編集アイコンを重ねて表示 */}
          {isOwn && (
            <div className="absolute top-2 right-2 bg-black/40 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center">
              ✏️
            </div>
          )}
        </div>

        {/* 詳細エリア */}
        <div className="px-2.5 pt-2 pb-2.5 space-y-1">
          {/* ハートボタンと一緒に食べたバッジを同じ行に表示 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleLike}
                className={`flex items-center transition-transform active:scale-110 ${
                  liked ? 'text-pink-500' : 'text-gray-300 hover:text-pink-300'
                }`}
                aria-label={liked ? 'ハートを外す' : 'ハートを押す'}
              >
                <span className="text-lg">{liked ? '❤️' : '🤍'}</span>
              </button>
              {likeCount > 0 && (
                <span className="text-xs font-semibold text-gray-700">{likeCount}</span>
              )}
            </div>
            {/* 一緒に食べたよフラグが立っているときだけ右側に表示 */}
            {post.together_flag && (
              <span className="text-base">🍽️</span>
            )}
          </div>

          {post.dish_name && (
            <p className="text-xs font-bold text-gray-900 leading-snug">{post.dish_name}</p>
          )}
          {post.memo && (
            <p className="text-[11px] text-gray-600 leading-snug line-clamp-2">{post.memo}</p>
          )}

          {/* 作り方の展開表示 */}
          {post.recipe && (
            <div>
              <button
                onClick={() => setRecipeExpanded(prev => !prev)}
                className="flex items-center gap-1 text-[10px] font-medium text-primary-600 hover:text-primary-700 transition-colors"
              >
                <span>🍳 作り方</span>
                <span className={`transition-transform ${recipeExpanded ? 'rotate-180' : ''}`}>▼</span>
              </button>
              {recipeExpanded && (
                <div className="mt-1.5 bg-amber-50 rounded-lg px-2 py-1.5">
                  <p className="text-[11px] text-gray-700 leading-relaxed whitespace-pre-line">
                    {post.recipe}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* ---- 削除確認モーダル
           ✕ ボタンを押したときに表示する。背景タップでキャンセル ---- */}
      {confirmingDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end"
          onClick={() => setConfirmingDelete(false)}
        >
          <div
            className="w-full bg-white rounded-t-2xl p-5 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-center text-sm font-semibold text-gray-800">この投稿を削除しますか？</p>
            <p className="text-center text-xs text-gray-400">削除すると元に戻せません</p>
            <button
              onClick={() => { setConfirmingDelete(false); handleDelete() }}
              className="w-full py-3 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
            >
              削除する
            </button>
            <button
              onClick={() => setConfirmingDelete(false)}
              className="w-full py-3 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* ---- 編集モーダル（ボトムシート）
           editing が true のときだけ表示する
           画面全体を暗くする背景と、下から現れる編集フォームで構成 ---- */}
      {editing && (
        // 背景のオーバーレイ：クリックでキャンセル
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end"
          onClick={() => setEditing(false)}
        >
          {/* フォーム本体：クリックが背景に伝わらないよう stopPropagation する */}
          <div
            className="w-full bg-white rounded-t-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* モーダルのヘッダー */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setEditing(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                キャンセル
              </button>
              <span className="text-sm font-semibold text-gray-800">投稿を編集</span>
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-sm font-semibold text-primary-600 disabled:opacity-40 hover:text-primary-700"
              >
                {saving ? '保存中...' : '保存する'}
              </button>
            </div>

            {/* 料理名の入力 */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">料理名</label>
              <input
                type="text"
                value={editDishName}
                onChange={e => setEditDishName(e.target.value)}
                placeholder="例：チキンカレー"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>

            {/* 一言コメントの入力 */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">一言コメント</label>
              <input
                type="text"
                value={editMemo}
                onChange={e => setEditMemo(e.target.value)}
                placeholder="例：今日も美味しかった！"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>

            {/* 作り方の入力（複数行） */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">🍳 作り方</label>
              <textarea
                value={editRecipe}
                onChange={e => setEditRecipe(e.target.value)}
                placeholder={`例：\n1. 玉ねぎを炒める\n2. 鶏肉を加える`}
                rows={5}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
              />
            </div>

            {/* 一緒に食べたよ チェックボックス */}
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={editTogetherFlag}
                onChange={e => setEditTogetherFlag(e.target.checked)}
                className="w-4 h-4 accent-primary-600"
              />
              <span className="text-sm text-gray-600">🍽️ 一緒に食べたよ</span>
            </label>
          </div>
        </div>
      )}
    </>
  )
}
