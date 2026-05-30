import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import Share from 'react-native-share';

import { bytesToBase64, bytesToBase64Async } from './crypto-primitives';
import { deleteItem, insertItem } from './db';
import { decryptFileBytes, encryptFileBytes } from './file-crypto';
import { dropCachedThumb, getCachedThumb, setCachedThumb } from './media-cache';
import type { VaultItem } from './types';

const VAULT_DIR = '.vault';
const THUMB_WIDTH = 400;

function vaultDir(): Directory {
  const dir = new Directory(Paths.document, VAULT_DIR);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

function safeDelete(uri: string): void {
  try {
    new File(uri).delete();
  } catch {
    // best-effort cleanup of plaintext temp files
  }
}

export async function requestLibraryPermission(): Promise<boolean> {
  const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return granted;
}

/** Opens the multi-select picker and imports each chosen photo. Returns count. */
/** Reports import progress: `done` assets processed out of `total` selected. */
export type ImportProgress = (done: number, total: number) => void;

export async function pickAndImport(onProgress?: ImportProgress): Promise<number> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    quality: 1,
  });
  if (result.canceled) return 0;

  const total = result.assets.length;
  onProgress?.(0, total);

  let processed = 0;
  let imported = 0;
  for (const asset of result.assets) {
    try {
      await importAsset(asset);
      imported += 1;
    } catch (e) {
      // Skip a single bad asset rather than aborting the whole batch.
      console.warn('[veil] import failed', e);
    }
    processed += 1;
    onProgress?.(processed, total);
  }
  return imported;
}

async function importAsset(asset: ImagePicker.ImagePickerAsset): Promise<void> {
  const id = Crypto.randomUUID();
  const dir = vaultDir();

  // 1. Full-size original → encrypted .enc (IV‖ciphertext‖tag)
  const originalBytes = new File(asset.uri).bytesSync();
  const encBlob = await encryptFileBytes(id, originalBytes);
  const encFile = new File(dir, `${id}.enc`);
  encFile.create();
  encFile.write(encBlob);

  // 2. Thumbnail (separate encrypted file, distinct subkey via `${id}.thumb`)
  const ctx = ImageManipulator.manipulate(asset.uri);
  ctx.resize({ width: THUMB_WIDTH });
  const rendered = await ctx.renderAsync();
  const thumb = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.6 });
  const thumbBytes = new File(thumb.uri).bytesSync();
  const thumbBlob = await encryptFileBytes(`${id}.thumb`, thumbBytes);
  const thumbFile = new File(dir, `${id}.thumb`);
  thumbFile.create();
  thumbFile.write(thumbBlob);

  // 3. Metadata row
  await insertItem({
    id,
    originalName: asset.fileName ?? `${id}.jpg`,
    encryptedPath: encFile.uri,
    thumbPath: thumbFile.uri,
    mimeType: asset.mimeType ?? 'image/jpeg',
    sizeBytes: asset.fileSize ?? originalBytes.length,
    albumId: null,
  });

  // 4. Wipe the plaintext temp copies the OS/manipulator left in the cache.
  safeDelete(thumb.uri);
  safeDelete(asset.uri);
}

/** Decrypts a thumbnail to an in-memory data: URI (never touches disk). */
export async function decryptThumbToDataUri(item: VaultItem): Promise<string | null> {
  if (!item.thumbPath) return null;
  const cached = getCachedThumb(item.id);
  if (cached) return cached;
  const blob = new File(item.thumbPath).bytesSync();
  const plain = await decryptFileBytes(`${item.id}.thumb`, blob);
  const uri = `data:image/jpeg;base64,${bytesToBase64(plain)}`;
  setCachedThumb(item.id, uri);
  return uri;
}

// Concurrency gate for thumbnail decryption. Fast scrolling mounts many cells at
// once; without this each fires an AES-GCM decrypt in parallel, flooding the
// native bridge and wasting work on cells that already scrolled off-screen.
const MAX_CONCURRENT_THUMBS = 4;
let activeThumbs = 0;
const thumbWaiters: (() => void)[] = [];

function acquireThumbSlot(): Promise<void> {
  if (activeThumbs < MAX_CONCURRENT_THUMBS) {
    activeThumbs += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => thumbWaiters.push(resolve));
}

function releaseThumbSlot(): void {
  const next = thumbWaiters.shift();
  if (next) next(); // hand the slot to the next waiter, activeThumbs unchanged
  else activeThumbs -= 1;
}

/**
 * Cache-first, concurrency-limited thumbnail loader for grid cells.
 * `isCancelled` lets a cell that scrolled away while queued skip the (costly)
 * decrypt entirely instead of just discarding the result.
 */
export async function loadThumb(
  item: VaultItem,
  isCancelled: () => boolean,
): Promise<string | null> {
  const cached = getCachedThumb(item.id);
  if (cached) return cached;
  await acquireThumbSlot();
  try {
    if (isCancelled()) return null;
    return await decryptThumbToDataUri(item);
  } finally {
    releaseThumbSlot();
  }
}

/** Decrypts the full-size image to an in-memory data: URI (detail view only). */
export async function decryptFullToDataUri(item: VaultItem): Promise<string> {
  const blob = new File(item.encryptedPath).bytesSync();
  const plain = await decryptFileBytes(item.id, blob);
  return `data:${item.mimeType ?? 'image/jpeg'};base64,${await bytesToBase64Async(plain)}`;
}

/**
 * Decrypts an item to a short-lived plaintext temp file in the cache and returns
 * its uri. The caller MUST wipe it (safeDelete) once done — this DELIBERATELY
 * materializes plaintext outside the vault for export/share/save flows.
 */
async function decryptToTempFile(item: VaultItem): Promise<string> {
  const blob = new File(item.encryptedPath).bytesSync();
  const plain = await decryptFileBytes(item.id, blob);
  const safeName = (item.originalName || `${item.id}.jpg`).replace(/[/\\:]/g, '_');
  const tmp = new File(Paths.cache, safeName);
  if (tmp.exists) safeDelete(tmp.uri);
  tmp.create();
  tmp.write(plain);
  return tmp.uri;
}

/**
 * User-initiated export through the system share sheet. The plaintext only
 * exists as a temp file for the duration of the share, then is wiped.
 */
export async function shareItem(item: VaultItem): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) return;
  const tmp = await decryptToTempFile(item);
  try {
    await Sharing.shareAsync(tmp, { mimeType: item.mimeType ?? 'image/jpeg' });
  } finally {
    safeDelete(tmp);
  }
}

/**
 * Native multi-file share: decrypts every selected item to a temp plaintext file,
 * opens a single system share sheet for all of them, then wipes the temps.
 */
export async function shareMany(items: VaultItem[]): Promise<void> {
  if (items.length === 0) return;
  if (items.length === 1) return shareItem(items[0]);
  const temps: string[] = [];
  try {
    for (const item of items) temps.push(await decryptToTempFile(item));
    await Share.open({ urls: temps, failOnCancel: false });
  } catch {
    // user cancelled or share unavailable
  } finally {
    temps.forEach(safeDelete);
  }
}

/**
 * User-initiated export: decrypts the photo to a short-lived plaintext temp file
 * and saves a copy into the device's photo library, then wipes the temp file.
 * Like {@link shareItem}, this DELIBERATELY moves plaintext out of the vault at
 * the user's request. Uses write-only library permission (no read access).
 * Returns false if the user denied the permission.
 */
export async function saveToDevice(item: VaultItem): Promise<boolean> {
  return saveManyToDevice([item]);
}

/** Bulk variant of {@link saveToDevice}: asks for permission once, then saves all. */
export async function saveManyToDevice(items: VaultItem[]): Promise<boolean> {
  if (items.length === 0) return true;
  const perm = await MediaLibrary.requestPermissionsAsync(true);
  if (!perm.granted) return false;
  for (const item of items) {
    const tmp = await decryptToTempFile(item);
    try {
      // Class-based API; saveToLibraryAsync is deprecated and throws at runtime.
      await MediaLibrary.Asset.create(tmp);
    } finally {
      safeDelete(tmp);
    }
  }
  return true;
}

/** Deletes the encrypted files and the metadata row. */
export async function removeItem(item: VaultItem): Promise<void> {
  safeDelete(item.encryptedPath);
  if (item.thumbPath) safeDelete(item.thumbPath);
  dropCachedThumb(item.id);
  await deleteItem(item.id);
}

/** Bulk variant of {@link removeItem}. */
export async function removeMany(items: VaultItem[]): Promise<void> {
  for (const item of items) await removeItem(item);
}
