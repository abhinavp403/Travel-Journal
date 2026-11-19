import type { Day, Moment, TimeOfDay } from '../db'
import { monthDay, weekday } from '../format'
import MediaGallery from './MediaGallery'

const PHASE: Record<TimeOfDay, { label: string; icon: string; color: string }> = {
  morning: { label: 'Morning', icon: '🌅', color: '#f2a541' },
  afternoon: { label: 'Afternoon', icon: '☀️', color: '#3b82c4' },
  evening: { label: 'Evening', icon: '🌇', color: '#e07a5f' },
  night: { label: 'Night', icon: '🌙', color: '#6d5dfc' },
  anytime: { label: '', icon: '', color: '' },
}

const NUMBER_WORDS = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve']

/** Pick a little picture for a moment from the words in it. First match wins, so specific things come first. */
const ICON_RULES: [RegExp, string][] = [
  [/\b(flight|fly|flew|airport|plane|boarding|layover)\b/, '✈️'],
  [/\b(ambulance|hospital|doctor|pharmacy|stretcher\w*)\b/, '🚑'],
  [/\b(rain\w*|storm|thunder|drizzl\w*|soaked)\b/, '🌧️'],
  [/\b(check(ed)?[- ]?in|check(ed)?[- ]?out|hotel|hostel|airbnb|resort|motel)\b/, '🏨'],
  [/\b(uber|lyft|taxi|cab|drive|drove|car|road)\b/, '🚕'],
  [/\b(bus|shuttle|tram)\b/, '🚌'],
  [/\b(train|subway|metro|rail)\b/, '🚆'],
  [/\b(boat|ferry|cruise|sail\w*|kayak|canoe)\b/, '⛵'],
  [/\b(festival|stage|dj|b2b|set|concert|band|gig|music|rave|club\w*)\b/, '🎶'],
  [/\b(nfl|nba|game|match|stadium|tennis|football|soccer|volleyball|sports?)\b/, '🏟️'],
  [/\b(arcade|bowling|karaoke|casino)\b/, '🕹️'],
  [/\b(beach|ocean|sea|swim\w*|surf\w*|pool|snorkel\w*)\b/, '🏖️'],
  [/\b(hike|hiked|hiking|trail|summit|mountain|climb\w*)\b/, '🥾'],
  [/\b(ski\w*|snowboard\w*|slopes?)\b/, '⛷️'],
  [/\b(museum|gallery|exhibit\w*|temple|shrine|church|cathedral|tour|monument)\b/, '🏛️'],
  [/\b(breakfast|brunch|coffee|cafe|café|bakery|denny'?s)\b/, '☕'],
  [/\b(cocktail\w*|marg\w*|beer|wine|bar|pub|drinks?|shots?)\b/, '🍹'],
  [/\b(dinner|lunch|restaurant|rooftop|ate|eat|eating|food|tacos?|pizza|sushi|ramen|bbq|meal)\b/, '🍽️'],
  [/\b(laundr\w*|wash\w*|dry|dried|dryed)\b/, '🧺'],
  [/\b(shop\w*|store|mall|market|bought|buy|doordash|delivery|delivered|slippers|souvenir\w*)\b/, '🛍️'],
  [/\b(nap|napped|sleep|slept|woke|wake|bed|rest\w*)\b/, '😴'],
  [/\b(met|meet|friends?|co-?workers?|party)\b/, '🥂'],
  [/\b(photo\w*|pictures?|sunset|sunrise|view\w*)\b/, '📸'],
  [/\b(walk\w*|stroll\w*|wander\w*|explor\w*)\b/, '🚶'],
  [/\b(line|queue|security|ticket\w*|entry|entered|re-?entered)\b/, '🎟️'],
]

function iconFor(m: Moment) {
  const text = `${m.title} ${m.detail ?? ''}`.toLowerCase()
  return ICON_RULES.find(([re]) => re.test(text))?.[1] ?? '✦'
}

function fromClock(time?: string): TimeOfDay {
  if (!time) return 'anytime'
  const h = Number(time.split(':')[0])
  if (h < 5) return 'night'
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  if (h < 21) return 'evening'
  return 'night'
}

/** Days written before the AI timeline existed still show their activities and thoughts. */
export function momentsOf(day: Day): Moment[] {
  if (day.moments?.length) return day.moments
  return [...day.activities]
    .sort((a, b) => (a.time || '99').localeCompare(b.time || '99'))
    .map((a) => ({ time: fromClock(a.time), title: a.title, detail: a.note }))
}

export default function DayTimeline({ day, number, accent }: { day: Day; number: number; accent: string }) {
  const moments = momentsOf(day)
  const summary = day.summary ?? day.thoughts
  const phases = [...new Set(moments.map((m) => m.time))].filter((t) => t !== 'anytime')

  return (
    <section id={`day-${number}`} className="scroll-mt-24 pt-10">
      {/* Chapter card */}
      <header
        className="reveal relative overflow-hidden rounded-[2rem] border border-line p-7 shadow-[0_30px_70px_-45px_rgba(0,0,0,0.5)] sm:p-10"
        style={{
          background: `radial-gradient(120% 140% at 100% 0%, color-mix(in oklab, ${accent} 30%, transparent), transparent 60%), linear-gradient(135deg, color-mix(in oklab, ${accent} 12%, var(--paper)), var(--paper-2))`,
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -right-2 -top-7 select-none font-serif text-[9.5rem] font-semibold leading-none tracking-tighter text-transparent sm:-top-9 sm:right-4 sm:text-[13rem]"
          style={{ WebkitTextStroke: `1.5px color-mix(in oklab, ${accent} 55%, transparent)` }}
        >
          {String(number).padStart(2, '0')}
        </span>

        <div className="relative">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="rounded-full px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white shadow-md"
              style={{ background: accent }}
            >
              Day {NUMBER_WORDS[number - 1] ?? number}
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft">
              {weekday(day.date)} · {monthDay(day.date)}
            </span>
          </div>

          {day.headline && (
            <h2 className="mt-5 max-w-[22ch] font-serif text-3xl font-semibold leading-[1.1] tracking-tight sm:text-[2.6rem]">
              {day.headline}
            </h2>
          )}
          {summary && <p className="mt-3 max-w-prose font-serif text-lg italic leading-relaxed text-ink-soft">{summary}</p>}
          {!day.headline && !summary && moments.length === 0 && (
            <p className="mt-5 font-serif text-lg italic text-ink-soft">A quiet day. Nothing noted.</p>
          )}

          {moments.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-2 text-xs font-medium text-ink-soft">
              <span className="rounded-full border border-line bg-paper/60 px-3 py-1">
                {moments.length} {moments.length === 1 ? 'moment' : 'moments'}
              </span>
              {phases.map((p) => (
                <span key={p} className="flex items-center gap-1.5 rounded-full border border-line bg-paper/60 px-3 py-1">
                  <span>{PHASE[p].icon}</span> {PHASE[p].label}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Timeline */}
      {moments.length > 0 && (
        <ol className="relative mt-10">
          <div aria-hidden className="absolute bottom-2 left-[21px] top-2 w-[2px] rounded-full bg-line md:left-1/2 md:-translate-x-1/2" />
          <div
            aria-hidden
            className="spine-fill absolute bottom-2 left-[21px] top-2 w-[2px] rounded-full md:left-1/2 md:-ml-px"
            style={{ background: `linear-gradient(to bottom, ${accent}, color-mix(in oklab, ${accent} 35%, transparent))` }}
          />

          {moments.map((m, i) => {
            const newPhase = m.time !== 'anytime' && m.time !== moments[i - 1]?.time
            const left = i % 2 === 0
            const ring = PHASE[m.time].color || accent
            return (
              <li key={i}>
                {newPhase && (
                  <div className="reveal relative flex py-4 pl-0 md:justify-center">
                    <span
                      className="relative z-10 ml-[-2px] flex items-center gap-2 rounded-full border bg-paper px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] shadow-sm md:ml-0"
                      style={{ color: PHASE[m.time].color, borderColor: `color-mix(in oklab, ${PHASE[m.time].color} 40%, transparent)` }}
                    >
                      <span className="text-sm">{PHASE[m.time].icon}</span> {PHASE[m.time].label}
                    </span>
                  </div>
                )}

                <div className="relative py-3 pl-16 md:grid md:grid-cols-2 md:gap-x-20 md:pl-0">
                  {/* node on the spine */}
                  <span
                    className="reveal absolute left-0 top-4 z-10 grid h-11 w-11 place-items-center rounded-full bg-paper text-lg shadow-[0_6px_18px_-6px_rgba(0,0,0,0.35)] md:left-1/2 md:-ml-[22px]"
                    style={{ boxShadow: `0 0 0 2px ${ring}, 0 0 0 7px color-mix(in oklab, ${ring} 16%, transparent), 0 8px 20px -8px rgba(0,0,0,.4)` }}
                  >
                    <span className={iconFor(m) === '✦' ? 'text-base' : ''} style={iconFor(m) === '✦' ? { color: ring } : undefined}>
                      {iconFor(m)}
                    </span>
                  </span>

                  <div className={`${left ? 'reveal-left md:col-start-1 md:text-right' : 'reveal-right md:col-start-2'} reveal`}>
                    <div className="moment-card group relative inline-block w-full rounded-2xl border border-line bg-card px-5 py-4 text-left shadow-[0_14px_40px_-28px_rgba(0,0,0,0.55)] backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-26px_rgba(0,0,0,0.6)]">
                      <span
                        aria-hidden
                        className={`absolute inset-y-4 left-0 w-[3px] rounded-full opacity-70 transition-all duration-300 group-hover:inset-y-2 group-hover:opacity-100 ${left ? 'md:left-auto md:right-0' : ''}`}
                        style={{ background: ring }}
                      />
                      <div className="font-serif text-lg font-semibold leading-snug">{m.title}</div>
                      {m.detail && <div className="mt-1 text-sm leading-relaxed text-ink-soft">{m.detail}</div>}
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {/* Snapshots */}
      <div className="reveal mt-8 rounded-3xl border border-dashed border-line p-5 sm:p-6">
        <p className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft">
          <span className="text-sm">📸</span> Snapshots
        </p>
        <MediaGallery tripId={day.tripId} dayId={day.id} accent={accent} />
      </div>
    </section>
  )
}
