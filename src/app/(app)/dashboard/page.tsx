import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Profile, Couple } from '@/types/database'
import CountdownTimer from '@/components/countdown/CountdownTimer'
import ReunionDatePicker from '@/components/countdown/ReunionDatePicker'
import WeatherCard from '@/components/weather/WeatherCard'
import DistanceBadge from '@/components/distance/DistanceBadge'

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

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-lg">
          {myProfile.display_name?.[0]}
        </div>
        <div className="text-sm text-gray-500">
          <span className="font-semibold text-gray-800">{myProfile.display_name}</span>
          {' & '}
          <span className="font-semibold text-gray-800">{partnerProfile?.display_name}</span>
        </div>
      </div>

      <CountdownTimer
        nextReunionAt={couple.next_reunion_at}
        coupleId={couple.id}
      />

      <ReunionDatePicker
        coupleId={couple.id}
        currentReunionAt={couple.next_reunion_at}
      />

      <div className="grid grid-cols-2 gap-3">
        <WeatherCard city={myProfile.city} label="あなた" />
        <WeatherCard
          city={partnerProfile?.city ?? null}
          label={partnerProfile?.display_name ?? 'パートナー'}
        />
      </div>

      {myProfile.city_lat && myProfile.city_lng && partnerProfile?.city_lat && partnerProfile?.city_lng && (
        <DistanceBadge
          lat1={myProfile.city_lat}
          lng1={myProfile.city_lng}
          lat2={partnerProfile.city_lat}
          lng2={partnerProfile.city_lng}
        />
      )}
    </div>
  )
}
