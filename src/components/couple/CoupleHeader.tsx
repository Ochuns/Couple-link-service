'use client'

import { useMemo } from 'react'

interface CoupleHeaderProps {
  myName: string
  partnerName: string
  myAvatarUrl?: string | null
  partnerAvatarUrl?: string | null
  anniversaryDate: string | null
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-primary-100 flex items-center justify-center text-2xl font-bold text-primary-600 overflow-hidden flex-shrink-0 ring-2 ring-primary-200">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          name[0]
        )}
      </div>
      <span className="text-xs font-medium text-gray-600 max-w-[80px] truncate">{name}</span>
    </div>
  )
}

export default function CoupleHeader({
  myName,
  partnerName,
  myAvatarUrl,
  partnerAvatarUrl,
  anniversaryDate,
}: CoupleHeaderProps) {
  const dayCount = useMemo(() => {
    if (!anniversaryDate) return null
    const start = new Date(anniversaryDate)
    start.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return diff >= 0 ? diff + 1 : null
  }, [anniversaryDate])

  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-4 py-5 flex flex-col items-center gap-4">
      {/* 交際日数 */}
      {dayCount !== null ? (
        <div className="text-center">
          <p className="text-xs text-gray-400 mb-0.5">付き合って</p>
          <p className="text-4xl font-bold text-primary-600 leading-none">
            {dayCount.toLocaleString()}
            <span className="text-lg font-semibold text-gray-500 ml-1">日目</span>
          </p>
        </div>
      ) : (
        <p className="text-xs text-gray-400">記念日を設定しよう</p>
      )}

      {/* アバター行 */}
      <div className="flex items-center gap-5">
        <Avatar name={myName} avatarUrl={myAvatarUrl} />
        <span className="text-3xl select-none animate-pulse">💗</span>
        <Avatar name={partnerName} avatarUrl={partnerAvatarUrl} />
      </div>
    </div>
  )
}
