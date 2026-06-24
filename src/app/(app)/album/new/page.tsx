'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Reunion } from '@/types/database'

const MAX_FILE_SIZE = 10 * 1024 * 1024

export default function NewReunionPage() {
  const router = useRouter()
  const [date, setDate] = useState('')
  const [comment, setComment] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    const oversized = selected.find((f) => f.size > MAX_FILE_SIZE)
    if (oversized) {
      setError('10MBを超えるファイルはアップロードできません')
      return
    }
    setError(null)
    setFiles(selected)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!date || files.length === 0) {
      setError('日付と写真は必須です')
      return
    }
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('couple_id')
      .eq('id', user.id)
      .single()
    const profile = profileData as Pick<Profile, 'couple_id'> | null

    if (!profile?.couple_id) { router.push('/onboarding'); return }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: reunionData, error: reunionError } = await (supabase.from('reunions') as any)
      .insert({
        couple_id: profile.couple_id,
        reunion_date: date,
        comment: comment || null,
        created_by: user.id,
      })
      .select()
      .single()
    const reunion = reunionData as Reunion | null

    if (reunionError || !reunion) {
      setError('投稿に失敗しました')
      setLoading(false)
      return
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const ext = file.name.split('.').pop()
      const path = `${profile.couple_id}/${reunion.id}/${crypto.randomUUID()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('reunion-photos')
        .upload(path, file)

      if (uploadError) continue

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('reunion_photos') as any).insert({
        reunion_id: reunion.id,
        storage_path: path,
        display_order: i,
        created_by: user.id,
      })
    }

    router.push('/album')
  }

  return (
    <div>
      <h1 className="text-lg font-bold mb-5">再会を記録する 📸</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">再会日</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">写真</label>
          <input
            type="file"
            required
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFileChange}
            className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-700"
          />
          {files.length > 0 && (
            <p className="text-xs text-gray-400 mt-1">{files.length}枚選択中</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">コメント（任意）</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            placeholder="この再会の一言メモ"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium rounded-lg py-2 text-sm transition-colors"
          >
            {loading ? '投稿中...' : '投稿する'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm"
          >
            キャンセル
          </button>
        </div>
      </form>
    </div>
  )
}
