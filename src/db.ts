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
  rawNotes?: string // the pasted trip notes the timeline was generated from
  createdAt: number
}

export interface Activity {
  id: string
  time?: string
  title: string
  note?: string
}

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night' | 'anytime'

export interface Moment {
  time: TimeOfDay
  title: string
  detail?: string
}

export interface Day {
  id: string
  tripId: string
  date: string
  mood?: string
  thoughts: string
  activities: Activity[]
  // AI-generated from the trip's pasted notes
  headline?: string
  summary?: string
  moments?: Moment[]
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
    if (!d.thoughts && d.activities.length === 0 && !d.mood && !d.moments?.length && mediaCount === 0) {
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

export interface GeneratedDay {
  day: number
  headline: string
  summary: string
  moments: { time: TimeOfDay; title: string; detail: string }[]
}

/** Store a generated per-day timeline (and the notes it came from) on the trip. */
export async function applyTimeline(tripId: string, notes: string, generated: GeneratedDay[]) {
  await db.transaction('rw', db.trips, db.days, async () => {
    const days = await db.days.where('tripId').equals(tripId).sortBy('date')
    const byNumber = new Map(generated.map((g) => [Math.min(Math.max(1, g.day), days.length), g]))
    for (const [i, d] of days.entries()) {
      const g = byNumber.get(i + 1)
      await db.days.update(d.id, {
        headline: g?.headline,
        summary: g?.summary,
        moments: g?.moments.map((m) => ({ time: m.time, title: m.title, detail: m.detail || undefined })),
      })
    }
    await db.trips.update(tripId, { rawNotes: notes })
  })
}

export const ACCENT_COLORS = [
  { value: '#e07a5f', label: 'Terracotta' },
  { value: '#c0392b', label: 'Crimson' },
  { value: '#d6577a', label: 'Raspberry' },
  { value: '#8e4a8a', label: 'Plum' },
  { value: '#6d5dfc', label: 'Violet' },
  { value: '#2f3e6b', label: 'Navy' },
  { value: '#3b82c4', label: 'Sky blue' },
  { value: '#3d8b8b', label: 'Ocean teal' },
  { value: '#4f9d69', label: 'Forest green' },
  { value: '#f2a541', label: 'Marigold' },
  { value: '#8b5e3c', label: 'Mocha' },
  { value: '#5b6770', label: 'Slate' },
]

export const TRIP_ICONS = [
  { emoji: '🏝️', label: 'Beach' },
  { emoji: '🤿', label: 'Diving & snorkeling' },
  { emoji: '🚢', label: 'Cruise' },
  { emoji: '🛶', label: 'Lake & paddling' },
  { emoji: '🏔️', label: 'Mountains' },
  { emoji: '⛷️', label: 'Skiing' },
  { emoji: '🥾', label: 'Hiking' },
  { emoji: '🏕️', label: 'Camping' },
  { emoji: '🏜️', label: 'Desert' },
  { emoji: '🌋', label: 'Volcano' },
  { emoji: '🦁', label: 'Safari' },
  { emoji: '🏙️', label: 'City break' },
  { emoji: '🗼', label: 'Sightseeing' },
  { emoji: '🗽', label: 'New York' },
  { emoji: '⛩️', label: 'Temples & shrines' },
  { emoji: '🌸', label: 'Cherry blossom' },
  { emoji: '🎤', label: 'Concert' },
  { emoji: '🎪', label: 'Festival' },
  { emoji: '🏟️', label: 'Sports event' },
  { emoji: '🎢', label: 'Theme park' },
  { emoji: '🚗', label: 'Road trip' },
  { emoji: '🚆', label: 'Train journey' },
  { emoji: '🎒', label: 'Backpacking' },
  { emoji: '🍷', label: 'Food & wine' },
  { emoji: '🎉', label: 'Celebration' },
  { emoji: '💍', label: 'Wedding & honeymoon' },
  { emoji: '🏡', label: 'Visiting family' },
  { emoji: '💼', label: 'Work trip' },
]

export const ACCENTS = ACCENT_COLORS.map((c) => c.value)
export const TRIP_EMOJIS = TRIP_ICONS.map((i) => i.emoji)
export const MOODS = ['🤩', '😊', '😌', '😴', '🥵', '🌧️', '😅', '🥹']
