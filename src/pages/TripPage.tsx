import { useEffect, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MapPin, Pencil, PenLine, Trash2 } from 'lucide-react'
import { db, deleteTrip } from '../db'
import { fmtRange } from '../format'
import { useMediaUrl } from '../hooks/useMediaUrl'
import TripFormModal from '../components/TripFormModal'
import NotesComposer from '../components/NotesComposer'
import DayTimeline, { momentsOf } from '../components/DayTimeline'

export default function TripPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [editingTrip, setEditingTrip] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)

  const trip = useLiveQuery(() => db.trips.get(id), [id], null)
  const days = useLiveQuery(() => db.days.where('tripId').equals(id).sortBy('date'), [id])
  const cover = useMediaUrl(trip?.coverMediaId)

  // highlight the day currently on screen in the sticky day bar
  const [activeDay, setActiveDay] = useState(1)
  const dayCount = days?.length ?? 0
  useEffect(() => {
    if (editingNotes || !dayCount) return
    const onScroll = () => {
      let current = 1
      for (let n = 1; n <= dayCount; n++) {
        const el = document.getElementById(`day-${n}`)
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.4) current = n
      }
      setActiveDay(current)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [dayCount, editingNotes])

  if (trip === undefined) {
    return (
      <main className="grid min-h-screen place-items-center text-ink-soft">
        <div className="text-center">
          <p className="font-serif text-2xl">This trip has wandered off.</p>
          <Link to="/" className="mt-4 inline-block text-terracotta underline">Back home</Link>
        </div>
      </main>
    )
  }
  if (!trip || !days) return null

  const hasContent = days.some((d) => d.moments?.length || d.activities.length || d.thoughts)
  const composing = editingNotes || !hasContent
  const momentCount = days.reduce((n, d) => n + momentsOf(d).length, 0)

  const onDelete = async () => {
    if (!confirm(`Delete "${trip.title}" and all its memories? This can't be undone.`)) return
    navigate('/', { replace: true })
    await deleteTrip(trip.id)
  }

  const meta = [
    fmtRange(trip.startDate, trip.endDate),
    `${days.length} ${days.length === 1 ? 'day' : 'days'}`,
    trip.companions.length ? `with ${trip.companions.join(', ')}` : '',
  ].filter(Boolean)

  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pb-28">
      <header className="relative flex min-h-[max(22vh,190px)] flex-col overflow-hidden">
        {cover ? (
          <>
            <motion.img
              src={cover}
              alt=""
              initial={{ scale: 1.08 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.6, ease: 'easeOut' }}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/35" />
          </>
        ) : (
          <HeaderArt accent={trip.accent} />
        )}

        <div className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 sm:px-8">
          <div className="flex items-center justify-between py-4">
            <Link
              to="/"
              className="flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/25"
            >
              <ArrowLeft size={16} /> All trips
            </Link>
            <div className="flex gap-2">
              <IconBtn label="Edit trip" onClick={() => setEditingTrip(true)}><Pencil size={15} /></IconBtn>
              <IconBtn label="Delete trip" onClick={onDelete}><Trash2 size={15} /></IconBtn>
            </div>
          </div>

          <div className="relative mt-auto pb-6 pt-2 text-white">
            {!cover && (
              <motion.span
                aria-hidden
                initial={{ opacity: 0, scale: 0.6, rotate: -10 }}
                animate={{ opacity: 1, scale: 1, rotate: 8, y: [0, -7, 0] }}
                transition={{
                  default: { type: 'spring', stiffness: 140, damping: 12, delay: 0.25 },
                  y: { duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 },
                }}
                className="pointer-events-none absolute bottom-3 right-0 select-none text-[5rem] leading-none opacity-40 drop-shadow-[0_12px_28px_rgba(0,0,0,0.45)] sm:text-[7rem] sm:opacity-100"
              >
                {trip.emoji}
              </motion.span>
            )}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-white/85"
            >
              <MapPin size={13} strokeWidth={2.5} /> {trip.destination}
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="relative mt-1.5 font-serif text-3xl font-semibold leading-[1.1] tracking-tight [text-shadow:0_2px_24px_rgba(0,0,0,0.35)] sm:pr-32 sm:text-[2.6rem]"
            >
              {trip.title}
            </motion.h1>
            <div className="relative mt-3 flex flex-wrap gap-2 sm:pr-32">
              {meta.map((m, i) => (
                <motion.span
                  key={m}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.16 + i * 0.06 }}
                  className="rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-md"
                >
                  {m}
                </motion.span>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        {composing ? (
          <div className="mt-10">
            <NotesComposer
              trip={trip}
              onDone={() => setEditingNotes(false)}
              onCancel={hasContent ? () => setEditingNotes(false) : undefined}
            />
          </div>
        ) : (
          <>
            <nav
              className="sticky top-3 z-20 mt-5 flex items-center gap-1 rounded-full border border-line p-1.5 shadow-[0_14px_40px_-20px_rgba(0,0,0,0.45)] backdrop-blur-xl"
              style={{ background: 'color-mix(in oklab, var(--paper) 88%, transparent)' }}
            >
              <div className="no-scrollbar flex min-w-0 flex-1 gap-1 overflow-x-auto">
                {days.map((d, i) => (
                  <button
                    key={d.id}
                    onClick={() => document.getElementById(`day-${i + 1}`)?.scrollIntoView({ behavior: 'smooth' })}
                    className={`relative shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${activeDay === i + 1 ? 'text-white' : 'text-ink-soft hover:text-ink'}`}
                  >
                    {activeDay === i + 1 && (
                      <motion.span
                        layoutId="day-pill"
                        className="absolute inset-0 rounded-full shadow-md"
                        style={{ background: trip.accent }}
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span className="relative">Day {i + 1}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setEditingNotes(true)}
                className="flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm text-ink-soft transition hover:bg-paper-2 hover:text-ink"
              >
                <PenLine size={14} /> <span className="hidden sm:inline">Edit notes</span>
              </button>
            </nav>

            {days.map((d, i) => (
              <div key={d.id}>
                <DayTimeline day={d} number={i + 1} accent={trip.accent} />
              </div>
            ))}

            <div className="reveal mt-16 text-center">
              <p className="font-hand text-4xl" style={{ color: trip.accent }}>that's a wrap</p>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-soft">
                {days.length} {days.length === 1 ? 'day' : 'days'} · {momentCount} {momentCount === 1 ? 'moment' : 'moments'} · {trip.destination}
              </p>
            </div>
          </>
        )}
      </div>

      <TripFormModal open={editingTrip} onClose={() => setEditingTrip(false)} trip={trip} />
    </motion.main>
  )
}

/** Animated backdrop for trips without a cover photo: drifting color glows built from the trip's accent. */
function HeaderArt({ accent }: { accent: string }) {
  const blobs = [
    { hue: 0, size: '55%', left: '-8%', top: '-60%', x: [0, 60, 0], y: [0, 30, 0], dur: 14 },
    { hue: 45, size: '45%', left: '38%', top: '10%', x: [0, -70, 0], y: [0, -40, 0], dur: 18 },
    { hue: -55, size: '50%', left: '68%', top: '-70%', x: [0, -40, 0], y: [0, 50, 0], dur: 16 },
  ]
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: `linear-gradient(115deg, color-mix(in oklab, ${accent} 70%, #120c1f), color-mix(in oklab, ${accent} 35%, #0b0a14))` }}>
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          className="absolute aspect-square rounded-full opacity-90 mix-blend-screen"
          style={{
            width: b.size,
            left: b.left,
            top: b.top,
            background: `radial-gradient(circle, ${accent}, transparent 65%)`,
            filter: `hue-rotate(${b.hue}deg) saturate(1.5) blur(30px)`,
          }}
          animate={{ x: b.x, y: b.y }}
          transition={{ duration: b.dur, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      {/* dashed flight path */}
      <svg className="absolute inset-0 h-full w-full text-white/35" viewBox="0 0 1200 220" preserveAspectRatio="none" fill="none" aria-hidden>
        <motion.path
          d="M-20 190 C 260 40, 520 230, 800 110 S 1120 20, 1230 60"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="2 9"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2.4, ease: 'easeInOut' }}
        />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />
    </div>
  )
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-white/15 text-white backdrop-blur-md transition hover:bg-white/30"
    >
      {children}
    </button>
  )
}
