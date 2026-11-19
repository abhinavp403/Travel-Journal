import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowUpRight, MapPin } from 'lucide-react'
import { db, datesBetween, type Trip } from '../db'
import { fmtRange, tripStatus } from '../format'
import { useMediaUrl } from '../hooks/useMediaUrl'
import Avatars from './Avatars'
import { momentsOf } from './DayTimeline'

const DAY_MS = 86_400_000

/** "in 12 days", "tomorrow", "day 2 of 3", "3 weeks ago"… */
function whenLabel(start: string, end: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  const until = Math.round((s.getTime() - today.getTime()) / DAY_MS)
  const since = Math.round((today.getTime() - e.getTime()) / DAY_MS)
  const ago = (n: number) =>
    n < 14 ? `${n} days ago` : n < 60 ? `${Math.round(n / 7)} weeks ago` : n < 730 ? `${Math.round(n / 30)} months ago` : `${Math.round(n / 365)} years ago`
  if (until > 1) return until < 60 ? `in ${until} days` : `in ${Math.round(until / 30)} months`
  if (until === 1) return 'tomorrow'
  if (since <= 0) return `day ${-until + 1} of ${datesBetween(start, end).length}`
  return since === 1 ? 'ended yesterday' : ago(since)
}

export default function TripCard({ trip, index }: { trip: Trip; index: number }) {
  const cover = useMediaUrl(trip.coverMediaId)
  const photos = useLiveQuery(
    () => db.media.where('tripId').equals(trip.id).filter((m) => !!m.dayId).count(),
    [trip.id],
  )
  const moments = useLiveQuery(
    async () => (await db.days.where('tripId').equals(trip.id).toArray()).reduce((n, d) => n + momentsOf(d).length, 0),
    [trip.id],
  )
  const nDays = datesBetween(trip.startDate, trip.endDate).length
  const status = tripStatus(trip.startDate, trip.endDate)
  const a = trip.accent

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 * index, type: 'spring', stiffness: 120, damping: 18 }}
      whileHover={{ y: -8 }}
    >
      <Link
        to={`/trip/${trip.id}`}
        className="group block overflow-hidden rounded-[1.75rem] border border-line bg-card shadow-[0_14px_44px_-22px_rgba(0,0,0,0.4)] backdrop-blur-md transition-shadow duration-300 hover:shadow-[0_34px_70px_-28px_rgba(0,0,0,0.55)]"
      >
        <div className="relative h-56 overflow-hidden">
          {cover ? (
            <img src={cover} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(125deg, color-mix(in oklab, ${a} 78%, #120c1f), color-mix(in oklab, ${a} 40%, #0b0a14))` }}
            >
              <div
                className="absolute -left-[15%] -top-[45%] aspect-square w-[75%] rounded-full mix-blend-screen transition-transform duration-1000 group-hover:translate-x-6 group-hover:translate-y-4"
                style={{ background: `radial-gradient(circle, ${a}, transparent 65%)`, filter: 'saturate(1.5) blur(24px)' }}
              />
              <div
                className="absolute -bottom-[45%] left-[35%] aspect-square w-[70%] rounded-full mix-blend-screen transition-transform duration-1000 group-hover:-translate-x-6 group-hover:-translate-y-4"
                style={{ background: `radial-gradient(circle, ${a}, transparent 65%)`, filter: 'hue-rotate(45deg) saturate(1.5) blur(24px)' }}
              />
              <div
                className="absolute -right-[20%] -top-[40%] aspect-square w-[65%] rounded-full mix-blend-screen"
                style={{ background: `radial-gradient(circle, ${a}, transparent 65%)`, filter: 'hue-rotate(-55deg) saturate(1.5) blur(24px)' }}
              />
              <span className="absolute right-5 top-9 rotate-6 select-none text-[5.5rem] leading-none drop-shadow-[0_14px_26px_rgba(0,0,0,0.45)] transition-transform duration-500 group-hover:-translate-y-1.5 group-hover:rotate-12 group-hover:scale-110">
                {trip.emoji}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />

          <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
            <span className="rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-md">
              {status === 'now' && <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300 align-middle" />}
              {status === 'now' ? 'On the road' : status === 'upcoming' ? 'Upcoming' : 'Memory'}
            </span>
            <span className="grid h-8 w-8 -translate-y-1 place-items-center rounded-full bg-white text-neutral-900 opacity-0 shadow-lg transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
              <ArrowUpRight size={16} />
            </span>
          </div>

          <div className="absolute bottom-4 left-5 right-5 text-white">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/85">
              <MapPin size={12} strokeWidth={2.5} /> {trip.destination}
            </div>
            <h3 className="mt-1.5 font-serif text-2xl font-semibold leading-tight [text-shadow:0_2px_18px_rgba(0,0,0,0.35)]">{trip.title}</h3>
          </div>
        </div>

        <div className="px-5 pb-5 pt-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium">{fmtRange(trip.startDate, trip.endDate)}</span>
            <span className="shrink-0 font-hand text-xl leading-none" style={{ color: a }}>
              {whenLabel(trip.startDate, trip.endDate)}
            </span>
          </div>
          <div className="mt-3.5 flex items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5 text-xs font-medium text-ink-soft">
              <Chip>{nDays} {nDays === 1 ? 'day' : 'days'}</Chip>
              {!!moments && <Chip>{moments} {moments === 1 ? 'moment' : 'moments'}</Chip>}
              {!!photos && <Chip>{photos} {photos === 1 ? 'photo' : 'photos'}</Chip>}
              {!moments && !photos && <Chip>No notes yet</Chip>}
            </div>
            {trip.companions.length > 0 && <Avatars names={trip.companions} max={3} />}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-line bg-paper/60 px-2.5 py-1">{children}</span>
}
