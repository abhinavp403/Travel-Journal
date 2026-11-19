import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarDays, Camera, MapPin } from 'lucide-react'
import { db, datesBetween, type Trip } from '../db'
import { fmtRange, tripStatus } from '../format'
import { useMediaUrl } from '../hooks/useMediaUrl'
import Avatars from './Avatars'

export default function TripCard({ trip, index }: { trip: Trip; index: number }) {
  const cover = useMediaUrl(trip.coverMediaId)
  const memories = useLiveQuery(
    () => db.media.where('tripId').equals(trip.id).filter((m) => !!m.dayId).count(),
    [trip.id],
  )
  const nDays = datesBetween(trip.startDate, trip.endDate).length
  const status = tripStatus(trip.startDate, trip.endDate)

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index, type: 'spring', stiffness: 120, damping: 18 }}
      whileHover={{ y: -6 }}
    >
      <Link
        to={`/trip/${trip.id}`}
        className="group block overflow-hidden rounded-[1.75rem] glass shadow-[0_10px_40px_-15px_rgba(0,0,0,0.25)] transition-shadow hover:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)]"
      >
        <div className="relative h-52 overflow-hidden">
          {cover ? (
            <img src={cover} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
          ) : (
            <div
              className="grid h-full w-full place-items-center text-7xl transition-transform duration-700 group-hover:scale-110"
              style={{
                background: `radial-gradient(circle at 30% 20%, ${trip.accent}cc, ${trip.accent}55 55%, ${trip.accent}22)`,
              }}
            >
              <span className="drop-shadow-lg">{trip.emoji}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
          {status !== 'past' && (
            <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-neutral-800 backdrop-blur">
              {status === 'now' ? '● On the road' : 'Upcoming'}
            </span>
          )}
          <div className="absolute bottom-4 left-5 right-5 text-white">
            <div className="flex items-center gap-1.5 text-sm font-medium text-white/85">
              <MapPin size={14} /> {trip.destination}
            </div>
            <h3 className="mt-1 font-serif text-2xl font-semibold leading-tight">{trip.title}</h3>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <div className="space-y-1 text-sm text-ink-soft">
            <div className="flex items-center gap-1.5">
              <CalendarDays size={14} /> {fmtRange(trip.startDate, trip.endDate)}
            </div>
            <div className="flex items-center gap-1.5">
              <Camera size={14} /> {nDays} {nDays === 1 ? 'day' : 'days'} · {memories ?? 0} memories
            </div>
          </div>
          {trip.companions.length > 0 && <Avatars names={trip.companions} />}
        </div>
      </Link>
    </motion.div>
  )
}
