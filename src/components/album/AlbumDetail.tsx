'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { Reunion, ReunionPhoto } from '@/types/database'
import PhotoViewer from './PhotoViewer'

interface PhotoWithUrl extends ReunionPhoto {
  signedUrl: string
}

interface Props {
  reunion: Reunion & { photos: PhotoWithUrl[] }
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// アルバム詳細画面：全写真のグリッド表示、写真追加・削除、アルバム削除ができる
export default function AlbumDetail({ reunion }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 現在表示中の写真のインデックス（nullなら非表示）
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  // 保存済み写真リスト
  const [photos, setPhotos] = useState<PhotoWithUrl[]>(reunion.photos)
  // 追加しようとしている写真（まだ保存していない）
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  // pendingFilesのプレビューURL（filesと1対1で対応）
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null) // 削除中の写真ID
  const [error, setError] = useState<string | null>(null)
  // アルバム削除の確認モーダルを表示するか
  const [showDeleteAlbumModal, setShowDeleteAlbumModal] = useState(false)
  const [deletingAlbum, setDeletingAlbum] = useState(false)

  const dateStr = new Date(reunion.reunion_date).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric'
  })

  // ファイルが選択されたとき：サイズチェック後にプレビューを表示する（まだ保存しない）
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    if (selected.length === 0) return

    const oversized = selected.find((f) => f.size > MAX_FILE_SIZE)
    if (oversized) {
      setError('10MBを超えるファイルはアップロードできません')
      return
    }
    setError(null)

    // 既存のpendingに追加（上書きではなく追加）
    setPendingFiles((prev) => [...prev, ...selected])
    setPendingPreviews((prev) => [
      ...prev,
      ...selected.map((f) => URL.createObjectURL(f)),
    ])

    // 同じファイルを再選択できるようにinputをリセット
    e.target.value = ''
  }

  // プレビューから1枚取り消す（まだ保存していないのでStorageへのリクエストは不要）
  function handleRemovePending(index: number) {
    URL.revokeObjectURL(pendingPreviews[index])
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
    setPendingPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  // 追加をキャンセルして選択をすべてクリアする
  function handleCancelAdd() {
    pendingPreviews.forEach((url) => URL.revokeObjectURL(url))
    setPendingFiles([])
    setPendingPreviews([])
    setError(null)
  }

  // 「保存する」ボタン：pendingFilesをアップロードしてアルバムに追加する
  async function handleSavePhotos() {
    if (pendingFiles.length === 0) return
    setUploading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('couple_id')
      .eq('id', user.id)
      .single()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile = profileData as any

    // 現在の枚数を基準に表示順を決める
    const baseOrder = photos.length

    for (let i = 0; i < pendingFiles.length; i++) {
      const file = pendingFiles[i]
      const ext = file.name.split('.').pop()
      const path = `${profile.couple_id}/${reunion.id}/${crypto.randomUUID()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('reunion-photos')
        .upload(path, file)
      if (uploadError) continue

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: photoRow } = await (supabase.from('reunion_photos') as any).insert({
        reunion_id: reunion.id,
        storage_path: path,
        display_order: baseOrder + i,
        created_by: user.id,
      }).select().single()

      // アップロード成功した写真をグリッドに追加する
      if (photoRow) {
        const { data: urlData } = await supabase.storage
          .from('reunion-photos')
          .createSignedUrl(path, 3600)
        setPhotos((prev) => [...prev, {
          ...photoRow,
          signedUrl: urlData?.signedUrl ?? '',
        }])
      }
    }

    // 保存完了後にpendingをクリア
    pendingPreviews.forEach((url) => URL.revokeObjectURL(url))
    setPendingFiles([])
    setPendingPreviews([])
    setUploading(false)
  }

  // 写真を1枚削除する
  async function handleDeletePhoto(photo: PhotoWithUrl) {
    setDeleting(photo.id)
    const supabase = createClient()

    // Storageから削除
    await supabase.storage.from('reunion-photos').remove([photo.storage_path])
    // DBから削除
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('reunion_photos') as any).delete().eq('id', photo.id)

    setPhotos((prev) => prev.filter((p) => p.id !== photo.id))
    setDeleting(null)

    // 表示中の写真が削除された場合はビューアーを閉じる
    if (viewerIndex !== null) setViewerIndex(null)
  }

  // アルバム（再会記録）ごと削除する
  async function handleDeleteAlbum() {
    setDeletingAlbum(true)
    const supabase = createClient()

    // 全写真をStorageから削除
    const paths = photos.map((p) => p.storage_path)
    if (paths.length > 0) {
      await supabase.storage.from('reunion-photos').remove(paths)
    }

    // reunionsのレコードを削除（reunion_photosはON DELETE CASCADEで自動削除）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('reunions') as any).delete().eq('id', reunion.id)

    router.push('/album')
  }

  // 追加モード中かどうか（1枚以上選択済みのとき）
  const isAdding = pendingFiles.length > 0

  return (
    <div>
      {/* ヘッダー：戻るボタン、タイトル、削除ボタン */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => router.back()}
          className="text-gray-500 flex items-center gap-1 text-sm"
        >
          ← 戻る
        </button>
        <h1 className="text-base font-bold">{dateStr}</h1>
        <button
          onClick={() => setShowDeleteAlbumModal(true)}
          className="text-red-400 text-sm"
        >
          削除
        </button>
      </div>

      {/* コメント表示 */}
      {reunion.comment && (
        <p className="text-sm text-gray-600 mb-4 bg-gray-50 rounded-xl p-3">{reunion.comment}</p>
      )}

      {/* 保存済み写真グリッド：3列で表示（LINEアルバムスタイル） */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-3 gap-0.5">
          {photos.map((photo, index) => (
            <div key={photo.id} className="relative aspect-square">
              <button
                className="w-full h-full relative"
                onClick={() => setViewerIndex(index)}
              >
                <Image
                  src={photo.signedUrl}
                  alt={`写真 ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="33vw"
                />
              </button>
              {/* 削除ボタン：写真の右上に常時表示（モバイルではhoverが効かないため） */}
              <button
                onClick={() => handleDeletePhoto(photo)}
                disabled={deleting === photo.id}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs z-10"
                aria-label="写真を削除"
              >
                {deleting === photo.id ? '…' : '✕'}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400 text-sm">
          写真がありません
        </div>
      )}

      {/* 写真枚数表示 */}
      {!isAdding && (
        <p className="text-xs text-gray-400 text-center mt-2 mb-4">{photos.length}枚</p>
      )}

      {/* ── 追加モード（写真を選択後に表示） ── */}
      {isAdding && (
        <div className="mt-4 bg-gray-50 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">
            追加する写真
            <span className="text-xs font-normal text-gray-400 ml-1">（{pendingFiles.length}枚）</span>
          </p>

          {/* 選択中の写真プレビュー */}
          <div className="grid grid-cols-3 gap-1">
            {pendingPreviews.map((url, i) => (
              <div key={i} className="relative aspect-square">
                <Image
                  src={url}
                  alt={`追加予定の写真 ${i + 1}`}
                  fill
                  className="object-cover rounded-lg"
                />
                {/* プレビューからこの1枚を取り消すボタン */}
                <button
                  type="button"
                  onClick={() => handleRemovePending(i)}
                  className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs z-10"
                  aria-label="この写真を取り消す"
                >
                  ✕
                </button>
              </div>
            ))}
            {/* さらに写真を追加するボタン */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 text-xs gap-1"
            >
              <span className="text-xl">+</span>
              <span>追加</span>
            </button>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* 保存・キャンセルボタン */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSavePhotos}
              disabled={uploading}
              className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium rounded-xl py-2.5 text-sm transition-colors"
            >
              {uploading ? '保存中...' : '保存する'}
            </button>
            <button
              onClick={handleCancelAdd}
              disabled={uploading}
              className="flex-1 border border-gray-300 text-gray-600 rounded-xl py-2.5 text-sm disabled:opacity-50"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* ファイル入力（常にマウント、非表示） */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* 写真追加ボタン（追加モードでないときのみ表示） */}
      {!isAdding && (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-3 border-2 border-dashed border-primary-300 text-primary-600 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
        >
          <span className="text-lg">+</span> 写真を追加
        </button>
      )}

      {/* フルスクリーンフォトビューアー */}
      <PhotoViewer
        photos={photos}
        currentIndex={viewerIndex}
        onClose={() => setViewerIndex(null)}
        onPrev={() => setViewerIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
        onNext={() => setViewerIndex((i) => (i !== null && i < photos.length - 1 ? i + 1 : i))}
      />

      {/* アルバム削除確認モーダル */}
      {showDeleteAlbumModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center">
          <div className="bg-white rounded-t-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-base font-bold text-center">アルバムを削除しますか？</h2>
            <p className="text-sm text-gray-500 text-center">
              {dateStr}の再会記録と{photos.length}枚の写真がすべて削除されます。<br />
              この操作は取り消せません。
            </p>
            <button
              onClick={handleDeleteAlbum}
              disabled={deletingAlbum}
              className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl py-3 font-medium text-sm"
            >
              {deletingAlbum ? '削除中...' : '削除する'}
            </button>
            <button
              onClick={() => setShowDeleteAlbumModal(false)}
              className="w-full border border-gray-300 text-gray-600 rounded-xl py-3 text-sm"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
