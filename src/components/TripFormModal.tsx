import { useEffect, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ImagePlus, X } from 'lucide-react'
import { ACCENTS, TRIP_EMOJIS, saveTrip, toISO, uid, type Trip } from '../db'
import { useBlobUrl, useMediaUrl } from '../hooks/useMediaUrl'
import { useScrollLock } from '../hooks/useScrollLock'
import { colorFor } from './Avatars'

interface Props {
  open: boolean
  onClose: () => void
  trip?: Trip
  onSaved?: (trip: Trip) => void
}

export default function TripFormModal({ open, onClose, trip, onSaved }: Props) {
  const today = toISO(new Date())
  const [title, setTitle] = useState('')
  const [destination, setDestination] = useState('')
  const [startDate, setStart] = useState(today)
  const [endDate, setEnd] = useState(today)
  const [companions, setCompanions] = useState<string[]>([])
  const [person, setPerson] = useState('')
  const [accent, setAccent] = useState(ACCENTS[0])
  const [emoji, setEmoji] = useState(TRIP_EMOJIS[0])
  const [notes, setNotes] = useState('')
  const [cover, setCover] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useScrollLock(open)
  const existingCover = useMediaUrl(trip?.coverMediaId)
  const newCover = useBlobUrl(cover ?? undefined)
  const coverUrl = newCover ?? existingCover

  useEffect(() => {
    if (!open) return
    setTitle(trip?.title ?? '')
    setDestination(trip?.destination ?? '')
    setStart(trip?.startDate ?? today)
    setEnd(trip?.endDate ?? today)
    setCompanions(trip?.companions ?? [])
    setAccent(trip?.accent ?? ACCENTS[Math.floor(Math.random() * ACCENTS.length)])
    setEmoji(trip?.emoji ?? TRIP_EMOJIS[Math.floor(Math.random() * TRIP_EMOJIS.length)])
    setNotes(trip?.notes ?? '')
    setCover(null)
    setPerson('')
    setError('')
  }, [open, trip]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && onClose()
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const addPerson = () => {
    const p = person.trim()
    if (p && !companions.includes(p)) setCompanions([...companions, p])
    setPerson('')
  }
  const onPersonKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addPerson()
    } else if (e.key === 'Backspace' && !person && companions.length) {
      setCompanions(companions.slice(0, -1))
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!destination.trim()) return setError('Where are you headed?')
    if (endDate < startDate) return setError('The trip has to end after it starts ✈️')
    setSaving(true)
    const finalCompanions = person.trim() && !companions.includes(person.trim()) ? [...companions, person.trim()] : companions
    const t: Trip = {
      id: trip?.id ?? uid(),
      createdAt: trip?.createdAt ?? Date.now(),
      coverMediaId: trip?.coverMediaId,
      title: title.trim() || destination.trim(),
      destination: destination.trim(),
      startDate,
      endDate,
      companions: finalCompanions,
      accent,
      emoji,
      notes: notes.trim(),
    }
    await saveTrip(t, cover)
    setSaving(false)
    onSaved?.(t)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.form
            onSubmit={submit}
            initial={{ y: 60, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] bg-paper shadow-2xl sm:rounded-[2rem]"
          >
            {/* Cover */}
            <label className="group relative block h-40 cursor-pointer overflow-hidden">
              {coverUrl ? (
                <img src={coverUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div
                  className="grid h-full w-full place-items-center text-6xl"
                  style={{ background: `radial-gradient(circle at 30% 20%, ${accent}dd, ${accent}55 60%, ${accent}22)` }}
                >
                  {emoji}
                </div>
              )}
              <div className="absolute inset-0 flex items-end justify-end bg-gradient-to-t from-black/40 to-transparent p-4">
                <span className="flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-sm font-medium text-neutral-800 shadow transition group-hover:scale-105">
                  <ImagePlus size={16} /> {coverUrl ? 'Change cover' : 'Add cover photo'}
                </span>
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && setCover(e.target.files[0])}
              />
            </label>
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-black/30 text-white backdrop-blur transition hover:bg-black/50"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="space-y-5 p-6 sm:p-8">
              <div>
                <p className="font-hand text-2xl text-terracotta">{trip ? 'Edit your adventure' : 'A new adventure begins…'}</p>
                <h2 className="font-serif text-3xl font-semibold">{trip ? 'Trip details' : 'Plan a new trip'}</h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Destination">
                  <input
                    autoFocus
                    className="field"
                    placeholder="Kyoto, Japan"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                  />
                </Field>
                <Field label="Trip name (optional)">
                  <input className="field" placeholder="Cherry blossom escape" value={title} onChange={(e) => setTitle(e.target.value)} />
                </Field>
                <Field label="Start date">
                  <input type="date" className="field" value={startDate} onChange={(e) => {
                    setStart(e.target.value)
                    if (e.target.value > endDate) setEnd(e.target.value)
                  }} />
                </Field>
                <Field label="End date">
                  <input type="date" className="field" value={endDate} min={startDate} onChange={(e) => setEnd(e.target.value)} />
                </Field>
              </div>

              <Field label="Travel companions">
                <div className="field flex flex-wrap items-center gap-2 !py-2">
                  {companions.map((c) => (
                    <span
                      key={c}
                      className="flex items-center gap-1 rounded-full py-1 pl-3 pr-1.5 text-sm font-medium text-white"
                      style={{ background: colorFor(c) }}
                    >
                      {c}
                      <button
                        type="button"
                        onClick={() => setCompanions(companions.filter((x) => x !== c))}
                        className="rounded-full p-0.5 hover:bg-white/25"
                        aria-label={`Remove ${c}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  <input
                    className="min-w-[8rem] flex-1 bg-transparent py-1 outline-none placeholder:text-ink-soft/70"
                    placeholder={companions.length ? 'Add another…' : 'Type a name and press Enter'}
                    value={person}
                    onChange={(e) => setPerson(e.target.value)}
                    onKeyDown={onPersonKey}
                    onBlur={addPerson}
                  />
                </div>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Icon">
                  <div className="flex flex-wrap gap-1.5">
                    {TRIP_EMOJIS.map((e) => (
                      <button
                        type="button"
                        key={e}
                        onClick={() => setEmoji(e)}
                        className={`grid h-9 w-9 place-items-center rounded-xl text-xl transition ${
                          emoji === e ? 'scale-110 bg-paper-2 ring-2 ring-terracotta' : 'hover:bg-paper-2'
                        }`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Color">
                  <div className="flex flex-wrap gap-2.5 pt-1">
                    {ACCENTS.map((c) => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => setAccent(c)}
                        className={`h-8 w-8 rounded-full transition ${accent === c ? 'scale-110 ring-4 ring-offset-2 ring-offset-[var(--paper)]' : 'hover:scale-110'}`}
                        style={{ background: c, ['--tw-ring-color' as string]: c + '66' }}
                        aria-label={`Color ${c}`}
                      />
                    ))}
                  </div>
                </Field>
              </div>

              <Field label="Notes (optional)">
                <textarea
                  rows={2}
                  className="field resize-none"
                  placeholder="Why this trip? What are you hoping for?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Field>

              {error && <p className="text-sm font-medium text-terracotta">{error}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onClose} className="rounded-full px-5 py-2.5 font-medium text-ink-soft hover:bg-paper-2">
                  Cancel
                </button>
                <button
                  disabled={saving}
                  className="rounded-full bg-ink px-6 py-2.5 font-semibold text-paper shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60"
                >
                  {trip ? 'Save changes' : 'Start journaling →'}
                </button>
              </div>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-semibold uppercase tracking-wider text-ink-soft">{label}</span>
      {children}
    </div>
  )
}
