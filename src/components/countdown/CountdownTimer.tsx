'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  nextReunionAt: string | null
  coupleId: string
}

export default function CountdownTimer({ nextReunionAt: initialAt, coupleId }: Props) {
  const [nextReunionAt, setNextReunionAt] = useState(initialAt)
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number } | null>(null)
  const [isPast, setIsPast] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`couple:${coupleId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'couples', filter: `id=eq.${coupleId}` },
        (payload) => {
          const updated = payload.new as { next_reunion_at: string | null }
          setNextReunionAt(updated.next_reunion_at)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [coupleId])

  useEffect(() => {
    if (!nextReunionAt) {
      setTimeLeft(null)
      return
    }

    function calculate() {
      const diff = new Date(nextReunionAt!).getTime() - Date.now()
      if (diff <= 0) {
        setIsPast(true)
        setTimeLeft({ days: 0, hours: 0, minutes: 0 })
        return
      }
      setIsPast(false)
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
      })
    }

    calculate()
    const timer = setInterval(calculate, 60000)
    return () => clearInterval(timer)
  }, [nextReunionAt])

  if (!nextReunionAt) {
    return (
      <div className="bg-white rounded-2xl p-6 text-center border border-gray-100">
        <p className="text-gray-400 text-sm">次の再会日を設定しよう 💕</p>
      </div>
    )
  }

  if (isPast) {
    return (
      <div className="bg-primary-50 rounded-2xl p-6 text-center border border-primary-100">
        <p className="text-primary-700 font-semibold">再会おめでとう！🎉</p>
        <p className="text-sm text-primary-500 mt-1">次の日程を設定しよう</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100">
      <p className="text-xs text-gray-400 text-center mb-3">次の再会まで</p>
      <div className="flex justify-center gap-4">
        {[
          { value: timeLeft?.days ?? 0, label: '日' },
          { value: timeLeft?.hours ?? 0, label: '時間' },
          { value: timeLeft?.minutes ?? 0, label: '分' },
        ].map(({ value, label }) => (
          <div key={label} className="text-center">
            <span className="text-4xl font-bold text-primary-700">
              {String(value).padStart(2, '0')}
            </span>
            <p className="text-xs text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 text-center mt-3">
        {new Date(nextReunionAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
    </div>
  )
}
