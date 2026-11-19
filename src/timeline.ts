import type { GeneratedDay, TimeOfDay, Trip } from './db'

const TIMES: TimeOfDay[] = ['morning', 'afternoon', 'evening', 'night', 'anytime']

/** The prompt the user pastes into a claude.ai chat. The reply is parsed by parseTimeline. */
export function buildPrompt(trip: Trip, dates: string[], notes: string) {
  return `Turn my rough trip notes into a clean day-by-day timeline for my personal travel journal.

The notes are shorthand written for my own memory: comma-separated fragments, typos, inside references. Organize them, don't embellish them.

- Split the notes by day. They usually mark days ("Day 1:", dates, weekdays). If there are no day markers at all, put everything in day 1.
- Use day numbers from 1 to ${dates.length}. If the notes describe more days than that, fold the extra ones into the last day. Skip days the notes say nothing about.
- Break each day into its moments, in the order they happened. Merge trivial fragments that belong together (for example a ride and the place it led to) so a day reads as roughly 4 to 10 moments.
- Give each moment a time of day only when the notes make it reasonably clear (meals, "midnight", "woke up", position in the day). Otherwise use "anytime".
- Titles are short and concrete (at most 6 words). Put names, places and the small specifics that make the memory vivid in the detail line. Leave detail as an empty string when the title says it all.
- Set "place" to the specific venue, neighborhood or landmark where the moment happened, written the way a map search would find it (for example "Wynwood Walls" or "Miami International Airport"). Only use places named in the notes. Use an empty string when there is no clear place, or the moment is just travel between places.
- Fix obvious typos and capitalization, keep my names for people and places, and never add facts, places or feelings that are not in the notes.
- The headline is a short, specific title for the day (2 to 5 words). The summary is one or two plain sentences in second person ("You ...").

Reply with only a JSON code block in exactly this shape, and nothing else:

\`\`\`json
{
  "days": [
    {
      "day": 1,
      "headline": "...",
      "summary": "...",
      "moments": [
        { "time": "morning | afternoon | evening | night | anytime", "title": "...", "detail": "...", "place": "..." }
      ]
    }
  ]
}
\`\`\`

Trip: ${trip.title}
Destination: ${trip.destination}
The trip has ${dates.length} day(s): ${dates.map((d, i) => `day ${i + 1} = ${d}`).join(', ')}

<notes>
${notes}
</notes>`
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

/** Parse Claude's pasted reply. Tolerates code fences and stray text around the JSON. */
export function parseTimeline(reply: string): GeneratedDay[] {
  const start = reply.indexOf('{')
  const end = reply.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error("That doesn't look like Claude's reply. Copy the whole reply, including the { } block.")

  let data: unknown
  try {
    data = JSON.parse(reply.slice(start, end + 1))
  } catch {
    throw new Error("Couldn't read that reply. Make sure you copied all of it, from the first { to the last }.")
  }

  const rawDays = (data as { days?: unknown })?.days
  if (!Array.isArray(rawDays)) throw new Error('The reply is missing its list of days. Ask Claude to try again with the same prompt.')

  const days = rawDays
    .map((d, i): GeneratedDay => {
      const moments = Array.isArray(d?.moments) ? d.moments : []
      return {
        day: Number.isFinite(Number(d?.day)) ? Number(d.day) : i + 1,
        headline: str(d?.headline),
        summary: str(d?.summary),
        moments: moments
          .map((m: Record<string, unknown>) => ({
            time: TIMES.includes(m?.time as TimeOfDay) ? (m.time as TimeOfDay) : 'anytime',
            title: str(m?.title),
            detail: str(m?.detail),
            place: str(m?.place),
          }))
          .filter((m: { title: string }) => m.title),
      }
    })
    .filter((d) => d.moments.length || d.summary)

  if (!days.length) throw new Error('The reply has no moments in it. Ask Claude to try again with the same prompt.')
  return days
}
