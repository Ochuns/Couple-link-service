import { calculateDistance } from '@/lib/distance'

interface Props {
  lat1: number
  lng1: number
  lat2: number
  lng2: number
}

export default function DistanceBadge({ lat1, lng1, lat2, lng2 }: Props) {
  const km = calculateDistance(lat1, lng1, lat2, lng2)

  return (
    <div className="flex items-center justify-center gap-2 bg-white rounded-2xl py-3 border border-gray-100">
      <span className="text-gray-400 text-sm">📍</span>
      <span className="text-sm text-gray-600">
        2人の距離: <span className="font-bold text-primary-600">{km.toLocaleString()} km</span>
      </span>
    </div>
  )
}
