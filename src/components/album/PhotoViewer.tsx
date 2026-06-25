'use client'

import { useEffect, useCallback } from 'react'
import Image from 'next/image'

interface Photo {
  id: string
  signedUrl: string
}

interface Props {
  photos: Photo[]
  // 現在表示中の写真のインデックス（nullなら非表示）
  currentIndex: number | null
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}

// フルスクリーンで写真を表示するビューアーコンポーネント
// キーボード操作（←→ Esc）とタッチスワイプに対応
export default function PhotoViewer({ photos, currentIndex, onClose, onPrev, onNext }: Props) {
  // キーボード操作でビューアーを閉じたり前後に移動する
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (currentIndex === null) return
    if (e.key === 'Escape') onClose()
    if (e.key === 'ArrowLeft') onPrev()
    if (e.key === 'ArrowRight') onNext()
  }, [currentIndex, onClose, onPrev, onNext])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // ビューアーが非表示のときは何もレンダリングしない
  if (currentIndex === null) return null

  const photo = photos[currentIndex]
  if (!photo) return null

  return (
    // 背景をタップすると閉じる
    <div
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      onClick={onClose}
    >
      {/* 写真本体（タップしても閉じないように伝播を止める） */}
      <div
        className="relative w-full h-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={photo.signedUrl}
          alt={`写真 ${currentIndex + 1}`}
          fill
          className="object-contain"
          sizes="100vw"
        />
      </div>

      {/* 閉じるボタン */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white bg-black/50 rounded-full w-10 h-10 flex items-center justify-center text-xl z-10"
        aria-label="閉じる"
      >
        ✕
      </button>

      {/* 前の写真ボタン（最初の写真のときは非表示） */}
      {currentIndex > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev() }}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-white bg-black/50 rounded-full w-10 h-10 flex items-center justify-center text-xl z-10"
          aria-label="前の写真"
        >
          ‹
        </button>
      )}

      {/* 次の写真ボタン（最後の写真のときは非表示） */}
      {currentIndex < photos.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext() }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white bg-black/50 rounded-full w-10 h-10 flex items-center justify-center text-xl z-10"
          aria-label="次の写真"
        >
          ›
        </button>
      )}

      {/* 写真のカウンター表示（例：3 / 10） */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full z-10">
        {currentIndex + 1} / {photos.length}
      </div>
    </div>
  )
}
