'use client'

import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { MealPost, MealReaction } from '@/types/database'

const EMOJI_OPTIONS = ['😋', '❤️', '👏', '🔥', '😍']

interface Props {
  post: MealPost & { signedUrl: string; reactions: MealReaction[] }
  currentUserId: string
  onDelete: (id: string) => void
  onReaction: (postId: string, emoji: string | null, reactionId: string | null) => void
}

export default function MealCard({ post, currentUserId, onDelete, onReaction }: Props) {
  const [showEmoji, setShowEmoji] = useState(false)

  const myReaction = post.reactions.find(r => r.user_id === currentUserId)

  async function handleReaction(emoji: string) {
    const supabase = createClient()
    setShowEmoji(false)

    if (myReaction?.emoji === emoji) {
      // 同じ絵文字 → 取り消し
      onReaction(post.id, null, myReaction.id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('meal_reactions') as any).delete().eq('id', myReaction.id)
    } else if (myReaction) {
      // 別の絵文字に変更
      onReaction(post.id, emoji, myReaction.id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('meal_reactions') as any).update({ emoji }).eq('id', myReaction.id)
    } else {
      // 新規リアクション
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('meal_reactions') as any)
        .insert({ meal_post_id: post.id, user_id: currentUserId, emoji })
        .select().single()
      if (data) onReaction(post.id, emoji, (data as MealReaction).id)
    }
  }

  async function handleDelete() {
    onDelete(post.id)
    const supabase = createClient()
    await supabase.storage.from('meal-photos').remove([post.photo_path])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('meal_posts') as any).delete().eq('id', post.id)
  }

  const timeStr = new Date(post.created_at).toLocaleString('ja-JP', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="relative aspect-square">
        <Image src={post.signedUrl} alt="ごはん写真" fill className="object-cover" />
        {post.together_flag && (
          <div className="absolute top-2 left-2 bg-primary-600/90 text-white text-xs px-2 py-0.5 rounded-full">
            🍽️ 一緒に食べたよ
          </div>
        )}
        {post.created_by === currentUserId && (
          <button onClick={handleDelete} className="absolute top-2 right-2 bg-black/40 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center hover:bg-black/60">
            ✕
          </button>
        )}
      </div>
      <div className="p-3">
        {post.memo && <p className="text-sm text-gray-700 mb-2">{post.memo}</p>}
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">{timeStr}</p>
          <div className="flex items-center gap-2">
            {post.reactions.length > 0 && (
              <div className="flex gap-1">
                {post.reactions.map(r => (
                  <span key={r.id} className="text-base">{r.emoji}</span>
                ))}
              </div>
            )}
            <div className="relative">
              <button onClick={() => setShowEmoji(v => !v)} className="text-gray-400 hover:text-primary-500 text-lg leading-none">
                {myReaction ? myReaction.emoji : '🙂'}
              </button>
              {showEmoji && (
                <div className="absolute bottom-8 right-0 bg-white border border-gray-200 rounded-xl p-2 flex gap-1 shadow-lg z-10">
                  {EMOJI_OPTIONS.map(e => (
                    <button key={e} onClick={() => handleReaction(e)} className={`text-xl hover:scale-125 transition-transform ${myReaction?.emoji === e ? 'opacity-100' : 'opacity-70'}`}>{e}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
