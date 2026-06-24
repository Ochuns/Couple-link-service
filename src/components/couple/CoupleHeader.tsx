'use client'

import { useMemo, useState, useCallback } from 'react'
import confetti from 'canvas-confetti'

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
      <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-2xl font-bold text-primary-600 overflow-hidden flex-shrink-0 ring-2 ring-primary-200">
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

const MAX_CLICKS = 10
const RADIUS = 26
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function HeartGauge() {
  const [count, setCount] = useState(0)
  const [burst, setBurst] = useState(false)

  const handleClick = useCallback(() => {
    setCount(prev => {
      const next = prev + 1
      if (next >= MAX_CLICKS) {
        setBurst(true)
        // クラッカー演出
        const launch = (angle: number, origin: { x: number; y: number }) =>
          confetti({
            particleCount: 60,
            angle,
            spread: 55,
            origin,
            colors: ['#f472b6', '#fb7185', '#e879f9', '#c084fc', '#f9a8d4'],
          })
        launch(60, { x: 0.35, y: 0.5 })
        launch(120, { x: 0.65, y: 0.5 })
        setTimeout(() => {
          setCount(0)
          setBurst(false)
        }, 2000)
        return MAX_CLICKS
      }
      return next
    })
  }, [])

  const dashOffset = CIRCUMFERENCE * (1 - count / MAX_CLICKS)
  const progress = count / MAX_CLICKS
  // ゲージが溜まるほどピンク→赤に近づく
  const ringColor = progress === 1 ? '#f43f5e' : progress > 0.5 ? '#fb7185' : '#f9a8d4'

  return (
    <button
      onClick={handleClick}
      className="relative flex items-center justify-center focus:outline-none"
      style={{ width: 72, height: 72 }}
      aria-label="ハートを押す"
    >
      {/* SVGゲージリング */}
      <svg
        width={72}
        height={72}
        className="absolute inset-0 -rotate-90"
        viewBox="0 0 72 72"
      >
        {/* 背景トラック */}
        <circle
          cx={36}
          cy={36}
          r={RADIUS}
          fill="none"
          stroke="#fce7f3"
          strokeWidth={4}
        />
        {/* 進捗リング */}
        <circle
          cx={36}
          cy={36}
          r={RADIUS}
          fill="none"
          stroke={ringColor}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.25s ease, stroke 0.25s ease' }}
        />
      </svg>

      {/* ハートアイコン */}
      <span
        className="text-3xl select-none relative z-10"
        style={{
          transform: burst ? 'scale(1.5)' : count > 0 ? `scale(${1 + count * 0.03})` : 'scale(1)',
          transition: 'transform 0.2s ease',
          filter: burst ? 'drop-shadow(0 0 8px #f43f5e)' : undefined,
        }}
      >
        {burst ? '💖' : count > 5 ? '❤️' : '🤍'}
      </span>
    </button>
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
      <div className="flex items-center gap-4">
        <Avatar name={myName} avatarUrl={myAvatarUrl} />
        <HeartGauge />
        <Avatar name={partnerName} avatarUrl={partnerAvatarUrl} />
      </div>
    </div>
  )
}
