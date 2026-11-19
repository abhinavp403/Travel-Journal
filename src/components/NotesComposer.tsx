import { useState, type FormEvent, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Check, Copy, ExternalLink, Sparkles } from 'lucide-react'
import { applyTimeline, datesBetween, type Trip } from '../db'
import { buildPrompt, parseTimeline } from '../timeline'

const PLACEHOLDER = `Day 1:
Checked in, dinner on the rooftop, walked to the old town, got caught in the rain…

Day 2:
Slow morning, laundromat, met friends for drinks, live band…`

export default function NotesComposer({ trip, onDone, onCancel }: { trip: Trip; onDone: () => void; onCancel?: () => void }) {
  const [notes, setNotes] = useState(trip.rawNotes ?? '')
  const [reply, setReply] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const prompt = buildPrompt(trip, datesBetween(trip.startDate, trip.endDate), notes.trim())

  const copy = async () => {
    setError('')
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setError('Copying was blocked by the browser. Open “Show the prompt” below and copy it by hand.')
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await applyTimeline(trip.id, notes.trim(), parseTimeline(reply))
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  const hasNotes = !!notes.trim()

  return (
    <motion.form
      onSubmit={submit}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-[1.75rem] p-6 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.35)] sm:p-9"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft">Your notes</p>
      <h2 className="mt-2 font-serif text-3xl font-semibold">{trip.rawNotes ? 'Edit your notes' : 'Paste your trip notes'}</h2>
      <p className="mt-2 max-w-xl text-ink-soft">Three quick steps: write your notes, let Claude organize them, paste the result back.</p>

      <Step n={1} title="Write or paste your notes" hint="However you like. Start each day with a label like “Day 1:”.">
        <textarea
          autoFocus
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={9}
          placeholder={PLACEHOLDER}
          className="w-full resize-y rounded-2xl border border-line bg-paper/60 p-5 leading-relaxed outline-none transition placeholder:text-ink-soft/50 focus:border-ink-soft"
        />
      </Step>

      <Step n={2} title="Ask Claude" hint="Copy the prompt, paste it into a new claude.ai chat and send it.">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copy}
            disabled={!hasNotes}
            className="flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-40"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'Copied' : 'Copy prompt'}
          </button>
          <a
            href="https://claude.ai/new"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm text-ink-soft transition hover:border-ink-soft hover:text-ink"
          >
            Open claude.ai <ExternalLink size={14} />
          </a>
        </div>
        {hasNotes && (
          <details className="mt-3 text-sm text-ink-soft">
            <summary className="cursor-pointer select-none hover:text-ink">Show the prompt</summary>
            <textarea
              readOnly
              value={prompt}
              rows={8}
              onFocus={(e) => e.target.select()}
              className="mt-2 w-full resize-y rounded-xl border border-line bg-paper/60 p-3 font-mono text-xs outline-none"
            />
          </details>
        )}
      </Step>

      <Step n={3} title="Paste Claude's reply" hint="Copy Claude's whole answer and paste it here.">
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={4}
          placeholder={'{ "days": [ … ] }'}
          className="w-full resize-y rounded-2xl border border-line bg-paper/60 p-4 font-mono text-xs leading-relaxed outline-none transition placeholder:text-ink-soft/50 focus:border-ink-soft"
        />
      </Step>

      {error && <p className="mt-4 text-sm font-medium text-terracotta">{error}</p>}

      <div className="mt-6 flex justify-end gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-full px-5 py-2.5 text-sm font-medium text-ink-soft hover:bg-paper-2">
            Cancel
          </button>
        )}
        <button
          disabled={!hasNotes || !reply.trim()}
          className="flex items-center gap-2 rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-paper shadow-lg transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-40"
        >
          <Sparkles size={16} />
          {trip.rawNotes ? 'Update timeline' : 'Create timeline'}
        </button>
      </div>
    </motion.form>
  )
}

function Step({ n, title, hint, children }: { n: number; title: string; hint: string; children: ReactNode }) {
  return (
    <div className="mt-8 grid gap-x-4 gap-y-3 sm:grid-cols-[2rem_1fr]">
      <div className="hidden h-8 w-8 place-items-center rounded-full border border-line font-serif text-sm font-semibold text-ink-soft sm:grid">{n}</div>
      <div className="min-w-0">
        <div className="font-medium">
          <span className="sm:hidden">{n}. </span>
          {title}
        </div>
        <p className="mb-3 text-sm text-ink-soft">{hint}</p>
        {children}
      </div>
    </div>
  )
}
