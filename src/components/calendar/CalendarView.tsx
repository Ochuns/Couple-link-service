'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CalendarEvent } from '@/types/database'

const EVENT_TYPE_CONFIG = {
  anniversary: { label: '記念日', color: 'bg-red-100 text-red-700 border-red-200' },
  video_date:  { label: 'ビデオデート', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  meal_date:   { label: 'ごはんデート', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  other:       { label: 'その他', color: 'bg-gray-100 text-gray-700 border-gray-200' },
} as const

interface Props {
  initialEvents: CalendarEvent[]
  coupleId: string
  currentUserId: string
}

interface EventFormData {
  title: string
  description: string
  event_date: string
  event_type: CalendarEvent['event_type']
}

const EMPTY_FORM: EventFormData = { title: '', description: '', event_date: '', event_type: 'other' }

export default function CalendarView({ initialEvents, coupleId, currentUserId }: Props) {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents)
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth())
  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [form, setForm] = useState<EventFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Realtime 同期
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`couple:${coupleId}:calendar`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events', filter: `couple_id=eq.${coupleId}` }, () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(supabase.from('calendar_events') as any)
          .select('*').eq('couple_id', coupleId).order('event_date')
          .then(({ data }: { data: CalendarEvent[] | null }) => { if (data) setEvents(data) })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [coupleId])

  // カレンダー計算
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date().toISOString().split('T')[0]

  function eventsOnDate(dateStr: string) {
    return events.filter(e => e.event_date === dateStr)
  }

  function openAddForm(dateStr?: string) {
    setEditingEvent(null)
    setForm({ ...EMPTY_FORM, event_date: dateStr ?? '' })
    setShowForm(true)
  }

  function openEditForm(e: CalendarEvent) {
    setEditingEvent(e)
    setForm({ title: e.title, description: e.description ?? '', event_date: e.event_date, event_type: e.event_type })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.title.trim() || !form.event_date) return
    setSaving(true)
    const supabase = createClient()

    if (editingEvent) {
      // 楽観的更新
      setEvents(prev => prev.map(e => e.id === editingEvent.id ? { ...e, ...form } : e))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('calendar_events') as any).update({ title: form.title.trim(), description: form.description || null, event_date: form.event_date, event_type: form.event_type }).eq('id', editingEvent.id)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('calendar_events') as any)
        .insert({ couple_id: coupleId, title: form.title.trim(), description: form.description || null, event_date: form.event_date, event_type: form.event_type, created_by: currentUserId })
        .select().single()
      if (data) setEvents(prev => [...prev, data as CalendarEvent])
    }

    setSaving(false)
    setShowForm(false)
    setEditingEvent(null)
    setForm(EMPTY_FORM)
  }

  async function handleDelete(event: CalendarEvent) {
    setEvents(prev => prev.filter(e => e.id !== event.id))
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('calendar_events') as any).delete().eq('id', event.id)
  }

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const monthEvents = events.filter(e => {
    const d = new Date(e.event_date)
    return d.getFullYear() === year && d.getMonth() === month
  })

  return (
    <div className="space-y-4">
      {/* 月ナビ */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">‹</button>
        <h2 className="font-bold text-gray-800">{year}年 {month + 1}月</h2>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">›</button>
      </div>

      {/* カレンダーグリッド */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-100">
          {['日','月','火','水','木','金','土'].map(d => (
            <div key={d} className="text-center text-xs text-gray-400 py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="min-h-[60px] border-r border-b border-gray-50" />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const dayEvents = eventsOnDate(dateStr)
            const isToday = dateStr === today
            return (
              <div
                key={day}
                onClick={() => { setSelectedDate(dateStr === selectedDate ? null : dateStr) }}
                className={`min-h-[60px] border-r border-b border-gray-50 p-1 cursor-pointer hover:bg-gray-50 ${selectedDate === dateStr ? 'bg-primary-50' : ''}`}
              >
                <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-primary-600 text-white' : 'text-gray-700'}`}>{day}</span>
                <div className="space-y-0.5 mt-0.5">
                  {dayEvents.slice(0, 2).map(e => (
                    <div key={e.id} className={`text-[10px] px-1 rounded truncate border ${EVENT_TYPE_CONFIG[e.event_type].color}`}>{e.title}</div>
                  ))}
                  {dayEvents.length > 2 && <div className="text-[10px] text-gray-400">+{dayEvents.length - 2}</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 選択日の予定・追加ボタン */}
      {selectedDate && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">
              {new Date(selectedDate).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}
            </p>
            <button onClick={() => openAddForm(selectedDate)} className="text-xs bg-primary-600 text-white px-3 py-1 rounded-lg">+ 追加</button>
          </div>
          {eventsOnDate(selectedDate).length === 0 ? (
            <p className="text-sm text-gray-400">予定はありません</p>
          ) : (
            eventsOnDate(selectedDate).map(e => (
              <div key={e.id} className="flex items-start gap-2">
                <div className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${EVENT_TYPE_CONFIG[e.event_type].color}`}>
                  {EVENT_TYPE_CONFIG[e.event_type].label}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{e.title}</p>
                  {e.description && <p className="text-xs text-gray-500 truncate">{e.description}</p>}
                </div>
                {e.created_by === currentUserId && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openEditForm(e)} className="text-xs text-gray-400 hover:text-primary-600">✏️</button>
                    <button onClick={() => handleDelete(e)} className="text-xs text-gray-400 hover:text-red-500">✕</button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* 今月の予定一覧 */}
      {monthEvents.length > 0 && !selectedDate && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 font-medium">今月の予定</p>
          {monthEvents.sort((a, b) => a.event_date.localeCompare(b.event_date)).map(e => (
            <div key={e.id} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
              <div className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${EVENT_TYPE_CONFIG[e.event_type].color}`}>
                {EVENT_TYPE_CONFIG[e.event_type].label}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{e.title}</p>
                <p className="text-xs text-gray-400">{new Date(e.event_date).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}</p>
              </div>
              {e.created_by === currentUserId && (
                <div className="flex gap-1">
                  <button onClick={() => openEditForm(e)} className="text-xs text-gray-400 hover:text-primary-600">✏️</button>
                  <button onClick={() => handleDelete(e)} className="text-xs text-gray-400 hover:text-red-500">✕</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 予定フォームモーダル */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4">
            <h3 className="font-semibold text-gray-800">{editingEvent ? '予定を編集' : '予定を追加'}</h3>
            <div>
              <label className="block text-xs text-gray-500 mb-1">タイトル *</label>
              <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="予定のタイトル" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">日付 *</label>
              <input type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">種類</label>
              <select value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value as CalendarEvent['event_type'] }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="anniversary">記念日</option>
                <option value="video_date">ビデオデート</option>
                <option value="meal_date">ごはんデート</option>
                <option value="other">その他</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">メモ（任意）</label>
              <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="一言メモ" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving || !form.title.trim() || !form.event_date}
                className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm rounded-lg py-2">
                {saving ? '保存中...' : '保存'}
              </button>
              <button onClick={() => { setShowForm(false); setEditingEvent(null) }}
                className="flex-1 border border-gray-300 text-gray-600 text-sm rounded-lg py-2">キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {/* 追加ボタン（選択日なし時） */}
      {!selectedDate && (
        <button onClick={() => openAddForm()} className="w-full border-2 border-dashed border-gray-200 text-gray-400 hover:border-primary-300 hover:text-primary-500 rounded-2xl py-4 text-sm transition-colors">
          + 予定を追加する
        </button>
      )}
    </div>
  )
}
