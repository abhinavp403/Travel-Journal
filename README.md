# TravelLogs 🧭

A travel journal for keeping each trip day by day. Add a trip, paste your rough notes, and with one copy-paste through claude.ai they become a clean timeline for each day. Add photos and videos alongside.

Everything is stored locally in your browser. There's no account, no server and no API key. Your notes only leave your machine when you paste them into claude.ai yourself.

## Features

- **Trips:** destination, trip name, start/end dates, companions, an icon and color, an optional cover photo and notes. Trips can be edited or deleted later.
- **Notes to timeline:** paste your notes for the whole trip (label days like "Day 1:"), copy the ready-made prompt into a claude.ai chat, and paste Claude's reply back. Each day gets a headline, a short summary and a timeline of moments grouped by time of day. Edit the notes any time to regenerate it.
- **Photos & videos:** add them to any day, with a full-screen viewer, captions, arrow-key navigation, and an option to make any photo the trip cover
- **Home screen:** trip cards with cover, dates, companions and memory counts, plus totals across all trips
- Works on phone screens and follows the system's light or dark mode

## Tech stack

- [React 18](https://react.dev) + TypeScript, built with [Vite](https://vitejs.dev)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Framer Motion](https://www.framer.com/motion/) for animation
- [Dexie](https://dexie.org) (IndexedDB) for storage, including photo and video blobs
- [React Router](https://reactrouter.com) and [lucide-react](https://lucide.dev) icons

## Getting started

Requires Node.js 18+.

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

Other scripts:

```bash
npm run build     # type-check and build to dist/
npm run preview   # serve the production build
```

## Project structure

```
src/
├── db.ts                 # Dexie schema (trips, days, media) and data helpers
├── timeline.ts           # Builds the claude.ai prompt and parses the pasted reply
├── format.ts             # Date and name formatting helpers
├── pages/
│   ├── Home.tsx          # Welcome screen and trip list
│   └── TripPage.tsx      # Trip cover, notes composer and day-by-day timeline
├── components/
│   ├── TripFormModal.tsx # Create/edit trip form
│   ├── TripCard.tsx      # Trip card on the home screen
│   ├── NotesComposer.tsx # Notes, copy-prompt and paste-reply steps
│   ├── DayTimeline.tsx   # One day's headline, summary, moments and media
│   ├── MediaGallery.tsx  # Photo/video grid, uploads and full-screen viewer
│   └── Avatars.tsx       # Companion initials
└── hooks/                # Object-URL and scroll-lock hooks
```

## Notes on data

- Data is kept in your browser's IndexedDB database (`travel-journal`). It stays across reloads, but it isn't synced between browsers or devices. Clearing site data deletes it.
- If you shorten a trip's dates, days outside the new range are removed only when they're empty. Days with entries are kept so nothing is lost.
