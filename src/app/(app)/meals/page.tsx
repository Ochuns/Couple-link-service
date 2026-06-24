import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Profile, MealPost, MealReaction } from '@/types/database'
import MealFeed from '@/components/meals/MealFeed'

export default async function MealsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
  const profile = profileData as Pick<Profile, 'couple_id'> | null
  if (!profile?.couple_id) redirect('/onboarding')

  const { data: postsData } = await supabase
    .from('meal_posts')
    .select('*, meal_reactions(*)')
    .eq('couple_id', profile.couple_id)
    .order('created_at', { ascending: false })

  const rawPosts = (postsData ?? []) as Array<MealPost & { meal_reactions: MealReaction[] }>

  const postsWithUrls = await Promise.all(
    rawPosts.map(async (post) => {
      const { data } = await supabase.storage.from('meal-photos').createSignedUrl(post.photo_path, 3600)
      return { ...post, signedUrl: data?.signedUrl ?? '', reactions: post.meal_reactions ?? [] }
    })
  )

  return (
    <div>
      <h1 className="text-lg font-bold mb-5">ごはんシェア 🍽️</h1>
      <MealFeed initialPosts={postsWithUrls} coupleId={profile.couple_id} currentUserId={user.id} />
    </div>
  )
}
