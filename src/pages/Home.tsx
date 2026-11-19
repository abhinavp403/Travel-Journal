import { useState } from 'react'
import { motion } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { Compass, Plus } from 'lucide-react'
import { db, datesBetween } from '../db'
import TripCard from '../components/TripCard'
import TripFormModal from '../components/TripFormModal'

export default function Home() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const trips = useLiveQuery(() => db.trips.orderBy('startDate').reverse().toArray(), [])
  const mediaCount = useLiveQuery(() => db.media.filter((m) => !!m.dayId).count(), [])

  const stats = trips && {
    trips: trips.length,
    days: trips.reduce((n, t) => n + datesBetween(t.startDate, t.endDate).length, 0),
    places: new Set(trips.map((t) => t.destination.toLowerCase())).size,
  }

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="mx-auto max-w-6xl px-4 pb-24 sm:px-8"
    >
      {/* Nav */}
      <nav className="flex items-center justify-between py-6">
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-ink text-paper shadow-lg">
            <Compass size={20} />
          </div>
          <span className="font-serif text-xl font-semibold tracking-tight">TravelLogs</span>
        </div>
        {!!trips?.length && (
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper shadow-lg transition hover:-translate-y-0.5"
          >
            <Plus size={16} /> New trip
          </button>
        )}
      </nav>

      {/* Hero */}
      <section className="relative grid items-center gap-10 py-10 sm:py-16 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-hand text-3xl text-terracotta"
          >
            your stories, day by day
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="mt-2 font-serif text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl"
          >
            Where have <br />
            you <em className="font-normal italic text-ocean">wandered</em>?
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="mt-5 max-w-md text-lg leading-relaxed text-ink-soft"
          >
            A beautiful home for every trip — the places you went, the people beside you, the photos, the little
            moments you never want to forget.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            <button
              onClick={() => setOpen(true)}
              className="group flex items-center gap-2 rounded-full bg-terracotta px-7 py-4 text-lg font-semibold text-white shadow-[0_12px_30px_-10px_#e07a5f] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-10px_#e07a5f]"
            >
              <Plus size={20} className="transition group-hover:rotate-90" /> Add a trip
            </button>
            {stats && stats.trips > 0 && (
              <div className="flex gap-6 text-sm text-ink-soft">
                <Stat n={stats.trips} label="trips" />
                <Stat n={stats.days} label="days" />
                <Stat n={mediaCount ?? 0} label="memories" />
              </div>
            )}
          </motion.div>
        </div>
        <HeroArt />
      </section>

      {/* Trips */}
      {trips && trips.length > 0 && (
        <section className="mt-6">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="font-serif text-3xl font-semibold">Your journeys</h2>
            <span className="text-sm text-ink-soft">{stats?.places} {stats?.places === 1 ? 'place' : 'places'} explored</span>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {trips.map((t, i) => (
              <TripCard key={t.id} trip={t} index={i} />
            ))}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.05 * trips.length }}
              onClick={() => setOpen(true)}
              className="grid min-h-72 place-items-center rounded-[1.75rem] border-2 border-dashed border-line text-ink-soft transition hover:border-terracotta hover:text-terracotta"
            >
              <div className="text-center">
                <Plus className="mx-auto mb-2" size={28} />
                <span className="font-medium">Plan another adventure</span>
              </div>
            </motion.button>
          </div>
        </section>
      )}

      {trips && trips.length === 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass mt-6 rounded-[2rem] p-8 text-center sm:p-12"
        >
          <div className="text-5xl">🗺️</div>
          <h2 className="mt-4 font-serif text-2xl font-semibold">Your map is still blank</h2>
          <p className="mx-auto mt-2 max-w-md text-ink-soft">
            Add your first trip — past, present, or dreamed-up — and start filling it with days, photos and thoughts.
          </p>
        </motion.section>
      )}

      <TripFormModal open={open} onClose={() => setOpen(false)} onSaved={(t) => navigate(`/trip/${t.id}`)} />
    </motion.main>
  )
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <div className="font-serif text-2xl font-semibold text-ink">{n}</div>
      <div>{label}</div>
    </div>
  )
}

const POLAROIDS = [
  { emoji: '🏝️', bg: '#3d8b8b', rot: -8, x: '4%', y: '18%', caption: 'Day 3 · Bali' },
  { emoji: '🗼', bg: '#e07a5f', rot: 6, x: '42%', y: '0%', caption: 'Paris mornings' },
  { emoji: '🏔️', bg: '#6d5dfc', rot: -3, x: '30%', y: '48%', caption: 'Summit!' },
]

function HeroArt() {
  return (
    <div className="relative hidden h-[420px] lg:block">
      {/* dotted flight path */}
      <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full" fill="none">
        <motion.path
          d="M30 340 C 90 200, 200 380, 250 220 S 360 60, 380 40"
          stroke="currentColor"
          className="text-ink-soft/40"
          strokeWidth="2"
          strokeDasharray="2 10"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2.2, ease: 'easeInOut' }}
        />
      </svg>
      <motion.div
        className="absolute right-2 top-2 text-3xl"
        initial={{ opacity: 0, x: -40, y: 40 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 1.8, duration: 0.6 }}
      >
        ✈️
      </motion.div>
      {POLAROIDS.map((p, i) => (
        <motion.div
          key={i}
          className="absolute w-48 rounded-md bg-white p-2.5 pb-10 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.35)]"
          style={{ left: p.x, top: p.y }}
          initial={{ opacity: 0, y: 40, rotate: 0 }}
          animate={{ opacity: 1, y: [0, -8, 0], rotate: p.rot }}
          transition={{
            opacity: { delay: 0.3 + i * 0.15 },
            rotate: { delay: 0.3 + i * 0.15, type: 'spring' },
            y: { delay: 1 + i * 0.4, duration: 5 + i, repeat: Infinity, ease: 'easeInOut' },
          }}
          whileHover={{ scale: 1.06, rotate: 0, zIndex: 10 }}
        >
          <div
            className="grid h-40 place-items-center rounded-sm text-6xl"
            style={{ background: `radial-gradient(circle at 30% 25%, ${p.bg}ee, ${p.bg}88)` }}
          >
            {p.emoji}
          </div>
          <p className="absolute bottom-2 left-0 right-0 text-center font-hand text-xl text-neutral-700">{p.caption}</p>
        </motion.div>
      ))}
    </div>
  )
}
