'use client'

import { useState, useEffect } from 'react'
import { fetchWeather, type WeatherData } from '@/lib/weather'

interface Props {
  city: string | null
  label: string
}

export default function WeatherCard({ city, label }: Props) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!city) return
    setLoading(true)
    fetchWeather(city)
      .then((data) => {
        if (data) setWeather(data)
        else setError(true)
      })
      .finally(() => setLoading(false))
  }, [city])

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100">
      <p className="text-xs text-gray-400 mb-2">{label}</p>
      {!city && (
        <p className="text-xs text-gray-400">都市を設定してください</p>
      )}
      {city && loading && (
        <div className="text-xs text-gray-300 animate-pulse">読み込み中...</div>
      )}
      {city && error && (
        <p className="text-xs text-gray-400">天気情報を取得できません</p>
      )}
      {city && weather && !loading && (
        <div className="flex items-center gap-2">
          <img
            src={`https://openweathermap.org/img/wn/${weather.condition_icon}.png`}
            alt={weather.condition}
            width={40}
            height={40}
          />
          <div>
            <p className="text-lg font-bold text-gray-800">{weather.temperature}°C</p>
            <p className="text-xs text-gray-500">{weather.condition}</p>
            <p className="text-xs text-gray-400">{weather.city}</p>
          </div>
        </div>
      )}
    </div>
  )
}
