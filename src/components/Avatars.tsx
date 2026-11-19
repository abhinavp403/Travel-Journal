import { initials } from '../format'

const COLORS = ['#e07a5f', '#3d8b8b', '#f2a541', '#6d5dfc', '#d6577a', '#4f9d69']

export function colorFor(name: string) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return COLORS[h % COLORS.length]
}

export default function Avatars({ names, max = 4, size = 28 }: { names: string[]; max?: number; size?: number }) {
  const shown = names.slice(0, max)
  const extra = names.length - shown.length
  return (
    <div className="flex -space-x-2">
      {shown.map((n) => (
        <div
          key={n}
          title={n}
          className="grid place-items-center rounded-full font-semibold text-white ring-2 ring-[var(--paper)]"
          style={{ width: size, height: size, background: colorFor(n), fontSize: size * 0.38 }}
        >
          {initials(n)}
        </div>
      ))}
      {extra > 0 && (
        <div
          className="grid place-items-center rounded-full bg-paper-2 font-semibold text-ink-soft ring-2 ring-[var(--paper)]"
          style={{ width: size, height: size, fontSize: size * 0.36 }}
        >
          +{extra}
        </div>
      )}
    </div>
  )
}
