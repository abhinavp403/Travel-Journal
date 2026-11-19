# TravelLogs 🧭

A travel journal for keeping each trip day by day. Add a trip, then log what you did each day, write down your thoughts, and attach photos and videos.

Everything is stored locally in your browser. There's no account, no server, and no uploads.

## Features

- **Trips:** destination, trip name, start/end dates, companions, an icon and color, an optional cover photo and notes. Trips can be edited or deleted later.
- **Day-by-day journal:** a day is created automatically for every date in the trip. Each day has:
  - a **mood** emoji
  - **activities**, shown as a timeline with optional times and notes
  - **thoughts**, a lined, handwriting-style area that saves as you type
  - **photos & videos**, added by drag and drop or file picker, with a full-screen viewer, captions, arrow-key navigation, and an option to make any photo the trip cover
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
├── format.ts             # Date and name formatting helpers
├── pages/
│   ├── Home.tsx          # Welcome screen and trip list
│   └── TripPage.tsx      # Trip cover, day strip and selected day
├── components/
│   ├── TripFormModal.tsx # Create/edit trip form
│   ├── TripCard.tsx      # Trip card on the home screen
│   ├── DayJournal.tsx    # Mood, activities, thoughts and media for one day
│   ├── ActivityList.tsx  # Activity timeline
│   ├── MediaGallery.tsx  # Photo/video grid, uploads and full-screen viewer
│   └── Avatars.tsx       # Companion initials
└── hooks/                # Object-URL and scroll-lock hooks
```

## Notes on data

- Data is kept in your browser's IndexedDB database (`travel-journal`). It stays across reloads, but it isn't synced between browsers or devices. Clearing site data deletes it.
- If you shorten a trip's dates, days outside the new range are removed only when they're empty. Days with entries are kept so nothing is lost.
