import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Loader2, MapPin, MousePointerClick, Search, X } from 'lucide-react'
import { db, type Day, type PlaceFix, type Trip } from '../db'
import { geocode, isNear, type GeoPoint } from '../geocode'
import { momentsOf } from './DayTimeline'

interface Stop {
  key: string // lowercased place name
  place: string
  fix?: PlaceFix
  /** changes whenever the way this stop is located changes, so it gets looked up again */
  lookupKey: string
  moments: { day: number; title: string }[]
}

const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

export default function TripMap({ trip, days }: { trip: Trip; days: Day[] }) {
  const [dayFilter, setDayFilter] = useState(0) // 0 = whole trip
  const [dest, setDest] = useState<GeoPoint | null>()
  const [points, setPoints] = useState<Record<string, GeoPoint | null>>({})
  const [failed, setFailed] = useState(false)

  // one stop per distinct place, in the order the trip visits them
  const stops = useMemo(() => {
    const byPlace = new Map<string, Stop>()
    days.forEach((d, i) =>
      momentsOf(d).forEach((m) => {
        const place = m.place?.trim()
        if (!place) return
        const key = place.toLowerCase()
        if (!byPlace.has(key)) {
          const fix = trip.placeFixes?.[key]
          byPlace.set(key, { key, place, fix, lookupKey: `${key}|${trip.destination}|${JSON.stringify(fix ?? null)}`, moments: [] })
        }
        byPlace.get(key)!.moments.push({ day: i + 1, title: m.title })
      }),
    )
    return [...byPlace.values()]
  }, [days, trip.destination, trip.placeFixes])
  const lookupKeys = stops.map((s) => s.lookupKey).join('\n')

  // look places up one at a time (the free search service allows one request per second)
  useEffect(() => {
    let cancelled = false
    setFailed(false)
    ;(async () => {
      try {
        const d = await geocode(trip.destination)
        if (cancelled) return
        setDest(d)
        for (const s of stops) {
          let p: GeoPoint | null
          if (s.fix?.lat != null && s.fix.lng != null) p = { lat: s.fix.lat, lng: s.fix.lng }
          else if (s.fix?.query) p = await geocode(s.fix.query)
          else {
            const near = (x: GeoPoint | null) => (x && (!d || isNear(x, d)) ? x : null)
            p = near(await geocode(`${s.place}, ${trip.destination}`)) ?? near(await geocode(s.place))
          }
          if (cancelled) return
          setPoints((prev) => ({ ...prev, [s.lookupKey]: p }))
        }
      } catch {
        if (!cancelled) setFailed(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [trip.destination, lookupKeys]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- fixing a place by hand ----
  const [editing, setEditing] = useState<string | null>(null) // stop key
  const [draft, setDraft] = useState('')
  const [finding, setFinding] = useState(false)
  const [editError, setEditError] = useState('')
  const editingStop = stops.find((s) => s.key === editing)
  const addressInput = useRef<HTMLInputElement>(null)
  // focus the address box without scrolling the map out of view
  useEffect(() => {
    if (editing) addressInput.current?.focus({ preventScroll: true })
  }, [editing])

  const startEdit = (s: Stop) => {
    setEditing(s.key)
    setDraft(s.fix?.query ?? '')
    setEditError('')
    map.current?.closePopup()
  }

  const saveFix = async (key: string, fix: PlaceFix | undefined) => {
    const next = { ...trip.placeFixes }
    if (fix) next[key] = fix
    else delete next[key]
    await db.trips.update(trip.id, { placeFixes: next })
    setEditing(null)
  }

  const onFind = async (e: FormEvent) => {
    e.preventDefault()
    const q = draft.trim()
    if (!q || !editing) return
    setFinding(true)
    setEditError('')
    try {
      if (await geocode(q)) await saveFix(editing, { query: q })
      else setEditError("Couldn't find that either. Try the full street address with city, or click the spot on the map.")
    } catch {
      setEditError("Couldn't reach the map search. Check your internet connection.")
    } finally {
      setFinding(false)
    }
  }

  // ---- the Leaflet map ----
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map>()
  const layer = useRef<L.LayerGroup>()
  const onMapClick = useRef<(p: L.LatLng) => void>()
  onMapClick.current = editing ? (p) => saveFix(editing, { lat: p.lat, lng: p.lng }) : undefined

  useEffect(() => {
    if (!el.current) return
    const m = L.map(el.current, { scrollWheelZoom: false, zoomControl: false }).setView([20, 0], 2)
    L.control.zoom({ position: 'bottomright' }).addTo(m)
    L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 19, className: 'map-tiles' }).addTo(m)
    m.on('click', (e) => onMapClick.current?.(e.latlng))
    map.current = m
    layer.current = L.layerGroup().addTo(m)
    return () => {
      m.remove()
      map.current = undefined
    }
  }, [])

  // draw pins and the route whenever lookups or the day filter change
  const shown = stops
    .map((s, i) => ({ ...s, n: i + 1, point: points[s.lookupKey] }))
    .filter((s) => s.point && (!dayFilter || s.moments.some((m) => m.day === dayFilter)))
  const drawKey = shown.map((s) => `${s.n}:${s.point!.lat},${s.point!.lng}`).join('|') + `#${dest?.lat},${dest?.lng}#${dayFilter}`

  useEffect(() => {
    const m = map.current
    const g = layer.current
    if (!m || !g) return
    g.clearLayers()

    const latlngs = shown.map((s) => L.latLng(s.point!.lat, s.point!.lng))
    if (latlngs.length > 1) {
      L.polyline(latlngs, { color: trip.accent, weight: 2.5, opacity: 0.75, dashArray: '2 9', lineCap: 'round', interactive: false }).addTo(g)
    }
    shown.forEach((s, i) => {
      const icon = L.divIcon({
        className: '',
        html: `<span class="map-pin" style="--pin:${trip.accent}">${s.n}</span>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -18],
      })
      // built with textContent: titles and places come from pasted text
      const box = document.createElement('div')
      const name = document.createElement('strong')
      name.textContent = s.place
      box.append(name)
      s.moments
        .filter((mo) => !dayFilter || mo.day === dayFilter)
        .forEach((mo) => {
          const line = document.createElement('div')
          line.textContent = `Day ${mo.day} · ${mo.title}`
          box.append(line)
        })
      const move = document.createElement('button')
      move.type = 'button'
      move.className = 'map-popup-action'
      move.textContent = 'Wrong spot? Move pin'
      move.onclick = () => startEdit(s)
      box.append(move)
      L.marker(latlngs[i], { icon, title: s.place }).bindPopup(box).addTo(g)
    })

    if (latlngs.length > 1) m.fitBounds(L.latLngBounds(latlngs), { padding: [48, 48], maxZoom: 15 })
    else if (latlngs.length === 1) m.setView(latlngs[0], 14)
    else if (dest) {
      if (dest.bbox) m.fitBounds([[dest.bbox[0], dest.bbox[2]], [dest.bbox[1], dest.bbox[3]]], { maxZoom: 12 })
      else m.setView([dest.lat, dest.lng], 11)
    }
  }, [drawKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const looked = stops.filter((s) => s.lookupKey in points).length
  const searching = !failed && (dest === undefined || looked < stops.length)
  const missing = stops.filter((s) => points[s.lookupKey] === null)
  const activeDays = [...new Set(stops.flatMap((s) => s.moments.map((m) => m.day)))].sort((a, b) => a - b)

  return (
    <section className="reveal mt-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft">
          <MapPin size={13} strokeWidth={2.5} /> The map
          {searching && (
            <span className="flex items-center gap-1.5 normal-case tracking-normal">
              <Loader2 size={12} className="animate-spin" /> {stops.length ? `Finding places… ${looked} of ${stops.length}` : 'Finding the destination…'}
            </span>
          )}
        </p>
        {activeDays.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {[0, ...activeDays].map((d) => (
              <button
                key={d}
                onClick={() => setDayFilter(d)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${dayFilter === d ? 'border-transparent text-white' : 'border-line text-ink-soft hover:text-ink'}`}
                style={dayFilter === d ? { background: trip.accent } : undefined}
              >
                {d ? `Day ${d}` : 'Whole trip'}
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        className={`relative isolate z-0 overflow-hidden rounded-[1.75rem] border shadow-[0_30px_70px_-45px_rgba(0,0,0,0.5)] ${editing ? 'map-picking' : 'border-line'}`}
        style={editing ? { borderColor: trip.accent, boxShadow: `0 0 0 3px color-mix(in oklab, ${trip.accent} 30%, transparent)` } : undefined}
      >
        <div ref={el} className="h-[340px] w-full bg-paper-2 sm:h-[400px]" role="application" aria-label={`Map of ${trip.destination}`} />
      </div>

      {/* Fix a place by hand */}
      {editingStop && (
        <form onSubmit={onFind} className="glass mt-3 rounded-2xl p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-serif text-lg font-semibold">Where is {editingStop.place}?</p>
              <p className="mt-0.5 text-sm text-ink-soft">Search for the full address, or click the exact spot on the map above.</p>
            </div>
            <button type="button" onClick={() => setEditing(null)} aria-label="Cancel" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-paper-2">
              <X size={16} />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              ref={addressInput}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="e.g. 1234 NW 36th St, Miami, FL"
              className="field min-w-0 flex-1 !py-2.5"
            />
            <button
              disabled={finding || !draft.trim()}
              className="flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-40"
            >
              {finding ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} Find
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-1.5 text-ink-soft">
              <MousePointerClick size={14} /> Zoom in with + and click to drop the pin
            </span>
            {editingStop.fix && (
              <button type="button" onClick={() => saveFix(editingStop.key, undefined)} className="font-medium text-ink-soft underline hover:text-ink">
                Reset to automatic
              </button>
            )}
          </div>
          {editError && <p className="mt-3 text-sm font-medium text-terracotta">{editError}</p>}
        </form>
      )}

      <div className="mt-3 space-y-2 text-sm text-ink-soft">
        {failed && <p className="text-terracotta">Couldn't reach the map search. Check your internet connection and reload.</p>}
        {!failed && dest === null && <p>Couldn't find “{trip.destination}” on the map. Try a more specific destination in the trip details.</p>}
        {stops.length === 0 && <p>No places yet. Open Edit notes, copy the prompt again and paste Claude's new reply to pin your moments here.</p>}
        {missing.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span>Not on the map yet:</span>
            {missing.map((s) => (
              <button
                key={s.key}
                onClick={() => startEdit(s)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition hover:text-ink ${editing === s.key ? 'border-ink-soft text-ink' : 'border-dashed border-line'}`}
              >
                <MapPin size={12} strokeWidth={2.5} /> {s.place} <span className="opacity-60">· add location</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
