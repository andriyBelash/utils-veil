import * as Crypto from 'expo-crypto';

import { createAlbum as dbCreateAlbum, deleteAlbum as dbDeleteAlbum } from '@/features/vault';

/** Creates an album with a fresh UUID and returns its id. */
export async function createAlbum(name: string): Promise<string> {
  const id = Crypto.randomUUID();
  await dbCreateAlbum(id, name);
  return id;
}

export const deleteAlbum = dbDeleteAlbum;
