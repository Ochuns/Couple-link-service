import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const CACHE_TTL_MINUTES = 10

export async function GET(request: NextRequest) {
  const city = request.nextUrl.searchParams.get('city')

  if (!city || city.trim().length === 0) {
    return NextResponse.json(
      { error: 'city パラメータが必要です' },
      { status: 400 }
    )
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const apiKey = process.env.OPENWEATHERMAP_API_KEY

  if (!supabaseUrl || !serviceKey) {
    console.error('[weather] Supabase 環境変数が未設定')
    return NextResponse.json({ error: 'サーバー設定エラー' }, { status: 500 })
  }

  if (!apiKey) {
    console.error('[weather] OPENWEATHERMAP_API_KEY が未設定')
    return NextResponse.json({ error: 'サーバー設定エラー' }, { status: 500 })
  }

  const supabase = createClient<Database>(supabaseUrl, serviceKey)

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: cachedData } = await (supabase.from('weather_cache') as any)
      .select('*')
      .eq('city', city.trim())
      .single()

    if (cachedData) {
      const ageMinutes = (Date.now() - new Date(cachedData.fetched_at).getTime()) / 60000
      if (ageMinutes < CACHE_TTL_MINUTES) {
        return NextResponse.json({ ...cachedData, cached: true })
      }
    }
  } catch {
    // キャッシュ未ヒットは正常フロー
  }

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city.trim())}&units=metric&lang=ja&appid=${apiKey}`,
      { next: { revalidate: 0 } }
    )

    if (res.status === 404) {
      return NextResponse.json(
        { error: `都市「${city}」が見つかりません。英語の都市名（例: Tokyo）を使ってください。` },
        { status: 404 }
      )
    }

    if (res.status === 401) {
      console.error('[weather] OpenWeatherMap API キーが無効')
      return NextResponse.json({ error: '天気情報サービスに接続できません' }, { status: 502 })
    }

    if (!res.ok) {
      console.error('[weather] OpenWeatherMap エラー:', res.status)
      return NextResponse.json(
        { error: '天気情報を取得できません。しばらくしてからお試しください。' },
        { status: 502 }
      )
    }

    const data = await res.json()

    const record = {
      city: city.trim(),
      temperature: Math.round(data.main.temp * 10) / 10,
      condition: data.weather[0].description,
      condition_icon: data.weather[0].icon,
      lat: data.coord.lat,
      lng: data.coord.lon,
      fetched_at: new Date().toISOString(),
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('weather_cache') as any).upsert(record, { onConflict: 'city' })

    return NextResponse.json({ ...record, cached: false })
  } catch (err) {
    console.error('[weather] 予期しないエラー:', err)
    return NextResponse.json(
      { error: '天気情報を取得できません。ネットワーク接続を確認してください。' },
      { status: 502 }
    )
  }
}
