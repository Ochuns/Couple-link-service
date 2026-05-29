'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import MealCard from './MealCard'
import type { MealPost, MealReaction } from '@/types/database'

type PostWithExtras = MealPost & { signedUrl: string; reactions: MealReaction[] }

interface Props {
  initialPosts: PostWithExtras[]
  coupleId: string
  currentUserId: string
}

const MAX_SIZE = 10 * 1024 * 1024

export default function MealFeed({ initialPosts, coupleId, currentUserId }: Props) {
  const [posts, setPosts] = useState<PostWithExtras[]>(initialPosts)
  const [memo, setMemo] = useState('')
  const [togetherFlag, setTogetherFlag] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Realtime: パートナーの新着投稿を反映
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`couple:${coupleId}:meals`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'meal_posts', filter: `couple_id=eq.${coupleId}` }, async (payload) => {
        const newPost = payload.new as MealPost
        if (newPost.created_by === currentUserId) return // 自分の投稿は楽観的更新済み
        const { data } = await supabase.storage.from('meal-photos').createSignedUrl(newPost.photo_path, 3600)
        setPosts(prev => [{ ...newPost, signedUrl: data?.signedUrl ?? '', reactions: [] }, ...prev])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [coupleId, currentUserId])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > MAX_SIZE) { setError('10MBを超えるファイルはアップロードできません'); return }
    setError(null)
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setPosting(true); setError(null)

    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${coupleId}/${crypto.randomUUID()}.${ext}`

    const { error: uploadErr } = await supabase.storage.from('meal-photos').upload(path, file)
    if (uploadErr) { setError('アップロードに失敗しました'); setPosting(false); return }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: postData } = await (supabase.from('meal_posts') as any)
      .insert({ couple_id: coupleId, photo_path: path, memo: memo || null, together_flag: togetherFlag, created_by: currentUserId })
      .select().single()

    if (postData) {
      const { data: signedData } = await supabase.storage.from('meal-photos').createSignedUrl(path, 3600)
      setPosts(prev => [{ ...(postData as MealPost), signedUrl: signedData?.signedUrl ?? '', reactions: [] }, ...prev])
    }

    setFile(null); setPreview(null); setMemo(''); setTogetherFlag(false)
    if (fileRef.current) fileRef.current.value = ''
    setPosting(false)
  }

  function handleDelete(id: string) {
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  function handleReaction(postId: string, emoji: string | null, reactionId: string | null) {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      if (!emoji) {
        return { ...p, reactions: p.reactions.filter(r => r.id !== reactionId) }
      }
      const existing = p.reactions.find(r => r.user_id === currentUserId)
      if (existing) {
        return { ...p, reactions: p.reactions.map(r => r.user_id === currentUserId ? { ...r, emoji } : r) }
      }
      return { ...p, reactions: [...p.reactions, { id: reactionId!, meal_post_id: postId, user_id: currentUserId, emoji, created_at: new Date().toISOString() }] }
    }))
  }

  return (
    <div className="space-y-5">
      {/* 投稿フォーム */}
      <form onSubmit={handlePost} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        {preview ? (
          <div className="relative aspect-square rounded-xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="プレビュー" className="w-full h-full object-cover" />
            <button type="button" onClick={() => { setFile(null); setPreview(null); if (fileRef.current) fileRef.current.value = '' }}
              className="absolute top-2 right-2 bg-black/50 text-white w-7 h-7 rounded-full text-sm">✕</button>
          </div>
        ) : (
          <label className="block border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-primary-300 transition-colors">
            <span className="text-3xl block mb-1">📷</span>
            <span className="text-sm text-gray-400">写真を選択（必須）</span>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="hidden" />
          </label>
        )}
        <input type="text" value={memo} onChange={e => setMemo(e.target.value)}
          placeholder="一言メモ（任意）"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={togetherFlag} onChange={e => setTogetherFlag(e.target.checked)} className="w-4 h-4 accent-primary-600" />
          <span className="text-sm text-gray-600">🍽️ 一緒に食べたよ</span>
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={!file || posting}
          className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm rounded-lg py-2 transition-colors">
          {posting ? '投稿中...' : '投稿する'}
        </button>
      </form>

      {/* フィード */}
      {posts.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-3">🍜</div>
          <p className="text-sm">まだ投稿がありません</p>
          <p className="text-xs mt-1">食事の写真を投稿してみましょう</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {posts.map(post => (
            <MealCard key={post.id} post={post} currentUserId={currentUserId} onDelete={handleDelete} onReaction={handleReaction} />
          ))}
        </div>
      )}
    </div>
  )
}
