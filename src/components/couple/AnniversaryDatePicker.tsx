'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  coupleId: string
  currentAnniversaryDate: string | null
}

export default function AnniversaryDatePicker({ coupleId, currentAnniversaryDate }: Props) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(currentAnniversaryDate ?? '')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSave() {
    if (!date) return
    setLoading(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('couples') as any)
      .update({ anniversary_date: date })
      .eq('id', coupleId)
    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-sm text-primary-600 hover:text-primary-700 py-2"
      >
        {currentAnniversaryDate ? '記念日を変更する ✏️' : '記念日を設定する 💕'}
      </button>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-primary-100 space-y-3">
      <p className="text-sm font-medium text-gray-700">記念日を選択</p>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        max={new Date().toISOString().split('T')[0]}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={loading || !date}
          className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm rounded-lg py-2 transition-colors"
        >
          {loading ? '保存中...' : '保存'}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="flex-1 border border-gray-300 text-gray-600 text-sm rounded-lg py-2"
        >
          キャンセル
        </button>
      </div>
    </div>
  )
}
