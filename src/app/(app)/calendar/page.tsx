import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Profile, CalendarEvent } from '@/types/database'
import CalendarView from '@/components/calendar/CalendarView'

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
  const profile = profileData as Pick<Profile, 'couple_id'> | null
  if (!profile?.couple_id) redirect('/onboarding')

  // カレンダーイベントとカップルの記念日を並行取得
  const [{ data: eventsData }, { data: coupleData }] = await Promise.all([
    supabase.from('calendar_events').select('*').eq('couple_id', profile.couple_id).order('event_date'),
    supabase.from('couples').select('anniversary_date').eq('id', profile.couple_id).single(),
  ])
  const events = (eventsData ?? []) as CalendarEvent[]
  const anniversaryDate = (coupleData as { anniversary_date: string | null } | null)?.anniversary_date ?? null

  return (
    <div>
      <h1 className="text-lg font-bold mb-5">共有カレンダー 📅</h1>
      <CalendarView
        initialEvents={events}
        coupleId={profile.couple_id}
        currentUserId={user.id}
        anniversaryDate={anniversaryDate}
      />
    </div>
  )
}
