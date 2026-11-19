import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

/** Create (and revoke) an object URL for a Blob. */
export function useBlobUrl(blob?: Blob) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!blob) return setUrl(undefined)
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url
}

export function useMediaUrl(id?: string) {
  const media = useLiveQuery(() => (id ? db.media.get(id) : undefined), [id])
  return useBlobUrl(media?.blob)
}
