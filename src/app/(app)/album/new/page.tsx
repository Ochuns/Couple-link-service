'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Reunion } from '@/types/database'

const MAX_FILE_SIZE = 10 * 1024 * 1024

// ファイルからブラウザ上で表示できるプレビューURLを生成するユーティリティ
function createPreviews(files: File[]): string[] {
  return files.map((f) => URL.createObjectURL(f))
}

export default function NewReunionPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [date, setDate] = useState('')
  const [comment, setComment] = useState('')
  // 選択されたファイルの配列
  const [files, setFiles] = useState<File[]>([])
  // プレビュー表示用のオブジェクトURL配列（filesと1対1で対応）
  const [previews, setPreviews] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // ファイルが選択されたときに呼ばれる
  // サイズチェック後、既存の選択に追加する形でstateを更新する
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    if (selected.length === 0) return

    const oversized = selected.find((f) => f.size > MAX_FILE_SIZE)
    if (oversized) {
      setError('10MBを超えるファイルはアップロードできません')
      return
    }
    setError(null)

    // 既存の選択に新しいファイルを追加（上書きではなく追加）
    setFiles((prev) => [...prev, ...selected])
    setPreviews((prev) => [...prev, ...createPreviews(selected)])

    // 同じファイルを再度選択できるようにinputをリセット
    e.target.value = ''
  }

  // プレビューから1枚削除する
  function handleRemoveFile(index: number) {
    URL.revokeObjectURL(previews[index])
    setFiles((prev) => prev.filter((_, i) => i !== index))
    setPreviews((prev) => prev.filter((_, i) => i !== index))
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

        {/* 写真選択エリア */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            写真
            <span className="text-xs font-normal text-gray-400 ml-1">（複数枚選択できます）</span>
          </label>

          {/* 隠しファイル入力 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          {/* プレビューグリッド：選択した写真のサムネイルを3列で表示 */}
          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-1 mb-2">
              {previews.map((url, i) => (
                <div key={i} className="relative aspect-square">
                  <Image
                    src={url}
                    alt={`選択中の写真 ${i + 1}`}
                    fill
                    className="object-cover rounded-lg"
                  />
                  {/* 各サムネイルの右上に削除ボタン */}
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(i)}
                    className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs z-10"
                    aria-label="この写真を削除"
                  >
                    ✕
                  </button>
                </div>
              ))}

              {/* 追加ボタン：既に選択済みの写真に追加できる */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 text-xs gap-1"
              >
                <span className="text-xl">+</span>
                <span>追加</span>
              </button>
            </div>
          )}

          {/* まだ写真が選ばれていないときの選択ボタン */}
          {previews.length === 0 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-8 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 gap-2"
            >
              <span className="text-3xl">📷</span>
              <span className="text-sm">タップして写真を選ぶ</span>
              <span className="text-xs">複数枚まとめて選択できます</span>
            </button>
          )}

          {previews.length > 0 && (
            <p className="text-xs text-gray-400">{previews.length}枚選択中</p>
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
            disabled={loading || files.length === 0}
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
