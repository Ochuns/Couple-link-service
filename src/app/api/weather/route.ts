import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const CACHE_TTL_MINUTES = 10

export async function GET(request: NextRequest) {
  const city = request.nextUrl.searchParams.get('city')

  if (!city) {
    return NextResponse.json({ error: 'city parameter is required' }, { status: 400 })
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: cached } = await supabase
    .from('weather_cache')
    .select('*')
    .eq('city', city)
    .single()

  if (cached) {
    const ageMinutes = (Date.now() - new Date(cached.fetched_at).getTime()) / 60000
    if (ageMinutes < CACHE_TTL_MINUTES) {
      return NextResponse.json({ ...cached, cached: true })
    }
  }

  const apiKey = process.env.OPENWEATHERMAP_API_KEY
  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&lang=ja&appid=${apiKey}`
  )

  if (res.status === 404) {
    return NextResponse.json({ error: 'City not found' }, { status: 404 })
  }

  if (!res.ok) {
    return NextResponse.json({ error: 'Weather service unavailable' }, { status: 502 })
  }

  const data = await res.json()

  const record = {
    city,
    temperature: Math.round(data.main.temp * 10) / 10,
    condition: data.weather[0].description,
    condition_icon: data.weather[0].icon,
    lat: data.coord.lat,
    lng: data.coord.lon,
    fetched_at: new Date().toISOString(),
  }

  await supabase.from('weather_cache').upsert(record, { onConflict: 'city' })

  return NextResponse.json({ ...record, cached: false })
}
