'use client'

// ごはんシェアの投稿1件を表示するカードコンポーネント
// インスタグラムの投稿のように、写真・料理名・キャプション・作り方・ハートボタンを表示する

import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { MealPost, MealReaction } from '@/types/database'

interface Props {
  post: MealPost & { signedUrl: string; reactions: MealReaction[] }
  currentUserId: string // ログイン中のユーザーID
  onDelete: (id: string) => void
  onLike: (postId: string, liked: boolean, reactionId: string | null) => void
}

export default function MealCard({ post, currentUserId, onDelete, onLike }: Props) {
  // 自分がこの投稿にハートを押しているか確認
  const myLike = post.reactions.find(r => r.user_id === currentUserId)
  const liked = !!myLike // myLike が存在すれば true

  // 作り方の展開/折りたたみ状態
  const [recipeExpanded, setRecipeExpanded] = useState(false)

  // ハートボタンを押したときの処理
  async function handleLike() {
    const supabase = createClient()

    if (liked && myLike) {
      // すでにハートを押している場合：取り消す（データベースから削除）
      onLike(post.id, false, myLike.id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('meal_reactions') as any).delete().eq('id', myLike.id)
    } else {
      // まだハートを押していない場合：追加する（データベースに挿入）
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
    onDelete(post.id) // 先にUIから除去してレスポンスを即時に見せる（楽観的UI更新）
    const supabase = createClient()
    // Storage から写真ファイルを削除
    await supabase.storage.from('meal-photos').remove([post.photo_path])
    // データベースから投稿レコードを削除
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('meal_posts') as any).delete().eq('id', post.id)
  }

  // 投稿日時を「6月25日 12:34」のような形式に変換
  const timeStr = new Date(post.created_at).toLocaleString('ja-JP', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  // ハートの合計数（カップル2人分）
  const likeCount = post.reactions.length

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">

      {/* カードのヘッダー：投稿日時・削除ボタン */}
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-gray-50">
        <span className="text-[10px] text-gray-400">{timeStr}</span>
        <div className="flex items-center gap-1.5">
          {/* 一緒に食べたよ バッジ */}
          {post.together_flag && (
            <span className="text-[10px] text-primary-600">🍽️</span>
          )}
          {/* 自分の投稿にのみ削除ボタンを表示 */}
          {post.created_by === currentUserId && (
            <button
              onClick={handleDelete}
              className="text-gray-300 hover:text-red-400 text-[10px] transition-colors"
              aria-label="投稿を削除"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 写真エリア（正方形で表示） */}
      <div className="relative aspect-square">
        <Image src={post.signedUrl} alt="ごはん写真" fill className="object-cover" />
      </div>

      {/* 投稿の詳細エリア（2列表示に合わせてコンパクトに） */}
      <div className="px-2.5 pt-2 pb-2.5 space-y-1">

        {/* アクションバー：ハートボタン */}
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
          {/* ハートの数が1以上のときだけ件数を表示 */}
          {likeCount > 0 && (
            <span className="text-xs font-semibold text-gray-700">{likeCount}</span>
          )}
        </div>

        {/* 料理名（設定されている場合のみ表示） */}
        {post.dish_name && (
          <p className="text-xs font-bold text-gray-900 leading-snug">{post.dish_name}</p>
        )}

        {/* 一言キャプション（設定されている場合のみ表示、長い場合は2行で切る） */}
        {post.memo && (
          <p className="text-[11px] text-gray-600 leading-snug line-clamp-2">{post.memo}</p>
        )}

        {/* 作り方セクション（recipe が設定されている場合のみ表示） */}
        {post.recipe && (
          <div>
            {/* 展開/折りたたみボタン */}
            <button
              onClick={() => setRecipeExpanded(prev => !prev)}
              className="flex items-center gap-1 text-[10px] font-medium text-primary-600 hover:text-primary-700 transition-colors"
            >
              <span>🍳 作り方</span>
              {/* 開閉状態に応じてアイコンを切り替え */}
              <span className={`transition-transform ${recipeExpanded ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>

            {/* 展開時に作り方テキストを表示 */}
            {recipeExpanded && (
              <div className="mt-1.5 bg-amber-50 rounded-lg px-2 py-1.5">
                {/* 改行を保持して表示（whitespace-pre-line） */}
                <p className="text-[11px] text-gray-700 leading-relaxed whitespace-pre-line">
                  {post.recipe}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
