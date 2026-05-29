import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('couple_id, display_name')
    .eq('id', user.id)
    .single()
  const profile = profileData as Pick<Profile, 'couple_id' | 'display_name'> | null

  if (!profile?.couple_id) redirect('/onboarding')

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 flex items-center justify-between h-14">
          <Link href="/dashboard" className="text-lg font-bold text-primary-700">
            Ochuna Link
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/tasks" className="text-gray-600 hover:text-primary-600">やること</Link>
            <Link href="/album" className="text-gray-600 hover:text-primary-600">アルバム</Link>
            <Link href="/settings" className="text-gray-600 hover:text-primary-600">設定</Link>
          </div>
        </div>
      </nav>
      <main className="max-w-lg mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
