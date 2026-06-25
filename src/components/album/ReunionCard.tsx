import Image from 'next/image'
import Link from 'next/link'
import type { Reunion, ReunionPhoto } from '@/types/database'

interface Props {
  reunion: Reunion & { photos: (ReunionPhoto & { signedUrl: string })[] }
}

// アルバム一覧に表示するカード：タップするとアルバム詳細ページに遷移する
export default function ReunionCard({ reunion }: Props) {
  const dateStr = new Date(reunion.reunion_date).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <Link href={`/album/${reunion.id}`} className="block bg-white rounded-2xl overflow-hidden border border-gray-100 active:opacity-80 transition-opacity">
      {reunion.photos.length > 0 && (
        <div className={`grid gap-0.5 ${reunion.photos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {reunion.photos.slice(0, 4).map((photo, i) => (
            <div key={photo.id} className="relative aspect-square">
              <Image
                src={photo.signedUrl}
                alt={`再会写真 ${i + 1}`}
                fill
                className="object-cover"
              />
              {/* 4枚以上ある場合は最後のサムネイルに残り枚数を表示 */}
              {i === 3 && reunion.photos.length > 4 && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="text-white font-bold">+{reunion.photos.length - 4}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-primary-700">{dateStr}</p>
          {reunion.comment && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-1">{reunion.comment}</p>
          )}
        </div>
        {/* 写真枚数バッジ */}
        <span className="text-xs text-gray-400 ml-2 shrink-0">{reunion.photos.length}枚 ›</span>
      </div>
    </Link>
  )
}
