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
      {/* デスクトップ: 上部ナビ / モバイル: 下部タブ */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10 hidden sm:block">
        <div className="max-w-2xl mx-auto px-4 flex items-center justify-between h-14">
          <Link href="/dashboard" className="text-lg font-bold text-primary-700">
            Ochuna Link
          </Link>
          <div className="flex items-center gap-5 text-sm">
            <Link href="/dashboard" className="text-gray-600 hover:text-primary-600">ホーム</Link>
            <Link href="/calendar" className="text-gray-600 hover:text-primary-600">カレンダー</Link>
            <Link href="/tasks" className="text-gray-600 hover:text-primary-600">やりたいこと</Link>
            <Link href="/meals" className="text-gray-600 hover:text-primary-600">ごはん</Link>
            <Link href="/album" className="text-gray-600 hover:text-primary-600">アルバム</Link>
            <Link href="/settings" className="text-gray-600 hover:text-primary-600">設定</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-4 sm:py-6 pb-24 sm:pb-6">
        {children}
      </main>

      {/* モバイル下部タブバー */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 sm:hidden z-10">
        <div className="grid grid-cols-6 h-16">
          {[
            { href: '/dashboard', label: 'ホーム', icon: '🏠' },
            { href: '/calendar', label: 'カレンダー', icon: '📅' },
            { href: '/tasks', label: 'やりたいこと', icon: '✅' },
            { href: '/meals', label: 'ごはん', icon: '🍽️' },
            { href: '/album', label: 'アルバム', icon: '📸' },
            { href: '/settings', label: '設定', icon: '⚙️' },
          ].map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-0.5 text-gray-500 hover:text-primary-600 active:text-primary-700"
            >
              <span className="text-xl">{icon}</span>
              <span className="text-[10px]">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}
