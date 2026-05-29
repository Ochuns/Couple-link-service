import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Profile, Reunion, ReunionPhoto } from '@/types/database'
import AlbumGrid from '@/components/album/AlbumGrid'

type ReunionWithPhotos = Reunion & { photos: (ReunionPhoto & { signedUrl: string })[] }

export default async function AlbumPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('couple_id')
    .eq('id', user.id)
    .single()
  const profile = profileData as Pick<Profile, 'couple_id'> | null

  if (!profile?.couple_id) redirect('/onboarding')

  const { data: reunionsData } = await supabase
    .from('reunions')
    .select('*, reunion_photos(*)')
    .eq('couple_id', profile.couple_id)
    .order('created_at', { ascending: false })

  const rawReunions = (reunionsData ?? []) as Array<Reunion & { reunion_photos: ReunionPhoto[] }>

  const reunionsWithUrls: ReunionWithPhotos[] = await Promise.all(
    rawReunions.map(async (reunion) => {
      const photosWithUrls = await Promise.all(
        (reunion.reunion_photos ?? []).map(async (photo) => {
          const { data } = await supabase.storage
            .from('reunion-photos')
            .createSignedUrl(photo.storage_path, 3600)
          return { ...photo, signedUrl: data?.signedUrl ?? '' }
        })
      )
      return { ...reunion, photos: photosWithUrls }
    })
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-bold">再会アルバム</h1>
        <Link
          href="/album/new"
          className="text-sm bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          + 記録する
        </Link>
      </div>
      <AlbumGrid reunions={reunionsWithUrls} />
    </div>
  )
}
