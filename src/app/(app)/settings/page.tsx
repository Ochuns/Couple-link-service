'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Couple, ReunionPhoto } from '@/types/database'

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [city, setCity] = useState('')
  const [saving, setSaving] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(supabase.from('profiles') as any).select('*').eq('id', user.id).single()
        .then(({ data }: { data: Profile | null }) => {
          if (data) {
            setProfile(data)
            setDisplayName(data.display_name)
            setCity(data.city ?? '')
          }
        })
    })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 都市が設定されている場合、天気APIから座標を取得して保存
    let cityLat: number | null = null
    let cityLng: number | null = null
    if (city.trim()) {
      try {
        const res = await fetch(`/api/weather?city=${encodeURIComponent(city.trim())}`)
        if (res.ok) {
          const weather = await res.json()
          cityLat = weather.lat ?? null
          cityLng = weather.lng ?? null
        } else if (res.status === 404) {
          setMessage('⚠️ 都市が見つかりませんでした。英語の都市名（例: Tokyo）で入力してください。')
          setSaving(false)
          return
        }
      } catch {
        // 座標取得失敗は無視して保存続行
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('profiles') as any).update({
      display_name: displayName,
      city: city.trim() || null,
      city_lat: cityLat,
      city_lng: cityLng,
    }).eq('id', user.id)

    setMessage('保存しました')
    setSaving(false)
    setTimeout(() => setMessage(null), 3000)
  }

  async function handleDisconnect() {
    if (!profile?.couple_id) return
    setDisconnecting(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: coupleData } = await (supabase.from('couples') as any)
      .select('user1_id, user2_id')
      .eq('id', profile.couple_id)
      .single()
    const couple = coupleData as Pick<Couple, 'user1_id' | 'user2_id'> | null

    if (!couple) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: reunionIds } = await (supabase.from('reunions') as any)
      .select('id')
      .eq('couple_id', profile.couple_id)

    if (reunionIds && reunionIds.length > 0) {
      const ids = (reunionIds as { id: string }[]).map(r => r.id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: photosData } = await (supabase.from('reunion_photos') as any)
        .select('storage_path')
        .in('reunion_id', ids)
      const photos = (photosData ?? []) as ReunionPhoto[]

      if (photos.length > 0) {
        await supabase.storage.from('reunion-photos').remove(photos.map(p => p.storage_path))
      }
    }

    const partnerIds = [couple.user1_id, couple.user2_id].filter(Boolean) as string[]
    for (const id of partnerIds) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('profiles') as any).update({ couple_id: null }).eq('id', id)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('couples') as any).delete().eq('id', profile.couple_id)

    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold">設定</h1>

      <form onSubmit={handleSave} className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
        <h2 className="font-semibold text-sm text-gray-700">プロフィール</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">表示名</label>
          <input
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">都市</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="例: Tokyo, Osaka"
          />
        </div>
        {message && <p className="text-sm text-green-600">{message}</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium rounded-lg py-2 text-sm transition-colors"
        >
          {saving ? '保存中...' : '保存する'}
        </button>
      </form>

      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <h2 className="font-semibold text-sm text-gray-700 mb-4">アカウント</h2>
        <button
          onClick={handleSignOut}
          className="w-full border border-gray-300 text-gray-600 rounded-lg py-2 text-sm mb-3"
        >
          ログアウト
        </button>

        {!confirmDisconnect ? (
          <button
            onClick={() => setConfirmDisconnect(true)}
            className="w-full border border-red-300 text-red-500 rounded-lg py-2 text-sm"
          >
            パートナーとの接続を解除する
          </button>
        ) : (
          <div className="border border-red-200 rounded-xl p-4 space-y-3">
            <p className="text-sm text-red-700 font-medium">本当に解除しますか？</p>
            <p className="text-xs text-red-500">すべての共有データ（タスク・写真・記録）が即時削除されます。この操作は取り消せません。</p>
            <div className="flex gap-2">
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm rounded-lg py-2"
              >
                {disconnecting ? '処理中...' : '解除する'}
              </button>
              <button
                onClick={() => setConfirmDisconnect(false)}
                className="flex-1 border border-gray-300 text-gray-600 text-sm rounded-lg py-2"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
