import { db, toISO, type Day, type DayWeather, type Trip } from './db'
import { geocode } from './geocode'

/** WMO weather codes, as returned by Open-Meteo. */
export function describeWeather(code: number): { icon: string; label: string } {
  if (code === 0) return { icon: '☀️', label: 'Clear' }
  if (code === 1) return { icon: '🌤️', label: 'Mostly clear' }
  if (code === 2) return { icon: '⛅', label: 'Partly cloudy' }
  if (code === 3) return { icon: '☁️', label: 'Overcast' }
  if (code <= 48) return { icon: '🌫️', label: 'Fog' }
  if (code <= 57) return { icon: '🌦️', label: 'Drizzle' }
  if (code <= 67) return { icon: '🌧️', label: 'Rain' }
  if (code <= 77) return { icon: '🌨️', label: 'Snow' }
  if (code <= 82) return { icon: '🌦️', label: 'Showers' }
  if (code <= 86) return { icon: '🌨️', label: 'Snow showers' }
  return { icon: '⛈️', label: 'Thunderstorm' }
}

const HOUR = 3_600_000
const shiftDays = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return toISO(d)
}

interface DailyResponse {
  daily?: {
    time: string[]
    weather_code: (number | null)[]
    temperature_2m_max: (number | null)[]
    temperature_2m_min: (number | null)[]
    precipitation_sum: (number | null)[]
  }
}

async function fetchDaily(base: string, lat: number, lng: number, start: string, end: string, unit: 'F' | 'C') {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    start_date: start,
    end_date: end,
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum',
    timezone: 'auto',
    ...(unit === 'F' ? { temperature_unit: 'fahrenheit', precipitation_unit: 'inch' } : {}),
  })
  const res = await fetch(`${base}?${params}`)
  if (!res.ok) throw new Error(`Weather request failed (${res.status})`)
  return ((await res.json()) as DailyResponse).daily
}

const inFlight = new Set<string>()

/**
 * Fill in each day's weather for the trip's destination from Open-Meteo (free, no account) and store it on the day.
 * Past days use the historical record and are fetched once. Recent and upcoming days use the forecast and are
 * refreshed every few hours. Trips more than about two weeks away have no forecast yet and are skipped.
 */
export async function syncWeather(trip: Trip, days: Day[]) {
  if (inFlight.has(trip.id) || !days.length) return
  inFlight.add(trip.id)
  try {
    const forecastLimit = shiftDays(15)
    const archiveCutoff = shiftDays(-6) // the historical record lags a few days behind
    if (days[0].date > forecastLimit) return

    const dest = await geocode(trip.destination)
    if (!dest) return
    const unit: 'F' | 'C' = /-(US|LR|MM)$/i.test(navigator.language) ? 'F' : 'C'
    const key = `${dest.lat.toFixed(2)},${dest.lng.toFixed(2)},${unit}`

    const needs = days.filter(
      (d) => d.date <= forecastLimit && (!d.weather || d.weather.key !== key || (!d.weather.final && Date.now() - d.weather.at > 6 * HOUR)),
    )
    const groups = [
      { final: true, base: 'https://archive-api.open-meteo.com/v1/archive', days: needs.filter((d) => d.date <= archiveCutoff) },
      { final: false, base: 'https://api.open-meteo.com/v1/forecast', days: needs.filter((d) => d.date > archiveCutoff) },
    ]

    for (const g of groups) {
      if (!g.days.length) continue
      const daily = await fetchDaily(g.base, dest.lat, dest.lng, g.days[0].date, g.days[g.days.length - 1].date, unit)
      if (!daily) continue
      for (const d of g.days) {
        const i = daily.time.indexOf(d.date)
        const code = daily.weather_code[i]
        const max = daily.temperature_2m_max[i]
        const min = daily.temperature_2m_min[i]
        if (i < 0 || code == null || max == null || min == null) continue
        const weather: DayWeather = { code, max, min, precip: daily.precipitation_sum[i] ?? 0, unit, key, final: g.final, at: Date.now() }
        await db.days.update(d.id, { weather })
      }
    }
  } finally {
    inFlight.delete(trip.id)
  }
}
