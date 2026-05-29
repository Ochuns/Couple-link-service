import type { Reunion, ReunionPhoto } from '@/types/database'
import ReunionCard from './ReunionCard'

interface ReunionWithPhotos extends Reunion {
  photos: (ReunionPhoto & { signedUrl: string })[]
}

interface Props {
  reunions: ReunionWithPhotos[]
}

export default function AlbumGrid({ reunions }: Props) {
  if (reunions.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-5xl mb-4">📸</div>
        <p className="text-sm">まだ再会の記録がありません</p>
        <p className="text-xs mt-1">会った後に写真を投稿しましょう</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {reunions.map((reunion) => (
        <ReunionCard key={reunion.id} reunion={reunion} />
      ))}
    </div>
  )
}
