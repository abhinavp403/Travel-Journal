import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, ChevronRight, ImagePlus, Play, Star, Trash2, UploadCloud, X } from 'lucide-react'
import { addMediaFiles, db, type Media } from '../db'
import { useBlobUrl } from '../hooks/useMediaUrl'
import { useScrollLock } from '../hooks/useScrollLock'

export default function MediaGallery({ tripId, dayId, accent }: { tripId: string; dayId: string; accent: string }) {
  const items = useLiveQuery(() => db.media.where('dayId').equals(dayId).sortBy('createdAt'), [dayId])
  const [dragging, setDragging] = useState(false)
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const input = useRef<HTMLInputElement>(null)

  const upload = (files: FileList | null) => files && addMediaFiles(tripId, dayId, [...files])

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    upload(e.dataTransfer.files)
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setDragging(false)}
      onDrop={onDrop}
      className="relative"
    >
      <input ref={input} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => {
        upload(e.target.files)
        e.target.value = ''
      }} />

      {items && items.length === 0 ? (
        <button
          onClick={() => input.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line px-6 py-14 text-ink-soft transition hover:border-current"
          style={{ ['--hover' as string]: accent }}
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            className="grid h-14 w-14 place-items-center rounded-2xl text-white shadow-lg"
            style={{ background: accent }}
          >
            <UploadCloud size={26} />
          </motion.div>
          <span className="mt-2 font-medium text-ink">Drag & drop photos or videos</span>
          <span className="text-sm">or click to browse</span>
        </button>
      ) : (
        <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
          {items?.map((m, i) => (
            <Thumb key={m.id} media={m} index={i} onOpen={() => setOpenIndex(i)} />
          ))}
          <button
            onClick={() => input.current?.click()}
            className="mb-3 flex aspect-square w-full break-inside-avoid flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line text-ink-soft transition hover:text-ink"
          >
            <ImagePlus size={24} />
            <span className="text-sm font-medium">Add more</span>
          </button>
        </div>
      )}

      <AnimatePresence>
        {dragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 grid place-items-center rounded-2xl border-2 border-dashed text-lg font-semibold backdrop-blur-sm"
            style={{ borderColor: accent, color: accent, background: accent + '18' }}
          >
            Drop to add to this day ✨
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {openIndex !== null && items?.[openIndex] && (
          <Lightbox
            items={items}
            index={openIndex}
            tripId={tripId}
            onIndex={setOpenIndex}
            onClose={() => setOpenIndex(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function Thumb({ media, index, onOpen }: { media: Media; index: number; onOpen: () => void }) {
  const url = useBlobUrl(media.blob)
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: Math.min(index * 0.04, 0.4) }}
      whileHover={{ y: -3 }}
      onClick={onOpen}
      className="group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-2xl bg-paper-2 shadow-md"
    >
      {url &&
        (media.type === 'video' ? (
          <video src={url + '#t=0.1'} muted playsInline preload="metadata" className="block w-full" />
        ) : (
          <img src={url} alt={media.caption ?? ''} className="block w-full transition duration-500 group-hover:scale-105" />
        ))}
      {media.type === 'video' && (
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-black/45 text-white backdrop-blur">
            <Play size={20} fill="white" />
          </span>
        </span>
      )}
      {media.caption && (
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6 text-left font-hand text-lg leading-tight text-white">
          {media.caption}
        </span>
      )}
    </motion.button>
  )
}

function Lightbox({
  items,
  index,
  tripId,
  onIndex,
  onClose,
}: {
  items: Media[]
  index: number
  tripId: string
  onIndex: (i: number) => void
  onClose: () => void
}) {
  const media = items[index]
  const url = useBlobUrl(media.blob)
  const [caption, setCaption] = useState(media.caption ?? '')
  const trip = useLiveQuery(() => db.trips.get(tripId), [tripId])
  const isCover = trip?.coverMediaId === media.id
  useScrollLock(true)

  useEffect(() => setCaption(media.caption ?? ''), [media.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const go = useCallback(
    (d: number) => onIndex((index + d + items.length) % items.length),
    [index, items.length, onIndex],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, onClose])

  const saveCaption = () => caption !== (media.caption ?? '') && db.media.update(media.id, { caption: caption.trim() || undefined })

  const remove = async () => {
    if (!confirm('Remove this from your journal?')) return
    if (isCover) await db.trips.update(tripId, { coverMediaId: undefined })
    await db.media.delete(media.id)
    if (items.length <= 1) onClose()
    else if (index >= items.length - 1) onIndex(index - 1)
  }

  const makeCover = async () => {
    if (media.type !== 'image' || isCover) return
    await db.transaction('rw', db.trips, db.media, async () => {
      const prev = trip?.coverMediaId ? await db.media.get(trip.coverMediaId) : undefined
      if (prev && !prev.dayId) await db.media.delete(prev.id) // drop a standalone uploaded cover
      await db.trips.update(tripId, { coverMediaId: media.id })
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-md"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex items-center justify-between p-4 text-white">
        <span className="text-sm text-white/70">{index + 1} / {items.length}</span>
        <div className="flex gap-2">
          {media.type === 'image' && (
            <LbBtn onClick={makeCover} label="Use as trip cover">
              <Star size={18} fill={isCover ? 'white' : 'none'} />
            </LbBtn>
          )}
          <LbBtn onClick={remove} label="Delete"><Trash2 size={18} /></LbBtn>
          <LbBtn onClick={onClose} label="Close"><X size={20} /></LbBtn>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        {items.length > 1 && (
          <button onClick={() => go(-1)} className="absolute left-2 z-10 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:left-6" aria-label="Previous">
            <ChevronLeft />
          </button>
        )}
        <AnimatePresence mode="wait">
          <motion.div
            key={media.id}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="flex max-h-full max-w-full items-center justify-center"
          >
            {url &&
              (media.type === 'video' ? (
                <video src={url} controls autoPlay playsInline className="max-h-[72vh] max-w-full rounded-xl shadow-2xl" />
              ) : (
                <img src={url} alt={media.caption ?? ''} className="max-h-[72vh] max-w-full rounded-xl object-contain shadow-2xl" />
              ))}
          </motion.div>
        </AnimatePresence>
        {items.length > 1 && (
          <button onClick={() => go(1)} className="absolute right-2 z-10 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-6" aria-label="Next">
            <ChevronRight />
          </button>
        )}
      </div>

      <div className="mx-auto w-full max-w-xl p-6">
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onBlur={saveCaption}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          placeholder="Write a caption…"
          className="w-full border-b border-white/20 bg-transparent pb-2 text-center font-hand text-3xl text-white outline-none placeholder:text-white/40 focus:border-white/60"
        />
      </div>
    </motion.div>
  )
}

function LbBtn({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={label} aria-label={label} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 transition hover:bg-white/20">
      {children}
    </button>
  )
}
