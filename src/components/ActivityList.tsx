import { useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Clock, Plus, Trash2 } from 'lucide-react'
import { db, uid, type Activity, type Day } from '../db'

export default function ActivityList({ day, accent }: { day: Day; accent: string }) {
  const [title, setTitle] = useState('')
  const [time, setTime] = useState('')
  const [editing, setEditing] = useState<string | null>(null)

  const sorted = [...day.activities].sort((a, b) => (a.time || '99').localeCompare(b.time || '99'))

  const save = (activities: Activity[]) => db.days.update(day.id, { activities })

  const add = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const activity = { id: uid(), title: title.trim(), time: time || undefined }
    setTitle('')
    setTime('')
    await db.days.where('id').equals(day.id).modify((d) => {
      d.activities.push(activity)
    })
  }

  const patch = (id: string, p: Partial<Activity>) =>
    save(day.activities.map((a) => (a.id === id ? { ...a, ...p } : a)))

  const remove = (id: string) => save(day.activities.filter((a) => a.id !== id))

  return (
    <div>
      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-soft">
          <div className="mb-1 text-2xl">🧭</div>
          Nothing logged yet — add your first stop below.
        </div>
      ) : (
        <ol className="relative ml-2">
          <div className="absolute bottom-3 left-[5px] top-3 w-0.5 rounded bg-line" />
          <AnimatePresence initial={false}>
            {sorted.map((a) => (
              <motion.li
                key={a.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10, height: 0 }}
                className="group relative flex gap-4 pb-4 pl-6"
              >
                <span
                  className="absolute left-0 top-2 h-3 w-3 rounded-full ring-4 ring-[var(--paper)]"
                  style={{ background: accent }}
                />
                <div className="min-w-0 flex-1">
                  {editing === a.id ? (
                    <div className="space-y-2">
                      <input
                        autoFocus
                        className="field !py-2"
                        defaultValue={a.title}
                        onBlur={(e) => e.target.value.trim() && patch(a.id, { title: e.target.value.trim() })}
                        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                      />
                      <textarea
                        className="field resize-none !py-2 text-sm"
                        rows={2}
                        placeholder="Add a note…"
                        defaultValue={a.note}
                        onBlur={(e) => patch(a.id, { note: e.target.value.trim() || undefined })}
                      />
                      <button onClick={() => setEditing(null)} className="text-sm font-medium" style={{ color: accent }}>
                        Done
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setEditing(a.id)} className="w-full text-left">
                      {a.time && (
                        <span className="mb-0.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                          <Clock size={11} /> {fmtTime(a.time)}
                        </span>
                      )}
                      <span className="block font-medium leading-snug">{a.title}</span>
                      {a.note ? (
                        <span className="mt-0.5 block text-sm text-ink-soft">{a.note}</span>
                      ) : (
                        <span className="mt-0.5 hidden text-xs text-ink-soft/70 group-hover:block">Click to add a note</span>
                      )}
                    </button>
                  )}
                </div>
                <button
                  onClick={() => remove(a.id)}
                  aria-label="Delete activity"
                  className="h-8 w-8 shrink-0 place-items-center rounded-full text-ink-soft opacity-0 transition hover:bg-paper-2 hover:text-terracotta group-hover:opacity-100 focus:opacity-100 grid"
                >
                  <Trash2 size={15} />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      )}

      <form onSubmit={add} className="mt-4 flex gap-2">
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="field !w-[7.5rem] shrink-0 !px-3"
          aria-label="Time (optional)"
        />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Sunrise hike, street tacos, museum…"
          className="field min-w-0"
        />
        <button
          className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full text-white shadow-md transition hover:-translate-y-0.5"
          style={{ background: accent }}
          aria-label="Add activity"
        >
          <Plus size={20} />
        </button>
      </form>
    </div>
  )
}

function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}
