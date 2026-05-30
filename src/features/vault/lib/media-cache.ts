import { Image } from 'expo-image';

// In-memory LRU of decrypted thumbnail data: URIs (item id → dataURI).
// Plaintext thumbnails live ONLY in RAM and are wiped on lock / background
// (see clearMediaCaches) per the security model — never persisted to disk.
const MAX_ENTRIES = 300;
const cache = new Map<string, string>();

export function getCachedThumb(id: string): string | undefined {
  const value = cache.get(id);
  if (value !== undefined) {
    // Touch for LRU recency (Map keeps insertion order).
    cache.delete(id);
    cache.set(id, value);
  }
  return value;
}

export function setCachedThumb(id: string, uri: string): void {
  if (cache.has(id)) cache.delete(id);
  cache.set(id, uri);
  if (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}

export function dropCachedThumb(id: string): void {
  cache.delete(id);
}

/** Wipes all in-memory plaintext image caches. Call on lock and on background. */
export function clearMediaCaches(): void {
  cache.clear();
  // expo-image keeps decoded bitmaps in a memory cache keyed by the data: URI.
  Image.clearMemoryCache();
}
