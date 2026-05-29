import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';

import { bytesToBase64, bytesToBase64Async } from './crypto-primitives';
import { deleteItem, insertItem } from './db';
import { decryptFileBytes, encryptFileBytes } from './file-crypto';
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
export async function pickAndImport(): Promise<number> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    quality: 1,
  });
  if (result.canceled) return 0;

  let imported = 0;
  for (const asset of result.assets) {
    try {
      await importAsset(asset);
      imported += 1;
    } catch (e) {
      // Skip a single bad asset rather than aborting the whole batch.
      console.warn('[veil] import failed', e);
    }
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
  const blob = new File(item.thumbPath).bytesSync();
  const plain = await decryptFileBytes(`${item.id}.thumb`, blob);
  return `data:image/jpeg;base64,${bytesToBase64(plain)}`;
}

/** Decrypts the full-size image to an in-memory data: URI (detail view only). */
export async function decryptFullToDataUri(item: VaultItem): Promise<string> {
  const blob = new File(item.encryptedPath).bytesSync();
  const plain = await decryptFileBytes(item.id, blob);
  return `data:${item.mimeType ?? 'image/jpeg'};base64,${await bytesToBase64Async(plain)}`;
}

/**
 * User-initiated export through the system share sheet. This DELIBERATELY takes
 * a photo out of the vault: it decrypts to a short-lived plaintext temp file in
 * the cache, shares it, then wipes the temp file. The plaintext only exists in
 * cache for the duration of the share.
 */
export async function shareItem(item: VaultItem): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) return;
  const blob = new File(item.encryptedPath).bytesSync();
  const plain = await decryptFileBytes(item.id, blob);

  const safeName = (item.originalName || `${item.id}.jpg`).replace(/[/\\:]/g, '_');
  const tmp = new File(Paths.cache, safeName);
  if (tmp.exists) safeDelete(tmp.uri);
  tmp.create();
  tmp.write(plain);
  try {
    await Sharing.shareAsync(tmp.uri, { mimeType: item.mimeType ?? 'image/jpeg' });
  } finally {
    safeDelete(tmp.uri);
  }
}

/** Deletes the encrypted files and the metadata row. */
export async function removeItem(item: VaultItem): Promise<void> {
  safeDelete(item.encryptedPath);
  if (item.thumbPath) safeDelete(item.thumbPath);
  await deleteItem(item.id);
}
