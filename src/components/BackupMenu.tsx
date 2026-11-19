import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Download, HardDriveDownload, Loader2, Upload } from 'lucide-react'
import { exportBackup, restoreBackup } from '../backup'

const plural = (n: number) => `${n} ${n === 1 ? 'trip' : 'trips'}`

export default function BackupMenu({ hasTrips }: { hasTrips: boolean }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  const run = async (job: () => Promise<string>) => {
    setBusy(true)
    setMessage(null)
    try {
      setMessage({ text: await job() })
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Something went wrong.', error: true })
    } finally {
      setBusy(false)
    }
  }

  const onExport = () => run(async () => `Saved a backup of ${plural(await exportBackup())} to your Downloads folder.`)
  const onImport = (file?: File) => file && run(async () => `Restored ${plural(await restoreBackup(file))} from the backup.`)

  return (
    <div ref={root} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-line bg-card px-4 py-2 text-sm font-semibold shadow-sm backdrop-blur-md transition hover:-translate-y-0.5 hover:shadow-md"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <HardDriveDownload size={16} />}
        <span className="hidden sm:inline">Backup</span>
      </button>
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(e) => {
          onImport(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] origin-top-right rounded-2xl border border-line bg-paper p-2 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)]"
          >
            <Item
              icon={<Download size={17} />}
              title="Export backup"
              text="Save all trips, timelines, photos and videos to one file."
              disabled={busy || !hasTrips}
              onClick={onExport}
            />
            <Item
              icon={<Upload size={17} />}
              title="Restore from backup"
              text="Load a backup file. Trips in it are added, or replace the copy here."
              disabled={busy}
              onClick={() => input.current?.click()}
            />
            {message && (
              <p className={`mx-2 mb-1 mt-2 border-t border-line pt-3 text-sm ${message.error ? 'font-medium text-terracotta' : 'text-ink-soft'}`}>
                {message.text}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Item({ icon, title, text, disabled, onClick }: { icon: React.ReactNode; title: string; text: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-paper-2 disabled:pointer-events-none disabled:opacity-40"
    >
      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line">{icon}</span>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-sm leading-snug text-ink-soft">{text}</span>
      </span>
    </button>
  )
}
