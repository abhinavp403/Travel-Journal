import { db, toISO, type Day, type Media, type Trip } from './db'

/** Photos and videos are stored as data URLs so the whole backup is one self-contained JSON file. */
type MediaRecord = Omit<Media, 'blob'> & { data: string }

interface Backup {
  app: 'travellogs'
  version: 1
  exportedAt: string
  trips: Trip[]
  days: Day[]
  media: MediaRecord[]
}

const toDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })

export async function buildBackup(): Promise<Blob> {
  const [trips, days, media] = await Promise.all([db.trips.toArray(), db.days.toArray(), db.media.toArray()])
  const mediaRecords: MediaRecord[] = []
  for (const { blob, ...rest } of media) mediaRecords.push({ ...rest, data: await toDataUrl(blob) })
  const backup: Backup = { app: 'travellogs', version: 1, exportedAt: new Date().toISOString(), trips, days, media: mediaRecords }
  return new Blob([JSON.stringify(backup)], { type: 'application/json' })
}

/** Download every trip, day and photo/video as one file. Returns how many trips it holds. */
export async function exportBackup() {
  const count = await db.trips.count()
  const url = URL.createObjectURL(await buildBackup())
  const a = document.createElement('a')
  a.href = url
  a.download = `travellogs-backup-${toISO(new Date())}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return count
}

/**
 * Restore from a backup file. Trips in the file are added, or replace the copy already here
 * (matched by id, including that trip's days and media). Trips not in the file are left alone.
 */
export async function restoreBackup(file: Blob) {
  let backup: Backup
  try {
    backup = JSON.parse(await file.text())
  } catch {
    throw new Error("That file isn't a TravelLogs backup.")
  }
  if (backup?.app !== 'travellogs' || !Array.isArray(backup.trips) || !Array.isArray(backup.days) || !Array.isArray(backup.media)) {
    throw new Error("That file isn't a TravelLogs backup.")
  }
  if (backup.version !== 1) throw new Error('This backup was made by a newer version of TravelLogs.')

  // decode media before opening the transaction: IndexedDB transactions can't wait on other async work
  const media: Media[] = []
  for (const { data, ...rest } of backup.media) media.push({ ...rest, blob: await (await fetch(data)).blob() })

  const tripIds = backup.trips.map((t) => t.id)
  await db.transaction('rw', db.trips, db.days, db.media, async () => {
    await db.media.where('tripId').anyOf(tripIds).delete()
    await db.days.where('tripId').anyOf(tripIds).delete()
    await db.trips.bulkPut(backup.trips)
    await db.days.bulkPut(backup.days)
    await db.media.bulkPut(media)
  })
  return backup.trips.length
}
