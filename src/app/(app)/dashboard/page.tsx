import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Profile, Couple, Task } from '@/types/database'
import CountdownTimer from '@/components/countdown/CountdownTimer'

import WeatherCard from '@/components/weather/WeatherCard'
import DistanceBadge from '@/components/distance/DistanceBadge'
import CoupleHeader from '@/components/couple/CoupleHeader'

function getUpcomingLabel(dateStr: string): string | null {
  const target = new Date(dateStr)
  const now = new Date()
  const diffMs = target.getTime() - now.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return null
  if (diffDays === 0) return '今日'
  if (diffDays === 1) return '明日'
  return null
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: myProfileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  const myProfile = myProfileData as Profile | null

  if (!myProfile?.couple_id) redirect('/onboarding')

  const { data: coupleData } = await supabase
    .from('couples')
    .select('*')
    .eq('id', myProfile.couple_id)
    .single()
  const couple = coupleData as Couple | null

  if (!couple) redirect('/onboarding')

  const partnerId = couple.user1_id === user.id ? couple.user2_id : couple.user1_id
  const { data: partnerData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', partnerId!)
    .single()
  const partnerProfile = partnerData as Profile | null

  // 未完了タスクを最大3件取得（Quick View用）
  const { data: pendingTasksData } = await supabase
    .from('tasks')
    .select('*')
    .eq('couple_id', myProfile.couple_id)
    .eq('completed', false)
    .order('created_at', { ascending: true })
    .limit(3)
  const pendingTasks = (pendingTasksData ?? []) as Task[]

  const reunionLabel = couple.next_reunion_at ? getUpcomingLabel(couple.next_reunion_at) : null

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Quick View: 再会日が今日・明日 */}
      {reunionLabel && couple.next_reunion_at && (
        <div className="bg-primary-600 text-white rounded-2xl px-4 py-3 flex items-center gap-2">
          <span className="text-xl">🎉</span>
          <div>
            <p className="font-semibold text-sm">{reunionLabel}が再会日です！</p>
            <p className="text-xs text-primary-100">
              {new Date(couple.next_reunion_at).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      )}

      {/* カウントダウン */}
      <CountdownTimer nextReunionAt={couple.next_reunion_at} coupleId={couple.id} />

      {/* カップルヘッダー: アイコン・ハート・記念日 */}
      <CoupleHeader
        myName={myProfile.display_name}
        partnerName={partnerProfile?.display_name ?? '...'}
        myAvatarUrl={myProfile.avatar_url}
        partnerAvatarUrl={partnerProfile?.avatar_url}
        anniversaryDate={couple.anniversary_date ?? null}
      />
      {/* 天気カード */}
      <div className="grid grid-cols-2 gap-3">
        <WeatherCard city={myProfile.city} label="あなた" />
        <WeatherCard
          city={partnerProfile?.city ?? null}
          label={partnerProfile?.display_name ?? 'パートナー'}
        />
      </div>

      {/* 距離バッジ */}
      {myProfile.city_lat && myProfile.city_lng && partnerProfile?.city_lat && partnerProfile?.city_lng && (
        <DistanceBadge
          lat1={myProfile.city_lat}
          lng1={myProfile.city_lng}
          lat2={partnerProfile.city_lat}
          lng2={partnerProfile.city_lng}
        />
      )}

      {/* Quick View: やることリスト（未完了タスク最大3件） */}
      {pendingTasks.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700">✅ やりたいこと</p>
            <Link href="/tasks" className="text-xs text-primary-600 hover:underline">
              すべて見る →
            </Link>
          </div>
          <ul className="space-y-1.5">
            {pendingTasks.map((task) => (
              <li key={task.id} className="flex items-center gap-2 text-sm text-gray-700">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-400 flex-shrink-0" />
                <span className="truncate">{task.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
