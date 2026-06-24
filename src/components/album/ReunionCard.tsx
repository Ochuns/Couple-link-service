import Image from 'next/image'
import type { Reunion, ReunionPhoto } from '@/types/database'

interface Props {
  reunion: Reunion & { photos: (ReunionPhoto & { signedUrl: string })[] }
}

export default function ReunionCard({ reunion }: Props) {
  const dateStr = new Date(reunion.reunion_date).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
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
              {i === 3 && reunion.photos.length > 4 && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="text-white font-bold">+{reunion.photos.length - 4}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="p-4">
        <p className="text-sm font-semibold text-primary-700">{dateStr}</p>
        {reunion.comment && (
          <p className="text-sm text-gray-600 mt-1">{reunion.comment}</p>
        )}
      </div>
    </div>
  )
}
