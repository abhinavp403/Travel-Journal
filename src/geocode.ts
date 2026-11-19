import { db, type GeoCacheRow } from './db'

export interface GeoPoint {
  lat: number
  lng: number
  bbox?: GeoCacheRow['bbox']
}

// OpenStreetMap's free search service allows at most one request per second.
const MIN_GAP_MS = 1100
let queue: Promise<unknown> = Promise.resolve()
let lastRequest = 0

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function search(q: string): Promise<GeoPoint | null> {
  await wait(Math.max(0, lastRequest + MIN_GAP_MS - Date.now()))
  lastRequest = Date.now()
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`)
  if (!res.ok) throw new Error(`Map search failed (${res.status})`)
  const [hit] = (await res.json()) as { lat: string; lon: string; boundingbox?: string[] }[]
  if (!hit) return null
  const bbox = hit.boundingbox?.map(Number)
  return { lat: Number(hit.lat), lng: Number(hit.lon), bbox: bbox?.length === 4 ? (bbox as GeoCacheRow['bbox']) : undefined }
}

/** Look up a place name. Results (including "not found") are remembered; network failures are not. */
export async function geocode(query: string): Promise<GeoPoint | null> {
  const q = query.trim().toLowerCase()
  if (!q) return null
  const cached = await db.geocache.get(q)
  if (cached) return cached.found ? { lat: cached.lat!, lng: cached.lng!, bbox: cached.bbox } : null

  const job = queue.then(async () => {
    const again = await db.geocache.get(q) // another caller may have fetched it while we queued
    if (again) return again.found ? { lat: again.lat!, lng: again.lng!, bbox: again.bbox } : null
    const point = await search(q)
    await db.geocache.put({ q, found: !!point, ...point, at: Date.now() })
    return point
  })
  queue = job.catch(() => undefined)
  return job
}

const KM_PER_DEG = 111

/** True when `p` plausibly belongs to a trip to `dest`: inside its area (plus a margin) or within ~300 km. */
export function isNear(p: GeoPoint, dest: GeoPoint) {
  if (dest.bbox) {
    const [s, n, w, e] = dest.bbox
    if (p.lat >= s - 1 && p.lat <= n + 1 && p.lng >= w - 1 && p.lng <= e + 1) return true
  }
  const dLat = (p.lat - dest.lat) * KM_PER_DEG
  const dLng = (p.lng - dest.lng) * KM_PER_DEG * Math.cos((dest.lat * Math.PI) / 180)
  return Math.hypot(dLat, dLng) < 300
}
