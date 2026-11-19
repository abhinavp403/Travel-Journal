import { useState } from 'react'
import { motion } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router-dom'
import { Compass, Plus } from 'lucide-react'
import { db, datesBetween, type Trip } from '../db'
import { useMediaUrl } from '../hooks/useMediaUrl'
import TripCard from '../components/TripCard'
import TripFormModal from '../components/TripFormModal'
import { momentsOf } from '../components/DayTimeline'

export default function Home() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const trips = useLiveQuery(() => db.trips.orderBy('startDate').toArray(), [])
  const photoCount = useLiveQuery(() => db.media.filter((m) => !!m.dayId).count(), [])
  const momentCount = useLiveQuery(async () => (await db.days.toArray()).reduce((n, d) => n + momentsOf(d).length, 0), [])

  const stats = trips && [
    { n: trips.length, label: trips.length === 1 ? 'trip' : 'trips' },
    { n: new Set(trips.map((t) => t.destination.toLowerCase())).size, label: 'places' },
    { n: trips.reduce((n, t) => n + datesBetween(t.startDate, t.endDate).length, 0), label: 'days away' },
    { n: momentCount ?? 0, label: 'moments' },
    { n: photoCount ?? 0, label: 'photos' },
  ]
  const hasTrips = !!trips?.length

  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-6xl px-4 pb-24 sm:px-8">
      {/* Nav */}
      <nav className="flex items-center justify-between py-6">
        <div className="group flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-ink text-paper shadow-lg transition-transform duration-700 group-hover:rotate-[200deg]">
            <Compass size={20} />
          </div>
          <span className="font-serif text-xl font-semibold tracking-tight">TravelLogs</span>
        </div>
        {hasTrips && (
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 rounded-full border border-line bg-card px-4 py-2 text-sm font-semibold shadow-sm backdrop-blur-md transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <Plus size={16} /> New trip
          </button>
        )}
      </nav>

      {/* Hero */}
      <section className="relative grid items-center gap-10 py-8 sm:py-14 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="font-hand text-3xl text-terracotta">
            your stories, day by day
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="mt-2 font-serif text-5xl font-semibold leading-[1.02] tracking-tight sm:text-7xl"
          >
            Where have <br />
            you{' '}
            <em className="relative font-normal italic text-ocean">
              wandered
              <svg aria-hidden viewBox="0 0 300 20" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-3 w-full text-terracotta" fill="none">
                <motion.path
                  d="M4 13 C 60 2, 110 20, 160 9 S 250 4, 296 12"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.7, duration: 0.9, ease: 'easeOut' }}
                />
              </svg>
            </em>
            ?
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="mt-6 max-w-md text-lg leading-relaxed text-ink-soft"
          >
            Paste the rough notes from your trip and watch them turn into a day-by-day timeline, with your photos right beside them.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            className="mt-8"
          >
            <button
              onClick={() => setOpen(true)}
              className="group relative flex items-center gap-2 overflow-hidden rounded-full bg-terracotta px-7 py-4 text-lg font-semibold text-white shadow-[0_14px_34px_-10px_#e07a5f] transition hover:-translate-y-0.5 hover:shadow-[0_22px_44px_-10px_#e07a5f]"
            >
              <span aria-hidden className="absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-white/25 opacity-0 transition-all duration-700 group-hover:left-full group-hover:opacity-100" />
              <Plus size={20} className="transition duration-300 group-hover:rotate-90" /> Add a trip
            </button>
          </motion.div>
        </div>
        <HeroArt trips={trips ?? []} />
      </section>

      {/* Stats */}
      {hasTrips && stats && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass grid grid-cols-2 gap-y-5 rounded-[1.75rem] px-4 py-6 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.5)] sm:grid-cols-5 sm:divide-x sm:divide-line sm:px-2"
        >
          {stats.map((s, i) => (
            <div key={s.label} className={`px-4 text-center ${i === 4 ? 'col-span-2 sm:col-span-1' : ''}`}>
              <div className="font-serif text-4xl font-semibold tracking-tight">{s.n}</div>
              <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft">{s.label}</div>
            </div>
          ))}
        </motion.section>
      )}

      {/* Trips */}
      {hasTrips && (
        <section className="mt-14">
          <div className="mb-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-soft">The logbook</p>
            <h2 className="mt-1.5 font-serif text-4xl font-semibold tracking-tight">Your journeys</h2>
          </div>
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {trips!.map((t, i) => (
              <TripCard key={t.id} trip={t} index={i} />
            ))}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.06 * trips!.length }}
              onClick={() => setOpen(true)}
              className="group grid min-h-80 place-items-center rounded-[1.75rem] border-2 border-dashed border-line text-ink-soft transition duration-300 hover:border-terracotta hover:bg-terracotta/5 hover:text-terracotta"
            >
              <div className="text-center">
                <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full border-2 border-dashed border-current transition duration-500 group-hover:rotate-90 group-hover:border-solid">
                  <Plus size={24} />
                </span>
                <span className="font-serif text-lg font-semibold">Plan another adventure</span>
                <p className="mt-1 text-sm opacity-70">Past, present or dreamed-up</p>
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
          className="glass mt-4 rounded-[2rem] p-8 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.5)] sm:p-12"
        >
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-soft">How it works</p>
          <h2 className="mt-2 text-center font-serif text-3xl font-semibold">Your map is still blank</h2>
          <div className="mx-auto mt-9 grid max-w-3xl gap-8 sm:grid-cols-3">
            {[
              { icon: '🧭', title: 'Add a trip', text: 'Where, when and who came along.' },
              { icon: '📝', title: 'Paste your notes', text: 'Rough is fine. Label each day.' },
              { icon: '✨', title: 'Get a timeline', text: 'Every day laid out, ready for photos.' },
            ].map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 + i * 0.12 }}
                className="text-center"
              >
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-line bg-paper text-3xl shadow-md">{s.icon}</div>
                <p className="mt-4 font-hand text-xl text-terracotta">step {i + 1}</p>
                <h3 className="font-serif text-xl font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-ink-soft">{s.text}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      <TripFormModal open={open} onClose={() => setOpen(false)} onSaved={(t) => navigate(`/trip/${t.id}`)} />
    </motion.main>
  )
}

interface Snap {
  emoji: string
  bg: string
  caption: string
  coverId?: string
  to?: string
}

const SAMPLE_SNAPS: Snap[] = [
  { emoji: '🏝️', bg: '#3d8b8b', caption: 'Day 3 · Bali' },
  { emoji: '🗼', bg: '#e07a5f', caption: 'Paris mornings' },
  { emoji: '🏔️', bg: '#6d5dfc', caption: 'Summit!' },
]

const SLOTS = [
  { rot: -8, x: '4%', y: '18%' },
  { rot: 6, x: '42%', y: '0%' },
  { rot: -3, x: '30%', y: '48%' },
]

/** Floating polaroids. They show your own latest trips once you have some, with samples filling any gaps. */
function HeroArt({ trips }: { trips: Trip[] }) {
  const mine: Snap[] = trips
    .slice(-3)
    .reverse()
    .map((t) => ({ emoji: t.emoji, bg: t.accent, caption: t.title, coverId: t.coverMediaId, to: `/trip/${t.id}` }))
  const snaps = [...mine, ...SAMPLE_SNAPS].slice(0, 3)

  return (
    <div className="relative hidden h-[420px] lg:block">
      <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full" fill="none" aria-hidden>
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
        aria-hidden
        className="absolute right-2 top-2 text-3xl"
        initial={{ opacity: 0, x: -40, y: 40 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 1.8, duration: 0.6 }}
      >
        ✈️
      </motion.div>
      {snaps.map((s, i) => (
        <Polaroid key={s.to ?? s.caption} snap={s} slot={SLOTS[i]} index={i} />
      ))}
    </div>
  )
}

function Polaroid({ snap, slot, index: i }: { snap: Snap; slot: (typeof SLOTS)[number]; index: number }) {
  const cover = useMediaUrl(snap.coverId)
  const body = (
    <>
      <span aria-hidden className="absolute -top-3 left-1/2 h-6 w-20 -translate-x-1/2 -rotate-2 rounded-sm bg-amber-100/80 shadow-sm" />
      {cover ? (
        <img src={cover} alt="" className="h-40 w-full rounded-sm object-cover" />
      ) : (
        <div
          className="grid h-40 place-items-center rounded-sm text-6xl"
          style={{ background: `radial-gradient(circle at 30% 25%, ${snap.bg}ee, ${snap.bg}88)` }}
        >
          <span className="drop-shadow-lg">{snap.emoji}</span>
        </div>
      )}
      <p className="absolute bottom-2 left-2 right-2 truncate text-center font-hand text-xl text-neutral-700">{snap.caption}</p>
    </>
  )
  return (
    <motion.div
      className="absolute w-48"
      style={{ left: slot.x, top: slot.y }}
      initial={{ opacity: 0, y: 40, rotate: 0 }}
      animate={{ opacity: 1, y: [0, -8, 0], rotate: slot.rot }}
      transition={{
        opacity: { delay: 0.3 + i * 0.15 },
        rotate: { delay: 0.3 + i * 0.15, type: 'spring' },
        y: { delay: 1 + i * 0.4, duration: 5 + i, repeat: Infinity, ease: 'easeInOut' },
      }}
      whileHover={{ scale: 1.07, rotate: 0, zIndex: 10 }}
    >
      {snap.to ? (
        <Link to={snap.to} className="relative block rounded-md bg-white p-2.5 pb-10 shadow-[0_22px_50px_-15px_rgba(0,0,0,0.4)]">
          {body}
        </Link>
      ) : (
        <div className="relative rounded-md bg-white p-2.5 pb-10 shadow-[0_22px_50px_-15px_rgba(0,0,0,0.4)]">{body}</div>
      )}
    </motion.div>
  )
}
