export interface WeatherData {
  city: string
  temperature: number
  condition: string
  condition_icon: string
  lat: number
  lng: number
  cached: boolean
  fetched_at: string
}

export async function fetchWeather(city: string): Promise<WeatherData | null> {
  try {
    const res = await fetch(`/api/weather?city=${encodeURIComponent(city)}`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}
