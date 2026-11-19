import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { db, MOODS, type Day } from '../db'
import { longDate } from '../format'
import ActivityList from './ActivityList'
import MediaGallery from './MediaGallery'

interface Props {
  day: Day
  dayNumber: number
  accent: string
  onPrev?: () => void
  onNext?: () => void
}

export default function DayJournal({ day, dayNumber, accent, onPrev, onNext }: Props) {
  const [thoughts, setThoughts] = useState(day.thoughts)
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved'>('idle')
  const timer = useRef<number>()

  // debounced autosave of thoughts
  useEffect(() => {
    if (thoughts === day.thoughts) return
    setSaved('saving')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(async () => {
      await db.days.update(day.id, { thoughts })
      setSaved('saved')
    }, 500)
    return () => window.clearTimeout(timer.current)
  }, [thoughts]) // eslint-disable-line react-hooks/exhaustive-deps

  const setMood = (mood: string) => db.days.update(day.id, { mood: day.mood === mood ? undefined : mood })

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 160, damping: 22 }}
      className="mt-10"
    >
      {/* Day header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-hand text-3xl" style={{ color: accent }}>Day {dayNumber}</p>
          <h2 className="font-serif text-3xl font-semibold sm:text-4xl">{longDate(day.date)}</h2>
        </div>
        <div className="flex gap-2">
          <NavBtn onClick={onPrev} label="Previous day"><ChevronLeft size={18} /></NavBtn>
          <NavBtn onClick={onNext} label="Next day"><ChevronRight size={18} /></NavBtn>
        </div>
      </div>

      {/* Mood */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-medium text-ink-soft">Today felt</span>
        {MOODS.map((m) => (
          <motion.button
            key={m}
            whileHover={{ scale: 1.2, rotate: -6 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setMood(m)}
            className={`grid h-10 w-10 place-items-center rounded-full text-xl transition ${
              day.mood === m ? 'bg-card shadow-md ring-2' : 'opacity-60 grayscale-[40%] hover:opacity-100 hover:grayscale-0'
            }`}
            style={day.mood === m ? { ['--tw-ring-color' as string]: accent } : undefined}
          >
            {m}
          </motion.button>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.15fr]">
        {/* Activities */}
        <Card title="What we did" subtitle="Little milestones of the day">
          <ActivityList day={day} accent={accent} />
        </Card>

        {/* Thoughts */}
        <Card
          title="Thoughts & reflections"
          subtitle="Dear diary…"
          right={
            saved !== 'idle' && (
              <span className="flex items-center gap-1 text-xs text-ink-soft">
                {saved === 'saving' ? 'Saving…' : <><Check size={12} /> Saved</>}
              </span>
            )
          }
        >
          <textarea
            value={thoughts}
            onChange={(e) => setThoughts(e.target.value)}
            placeholder="How did today feel? What surprised you, what made you laugh, what do you want to remember forever?"
            className="lined min-h-[18rem] w-full resize-y bg-transparent font-hand text-[1.6rem] text-ink outline-none placeholder:font-sans placeholder:text-base placeholder:text-ink-soft/70"
          />
        </Card>
      </div>

      {/* Media */}
      <div className="mt-6">
        <Card title="Photos & videos" subtitle="Drop in the moments you captured">
          <MediaGallery tripId={day.tripId} dayId={day.id} accent={accent} />
        </Card>
      </div>
    </motion.section>
  )
}

function Card({
  title,
  subtitle,
  right,
  children,
}: {
  title: string
  subtitle?: string
  right?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="glass rounded-[1.75rem] p-5 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.25)] sm:p-7">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-xl font-semibold">{title}</h3>
          {subtitle && <p className="text-sm text-ink-soft">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}

function NavBtn({ onClick, label, children }: { onClick?: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      aria-label={label}
      className="glass grid h-11 w-11 place-items-center rounded-full transition hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  )
}
