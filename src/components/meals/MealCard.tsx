'use client'

import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { MealPost, MealReaction } from '@/types/database'

interface Props {
  post: MealPost & { signedUrl: string; reactions: MealReaction[] }
  currentUserId: string
  onDelete: (id: string) => void
  onLike: (postId: string, liked: boolean, reactionId: string | null) => void
}

export default function MealCard({ post, currentUserId, onDelete, onLike }: Props) {
  const myLike = post.reactions.find(r => r.user_id === currentUserId)
  const liked = !!myLike

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
        .select().single()
      if (data) onLike(post.id, true, (data as MealReaction).id)
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
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
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
          <button
            onClick={handleDelete}
            className="absolute top-2 right-2 bg-black/40 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center hover:bg-black/60"
          >
            ✕
          </button>
        )}
      </div>
      <div className="p-3">
        {post.memo && <p className="text-sm text-gray-700 mb-2">{post.memo}</p>}
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">{timeStr}</p>
          <button
            onClick={handleLike}
            className={`flex items-center gap-1 text-sm transition-transform active:scale-110 ${
              liked ? 'text-pink-500' : 'text-gray-300 hover:text-pink-300'
            }`}
          >
            <span className="text-xl">{liked ? '❤️' : '🤍'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
