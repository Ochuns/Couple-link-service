import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('couple_id')
    .eq('id', user.id)
    .single()
  const profile = profileData as Pick<Profile, 'couple_id'> | null

  if (profile?.couple_id) {
    redirect('/dashboard')
  } else {
    redirect('/onboarding')
  }
}
