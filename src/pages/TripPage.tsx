import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Images, MapPin, Pencil, Trash2, Users } from 'lucide-react'
import { db, deleteTrip } from '../db'
import { fmtRange, monthDay, weekday } from '../format'
import { useMediaUrl } from '../hooks/useMediaUrl'
import Avatars from '../components/Avatars'
import TripFormModal from '../components/TripFormModal'
import DayJournal from '../components/DayJournal'

export default function TripPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [editing, setEditing] = useState(false)

  const trip = useLiveQuery(() => db.trips.get(id), [id], null)
  const days = useLiveQuery(() => db.days.where('tripId').equals(id).sortBy('date'), [id])
  const media = useLiveQuery(() => db.media.where('tripId').equals(id).toArray(), [id])
  const cover = useMediaUrl(trip?.coverMediaId)

  const selectedDate = params.get('day') ?? days?.[0]?.date
  const selected = days?.find((d) => d.date === selectedDate) ?? days?.[0]
  const selectedIndex = days && selected ? days.indexOf(selected) : 0

  const stripRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    stripRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [selected?.id])

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

  const mediaByDay = new Map<string, number>()
  media?.forEach((m) => m.dayId && mediaByDay.set(m.dayId, (mediaByDay.get(m.dayId) ?? 0) + 1))
  const totalMedia = [...mediaByDay.values()].reduce((a, b) => a + b, 0)
  const journaled = days.filter((d) => d.thoughts || d.activities.length || mediaByDay.get(d.id)).length

  const onDelete = async () => {
    if (!confirm(`Delete "${trip.title}" and all its memories? This can't be undone.`)) return
    await deleteTrip(trip.id)
    navigate('/')
  }

  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pb-24">
      {/* Hero */}
      <header className="relative h-[46vh] min-h-[340px] overflow-hidden">
        {cover ? (
          <motion.img
            src={cover}
            alt=""
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0 grid place-items-center"
            style={{ background: `radial-gradient(circle at 70% 30%, ${trip.accent}, ${trip.accent}99 40%, ${trip.accent}44)` }}
          >
            <span className="translate-x-[25%] text-[10rem] opacity-90 drop-shadow-2xl sm:text-[14rem]">{trip.emoji}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/30" />

        <div className="relative mx-auto flex h-full max-w-6xl flex-col px-4 sm:px-8">
          <div className="flex items-center justify-between py-6">
            <Link
              to="/"
              className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/25"
            >
              <ArrowLeft size={16} /> All trips
            </Link>
            <div className="flex gap-2">
              <IconBtn label="Edit trip" onClick={() => setEditing(true)}><Pencil size={16} /></IconBtn>
              <IconBtn label="Delete trip" onClick={onDelete}><Trash2 size={16} /></IconBtn>
            </div>
          </div>
          <div className="mt-auto pb-10 text-white">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-white/85">
              <MapPin size={16} /> {trip.destination}
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="mt-1 font-serif text-4xl font-semibold leading-tight drop-shadow sm:text-6xl"
            >
              {trip.title}
            </motion.h1>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 }}
              className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/90"
            >
              <span className="flex items-center gap-1.5"><CalendarDays size={15} /> {fmtRange(trip.startDate, trip.endDate)}</span>
              <span className="flex items-center gap-1.5"><Images size={15} /> {totalMedia} photos & videos</span>
              <span className="flex items-center gap-1.5">✍️ {journaled}/{days.length} days journaled</span>
              {trip.companions.length > 0 && (
                <span className="flex items-center gap-2">
                  <Users size={15} />
                  <Avatars names={trip.companions} size={26} max={5} />
                  <span className="hidden sm:inline">{trip.companions.join(', ')}</span>
                </span>
              )}
            </motion.div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        {/* Day strip */}
        <div className="glass relative z-10 -mt-7 rounded-3xl p-2 shadow-[0_20px_50px_-25px_rgba(0,0,0,0.4)]">
          <div ref={stripRef} className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {days.map((d, i) => {
              const active = d.id === selected?.id
              const filled = d.thoughts || d.activities.length || mediaByDay.get(d.id)
              return (
                <button
                  key={d.id}
                  data-active={active}
                  onClick={() => setParams({ day: d.date }, { replace: true })}
                  className={`relative min-w-[78px] shrink-0 rounded-2xl px-3 py-2.5 text-center transition ${
                    active ? 'text-white' : 'hover:bg-paper-2'
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="day-pill"
                      className="absolute inset-0 rounded-2xl shadow-lg"
                      style={{ background: trip.accent }}
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <div className="relative">
                    <div className={`text-[11px] font-semibold uppercase tracking-wider ${active ? 'text-white/80' : 'text-ink-soft'}`}>
                      Day {i + 1}
                    </div>
                    <div className="font-serif text-lg font-semibold leading-tight">{monthDay(d.date)}</div>
                    <div className={`flex h-5 items-center justify-center text-xs ${active ? 'text-white/80' : 'text-ink-soft'}`}>
                      {d.mood ? <span className="text-base">{d.mood}</span> : weekday(d.date)}
                    </div>
                    {filled && !active && (
                      <span className="absolute -right-1 top-0 h-1.5 w-1.5 rounded-full" style={{ background: trip.accent }} />
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {trip.notes && (
          <p className="mx-auto mt-8 max-w-2xl text-center font-hand text-2xl leading-snug text-ink-soft">“{trip.notes}”</p>
        )}

        {selected && (
          <DayJournal
            key={selected.id}
            day={selected}
            dayNumber={selectedIndex + 1}
            accent={trip.accent}
            onPrev={selectedIndex > 0 ? () => setParams({ day: days[selectedIndex - 1].date }, { replace: true }) : undefined}
            onNext={selectedIndex < days.length - 1 ? () => setParams({ day: days[selectedIndex + 1].date }, { replace: true }) : undefined}
          />
        )}
      </div>

      <TripFormModal open={editing} onClose={() => setEditing(false)} trip={trip} />
    </motion.main>
  )
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur-md transition hover:bg-white/30"
    >
      {children}
    </button>
  )
}
