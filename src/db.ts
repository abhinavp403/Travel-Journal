import Dexie, { type EntityTable } from 'dexie'

export interface Trip {
  id: string
  title: string
  destination: string
  startDate: string // YYYY-MM-DD
  endDate: string
  companions: string[]
  accent: string
  emoji: string
  coverMediaId?: string
  notes?: string
  createdAt: number
}

export interface Activity {
  id: string
  time?: string
  title: string
  note?: string
}

export interface Day {
  id: string
  tripId: string
  date: string
  mood?: string
  thoughts: string
  activities: Activity[]
}

export interface Media {
  id: string
  tripId: string
  dayId?: string // undefined = trip cover
  blob: Blob
  type: 'image' | 'video'
  caption?: string
  createdAt: number
}

export const db = new Dexie('travel-journal') as Dexie & {
  trips: EntityTable<Trip, 'id'>
  days: EntityTable<Day, 'id'>
  media: EntityTable<Media, 'id'>
}

db.version(1).stores({
  trips: 'id, createdAt, startDate',
  days: 'id, tripId, [tripId+date]',
  media: 'id, tripId, dayId, createdAt',
})

export const uid = () => crypto.randomUUID()

export function datesBetween(start: string, end: string): string[] {
  const out: string[] = []
  const d = new Date(start + 'T00:00:00')
  const last = new Date(end + 'T00:00:00')
  while (d <= last && out.length < 366) {
    out.push(toISO(d))
    d.setDate(d.getDate() + 1)
  }
  return out
}

export function toISO(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Ensure there is exactly one Day row per date in the trip range. Days outside the range are removed only if empty. */
async function syncDays(trip: Trip) {
  const dates = datesBetween(trip.startDate, trip.endDate)
  const existing = await db.days.where('tripId').equals(trip.id).toArray()
  const byDate = new Map(existing.map((d) => [d.date, d]))
  const toAdd = dates
    .filter((date) => !byDate.has(date))
    .map<Day>((date) => ({ id: uid(), tripId: trip.id, date, thoughts: '', activities: [] }))
  await db.days.bulkAdd(toAdd)

  const wanted = new Set(dates)
  for (const d of existing) {
    if (wanted.has(d.date)) continue
    const mediaCount = await db.media.where('dayId').equals(d.id).count()
    if (!d.thoughts && d.activities.length === 0 && !d.mood && mediaCount === 0) {
      await db.days.delete(d.id)
    }
  }
}

export async function saveTrip(trip: Trip, cover?: File | null) {
  await db.transaction('rw', db.trips, db.days, db.media, async () => {
    if (cover) {
      const prev = trip.coverMediaId ? await db.media.get(trip.coverMediaId) : undefined
      if (prev && !prev.dayId) await db.media.delete(prev.id) // keep it if it's also a day photo
      const id = uid()
      await db.media.add({ id, tripId: trip.id, blob: cover, type: 'image', createdAt: Date.now() })
      trip.coverMediaId = id
    }
    await db.trips.put(trip)
    await syncDays(trip)
  })
}

export async function deleteTrip(id: string) {
  await db.transaction('rw', db.trips, db.days, db.media, async () => {
    await db.media.where('tripId').equals(id).delete()
    await db.days.where('tripId').equals(id).delete()
    await db.trips.delete(id)
  })
}

export async function addMediaFiles(tripId: string, dayId: string, files: File[]) {
  const items: Media[] = files
    .filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'))
    .map((f) => ({
      id: uid(),
      tripId,
      dayId,
      blob: f,
      type: f.type.startsWith('video/') ? 'video' : 'image',
      createdAt: Date.now(),
    }))
  await db.media.bulkAdd(items)
  return items.length
}

export const ACCENTS = ['#e07a5f', '#3d8b8b', '#f2a541', '#6d5dfc', '#d6577a', '#4f9d69']
export const TRIP_EMOJIS = ['🏝️', '🏔️', '🗼', '🏜️', '🌋', '🏙️', '🌸', '⛩️', '🗽', '🛶', '🍷', '🎒']
export const MOODS = ['🤩', '😊', '😌', '😴', '🥵', '🌧️', '😅', '🥹']
