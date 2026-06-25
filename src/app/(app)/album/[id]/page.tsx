import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import type { Profile, Reunion, ReunionPhoto } from '@/types/database'
import AlbumDetail from '@/components/album/AlbumDetail'

// アルバム詳細ページ：特定の再会記録の写真一覧を表示する
export default async function AlbumDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // 認証チェック
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('couple_id')
    .eq('id', user.id)
    .single()
  const profile = profileData as Pick<Profile, 'couple_id'> | null
  if (!profile?.couple_id) redirect('/onboarding')

  // 再会記録を取得（自分のカップルのものか確認）
  const { data: reunionData } = await supabase
    .from('reunions')
    .select('*, reunion_photos(*)')
    .eq('id', id)
    .eq('couple_id', profile.couple_id)
    .single()

  if (!reunionData) notFound()

  const rawReunion = reunionData as Reunion & { reunion_photos: ReunionPhoto[] }

  // 各写真の署名付きURLを取得（1時間有効）
  const photosWithUrls = await Promise.all(
    (rawReunion.reunion_photos ?? [])
      .sort((a, b) => a.display_order - b.display_order)
      .map(async (photo) => {
        const { data } = await supabase.storage
          .from('reunion-photos')
          .createSignedUrl(photo.storage_path, 3600)
        return { ...photo, signedUrl: data?.signedUrl ?? '' }
      })
  )

  const reunion = { ...rawReunion, photos: photosWithUrls }

  return <AlbumDetail reunion={reunion} />
}
