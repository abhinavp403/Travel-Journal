const d = (iso: string) => new Date(iso + 'T00:00:00')

export function fmtRange(start: string, end: string) {
  const s = d(start)
  const e = d(end)
  const sameYear = s.getFullYear() === e.getFullYear()
  const sameMonth = sameYear && s.getMonth() === e.getMonth()
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  if (start === end) return s.toLocaleDateString(undefined, { ...opts, year: 'numeric' })
  if (sameMonth) return `${s.toLocaleDateString(undefined, opts)} – ${e.getDate()}, ${e.getFullYear()}`
  if (sameYear) return `${s.toLocaleDateString(undefined, opts)} – ${e.toLocaleDateString(undefined, opts)}, ${e.getFullYear()}`
  return `${s.toLocaleDateString(undefined, { ...opts, year: 'numeric' })} – ${e.toLocaleDateString(undefined, { ...opts, year: 'numeric' })}`
}

export const weekday = (iso: string) => d(iso).toLocaleDateString(undefined, { weekday: 'short' })
export const monthDay = (iso: string) => d(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
export const longDate = (iso: string) =>
  d(iso).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

export function tripStatus(start: string, end: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (d(end) < today) return 'past'
  if (d(start) > today) return 'upcoming'
  return 'now'
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
