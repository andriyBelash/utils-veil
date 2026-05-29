import {
  AESEncryptionKey,
  AESSealedData,
  aesDecryptAsync,
  aesEncryptAsync,
} from 'expo-crypto';

import { requireDek } from './crypto';
import { hmacSha256, utf8ToBytes } from './crypto-primitives';

// Per-file key: subKey = HMAC-SHA256(DEK, fileId). Each file therefore has a
// unique key, so reusing AES-GCM across files can never repeat (key, IV) pairs.
async function subKey(fileId: string): Promise<AESEncryptionKey> {
  const sub = hmacSha256(requireDek(), utf8ToBytes(fileId));
  return AESEncryptionKey.import(sub);
}

/** Encrypts bytes for storage. Output layout: IV(12B) ‖ ciphertext ‖ tag(16B). */
export async function encryptFileBytes(fileId: string, plaintext: Uint8Array): Promise<Uint8Array> {
  const key = await subKey(fileId);
  const sealed = await aesEncryptAsync(plaintext, key);
  return (await sealed.combined('bytes')) as Uint8Array;
}

/** Decrypts an IV‖ciphertext‖tag blob back to plaintext bytes (in memory only). */
export async function decryptFileBytes(fileId: string, blob: Uint8Array): Promise<Uint8Array> {
  const key = await subKey(fileId);
  const sealed = AESSealedData.fromCombined(blob);
  return (await aesDecryptAsync(sealed, key, { output: 'bytes' })) as Uint8Array;
}
